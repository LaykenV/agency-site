import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  getSiteBaseUrl,
  LEGAL_ENTITY,
  marketingOpenGraph,
  SITE_DESCRIPTION,
  SITE_EMAIL,
  SITE_PHONE,
  VARHOLDT_URL,
} from "@/lib/seo/site";

const title = "Acadiana Web Design | New projects now go through Varholdt Labs";

export const metadata: Metadata = {
  // absolute avoids double-branding from the root title template
  title: { absolute: title },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: marketingOpenGraph({
    title,
    description: SITE_DESCRIPTION,
    url: getSiteBaseUrl(),
  }),
};

/**
 * Website packages are retired. This page tells new visitors where new work
 * goes and gets existing clients to the portal. Old sales routes redirect here.
 */
export default function Home() {
  return (
    <main className="relative w-full">
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-10 pb-12 sm:pt-20 sm:pb-16">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[hsl(var(--foreground))] font-[family-name:var(--font-sora)]">
          An update from Acadiana Web Design
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.08] text-[hsl(var(--foreground))] font-[family-name:var(--font-sora)]">
          New projects now go through Varholdt Labs.
        </h1>
        <p className="mt-6 max-w-[52ch] text-base sm:text-lg leading-relaxed text-[hsl(var(--foreground))] font-[family-name:var(--font-sora)]">
          Acadiana Web Design is no longer taking new website projects. Layken
          now takes on custom software and AI projects as Varholdt Labs.
        </p>
        <div className="mt-8">
          <a
            href={VARHOLDT_URL}
            className="group btn-cta inline-flex items-center gap-2 px-5 py-3 text-base"
          >
            Go to varholdt.com
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      <section
        aria-labelledby="existing-clients"
        className="mx-auto max-w-3xl px-5 sm:px-8 pb-16 sm:pb-24"
      >
        <div className="surface rounded-2xl p-6 sm:p-8 shadow-sm">
          <h2
            id="existing-clients"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] font-[family-name:var(--font-display)]"
          >
            Already a client?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[hsl(var(--foreground))]">
            Nothing changes for you. Your site, hosting, edits, and billing
            continue as they are. Sign in to the client portal to request an
            edit, see your leads, or manage billing.
          </p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/portal"
              className="group btn-cta inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap px-5 py-3"
            >
              Client Portal
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-sm text-[hsl(var(--foreground))]">
              Questions? Email{" "}
              <a className="underline underline-offset-2" href={`mailto:${SITE_EMAIL}`}>
                {SITE_EMAIL}
              </a>{" "}
              or call{" "}
              <a className="underline underline-offset-2 whitespace-nowrap" href={`tel:${SITE_PHONE}`}>
                (337) 306-3705
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <footer className="footer-container pb-6 sm:pb-8">
        <div className="footer-content flex-col gap-3 sm:flex-row sm:justify-between">
          <p className="footer-copyright text-xs sm:text-sm">
            Acadiana Web Design is operated by {LEGAL_ENTITY}.
          </p>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm"
          >
            <Link href="/legal/terms" className="footer-link">
              Terms
            </Link>
            <Link href="/legal/privacy" className="footer-link">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
