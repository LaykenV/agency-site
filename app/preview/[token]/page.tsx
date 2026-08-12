import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { ConceptViewTracker } from "@/components/concepts/ConceptViewTracker";
import {
  CONCEPT_IFRAME_SANDBOX,
  neuterConceptHrefs,
} from "@/lib/concepts/sandbox";

/**
 * The unlisted concept preview a Facebook lead actually opens.
 *
 * ## Rendering and security boundary
 *
 * This page is trusted application code. The model-generated document is never
 * injected into it with `dangerouslySetInnerHTML`; it is handed to an iframe as
 * `srcDoc` with a restrictive sandbox. No `allow-scripts`, no `allow-forms`, no
 * `allow-same-origin`, so the generated document cannot reach this DOM,
 * authentication cookies, storage, or any network API — the boundary holds
 * without a second domain.
 *
 * No sandbox tokens are granted. Concept CTAs are dummy controls — they look
 * like buttons so the owner can judge the layout, but they must not call,
 * scroll, or leave the page. `validateConceptHtml` already rejects every `href`
 * other than `#`, and `neuterConceptHrefs` rewrites leftover live links in
 * already-published documents.
 *
 * ## If iOS sizing proves unacceptable
 *
 * Nested-iframe scrolling is the known risk in Messenger's in-app browser. The
 * planned fallback is to serve the generated HTML as the top-level response from
 * a route handler at this path with:
 *
 *   Content-Security-Policy: default-src 'none'; img-src <approved origins>;
 *     style-src 'unsafe-inline'; script-src 'none'; form-action 'none';
 *     frame-ancestors 'none'; base-uri 'none'; connect-src 'none';
 *     object-src 'none'
 *
 * That fallback must keep `?notrack=1`, the published-token check, and every
 * validation rule — and the concept notice below has to move into the generated
 * document, since there would no longer be a trusted parent to carry it.
 */

// Publishing and unpublishing must take effect on the next request, and
// `searchParams` must be readable, so this page is never statically cached.
export const dynamic = "force-dynamic";

type PreviewPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | Array<string> | undefined }>;
};

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const { token } = await params;
  const concept = await fetchQuery(api.concepts.public.getPublishedByToken, {
    token,
  });

  if (!concept) return { robots: { index: false, follow: false } };

  const title = `${concept.businessName} — Website Concept`;
  const description = `An early homepage concept for ${concept.businessName}. Not the finished website.`;

  return {
    // Absolute, so the root layout's "| Acadiana Web Design" template does not
    // append marketing copy to a page about someone else's business.
    title: { absolute: title },
    description,
    robots: { index: false, follow: false, noarchive: true, nocache: true },
    // The root layout's Open Graph tags describe the agency and carry the
    // agency's promotional image. Left inherited, pasting this link into
    // Messenger would render an ad for us instead of a card about the
    // prospect's own business, which is the opposite of the pitch. Images are
    // cleared rather than replaced because no screenshot of the concept exists.
    openGraph: {
      type: "website",
      title,
      description,
      images: [],
    },
    twitter: { card: "summary", title, description, images: [] },
    alternates: { canonical: `/preview/${token}` },
  };
}

export default async function ConceptPreviewPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);

  const concept = await fetchQuery(api.concepts.public.getPublishedByToken, {
    token,
  });

  // Covers an unknown token, an unpublished draft, and a deleted concept with
  // one response, so none of them can be told apart from outside.
  if (!concept) notFound();

  const notrack = query.notrack === "1";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-neutral-900">
      <ConceptViewTracker token={concept.token} track={!notrack} />

      {/*
        The concept notice lives here, in trusted code, rather than in the
        generated document. The model cannot omit it, a regeneration cannot lose
        it, and it stays visible no matter how far the prospect scrolls the
        frame — which is what makes putting someone else's business name and
        logo on a page we wrote defensible.
      */}
      <header className="flex flex-none items-start px-3 py-2 text-neutral-300 sm:px-4">
        <p className="min-w-0 flex-1 text-[11px] leading-snug sm:text-xs">
          Concept for{" "}
          <span className="font-semibold text-white">
            {concept.businessName}
          </span>
          <span className="text-neutral-400">
            {" "}
            — a direction sketch, not the finished website
          </span>
          <span className="mt-0.5 block text-neutral-500">
            Buttons are mockups. The live site will have more pages and a custom
            design.
          </span>
        </p>
      </header>

      <iframe
        // Shared with the admin review card so what Layken approves renders
        // under exactly the restrictions the prospect gets.
        sandbox={CONCEPT_IFRAME_SANDBOX}
        srcDoc={neuterConceptHrefs(concept.html)}
        title={`${concept.businessName} website concept`}
        referrerPolicy="no-referrer"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
