"use client";

import Link from "next/link";
import Image from "next/image";
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

export function PageContent() {
  const reduce = useReducedMotion();
  const TITLE = "More Calls. Less Hassle. One Simple Price.";
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-12 md:pb-20">
          <LazyMotion features={domAnimation} strict>
            <MotionConfig transition={motionDefaults.transition}>
              {reduce ? (
                <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] sm:leading-tight mx-auto max-w-[20ch] sm:max-w-[22ch] hero-title text-[hsl(var(--primary-foreground))]">
                  {TITLE}
                </h1>
              ) : (
                <SplitWords
                  text={TITLE}
                  className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] sm:leading-tight mx-auto max-w-[20ch] sm:max-w-[22ch] hero-title text-[hsl(var(--primary-foreground))]"
                />
              )}

              {/* Hero subcopy */}
              <motion.p
                className="text-center text-sm sm:text-base md:text-lg text-[hsl(var(--primary-foreground))]/90 mt-4 sm:mt-6 md:mt-8 mx-auto max-w-[38ch] sm:max-w-[42ch] leading-relaxed opacity-0"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? undefined : "visible"}
                transition={{ delay: reduce ? 0 : t.headerDuration + 0.1 }}
              >
                We build, host, and manage your website for one flat monthly fee. $0 upfront. Live in 72 hours. Unlimited changes included.
              </motion.p>

              {/* Centered CTA */}
              <motion.div
                data-floating-cta-anchor
                className="flex justify-center mt-5 sm:mt-6 md:mt-8 opacity-0"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? undefined : "visible"}
                transition={{ delay: reduce ? 0 : t.headerDuration + 0.2 }}
              >
                <ShinyLink
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="schedule-call-btn inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  Schedule 15-Min Call
                </ShinyLink>
              </motion.div>

              <div className="mt-8 sm:mt-10 md:mt-14">
                <motion.div
                  className="surface rounded-2xl sm:rounded-3xl overflow-hidden motion-will-change relative mx-auto max-w-4xl lg:max-w-5xl ring-1 ring-black/5 dark:ring-white/5"
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
                  <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] hero-media">
                    <Image
                      src="/heroimg.png"
                      alt="Acadiana Web Design mobile-responsive website example for local contractors in Lafayette, Louisiana - 95+ PageSpeed score"
                      fill
                      priority
                      sizes="(min-width: 1024px) 960px, (min-width: 768px) 720px, 100vw"
                      className="absolute inset-0 object-cover"
                    />
                  </div>
                  <div className="relative px-4 sm:px-6 py-4 sm:py-5 md:py-6 bg-gradient-to-b from-white/60 via-white/55 to-white/50 dark:from-black/60 dark:via-black/55 dark:to-black/50 backdrop-blur-xl backdrop-saturate-150 border-t border-black/8 dark:border-white/8 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none z-0 hero-glass-overlay"
                    />
                    <div ref={contentRef} className="relative z-[1]">
                      <div className="mt-1 sm:mt-2">
                        <StarRating align="left" start={reduce ? true : !!(mdUp ? isInView : cardContentVisible)} />
                      </div>
                      <motion.h2
                        className="mt-3 sm:mt-4 font-semibold text-base sm:text-lg text-[var(--foreground)] opacity-0"
                        variants={fadeUp}
                        {...contentMotionProps}
                        transition={{ delay: reduce ? 0 : 0.16 }}
                      >
                        One plan. Everything included.
                      </motion.h2>
                      <motion.ul
                        className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-[var(--muted-foreground)]"
                        variants={containerStagger}
                        {...contentMotionProps}
                        transition={{ delay: reduce ? 0 : 0.20 }}
                      >
                        <motion.li className="flex items-center gap-2" variants={fadeUp}>
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--primary))] flex-shrink-0" />
                          <span>$199/mo, nothing upfront</span>
                        </motion.li>
                        <motion.li className="flex items-center gap-2" variants={fadeUp}>
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--primary))] flex-shrink-0" />
                          <span>Live in 72 hours</span>
                        </motion.li>
                        <motion.li className="flex items-center gap-2" variants={fadeUp}>
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--primary))] flex-shrink-0" />
                          <span>Unlimited changes, no extra charge</span>
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16">
          <SectionHeader as="h2">Trusted by local businesses across Acadiana</SectionHeader>
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="pill text-xs sm:text-sm">Plumbing</span>
            <span className="pill text-xs sm:text-sm">Landscaping</span>
            <span className="pill text-xs sm:text-sm">Painting</span>
            <span className="pill text-xs sm:text-sm">Home Services</span>
          </div>
          <ReviewsScroller reviews={REVIEWS} className="mt-6 sm:mt-8" />
          <p className="mt-4 text-[11px] sm:text-xs text-[var(--muted-foreground)] text-center max-w-md mx-auto leading-relaxed">
            Built the right way. Loads fast on any phone. Same-day support.
          </p>
        </div>
      </section>

      {/* Offer / Features / Comparison */}
      <section id="offer" className="anchor-target">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 lg:py-20">
          <SectionHeader as="h2" className="mb-6 sm:mb-8">Our Plan</SectionHeader>
          <div className="surface-elevated rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 overflow-hidden md:overflow-visible ring-1 ring-black/5 dark:ring-white/5">

            {/* Main grid: narrative + sticky proof */}
            <div className="grid gap-6 sm:gap-8 lg:gap-10 md:grid-cols-[1.4fr_1fr]">
              {/* Narrative column */}
              <div className="space-y-6 sm:space-y-8 min-w-0">
                {/* Steps */}
                <section id="plan-steps">
                  <h3 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] pb-2 md:pb-3">How it works</h3>
                  <HowItWorks />
                </section>

                {/* Inclusions */}
                <section id="plan-inclusions">
                  <h3 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">What you get</h3>
                  {/* Desktop grid */}
                  <div className="mt-3 sm:mt-4 hidden md:grid md:grid-cols-2 md:gap-4 lg:gap-5">
                    <div className="surface rounded-xl p-4 lg:p-5">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Build & Performance</div>
                      <ul className="mt-3 list-checks text-sm">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>7-page site built around your services</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>Loads in under a second on any phone</span></li>
                      </ul>
                    </div>
                    <div className="surface rounded-xl p-4 lg:p-5">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Hosting & Domain</div>
                      <ul className="mt-3 list-checks text-sm">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>Always online, always secure</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>Your own .com, registered and managed</span></li>
                      </ul>
                    </div>
                    <div className="surface rounded-xl p-4 lg:p-5">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Conversion</div>
                      <ul className="mt-3 list-checks text-sm">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>Show off your 5-star reviews automatically</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>Leads go straight to your inbox</span></li>
                      </ul>
                    </div>
                    <div className="surface rounded-xl p-4 lg:p-5">
                      <div className="text-sm font-semibold text-[var(--muted-foreground)]">Support & Insights</div>
                      <ul className="mt-3 list-checks text-sm">
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>Unlimited changes through your portal</span></li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0" /><span>Monthly traffic summary delivered to you</span></li>
                      </ul>
                    </div>
                  </div>
                  {/* Mobile scroller */}
                  <div className="mt-3 sm:mt-4 md:hidden">
                  <HorizontalScroller trackClassName="hscroll-track--contained" cardClassName="plan-hscroll-card surface rounded-xl p-4" ariaLabel="What you get">
                      <div>
                        <div className="plan-card-title">Build & Performance</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>7-page site built around your services</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Loads in under a second on any phone</span></li>
                        </ul>
                      </div>
                      <div>
                        <div className="plan-card-title">Hosting & Domain</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Always online, always secure</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Your own .com, registered and managed</span></li>
                        </ul>
                      </div>
                      <div>
                        <div className="plan-card-title">Conversion</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Show off your 5-star reviews automatically</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Leads go straight to your inbox</span></li>
                        </ul>
                      </div>
                      <div>
                        <div className="plan-card-title">Support & Insights</div>
                        <ul className="mt-3 list-checks">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Unlimited changes through your portal</span></li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Monthly traffic summary delivered to you</span></li>
                        </ul>
                      </div>
                    </HorizontalScroller>
                  </div>
                </section>
              </div>

              {/* Proof column (sticky) */}
              <aside id="plan-performance" className="self-start md:sticky md:top-24">
                <div className="surface rounded-xl sm:rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-4 sm:gap-6">
                  <PerformanceGauge value={95} />
                  <div className="space-y-2">
                    <div className="stat-pill">
                      <div className="stat-pill-label">Before</div>
                      <div className="stat-pill-value">3.9s</div>
                    </div>
                    <div className="stat-pill">
                      <div className="stat-pill-label">After</div>
                      <div className="stat-pill-value">0.9s</div>
                    </div>
                  </div>
                </div>
                <ul className="mt-4 sm:mt-5 space-y-2 text-sm text-[var(--muted-foreground)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                    <span>Fast sites rank higher on Google</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                    <span>Customers don&apos;t wait. Slow sites lose calls.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                    <span>Built the right way, works on every device</span>
                  </li>
                </ul>
              </div>
              </aside>
            </div>

            {/* Comparison */}
            <section id="plan-comparison" className="mt-8 sm:mt-10">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">Our Plan vs Traditional</h3>

              {/* Mobile: horizontal scroller for comparison cards */}
              <div className="mt-4 md:hidden">
                <HorizontalScroller trackClassName="hscroll-track--contained" cardClassName="plan-hscroll-card surface rounded-xl p-4 plan-compare-card" ariaLabel="Plan comparison">
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
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Yes, through your portal</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> $75-150/hour for every change</span></div></div>
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
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> Same-day responses</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Submit a ticket, wait days</span></div></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/></svg>Contract term</span></div>
                    <div className="mt-2 plan-compare-grid text-sm">
                      <div><div className="text-[var(--muted-foreground)]">Our Plan</div><div><span className="badge badge-good inline-flex items-center gap-1"><CheckCircle2 aria-hidden className="inline-block" /> 12-month minimum</span></div></div>
                      <div><div className="text-[var(--muted-foreground)]">Traditional Agency</div><div><span className="badge badge-bad inline-flex items-center gap-1"><XCircle aria-hidden className="inline-block" /> Project-based/retainer</span></div></div>
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
                        <CheckCircle2 aria-hidden className="inline-block" /> Yes, through your portal
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> $75-150/hour for every change
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
                        <CheckCircle2 aria-hidden className="inline-block" /> Same-day responses
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Submit a ticket, wait days
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"><span className="inline-flex items-center gap-2"><svg className="h-5 w-5 text-[hsl(var(--primary))]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/></svg>Contract term</span></th>
                    <td>
                      <span className="badge badge-good inline-flex items-center gap-1">
                        <CheckCircle2 aria-hidden className="inline-block" /> 12-month minimum
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-bad inline-flex items-center gap-1">
                        <XCircle aria-hidden className="inline-block" /> Project-based/retainer
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

      {/* Service Area */}
      <section id="service-area" className="anchor-target">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 lg:py-20">
          <SectionHeader as="h2">Serving Businesses Across Acadiana</SectionHeader>
          <p className="text-center text-[var(--muted-foreground)] mt-4 max-w-2xl mx-auto">
            We build professional websites for local service businesses throughout Lafayette Parish and the greater Acadiana region.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
            <Link href="/lafayette" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">Lafayette</Link>
            <Link href="/new-iberia" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">New Iberia</Link>
            <Link href="/opelousas" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">Opelousas</Link>
            <Link href="/crowley" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">Crowley</Link>
            <Link href="/breaux-bridge" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">Breaux Bridge</Link>
            <Link href="/abbeville" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">Abbeville</Link>
            <Link href="/youngsville" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">Youngsville</Link>
            <Link href="/scott" className="pill text-xs sm:text-sm hover:bg-[hsl(var(--primary))]/10 transition-colors">Scott</Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            <Link href="/websites-for-plumbers" className="text-[hsl(var(--primary))] hover:underline">Plumbers</Link>
            <Link href="/websites-for-landscapers" className="text-[hsl(var(--primary))] hover:underline">Landscapers</Link>
            <Link href="/websites-for-painters" className="text-[hsl(var(--primary))] hover:underline">Painters</Link>
            <Link href="/websites-for-contractors" className="text-[hsl(var(--primary))] hover:underline">Contractors</Link>
            <Link href="/websites-for-electricians" className="text-[hsl(var(--primary))] hover:underline">Electricians</Link>
            <Link href="/websites-for-hvac" className="text-[hsl(var(--primary))] hover:underline">HVAC</Link>
            <Link href="/websites-for-roofers" className="text-[hsl(var(--primary))] hover:underline">Roofers</Link>
            <Link href="/websites-for-pressure-washing" className="text-[hsl(var(--primary))] hover:underline">Pressure Washing</Link>
            <Link href="/websites-for-cleaning-services" className="text-[hsl(var(--primary))] hover:underline">Cleaning</Link>
            <Link href="/websites-for-pest-control" className="text-[hsl(var(--primary))] hover:underline">Pest Control</Link>
            <Link href="/websites-for-tree-services" className="text-[hsl(var(--primary))] hover:underline">Tree Services</Link>
            <Link href="/websites-for-fencing" className="text-[hsl(var(--primary))] hover:underline">Fencing</Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className="anchor-target">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 lg:py-20">
          <SectionHeader as="h2">FAQs</SectionHeader>
          <div className="mt-6 sm:mt-8 faq-grid max-w-3xl mx-auto">
            <FaqItem question='What does "unlimited edits" include?'>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">Swap a photo, fix a typo, add a new service, change your hours. Submit requests through your portal anytime. If you want a full redesign, we&apos;ll give you a simple quote. No nickel-and-diming.</p>
            </FaqItem>

            <FaqItem question="How fast can we launch?">
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">After our kickoff call, most sites go live in 72 hours. Send us your logo and photos, and we move fast.</p>
            </FaqItem>

            <FaqItem question="Do I keep my domain?">
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">We register and manage your domain while you&apos;re subscribed. After the 12-month minimum and if your account is in good standing, we can transfer it to you per the Terms.</p>
            </FaqItem>

            <FaqItem question="Who owns the website?">
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">You own your content: your copy, your images, your logo. We license the design and code during your subscription. Details are in the Terms.</p>
            </FaqItem>

            <FaqItem question="How do I cancel?">
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">Reach out to support. During months 1-12, the early termination policy applies. After 12 months, cancel any month before renewal.</p>
            </FaqItem>
          </div>
        </div>
      </section>

      {/* Final CTA / pricing */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 lg:py-20">
          <SectionHeader as="h2" align="center" className="mb-6 sm:mb-8">Ready to Get Started?</SectionHeader>
          <div className="cta-card surface-elevated rounded-2xl sm:rounded-3xl mx-auto max-w-4xl p-5 sm:p-8 md:p-10 lg:p-12 relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
            <div className="absolute inset-0 beams-overlay" aria-hidden />
            <div className="relative z-[1] flex flex-col gap-5 sm:gap-6 md:grid md:grid-cols-[1fr_auto] md:items-center">
              <div className="text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <span className="pill text-[11px] sm:text-xs"><Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--primary))]" aria-hidden /> Live in 72 hours</span>
                  <span className="pill text-[11px] sm:text-xs"><CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--primary))]" aria-hidden /> Unlimited changes</span>
                  <span className="pill text-[11px] sm:text-xs"><CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--primary))]" aria-hidden /> $0 upfront</span>
                  <span className="pill text-[11px] sm:text-xs"><CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[hsl(var(--primary))]" aria-hidden /> Hosting included</span>
                </div>
                <p className="text-[var(--muted-foreground)] text-sm md:text-base leading-relaxed max-w-lg mx-auto md:mx-0">One flat price. No tech headaches. Just a website that makes your business look as good as it really is.</p>
                <p className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-[var(--muted-foreground)]/80">$199/mo. 12-month minimum. Renews monthly until canceled. See <Link href="/legal/terms" className="underline hover:text-[var(--foreground)] transition-colors">Terms</Link>.</p>
              </div>
              <div className="flex flex-col gap-2.5 sm:gap-3 w-full md:w-auto md:min-w-[260px] lg:min-w-[300px]">
                <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-cta w-full inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base whitespace-nowrap rounded-xl font-semibold">
                  Book a Free Call
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom gradient fade-out */}
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none page-gradient-fade" aria-hidden="true" />
      </section>

      {/* Footer */}
      <footer className="footer-container pb-6 sm:pb-8">
        <div className="footer-content">
          <div className="footer-info">
            <p className="footer-copyright text-xs sm:text-sm">© {new Date().getFullYear()} Acadiana Web Design</p>
            <div className="footer-badges text-[10px] sm:text-xs">
              <span>Vet Owned</span>
              <span>Serving Acadiana</span>
              <span>Local Developer</span>
            </div>
          </div>
          <Link href="/legal/terms" className="footer-link text-xs sm:text-sm">Terms</Link>
        </div>
      </footer>
      <FloatingCtaTray />
    </main>
  );
}

