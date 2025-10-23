import Link from "next/link";
import { ONBOARDING_CAL_LINK } from "@/lib/config";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24 flex flex-col gap-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl surface-hero ring-1 ring-[var(--border)]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-[var(--foreground)]">
            Your high‑performance website, managed end‑to‑end
          </h1>
          <p className="mt-5 max-w-2xl text-[var(--muted-foreground)]">
            $0 down, $199/mo. We design, build, host, and handle unlimited edits so you can focus on your business.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              style={{ backgroundImage: "linear-gradient(90deg, var(--brand-teal), var(--brand-amber))" }}
            >
              Get a tailored plan
            </Link>
            <Link
              href={ONBOARDING_CAL_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] transition hover:bg-[color-mix(in_oklch,var(--card),var(--foreground)_5%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              Schedule a call
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="surface-section rounded-2xl ring-1 ring-[var(--border)]">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">Everything included</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">The all‑inclusive plan covers design, development, hosting, and support.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="card-surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Elite performance</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Aim 95+ Lighthouse on modern devices for instant load speeds.</p>
            </div>
            <div className="card-surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Unlimited edits</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Email changes anytime; we update and maintain for you.</p>
            </div>
            <div className="card-surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Reviews widget</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Showcase your Google reviews to build trust and conversions.</p>
            </div>
            <div className="card-surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Managed hosting</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Deployed on Vercel with SSL and best‑practice security.</p>
            </div>
            <div className="card-surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Contact + email</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Standard contact form with email notifications you can rely on.</p>
            </div>
            <div className="card-surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Monthly analytics</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">A simple monthly summary so you always know what’s working.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section>
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">Kind words from clients</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <figure className="card-surface rounded-xl p-6">
              <div className="text-amber-500">★★★★★</div>
              <blockquote className="mt-3 text-[var(--foreground)]">“The new site is blazing fast and our contact leads doubled.”</blockquote>
              <figcaption className="mt-4 text-sm text-[var(--muted-foreground)]">Alex R., Landscaping Owner</figcaption>
            </figure>
            <figure className="card-surface rounded-xl p-6">
              <div className="text-amber-500">★★★★★</div>
              <blockquote className="mt-3 text-[var(--foreground)]">“They handle everything—content edits are same‑day. Huge time saver.”</blockquote>
              <figcaption className="mt-4 text-sm text-[var(--muted-foreground)]">Maya P., Plumbing Services</figcaption>
            </figure>
            <figure className="card-surface rounded-xl p-6">
              <div className="text-amber-500">★★★★★</div>
              <blockquote className="mt-3 text-[var(--foreground)]">“Professional build and great communication. Highly recommend.”</blockquote>
              <figcaption className="mt-4 text-sm text-[var(--muted-foreground)]">Jordan K., Home Renovation</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="surface-section rounded-2xl ring-1 ring-[var(--border)]">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">How it works</h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <li className="card-surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">1. Agreement</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Accept terms in‑app with a simple clickwrap.</p>
            </li>
            <li className="card-surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">2. Payment</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Start your Polar subscription—billing is handled securely.</p>
            </li>
            <li className="card-surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">3. Kickoff</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Schedule the 45‑min kickoff to align on brand and goals.</p>
            </li>
            <li className="card-surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">4. Go live</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">We build, review together, launch, and handle ongoing updates.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="relative overflow-hidden rounded-2xl surface-section ring-1 ring-[var(--border)]">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">$199/mo — The All‑Inclusive Plan</h3>
              <p className="mt-2 text-[var(--muted-foreground)]">$0 down, 12‑month minimum, recurring billing consent included.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                style={{ backgroundImage: "linear-gradient(90deg, var(--brand-teal), var(--brand-amber))" }}
              >
                Start now
              </Link>
              <Link
                href={ONBOARDING_CAL_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] transition hover:bg-[color-mix(in_oklch,var(--card),var(--foreground)_5%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl px-6">
        <div className="flex flex-col items-center justify-between gap-3 py-6 text-sm text-[var(--muted-foreground)] md:flex-row">
          <p>© {new Date().getFullYear()} Your Agency</p>
          <Link href="/legal/terms" className="hover:text-[var(--foreground)]">Terms</Link>
        </div>
      </footer>
    </main>
  );
}
