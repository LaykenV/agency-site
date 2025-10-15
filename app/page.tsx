import Link from "next/link";

export default function Home() {
  return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <section className="flex justify-center">
          <Link
            href="/onboarding"
            className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Get started
          </Link>
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
