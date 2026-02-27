"use client";

import Image from "next/image";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { ShinyLink } from "@/components/ui/shiny-button";
import {
  Star,
  Shield,
} from "lucide-react";
import {
  LazyMotion,
  domAnimation,
  MotionConfig,
  m as motion,
} from "framer-motion";
import { motionDefaults, fadeUp } from "@/components/animations";

/* ─────────────────────────────────────────────
   VARIANT 3 — "Cinematic Full-Bleed"
   Font: Instrument Serif — elegant editorial serif,
   dramatic at large optical sizes.
   Full-viewport hero with giant text,
   wide-aspect screenshot below, and
   glowing accent lines framing the content.
   Uses the page-gradient system for light/dark.
   ───────────────────────────────────────────── */

export default function HeroVariant3() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig transition={motionDefaults.transition}>
        <main className="w-full flex flex-col relative">
          {/* ── Full-bleed hero section ── */}
          <section className="relative min-h-screen flex flex-col">
            {/* Page gradient — same system as homepage */}
            <div aria-hidden className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[120vh] sm:h-[110vh] md:h-[100vh] pointer-events-none" />

            {/* Horizontal accent line under header */}
            <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary-foreground))]/40 to-transparent" />

            {/* Vertical accent lines */}
            <div aria-hidden className="absolute top-0 bottom-0 left-[8%] w-px hidden lg:block" style={{ background: "linear-gradient(to bottom, hsl(var(--primary-foreground) / 0.30) 0%, hsl(var(--primary-foreground) / 0.12) 40%, transparent 70%)" }} />
            <div aria-hidden className="absolute top-0 bottom-0 right-[8%] w-px hidden lg:block" style={{ background: "linear-gradient(to bottom, hsl(var(--primary-foreground) / 0.30) 0%, hsl(var(--primary-foreground) / 0.12) 40%, transparent 70%)" }} />

            {/* Noise */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-center mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12 pt-8 sm:pt-16 pb-10">
              {/* Giant headline — Instrument Serif */}
              <motion.h1
                className="font-[family-name:var(--font-instrument-serif)]"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.5rem] font-normal tracking-[-0.02em] leading-[0.95] text-[hsl(var(--primary-foreground))] hero-title">
                  One website.
                </span>
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.5rem] font-normal tracking-[-0.02em] leading-[0.95] text-[hsl(var(--primary-foreground))]/70 mt-1 sm:mt-2 hero-title">
                  One monthly fee.
                </span>
                <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.5rem] italic tracking-[-0.02em] leading-[0.95] text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,65%)] mt-1 sm:mt-2">
                  Zero headaches.
                </span>
              </motion.h1>

              {/* Sub copy + CTA row side by side on desktop */}
              <div className="mt-6 sm:mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-12">
                <motion.p
                  className="text-base sm:text-lg text-[hsl(var(--primary-foreground))]/70 leading-relaxed max-w-[44ch]"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.35 }}
                >
                  We hand-code fast, professional websites for local service businesses.
                  Hosting, SSL, edits, and support — all included for{" "}
                  <span className="font-[family-name:var(--font-instrument-serif)] italic text-2xl sm:text-3xl text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,65%)] leading-none align-baseline">$199/mo</span>.
                </motion.p>

                <motion.div
                  className="shrink-0"
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.5 }}
                >
                  <ShinyLink
                    href={ONBOARDING_CAL_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="schedule-call-btn inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-bold whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Schedule 15-Min Call
                  </ShinyLink>
                </motion.div>
              </div>

              {/* Trust row */}
              <motion.div
                className="mt-8 sm:mt-10 flex flex-wrap gap-2.5 text-sm font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.65 }}
              >
                <span className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 backdrop-blur-md px-3.5 py-2 text-[var(--foreground)] shadow-sm whitespace-nowrap cursor-default">
                  <Shield className="h-4 w-4 text-[hsl(var(--brand-amber))]" />
                  Veteran Owned
                </span>
                <span className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 backdrop-blur-md px-3.5 py-2 text-[var(--foreground)] shadow-sm whitespace-nowrap cursor-default">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[hsl(var(--brand-amber))] text-[hsl(var(--brand-amber))]" />
                    ))}
                  </div>
                  5.0 from every client
                </span>
              </motion.div>
            </div>

            {/* Wide screenshot stretching full width with fade */}
            <motion.div
              className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="surface rounded-xl sm:rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                {/* Browser bar */}
                <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-4 py-2.5 bg-[hsl(var(--muted))]/50">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <div className="ml-2 flex-1 max-w-sm rounded-md bg-[hsl(var(--background))] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                    yourbusiness.com
                  </div>
                </div>

                {/* Client screenshot */}
                <Image
                  src="/client-tb-tree.png"
                  alt="Client website screenshot"
                  width={1916}
                  height={992}
                  sizes="(min-width: 1280px) 1152px, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
                  className="w-full object-cover object-top"
                />
              </div>
            </motion.div>
          </section>
        </main>
      </MotionConfig>
    </LazyMotion>
  );
}
