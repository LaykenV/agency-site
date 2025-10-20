import Link from "next/link";
import { ONBOARDING_CAL_LINK } from "@/lib/config";

export default function Home() {
  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <section className="flex justify-center">
          <div className="flex gap-2">
          <Link
            href="/onboarding"
            className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Get a tailored plan
          </Link>
          <Link
            href={ONBOARDING_CAL_LINK}
            className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Schedule a call
          </Link>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">
            Our Location
          </h2>
          <div className="flex justify-center">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3450.534085732959!2d-92.01524892404248!3d30.13614287487748!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x86249c1b10251323%3A0xf38d76ace814326d!2sPelican%20Roofing%20Company!5e0!3m2!1sen!2sus!4v1760762960557!5m2!1sen!2sus" 
              width="400" 
              height="300" 
              style={{border: 0}} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg"
            />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">
            Customer Reviews
          </h2>
          <div className="flex justify-center">
            <iframe 
              src="https://widgets.sociablekit.com/google-reviews/iframe/25611541" 
              frameBorder="0" 
              width="100%" 
              height="1000"
              className="rounded-lg"
            />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">
            Theme palette preview
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-6 text-[var(--foreground)]">
              <h3 className="text-lg font-semibold">Background &amp; Foreground</h3>
              <p className="mt-2 text-sm text-[var(--secondary)]">
                Core surfaces keep things legible in both light and dark mode.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--primary)] p-6 text-white">
              <h3 className="text-lg font-semibold">Primary</h3>
              <p className="mt-2 text-sm opacity-80">
                Primary actions and highlights live here—like the onboarding CTA.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-6 text-white">
              <h3 className="text-lg font-semibold">Secondary</h3>
              <p className="mt-2 text-sm opacity-80">
                Supporting text and UI affordances use the secondary palette.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)] p-6 text-white">
              <h3 className="text-lg font-semibold">Accent</h3>
              <p className="mt-2 text-sm opacity-80">
                Reserved for celebratory or attention-grabbing UI states.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 text-[var(--foreground)]">
              <h3 className="text-lg font-semibold">Borders</h3>
              <p className="mt-2 text-sm text-[var(--secondary)]">
                Neutral strokes ensure components feel cohesive across themes.
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--secondary)]">
            Toggle the theme in the header to preview the animated transition.
          </p>
        </section>
      </main>
  );
}
