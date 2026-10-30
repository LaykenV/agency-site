import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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

const title = "Acadiana Web Design | Website work by Layken Varholdt";

const WEBSITES = [
  {
    name: "All About Towing",
    type: "Towing services",
    url: "https://allabouttowingservice.com/",
    image: "/client-all-about-towin.jpg",
    height: 788,
  },
  {
    name: "TB Tree Service",
    type: "Tree services",
    url: "https://tbtreeservice.org/",
    image: "/client-tb-tree.jpg",
    height: 725,
  },
  {
    name: "Bordelon's Tree Service",
    type: "Tree services",
    url: "https://bordelonstreeremoval.com/",
    image: "/client-bordelons.jpg",
    height: 790,
  },
  {
    name: "Chelsea Social Co.",
    type: "Social media strategy and content",
    url: "https://chelseasoco.com/",
    image: "/client-chelsea-social.jpg",
    height: 788,
  },
] as const;

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

/** Website portfolio and client access. New inquiries go to Varholdt Labs. */
export default function Home() {
  return (
    <main className="relative w-full">
      <aside
        aria-label="Now part of Varholdt Labs"
        className="border-y border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      >
        <p className="mx-auto max-w-7xl px-5 py-4 text-sm leading-relaxed sm:px-8 lg:px-12">
          Acadiana Web Design is now part of Varholdt Labs. New inquiries go
          through{" "}
          <a
            href={VARHOLDT_URL}
            className="font-semibold underline underline-offset-4"
          >
            varholdt.com
          </a>
          . Existing clients keep the same support and portal.
        </p>
      </aside>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-24">
          <div className="max-w-xl">
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-[hsl(var(--hero-foreground))] sm:text-5xl md:text-6xl font-[family-name:var(--font-sora)]">
              <span className="block">Web design.</span>
              <span className="mt-1 block">For Acadiana.</span>
              <span className="mt-1 block font-normal italic text-[hsl(var(--primary))] font-[family-name:var(--font-instrument-serif)]">
                Built by Layken.
              </span>
            </h1>
            <p className="mt-6 max-w-[42ch] text-base leading-relaxed sm:text-lg">
              Websites for Louisiana service businesses, built around the work
              they do. Take a look at the work below. For a new project, find me
              at Varholdt Labs.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a
                href={VARHOLDT_URL}
                className="group btn-cta inline-flex items-center gap-2 px-5 py-3"
              >
                New project? Visit Varholdt Labs
                <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
              </a>
              <a
                href="#work"
                className="font-semibold underline underline-offset-4"
              >
                See the websites
              </a>
            </div>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
            {/* Prebuilt sizes keep the original hero image fast without a cold transform. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/client-tb-tree-1120.webp"
              srcSet="/client-tb-tree-750.webp 750w, /client-tb-tree-1120.webp 1120w"
              alt="TB Tree Service website homepage"
              width={1400}
              height={725}
              sizes="(min-width: 1024px) 560px, 92vw"
              fetchPriority="high"
              className="h-auto w-full"
            />
            <figcaption className="border-t border-[hsl(var(--border))] px-5 py-4 text-sm">
              TB Tree Service{" "}
              <span className="text-[hsl(var(--muted-foreground))]">
                / Website work
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        id="work"
        aria-labelledby="work-heading"
        className="anchor-target bg-[hsl(var(--primary))]/[0.04]"
      >
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <h2
            id="work-heading"
            className="text-3xl font-extrabold tracking-tight sm:text-4xl font-[family-name:var(--font-display)]"
          >
            Websites I built.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed">
            A selection of work from Acadiana Web Design.
          </p>
          <div className="mt-10 space-y-8">
            {WEBSITES.map((site, index) => (
              <article
                key={site.url}
                className="surface-elevated grid items-center gap-6 rounded-3xl p-5 sm:gap-8 sm:p-7 lg:grid-cols-2 lg:p-8"
              >
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${site.name} website (opens in a new tab)`}
                  className={`review-screenshot block rounded-2xl ${index % 2 ? "lg:order-2" : ""}`}
                >
                  <Image
                    src={site.image}
                    alt={`${site.name} website homepage`}
                    width={1400}
                    height={site.height}
                    sizes="(min-width: 1024px) 520px, 92vw"
                    className="h-auto w-full"
                  />
                </a>
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {site.type}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl font-[family-name:var(--font-display)]">
                    {site.name}
                  </h3>
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cta mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm"
                    aria-label={`Visit ${site.name} website (opens in a new tab)`}
                  >
                    Visit site <ArrowUpRight aria-hidden className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="developer-heading"
        className="mx-auto grid max-w-4xl items-center gap-8 px-5 py-16 sm:grid-cols-[auto_1fr] sm:px-8 sm:py-24"
      >
        <Image
          src="/portrait.jpeg"
          alt="Layken Varholdt"
          width={192}
          height={192}
          sizes="192px"
          className="h-48 w-48 rounded-full object-cover object-top"
        />
        <div>
          <h2
            id="developer-heading"
            className="text-3xl font-extrabold tracking-tight sm:text-4xl font-[family-name:var(--font-display)]"
          >
            The developer behind the work.
          </h2>
          <p className="mt-4 leading-relaxed">
            I’m Layken Varholdt, the developer behind Acadiana Web Design. My
            custom software and AI work now lives at Varholdt Labs. If you
            already have a website with me, I’m still your point of contact.
          </p>
          <a
            href={VARHOLDT_URL}
            className="mt-5 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
          >
            Meet Varholdt Labs <ArrowUpRight aria-hidden className="h-4 w-4" />
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
              <a
                className="underline underline-offset-2"
                href={`mailto:${SITE_EMAIL}`}
              >
                {SITE_EMAIL}
              </a>{" "}
              or call{" "}
              <a
                className="underline underline-offset-2 whitespace-nowrap"
                href={`tel:${SITE_PHONE}`}
              >
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
