import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Quote } from "lucide-react";
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
    name: "Bordelon's Tree Service",
    type: "Tree services",
    url: "https://bordelonstreeremoval.com/",
    image: "/client-bordelons.jpg",
    height: 790,
    quote:
      "They made the whole process easy and our new site looks clean and professional. We have already had customers mention they found us online and loved how simple it is to use.",
  },
  {
    name: "All About Towing",
    type: "Towing services",
    url: "https://allabouttowingservice.com/",
    image: "/client-all-about-towin.jpg",
    height: 788,
  },
  {
    name: "Chelsea Social Co.",
    type: "Social media strategy and content",
    url: "https://chelseasoco.com/",
    image: "/client-chelsea-social.jpg",
    height: 788,
    quote:
      "He is very thorough and included every detail I asked for. The client portal is easy to use, I can manage all of my leads and view my analytics with ease.",
  },
] as const;

const CONTAINER = "mx-auto max-w-7xl px-5 sm:px-8 lg:px-12";

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
      <div
        aria-hidden
        className="page-gradient pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[120vh] sm:h-[110vh] md:-top-20 md:h-[100vh]"
      />
      {/* Light mode only: a deeper wash keeps the white headline readable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[560px] bg-gradient-to-b from-[hsl(var(--primary))]/40 to-transparent md:-top-20 dark:hidden"
      />

      <section className={CONTAINER}>
        <div className="grid items-center gap-10 pt-8 pb-16 sm:pt-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pt-16 lg:pb-24">
          <div className="max-w-xl">
            <h1 className="hero-title text-4xl font-black leading-[1.08] tracking-tight text-[hsl(var(--primary-foreground))] sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-[4rem] font-[family-name:var(--font-sora)]">
              <span className="block">Web design.</span>
              <span className="mt-1 block">For Acadiana.</span>
              <span className="mt-1 block font-normal italic text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,65%)] font-[family-name:var(--font-instrument-serif)]">
                Built by Layken.
              </span>
            </h1>
            <p className="mt-6 max-w-[42ch] text-base leading-relaxed text-[hsl(var(--hero-foreground))] sm:text-lg dark:text-[hsl(var(--primary-foreground))]/90 font-[family-name:var(--font-sora)]">
              Websites for Louisiana service businesses, built around the work
              they do. New projects now go through Varholdt Labs.
            </p>
            <a
              href={VARHOLDT_URL}
              className="schedule-call-btn mt-8 inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-7 py-3.5 text-sm font-bold sm:text-base font-[family-name:var(--font-sora)]"
            >
              Visit Varholdt Labs
              <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
            </a>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
            <a
              href="https://tbtreeservice.org/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit TB Tree Service website (opens in a new tab)"
              className="block"
            >
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
            </a>
            <figcaption className="border-t border-[hsl(var(--border))] px-5 py-3 text-sm">
              <span className="font-semibold">TB Tree Service</span>{" "}
              <span className="text-[hsl(var(--muted-foreground))]">
                / Tree services in Central Louisiana
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        id="work"
        aria-labelledby="work-heading"
        className="anchor-target"
      >
        <div className={`${CONTAINER} py-14 sm:py-20`}>
          <h2
            id="work-heading"
            className="text-3xl font-extrabold tracking-tight sm:text-4xl font-[family-name:var(--font-display)]"
          >
            Websites I built.
          </h2>
          <div className="mt-10 space-y-8">
            {WEBSITES.map((site, index) => (
              <article
                key={site.url}
                className="surface-elevated grid items-center gap-6 rounded-3xl p-5 sm:gap-8 sm:p-7 lg:grid-cols-2 lg:gap-12 lg:p-8"
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
                    sizes="(min-width: 1024px) 560px, 92vw"
                    className="h-auto w-full"
                  />
                </a>
                <div>
                  {"quote" in site ? (
                    <>
                      <Quote
                        aria-hidden
                        className="h-8 w-8 text-[hsl(var(--primary))]/25"
                      />
                      <blockquote className="mt-3 text-xl font-extrabold leading-[1.25] tracking-tight sm:text-2xl font-[family-name:var(--font-display)]">
                        &ldquo;{site.quote}&rdquo;
                      </blockquote>
                      <h3 className="mt-5 text-sm font-normal">
                        <span className="font-semibold">{site.name}</span>{" "}
                        <span className="text-[hsl(var(--muted-foreground))]">
                          / {site.type}
                        </span>
                      </h3>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {site.type}
                      </p>
                      <h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl font-[family-name:var(--font-display)]">
                        {site.name}
                      </h3>
                    </>
                  )}
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-cta mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm"
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

      <div
        className={`${CONTAINER} grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16`}
      >
        <section
          aria-labelledby="developer-heading"
          className="grid items-center gap-6 sm:grid-cols-[auto_1fr] sm:gap-8"
        >
          <Image
            src="/portrait.jpeg"
            alt="Layken Varholdt"
            width={160}
            height={160}
            sizes="160px"
            className="h-40 w-40 rounded-full object-cover object-top"
          />
          <div>
            <h2
              id="developer-heading"
              className="text-2xl font-extrabold tracking-tight sm:text-3xl font-[family-name:var(--font-display)]"
            >
              The developer behind the work.
            </h2>
            <p className="mt-3 leading-relaxed">
              I’m Layken Varholdt. I built these sites as Acadiana Web Design,
              and my custom software and AI work now lives at Varholdt Labs.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="existing-clients"
          className="surface rounded-2xl p-6 shadow-sm sm:p-8"
        >
          <h2
            id="existing-clients"
            className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))] sm:text-3xl font-[family-name:var(--font-display)]"
          >
            Already a client?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[hsl(var(--foreground))]">
            Nothing changes for you. Your site, hosting, edits, and billing
            continue as they are, and I’m still your point of contact.
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
              Or email{" "}
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
        </section>
      </div>

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
