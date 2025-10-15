//import { useMutation, useQuery } from "convex/react";
//import { api } from "../convex/_generated/api";
//import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <header
        className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--secondary)]">
            Convex × Next.js
          </span>
          <AnimatedThemeToggler />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <section className="grid gap-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-xs font-medium text-[var(--secondary)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden />
              <span>Build-ready brief in under 2 minutes</span>
            </div>
            <h1 className="text-4xl font-semibold text-[var(--foreground)] md:text-5xl">
              The quality of a creative agency, delivered at AI speed.
            </h1>
            <p className="text-base leading-relaxed text-[var(--secondary)] md:text-lg">
              Start with a guided intake designed for busy founders. Answer a handful of
              plain-language questions, and we&apos;ll turn your ideas into a tailored build plan.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Get started
              </Link>
              <a
                href="#theme-preview"
                className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                Preview the theme
              </a>
            </div>
            <ul className="grid gap-3 text-sm text-[var(--secondary)] md:grid-cols-2">
              <li className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                Step-by-step onboarding that autosaves as you go.
              </li>
              <li className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                Personalised tier recommendations powered by AI (coming soon).
              </li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--background)] p-8 shadow-lg shadow-black/5">
            <div className="absolute left-6 top-6 h-12 w-12 rounded-2xl bg-[var(--accent)]/20" aria-hidden />
            <div className="relative flex flex-col gap-4 text-sm">
              <span className="text-xs uppercase tracking-wide text-[var(--secondary)]">
                The first screen you&apos;ll see
              </span>
              <p className="text-lg font-medium text-[var(--foreground)]">
                “Describe your business in one line so we can tailor the build.”
              </p>
              <p className="text-[var(--secondary)]">
                We capture the essentials up front and defer the heavy lifts until after checkout.
              </p>
              <div className="rounded-2xl bg-[var(--muted)] p-4 text-[var(--foreground)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-[var(--secondary)]">
                    Progress
                  </span>
                  <span className="text-xs text-[var(--secondary)]">Step 1 of 4</span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--background)]">
                  <div className="h-full w-1/4 rounded-full bg-[var(--primary)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="theme-preview" className="flex flex-col gap-6">
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
    </>
  );
}
