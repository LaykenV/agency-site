"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import StarRating from "@/components/star-rating";
import { ShinyLink } from "@/components/ui/shiny-button";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { FloatingCtaTray } from "@/components/FloatingCtaTray";
import { ReviewsScroller } from "@/components/ReviewsScroller";
import { HorizontalScroller } from "@/components/HorizontalScroller";
import { HowItWorks } from "@/components/our-plan/HowItWorks";
import { PerformanceGauge } from "@/components/our-plan/PerformanceGauge";
import { FaqItem } from "@/components/faq/FaqItem";
import { SectionHeader } from "@/components/SectionHeader";
import { LazyMotion, domAnimation, MotionConfig, m as motion, useInView, useReducedMotion } from "framer-motion";
import {
  motionDefaults,
  containerStagger,
  fadeUp,
  floatCard,
  SplitWords,
  useHeroTimings,
  useIsMdUp,
  inViewDefaults,
} from "@/components/animations";

const REVIEWS = [
  {
    quote: "They launched in 3 days and updates are a portal request away.",
    name: "Alex R.",
    role: "Service Owner in Acadiana",
    rating: 5,
    siteUrl: "https://example.com/greenscape",
    imageSrc: "/placeholders/sites/landscaping.svg",
    imageAlt: "GreenScape Landscaping website homepage",
  },
  {
    quote: "Fast, professional build. Our phone calls picked up immediately.",
    name: "Maya P.",
    role: "Plumbing Services in Acadiana",
    rating: 5,
    siteUrl: "https://example.com/pro-plumb",
    imageSrc: "/placeholders/sites/plumbing.svg",
    imageAlt: "ProPlumb Services website homepage",
  },
  {
    quote: "We submit changes in the portal and they ship the same day. Couldn’t be easier.",
    name: "Jordan K.",
    role: "Home Renovation in Acadiana",
    rating: 5,
    siteUrl: "https://example.com/reno-co",
    imageSrc: "/placeholders/sites/renovation.svg",
    imageAlt: "RenoCo website homepage",
  },
] as const;

export default function Home() {
  const reduce = useReducedMotion();
  const TITLE = "Get More Calls in Acadiana with a 5‑Star Website";
  const t = useHeroTimings(TITLE);
  const [cardContentVisible, setCardContentVisible] = useState(reduce);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const mdUp = useIsMdUp();
  const isInView = useInView(contentRef, inViewDefaults);

  const contentMotionProps =
    reduce
      ? { initial: false }
      : mdUp
      ? ({ initial: "hidden", whileInView: "visible", viewport: inViewDefaults })
      : ({ initial: "hidden", animate: (cardContentVisible ? "visible" : "hidden") as "visible" | "hidden" });

  useEffect(() => {
    if (reduce) {
      setCardContentVisible(true);
    }
  }, [reduce]);
  return (
    <main className="w-full flex flex-col relative">
      <div aria-hidden className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[120vh] sm:h-[110vh] md:h-[100vh] pointer-events-none" />
      {/* Hero */}
      <motion.section id="hero" className="anchor-target relative overflow-hidden" viewport={{ once: true, amount: 0.20 }}>
        <div className="mx-auto max-w-6xl px-6 pt-2 md:pt-4 pb-10 md:pb-16">
          <LazyMotion features={domAnimation} strict>
            <MotionConfig transition={motionDefaults.transition}>
              {reduce ? (
                <h1 className="text-center text-4xl md:text-6xl font-semibold tracking-tight leading-tight mx-auto max-w-[22ch] hero-title text-[hsl(var(--primary-foreground))]">
                  {TITLE}
                </h1>
              ) : (
                <SplitWords
                  text={TITLE}
                  className="text-center text-4xl md:text-6xl font-semibold tracking-tight leading-tight mx-auto max-w-[22ch] hero-title text-[hsl(var(--primary-foreground))]"
                />
              )}

              {/* Hero subcopy */}
              <motion.p
                className="text-center text-base md:text-lg text-[hsl(var(--primary-foreground))] mt-6 md:mt-8 mx-auto max-w-[42ch] opacity-0"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? undefined : "visible"}
                transition={{ delay: reduce ? 0 : t.headerDuration + 0.1 }}
              >
                Done‑for‑you website, hosting, and domain. $0 down. 72‑hour go‑live. Unlimited edit requests in the client portal.
              </motion.p>

              {/* Centered CTA */}
              <motion.div
                data-floating-cta-anchor
                className="flex justify-center mt-6 md:mt-8 opacity-0"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? undefined : "visible"}
                transition={{ delay: reduce ? 0 : t.headerDuration + 0.2 }}
              >
                <ShinyLink
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="schedule-call-btn inline-flex items-center justify-center gap-3 px-4 py-2 font-bold whitespace-nowrap"
                >
                  Schedule 15‑Min Call
                </ShinyLink>
              </motion.div>

              <div className="mt-8 md:mt-12">
                <motion.div
                  className="surface rounded-xl overflow-hidden motion-will-change relative mx-auto max-w-4xl lg:max-w-5xl"
                  variants={floatCard}
                  initial={reduce ? false : "hidden"}
                  whileInView={reduce ? undefined : "visible"}
                  custom={reduce ? 0 : t.cardStart}
                  viewport={{ once: true, amount: 0.20 }}
                  onAnimationComplete={() => {
                    if (!reduce) {
                      setCardContentVisible(true);
                    }
                  }}
                >
                  <div className="relative w-full aspect-[16/9] md:aspect-[16/9] hero-media">
                    <picture>
                      <img
                        src="/heroimg.png"
                        alt="Website preview"
                        className="absolute inset-0 h-full w-full object-cover"
                        decoding="async"
                      />
                    </picture>
                  </div>
                  <div className="relative px-6 py-4 md:px-6 md:py-6 md:rounded-b-xl md:backdrop-blur-xl md:backdrop-saturate-150 md:bg-gradient-to-b md:from-white/50 md:via-white/45 md:to-white/40 md:dark:from-black/50 md:dark:via-black/45 md:dark:to-black/40 md:border-t md:border-black/10 md:dark:border-white/10 md:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] md:dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.06)] md:overflow-hidden">
                    <div
                      aria-hidden
                      className="hidden md:block absolute inset-0 rounded-b-xl pointer-events-none z-0 hero-glass-overlay"
                    />
                    <div ref={contentRef} className="relative z-[1]">
                      <div className="mt-2">
                        <StarRating align="left" start={reduce ? true : !!(mdUp ? isInView : cardContentVisible)} />
                      </div>
                      <motion.h2
                        className="mt-4 font-semibold text-[var(--foreground)] opacity-0"
                        variants={fadeUp}
                        {...contentMotionProps}
                        transition={{ delay: reduce ? 0 : 0.16 }}
                      >
                        All‑inclusive plan
                      </motion.h2>
                      <motion.ul
                        className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]"
                        variants={containerStagger}
                        {...contentMotionProps}
                        transition={{ delay: reduce ? 0 : 0.20 }}
                      >
                        <motion.li className="flex items-center gap-2" variants={fadeUp}>
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <span>$199/mo • $0 down</span>
                        </motion.li>
                        <motion.li className="flex items-center gap-2" variants={fadeUp}>
                          <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <span>72‑hour go‑live from build</span>
                        </motion.li>
                        <motion.li className="flex items-center gap-2" variants={fadeUp}>
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                          <span>Unlimited edit requests via the client portal</span>
                        </motion.li>
                      </motion.ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </MotionConfig>
          </LazyMotion>
          </div>
        <span className="sr-only">Hero background illustration</span>
        <span className="sr-only">Device mockups are decorative</span>
      </motion.section>

      {/* Trust & Reviews */}
      <section id="trust" className="anchor-target">
        <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
          <SectionHeader as="h2">Trusted by local pros across Acadiana</SectionHeader>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <span className="pill">Plumbing</span>
            <span className="pill">Landscaping</span>
            <span className="pill">Painting</span>
            <span className="pill">Home Services</span>
          </div>
          <ReviewsScroller reviews={REVIEWS} className="mt-6" />
          <p className="mt-2 text-xs text-[var(--muted-foreground)] text-center">
            Built on modern best practices • Pages load fast on mobile • Same‑day support
          </p>
        </div>
      </section>

      {/* Offer / Features / Comparison */}
      <section id="offer" className="anchor-target">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <SectionHeader as="h2" className="mb-6">Our Plan</SectionHeader>
          <div className="surface-elevated rounded-xl p-4 sm:p-6 md:p-8 overflow-hidden md:overflow-visible">

            {/* Main grid: narrative + sticky proof */}
            <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
              {/* Narrative column */}
              <div className="space-y-8 min-w-0">
                {/* Steps */}
                <section id="plan-steps">
                  <h3 className="text-xl font-semibold text-[var(--foreground)] pb-2 md:pb-3">How it works</h3>
                  <HowItWorks />
                </section>

                {/* Inclusions */}
                <section id="plan-inclusions">
                  <h3 className="text-xl font-semibold text-[var(--foreground)]">What you get</h3>
                  {/* Desktop unchanged */}
                  <div className="mt-3 hidden md:grid md:grid-cols-2 md:gap-4">
                    <div className="surface rounded-lg p-4">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Build & Performance</div>
                      <ul className="mt-3 list-checks">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Custom 7‑page website</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Loads fast on mobile (95+ PageSpeed)</span></li>
                      </ul>
                    </div>
                    <div className="surface rounded-lg p-4">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Hosting & Domain</div>
                      <ul className="mt-3 list-checks">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Managed hosting + SSL</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Domain included & managed</span></li>
                      </ul>
                    </div>
                    <div className="surface rounded-lg p-4">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Conversion</div>
                      <ul className="mt-3 list-checks">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Google Reviews widget</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Contact form + email alerts</span></li>
                      </ul>
                    </div>
                    <div className="surface rounded-lg p-4">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Support & Insights</div>
                      <ul className="mt-3 list-checks">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Unlimited edit requests via the client portal</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Monthly analytics summary</span></li>
                      </ul>
                    </div>
                  </div>
                  {/* Mobile scroller */}
                  <div className="mt-3 md:hidden">
                  <HorizontalScroller trackClassName="hscroll-track--contained" cardClassName="plan-hscroll-card surface rounded-lg p-4" ariaLabel="What you get">
                      <div>
                        <div className="plan-card-title">Build & Performance</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Custom 7‑page website</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Loads fast on mobile (95+ PageSpeed)</span></li>
                        </ul>
                      </div>
                      <div>
                        <div className="plan-card-title">Hosting & Domain</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Managed hosting + SSL</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Domain included & managed</span></li>
                        </ul>
                      </div>
                      <div>
                        <div className="plan-card-title">Conversion</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Google Reviews widget</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Contact form + email alerts</span></li>
                        </ul>
                      </div>
                      <div>
                        <div className="plan-card-title">Support & Insights</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Unlimited edit requests via the client portal</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Monthly analytics summary</span></li>
                        </ul>
                      </div>
                    </HorizontalScroller>
                  </div>
                </section>
              </div>

              {/* Proof column (sticky) */}
              <aside id="plan-performance" className="self-start md:sticky md:top-24">
                <div className="surface rounded-xl p-6">
                <div className="flex items-center gap-6">
                  <PerformanceGauge value={95} />
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
                <ul className="mt-4 space-y-2 text-[var(--muted-foreground)]">
                  <li>Google favors quick, mobile‑first sites</li>
                  <li>Fewer bounces, more calls and form fills</li>
                  <li>Built with modern best practices</li>
                </ul>
              </div>
              </aside>
            </div>

            {/* Comparison */}
            <section id="plan-comparison" className="mt-8">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Our Plan vs Traditional</h3>

              {/* Mobile: horizontal scroller for comparison cards */}
              <div className="mt-4 md:hidden">
                <HorizontalScroller trackClassName="hscroll-track--contained" cardClassName="plan-hscroll-card surface rounded-lg p-4 plan-compare-card" ariaLabel="Plan comparison">
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Price</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> $199/mo • $0 down</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> $3–5k+ upfront + retainers</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><Clock className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden /> Timeline to live</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> 72 hours from build</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> 4–8 weeks</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 17a4 4 0 0 0 4-4V9a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2"/><path d="M5 11h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Z" stroke="currentColor" strokeWidth="2"/></svg>Hosting & SSL</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Included</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Billed separately</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2"/><path d="M2.1 9h19.8M2.1 15h19.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke="currentColor" strokeWidth="2"/></svg>Domain</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Included & managed</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Bring your own</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" strokeWidth="2"/></svg>Unlimited edits</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Yes — via client portal</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Typically billed hourly</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>PageSpeed target</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> 95+</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Varies (often 60–80)</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 17.3 6.18 21l1.57-6.73L2 8.97l6.9-.6L12 2l3.1 6.37 6.9.6-5.75 5.3L17.82 21 12 17.3Z" stroke="currentColor" strokeWidth="2"/></svg>Reviews widget</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Included</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Often extra</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/><path d="M7 15v3M11 10v8M15 6v12M19 12v6" stroke="currentColor" strokeWidth="2"/></svg>Analytics</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Monthly summary</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> DIY</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 22a5 5 0 0 0 5-5v-1a7 7 0 1 0-14 0v1a5 5 0 0 0 5 5" stroke="currentColor" strokeWidth="2"/><path d="M19 14v-1a7 7 0 0 0-14 0v1" stroke="currentColor" strokeWidth="2"/></svg>Support</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Email support, same‑day</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Ticket queues</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/></svg>Contract term</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> 12‑month minimum</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Project‑based/retainer</span></div></div>
                    </div>
                  </div>
                </HorizontalScroller>
              </div>

              {/* Desktop: table comparison */}
              <div className="mt-4 hidden md:block overflow-x-auto">
              <table className="compare-table w-full">
                <caption className="sr-only">Our Plan vs Traditional Agency</caption>
                <thead>
                  <tr>
                    <th className="text-left">Feature</th>
                    <th className="text-left">Our Plan</th>
                    <th className="text-left">Traditional Agency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Price</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> $199/mo • $0 down
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> $3–5k+ upfront + retainers
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><Clock className="h-5 w-5 text-[hsl(var(--primary))]" aria-hidden /> Timeline to live</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> 72 hours from build
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> 4–8 weeks
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 17a4 4 0 0 0 4-4V9a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2"/><path d="M5 11h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Z" stroke="currentColor" strokeWidth="2"/></svg>Hosting & SSL</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> Included
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Billed separately
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="2"/><path d="M2.1 9h19.8M2.1 15h19.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" stroke="currentColor" strokeWidth="2"/></svg>Domain</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> Included & managed
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Bring your own
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" strokeWidth="2"/></svg>Unlimited edits</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> Yes — via client portal
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Typically billed hourly
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 3a9 9 0 1 0 9 9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>PageSpeed target</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> 95+
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Varies (often 60–80)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 17.3 6.18 21l1.57-6.73L2 8.97l6.9-.6L12 2l3.1 6.37 6.9.6-5.75 5.3L17.82 21 12 17.3Z" stroke="currentColor" strokeWidth="2"/></svg>Reviews widget</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> Included
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Often extra
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/><path d="M7 15v3M11 10v8M15 6v12M19 12v6" stroke="currentColor" strokeWidth="2"/></svg>Analytics</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> Monthly summary
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> DIY
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 22a5 5 0 0 0 5-5v-1a7 7 0 1 0-14 0v1a5 5 0 0 0 5 5" stroke="currentColor" strokeWidth="2"/><path d="M19 14v-1a7 7 0 0 0-14 0v1" stroke="currentColor" strokeWidth="2"/></svg>Support</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> Email support, same‑day
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Ticket queues
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/></svg>Contract term</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> 12‑month minimum
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Project‑based/retainer
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            </section>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className="anchor-target">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <SectionHeader as="h2">FAQs</SectionHeader>
          <div className="mt-6 faq-grid">
            <FaqItem question='What does "unlimited edits" include?'>
              <p className="text-sm">Reasonable updates like text, photos, hours, banners, sections, and small layout tweaks. Submit requests in the client portal anytime. Bigger redesigns get a simple scope and quote.</p>
            </FaqItem>

            <FaqItem question="How fast can we launch?">
              <p className="text-sm">Once we start the build, we aim to go live within 72 hours. Kickoff happens after we collect assets.</p>
            </FaqItem>

            <FaqItem question="Do I keep my domain?">
              <p className="text-sm">We include and manage your domain while subscribed. After the 12‑month minimum and if your account is in good standing, we can transfer per the Terms.</p>
            </FaqItem>

            <FaqItem question="Who owns the website?">
              <p className="text-sm">You own your original content (copy, images, logo). We license the implementation during the term. Details are in the Terms.</p>
            </FaqItem>

            <FaqItem question="How do I cancel?">
              <p className="text-sm">Email support. During months 1–12, the early termination policy applies. After 12 months, cancel any month before renewal.</p>
            </FaqItem>
          </div>
        </div>
      </section>

      {/* Final CTA / pricing */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <SectionHeader as="h2" align="center" className="mb-6">Launch Your 5‑Star Website</SectionHeader>
          <div className="cta-card surface-elevated rounded-xl mx-auto max-w-4xl p-6 sm:p-8 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 beams-overlay" aria-hidden />
            <div className="relative z-[1] flex flex-col gap-6 md:grid md:grid-cols-[1fr_auto] md:items-center">
              <div className="text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3 sm:mb-4">
                  <span className="pill"><Clock className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden /> 72‑hour go‑live</span>
                  <span className="pill"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden /> Unlimited edits</span>
                  <span className="pill"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden /> $0 down</span>
                  <span className="pill"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden /> Managed hosting + SSL</span>
                </div>
                <p className="text-[var(--muted-foreground)] text-sm md:text-base">Everything you need to launch and grow—managed hosting, SSL, and domain included. Built for local pros in Acadiana with same‑day email support.</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">$199/mo • 12‑month minimum. Renews monthly thereafter until canceled. Early termination policy applies. See <Link href="/legal/terms" className="underline">Terms</Link>.</p>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto md:max-w-[320px]">
                <Link href="/onboarding?utm_source=lp&cta=final" className="btn-secondary w-full inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap">
                  Get Your Tailored Plan
                </Link>
                <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-cta w-full inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap">
                  Schedule 15‑Min Call
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom gradient fade-out */}
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none page-gradient-fade" aria-hidden="true" />
      </section>

      {/* Footer */}
      <footer className="footer-container">
        <div className="footer-content">
          <div className="footer-info">
            <p className="footer-copyright">© {new Date().getFullYear()} Acadiana Web Design</p>
            <div className="footer-badges">
              <span>Vet Owned</span>
              <span>Serving Acadiana</span>
              <span>Local Developer</span>
            </div>
          </div>
          <Link href="/legal/terms" className="footer-link">Terms</Link>
        </div>
      </footer>
      <FloatingCtaTray />
    </main>
  );
}
