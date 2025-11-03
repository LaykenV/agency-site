import Link from "next/link";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import StarRating from "@/components/star-rating";

export default function Home() {
  return (
    <main className="w-full flex flex-col">
      {/* Hero */}
      <section id="hero" className="anchor-target relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-3">
              <StarRating />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">Built for 5‑star local businesses with 4.5+ Google ratings.</p>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight">Your 5‑Star Reputation Deserves a 5‑Star Website</h1>
            <p className="mt-5 max-w-[60ch] text-[var(--muted-foreground)]">We design, build, host, and maintain a lightning‑fast professional website—and handle unlimited edits—for one simple monthly price.</p>
            <div className="mt-5 offer-bar">
              <span>$0 down</span><span>•</span><span>$199/mo</span><span>•</span><span>12‑month minimum</span><span>•</span><span>72‑hour go‑live from build</span>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding?utm_source=lp&cta=hero" className="btn-cta inline-flex items-center gap-2 px-6 py-3">
                Start for $0
              </Link>
              <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-soft inline-flex items-center gap-2 px-6 py-3">
                Book a 15‑min Call
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
              <span className="badge">95+ PageSpeed target</span>
              <span className="badge">Managed on Vercel with SSL</span>
              <span className="badge">Unlimited edits via email</span>
              <span className="badge">Powered by Next.js</span>
            </div>
          </div>
          <div className="relative">
            <div className="device-stack">
              <div className="device-frame device-frame--laptop" />
              <div className="device-frame device-frame--mobile glow-primary" />
            </div>
          </div>
        </div>
        <div className="beams-overlay" aria-hidden />
        <span className="sr-only">Hero background illustration</span>
        <span className="sr-only">Device mockups are decorative</span>
      </section>

      {/* Local Trust Strip */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-8 md:py-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">Trusted by local service pros</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <span className="badge">Plumbing</span>
            <span className="badge">Landscaping</span>
            <span className="badge">Painting</span>
            <span className="badge">Consulting</span>
            <span className="badge">Home Services</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <span className="text-amber-500" aria-hidden>★★★★★</span>
            <span className="text-[var(--muted-foreground)]">Clients love the unlimited edits.</span>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">Your Reputation Is 5‑Star. Your Website Is Holding You Back.</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="surface rounded-xl p-6">
              <ul className="list-disc pl-5 space-y-2 text-[var(--muted-foreground)]">
                <li>Slow or DIY site costs you calls—especially on mobile</li>
                <li>Outdated look hides your great reviews</li>
                <li>No one to email when you need changes</li>
              </ul>
            </div>
            <div className="surface rounded-xl p-6 glow-amber">
              <h3 className="font-semibold">The All‑Inclusive Plan: $0 Down, $199/mo</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">We hand‑build a fast, mobile‑first site, include hosting/SSL/domain, and stay on call for unlimited edits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What’s Included */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">Everything You Need. Nothing You Don’t.</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">One plan. Zero surprises. You email; we ship.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Custom 7‑page website</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Designed to convert for your local service business.</p>
            </div>
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Elite performance</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">95+ PageSpeed target on modern devices.</p>
            </div>
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Managed hosting + SSL</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Deployed on Vercel with best‑practice security.</p>
            </div>
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Domain included</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">We include and manage it while you’re subscribed.</p>
            </div>
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Google Reviews widget</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Showcase your great reputation on your site.</p>
            </div>
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Contact form + email alerts</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Reliable notifications for new leads.</p>
            </div>
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Unlimited edits via email</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Send changes anytime; we update and maintain.</p>
            </div>
            <div className="surface rounded-xl p-6 transition">
              <h3 className="font-semibold">Monthly analytics summary</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Simple, actionable insights each month.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Speed & Performance Proof */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">Fast Sites Convert More Calls</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center">
            <div className="flex items-center gap-6">
              <div className="gauge" style={{ ["--value" as any]: 95 }}>
                <div className="gauge-badge">95+</div>
              </div>
              <div>
                <div className="stat-pill">
                  <div className="stat-pill-label">Before</div>
                  <div className="stat-pill-value">3.9s</div>
                </div>
                <div className="mt-2 stat-pill">
                  <div className="stat-pill-label">After</div>
                  <div className="stat-pill-value">0.9s</div>
                </div>
              </div>
            </div>
            <ul className="space-y-2 text-[var(--muted-foreground)]">
              <li>Google prioritizes fast, mobile‑first experiences</li>
              <li>Fewer bounces, more calls and form fills</li>
              <li>Built with modern best practices</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Showcase (Before/After) */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">See the Difference</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <figure className="surface rounded-xl p-4">
              <figcaption className="mb-3 text-sm text-[var(--muted-foreground)]">Landscaper in Austin</figcaption>
              <div className="before-after">
                <img src="/showcase-1-before.jpg" alt="Before redesign" width={1200} height={720} loading="lazy" />
                <div className="before-after__after" aria-hidden>
                  <img src="/showcase-1-after.jpg" alt="" />
                </div>
              </div>
            </figure>
            <figure className="surface rounded-xl p-4">
              <figcaption className="mb-3 text-sm text-[var(--muted-foreground)]">Plumber in Round Rock</figcaption>
              <div className="before-after">
                <img src="/showcase-2-before.jpg" alt="Before redesign" width={1200} height={720} loading="lazy" />
                <div className="before-after__after" aria-hidden>
                  <img src="/showcase-2-after.jpg" alt="" />
                </div>
              </div>
            </figure>
            <figure className="surface rounded-xl p-4">
              <figcaption className="mb-3 text-sm text-[var(--muted-foreground)]">Home Renovation</figcaption>
              <div className="before-after">
                <img src="/showcase-3-before.jpg" alt="Before redesign" width={1200} height={720} loading="lazy" />
                <div className="before-after__after" aria-hidden>
                  <img src="/showcase-3-after.jpg" alt="" />
                </div>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">Trusted by Local Businesses Like Yours</h2>
          <div className="mt-8 flex justify-center">
            <StarRating />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <figure className="surface rounded-xl p-6">
              <div className="text-amber-500" aria-hidden>★★★★★</div>
              <blockquote className="mt-3 text-[var(--foreground)]">“They launched in 3 days and updates are an email away.”</blockquote>
              <figcaption className="mt-4 text-sm text-[var(--muted-foreground)]">Alex R., Landscaping Owner</figcaption>
            </figure>
            <figure className="surface rounded-xl p-6">
              <div className="text-amber-500" aria-hidden>★★★★★</div>
              <blockquote className="mt-3 text-[var(--foreground)]">“Fast, professional build. Our phone calls picked up immediately.”</blockquote>
              <figcaption className="mt-4 text-sm text-[var(--muted-foreground)]">Maya P., Plumbing Services</figcaption>
            </figure>
            <figure className="surface rounded-xl p-6">
              <div className="text-amber-500" aria-hidden>★★★★★</div>
              <blockquote className="mt-3 text-[var(--foreground)]">“We email changes and they ship the same day. Couldn’t be easier.”</blockquote>
              <figcaption className="mt-4 text-sm text-[var(--muted-foreground)]">Jordan K., Home Renovation</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="anchor-target">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">From Sign‑Up to Live in 4 Simple Steps</h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <li className="surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">1) Start for $0</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Accept terms on our onboarding page and subscribe securely.</p>
            </li>
            <li className="surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">2) Kickoff</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Share details, brand colors, and inspiration; upload assets.</p>
            </li>
            <li className="surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">3) Build Stage</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">We begin your build—your site goes live within 72 hours from this point.</p>
            </li>
            <li className="surface rounded-xl p-6">
              <div className="text-sm font-semibold text-[var(--muted-foreground)]">4) Review & Ongoing Support</div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">You review; we launch and handle unlimited edits via email.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className="anchor-target">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">FAQs</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <details className="surface rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">What does "unlimited edits" include?</summary>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Non‑material updates like text, photos, hours, banners, sections, and minor layout tweaks. Fair, reasonable use; larger redesigns are scoped separately.</p>
            </details>
            <details className="surface rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">How fast can we launch?</summary>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Once we enter the build stage, we go live within 72 hours. The build stage begins after kickoff and assets are received.</p>
            </details>
            <details className="surface rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">Do I keep my domain?</summary>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">We include and manage it while subscribed. After the minimum term and if your account is in good standing, we can transfer per Terms.</p>
            </details>
            <details className="surface rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">Who owns the website?</summary>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">You own your original content. We license the implementation during the term. See Terms for details.</p>
            </details>
            <details className="surface rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">I already pay for hosting—do I still need it?</summary>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Hosting, SSL, and management are included to ensure speed, security, and simplicity.</p>
            </details>
            <details className="surface rounded-xl p-6">
              <summary className="font-semibold cursor-pointer">How do I cancel?</summary>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Contact support. During months 1–12, the early termination policy applies. After 12 months, cancel any month before renewal.</p>
            </details>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="anchor-target relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">The All‑Inclusive Plan — $0 down, then $199/month — 12‑month minimum</h3>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Includes: custom site, hosting + SSL, domain, unlimited edits, reviews widget, analytics. Service speed note: Go live within 72 hours once we start your build.
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                12‑month minimum commitment. Renews monthly thereafter until canceled. Early termination policy applies. See <Link href="/legal/terms" className="underline">Terms</Link>.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding?utm_source=lp&cta=pricing" className="btn-cta inline-flex items-center gap-2 px-6 py-3">
                Start for $0
              </Link>
              <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-soft inline-flex items-center gap-2 px-6 py-3">
                Book a 15‑min Call
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold text-[var(--foreground)]">Launch Your 5‑Star Website</h3>
              <p className="mt-2 text-[var(--muted-foreground)]">$0 down • $199/mo • Unlimited edits • 72‑hour go‑live from build</p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">Limited spots per city each month to ensure fast turnaround. Reserve yours.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding?utm_source=lp&cta=final" className="btn-cta inline-flex items-center gap-2 px-6 py-3">
                Start for $0
              </Link>
              <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-soft inline-flex items-center gap-2 px-6 py-3">
                Book a 15‑min Call
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
