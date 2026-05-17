import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Phone, Sparkles, Star } from "lucide-react";
import { PublicAuditForm } from "./PublicAuditForm";

export const metadata: Metadata = {
  title: "Your Website Audit",
  description:
    "A private, one-page audit of your website — mobile speed, trust signals, and conversion notes. Built by Layken at Acadiana Web Design.",
  alternates: { canonical: "/audit" },
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    n: "01",
    title: "Drop your URL",
    body: "Just the homepage. I do not need a login, an email, or your business name.",
  },
  {
    n: "02",
    title: "I scan it the way Google does",
    body: "Mobile speed, layout shift, HTTPS, meta tags, the platform you are built on, the works.",
  },
  {
    n: "03",
    title: "You get a private report link",
    body: "One page. No signup. Read it on the toilet. Send it to whoever runs your site.",
  },
];

export default function PublicAuditPage() {
  return (
    <main className="relative w-full flex flex-col">
      {/* Brand backdrop — extends UP past the top of <main> so the gradient
          bleeds behind the global header (same trick the home page uses).
          IMPORTANT: do not add `isolate` or `overflow-hidden` to <main> or
          the negative top offset will get clipped. */}
      <div
        aria-hidden
        className="page-gradient pointer-events-none absolute inset-x-0 -top-16 md:-top-20 -z-10 h-[120vh] sm:h-[110vh] md:h-[100vh]"
      />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-8 pb-16 sm:px-8 sm:pt-12 sm:pb-20 lg:px-12 lg:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          {/* LEFT — copy + form. White-on-gradient treatment to match the
              homepage hero (header is white on the same gradient). */}
          <div className="max-w-xl">
            <h1 className="font-[family-name:var(--font-sora)] text-[2.5rem] font-black leading-[1.04] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              <span className="hero-title block text-[hsl(var(--primary-foreground))]">
                Thanks for scanning.
              </span>
              <span className="mt-1 block text-[hsl(var(--primary-foreground))]/80">
                Here is the actual{" "}
                <span className="font-[family-name:var(--font-instrument-serif)] text-[1.15em] font-normal italic text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,68%)]">
                  audit
                </span>{" "}
                I promised.
              </span>
            </h1>

            <p className="mt-5 max-w-[44ch] font-[family-name:var(--font-sora)] text-base leading-relaxed text-[hsl(var(--primary-foreground))]/80 sm:text-lg">
              Drop your URL and I will pull the same mobile speed and conversion
              signals Google uses to rank local service businesses. Private
              link, no signup, no follow-up sequence.
            </p>

            <PublicAuditForm />
          </div>

          {/* RIGHT — the calling card. Hidden on phones because the user is
              literally holding the physical card; show on tablet+ for desktop
              visitors who landed via shared link. */}
          <div className="relative mx-auto hidden w-full max-w-md md:block lg:mx-0">
            {/* glow */}
            <div
              aria-hidden
              className="absolute -inset-10 -z-10 rounded-[2.5rem] opacity-60 blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at 70% 30%, hsl(var(--primary) / 0.28), transparent 70%), radial-gradient(ellipse at 30% 80%, hsl(var(--primary) / 0.14), transparent 70%)",
              }}
            />

            <article
              className="relative overflow-hidden rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.45),0_12px_30px_-20px_rgba(0,0,0,0.25)]"
              style={{
                transform: "rotate(-1.2deg)",
              }}
            >
              {/* Perforated top — receipt/ticket nod */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1.5"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 8px 0, hsl(var(--background)) 4px, transparent 4.5px)",
                  backgroundSize: "16px 8px",
                  backgroundRepeat: "repeat-x",
                }}
              />

              <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 pt-6 pb-4">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/logo.png"
                    alt="Acadiana Web Design"
                    width={32}
                    height={32}
                    className="rounded-md"
                  />
                  <div className="leading-tight">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                      Founder
                    </div>
                    <div className="font-[family-name:var(--font-sora)] text-sm font-bold text-[var(--foreground)]">
                      Layken Varholdt
                    </div>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  No. 0337
                </div>
              </header>

              <div className="px-6 pt-5 pb-2">
                <p className="font-[family-name:var(--font-instrument-serif)] text-2xl italic leading-snug text-[var(--foreground)]">
                  &ldquo;Fast, honest websites for local service
                  pros&mdash;built by hand in Acadiana.&rdquo;
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-px bg-[hsl(var(--border))] text-sm">
                <div className="bg-[hsl(var(--card))] px-6 py-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Based in
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                    <MapPin className="size-3.5 text-[hsl(var(--primary))]" />
                    Youngsville, LA
                  </dd>
                </div>
                <div className="bg-[hsl(var(--card))] px-6 py-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    Direct
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                    <Phone className="size-3.5 text-[hsl(var(--primary))]" />
                    <a
                      href="tel:+13373063705"
                      className="hover:text-[hsl(var(--primary))]"
                    >
                      (337) 306-3705
                    </a>
                  </dd>
                </div>
                <div className="col-span-2 bg-[hsl(var(--card))] px-6 py-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    What you get if you sign on
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[var(--foreground)]">
                    <span className="font-[family-name:var(--font-instrument-serif)] text-3xl italic leading-none text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,68%)]">
                      $199/mo
                    </span>
                    <span className="text-sm">
                      hand-coded site, $0 down, unlimited edits, hosting +
                      SSL included.
                    </span>
                  </dd>
                </div>
              </dl>

              <footer className="flex items-center justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-6 py-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-3.5 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    />
                  ))}
                  <span className="ml-1 text-[11px] font-semibold text-[var(--foreground)]">
                    5.0 from every client
                  </span>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-[hsl(var(--primary))]"
                >
                  acadianawebdesign.com
                  <ArrowUpRight className="size-3" />
                </Link>
              </footer>

              {/* Perforated bottom */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1.5"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 8px 100%, hsl(var(--background)) 4px, transparent 4.5px)",
                  backgroundSize: "16px 8px",
                  backgroundRepeat: "repeat-x",
                }}
              />
            </article>

            {/* Floating sparkles — playful, not noisy */}
            <Sparkles
              aria-hidden
              className="absolute -right-4 -top-4 size-6 text-[hsl(var(--primary))]"
            />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12">
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
            How it{" "}
            <span className="font-[family-name:var(--font-instrument-serif)] font-normal italic text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,68%)]">
              works
            </span>
          </h2>
          <p className="hidden text-sm text-[var(--muted-foreground)] sm:block">
            Under a minute, start to finish.
          </p>
        </div>

        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="surface relative overflow-hidden p-5"
            >
              <div className="font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tighter text-[hsl(var(--primary))]/12">
                {step.n}
              </div>
              <h3 className="-mt-6 font-[family-name:var(--font-sora)] text-base font-bold text-[var(--foreground)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Closing strip ────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8 lg:px-12">
        <div className="surface-elevated relative overflow-hidden rounded-2xl p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 70%)",
            }}
          />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1.4fr_auto]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                After the audit
              </p>
              <p className="mt-2 max-w-2xl font-[family-name:var(--font-sora)] text-lg font-semibold leading-snug text-[var(--foreground)] sm:text-xl">
                If anything in the report looks worth fixing, the rest of the
                site walks through what I would build instead &mdash;{" "}
                <span className="font-[family-name:var(--font-instrument-serif)] italic font-normal text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,68%)]">
                  no obligation
                </span>
                .
              </p>
            </div>
            <Link
              href="/"
              className="btn-cta inline-flex items-center justify-center gap-2 self-start px-5 py-3 text-sm font-bold sm:self-center"
            >
              See what I build
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
