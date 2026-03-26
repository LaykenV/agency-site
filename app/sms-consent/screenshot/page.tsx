import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Opt-In Screenshot — Acadiana Web Design",
  description:
    "Public reviewer page showing the exact SMS lead notification opt-in UI used in the Acadiana Web Design client portal.",
};

export default function SmsConsentScreenshotPage() {
  return (
    <div className="min-h-dvh w-full bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--primary)]">
            Twilio Reviewer Reference
          </p>
          <h1 className="hero-title mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Public SMS Opt-In Screenshot
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
            This page shows the exact SMS lead notification opt-in interface presented to subscribing
            business owners inside the Acadiana Web Design client portal.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="surface-elevated relative overflow-hidden rounded-[2rem] border border-[var(--border)]/70 p-4 shadow-2xl md:p-6">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[var(--primary)]/15 via-transparent to-[var(--accent)]/15" />

            <div className="relative rounded-[1.5rem] border border-[var(--border)]/70 bg-[var(--card)]/70 p-4 backdrop-blur-xl md:p-6">
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--primary)]">
                    Client Portal
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Project Details</h2>
                </div>
                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Awaiting Assets
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">Domain Preference</label>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    allabouttowing.com
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-[var(--foreground)]">Lead SMS Alerts</label>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      Optional
                    </span>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--foreground)] shadow-inner">
                    +1 (337) 555-1234
                  </div>

                  <div className="rounded-2xl border-2 border-[var(--primary)]/40 bg-[var(--primary)]/8 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.16)]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 border-[var(--primary)] bg-[var(--background)]">
                      </div>
                      <div className="space-y-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                        <p className="font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                          Required For SMS Opt-In
                        </p>
                        <p>
                          I agree to receive SMS lead notifications from Acadiana Web Design at the
                          phone number above. Message frequency varies based on lead volume. Msg &amp;
                          data rates may apply. Reply STOP to opt out. Reply HELP for support.
                          Consent is not a condition of purchase.
                        </p>
                        <p>
                          <Link
                            href="/legal/terms#sms-lead-notifications"
                            className="font-semibold text-[var(--foreground)] underline underline-offset-4"
                          >
                            Terms
                          </Link>
                          {" & "}
                          <Link
                            href="/legal/privacy#sms-notifications"
                            className="font-semibold text-[var(--foreground)] underline underline-offset-4"
                          >
                            Privacy
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    Clients may leave the phone number blank and receive lead notifications only by
                    email.
                  </p>
                </div>

                <div className="space-y-2 opacity-70">
                  <label className="text-sm font-medium text-[var(--foreground)]">Inspiration Links</label>
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    https://example.com, https://example.org
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="surface rounded-3xl border border-[var(--border)]/70 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
                Reviewer Notes
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <li>The checkbox is a separate affirmative action and is not preselected.</li>
                <li>SMS consent is optional and not required to purchase the service.</li>
                <li>The disclosure includes brand identity, message frequency, STOP, HELP, and policy links.</li>
                <li>The recipient is the subscribing business owner, not the website visitor.</li>
              </ul>
            </div>

            <div className="surface rounded-3xl border border-[var(--border)]/70 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">
                Supporting Pages
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <Link href="/sms-consent" className="block text-[var(--foreground)] underline underline-offset-4">
                  SMS Consent Overview
                </Link>
                <Link href="/legal/privacy" className="block text-[var(--foreground)] underline underline-offset-4">
                  Privacy Policy
                </Link>
                <Link href="/legal/terms#sms-lead-notifications" className="block text-[var(--foreground)] underline underline-offset-4">
                  Terms of Service
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)]/70 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/50 p-6 text-sm text-[var(--muted-foreground)]">
              Use this URL in the Twilio campaign submission if the reviewer needs a public reference
              for the gated opt-in flow:
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-xs text-[var(--foreground)]">
                /sms-consent/screenshot
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
