import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Consent — Acadiana Web Design",
  description:
    "Learn how Acadiana Web Design clients consent to receive SMS lead notifications as part of their Website-as-a-Service subscription.",
};

export default function SmsConsentPage() {
  return (
    <div className="min-h-dvh w-full bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-24">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="hero-title mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            SMS Lead Notifications
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
            How Acadiana Web Design clients receive and consent to SMS lead notifications.
          </p>
        </div>

        <article className="surface-elevated relative rounded-3xl p-8 glow-primary md:p-12">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)]/30 to-transparent opacity-50" />

          <div className="space-y-12">
            {/* What Are SMS Lead Notifications */}
            <section>
              <h2 className="heading-gradient-soft text-2xl font-bold tracking-tight md:text-3xl">
                What Are SMS Lead Notifications?
              </h2>
              <div className="mt-6 space-y-4 text-[var(--muted-foreground)]">
                <p>
                  When someone submits a contact form on a client&apos;s website, Acadiana Web Design sends the
                  business owner an SMS message with the lead&apos;s details so they can follow up quickly.
                </p>
                <p>
                  Only the subscribing business owner receives these messages — we never send SMS to the
                  website visitor or any third party.
                </p>
              </div>
              <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
            </section>

            {/* How Clients Consent */}
            <section>
              <h2 className="heading-gradient-soft text-2xl font-bold tracking-tight md:text-3xl">
                How Clients Consent
              </h2>
              <div className="mt-6 space-y-4 text-[var(--muted-foreground)]">
                <p>
                  Business owners subscribe to SMS lead notifications when they sign up for our
                  Website-as-a-Service plan. During the onboarding process, clients provide their phone
                  number through our client portal and explicitly agree to receive SMS notifications when
                  new leads submit a contact form on their website.
                </p>
                <p>
                  Consent is not a condition of purchase. Clients may use the service without providing a
                  phone number and will still receive lead notifications via email.
                </p>
              </div>
              <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
            </section>

            {/* Consent Disclosure */}
            <section>
              <h2 className="heading-gradient-soft text-2xl font-bold tracking-tight md:text-3xl">
                SMS Consent Disclosure
              </h2>
              <div className="mt-6">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    When clients provide their phone number, they see the following disclosure:
                  </p>
                  <blockquote className="mt-4 rounded-xl border-l-4 border-[var(--primary)] bg-[var(--muted)]/50 p-4 text-sm italic text-[var(--muted-foreground)]">
                    &ldquo;By providing your phone number, you agree to receive SMS lead notifications from
                    Acadiana Web Design. Message frequency varies based on lead volume. Msg &amp; data
                    rates may apply. Reply STOP to opt out. Reply HELP for support. Terms &amp; Privacy.&rdquo;
                  </blockquote>
                </div>
              </div>
              <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
            </section>

            {/* Example Message */}
            <section>
              <h2 className="heading-gradient-soft text-2xl font-bold tracking-tight md:text-3xl">
                Example Message
              </h2>
              <div className="mt-6">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 font-mono text-sm leading-relaxed text-[var(--muted-foreground)]">
                  <p>New lead for All About Towing</p>
                  <p>Name: John Smith</p>
                  <p>Email: john@example.com</p>
                  <p>Phone: (337) 555-1234</p>
                  <p>Message: I need a tow truck at 123 Main St.</p>
                  <p className="mt-2">Reply to this lead ASAP for the best chance of closing.</p>
                </div>
              </div>
              <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
            </section>

            {/* Key Details */}
            <section>
              <h2 className="heading-gradient-soft text-2xl font-bold tracking-tight md:text-3xl">
                Key Details
              </h2>
              <div className="mt-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Brand", value: "Acadiana Web Design" },
                    { label: "Message Frequency", value: "Varies (one per lead submission)" },
                    { label: "Opt-Out", value: "Reply STOP to any message" },
                    { label: "Help", value: "Reply HELP or email support" },
                  ].map((item) => (
                    <div key={item.label} className="surface relative overflow-hidden rounded-xl p-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-[var(--card)] to-[var(--accent)]/10 opacity-100" />
                      <div className="relative z-10">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                          {item.label}
                        </dt>
                        <dd className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                          {item.value}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
                <p className="mt-6 text-sm text-[var(--muted-foreground)]">
                  Message and data rates may apply depending on your mobile carrier and plan.
                </p>
              </div>
              <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent opacity-50" />
            </section>

            {/* Data & Privacy */}
            <section>
              <h2 className="heading-gradient-soft text-2xl font-bold tracking-tight md:text-3xl">
                Data & Privacy
              </h2>
              <div className="mt-6 space-y-4 text-[var(--muted-foreground)]">
                <ul className="ml-4 list-disc space-y-2 pl-2 marker:text-[var(--primary)]">
                  <li className="pl-2">Your phone number is stored securely and used only for lead notifications.</li>
                  <li className="pl-2">We do not sell, rent, or share your phone number with third parties for marketing purposes.</li>
                  <li className="pl-2">Your phone number is not shared with third parties.</li>
                  <li className="pl-2">SMS messages are delivered via Twilio.</li>
                </ul>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer className="mt-16 rounded-2xl border border-[var(--border)]/60 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/50 p-6 md:p-8">
            <div className="flex flex-col gap-4 text-sm text-[var(--muted-foreground)]">
              <p>
                For full details, see our{" "}
                <Link href="/legal/terms#sms-lead-notifications" className="font-medium text-[var(--primary)] hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="font-medium text-[var(--primary)] hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <p>
                Questions? Contact us at{" "}
                <a href="mailto:support@acadianawebdesign.com" className="font-medium text-[var(--primary)] hover:underline">
                  support@acadianawebdesign.com
                </a>
                .
              </p>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
