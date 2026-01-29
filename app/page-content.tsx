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
  sectionReveal,
  staggerContainer,
  staggerItem,
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
    <LazyMotion features={domAnimation} strict>
    <MotionConfig transition={motionDefaults.transition}>
    <main className="w-full flex flex-col relative">
      <div aria-hidden className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[120vh] sm:h-[110vh] md:h-[100vh] pointer-events-none" />
      {/* Hero */}
      <motion.section id="hero" className="anchor-target relative overflow-hidden" viewport={{ once: true, amount: 0.20 }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-12 md:pb-20">
              {reduce ? (
                <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] sm:leading-tight mx-auto max-w-[20ch] sm:max-w-[22ch] hero-title text-[hsl(var(--primary-foreground))]">
                  {TITLE}
                </h1>
              ) : (
                <SplitWords
                  text={TITLE}
                  className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] sm:leading-tight mx-auto max-w-[20ch] sm:max-w-[22ch] hero-title text-[hsl(var(--primary-foreground))]"
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
                className="flex items-center justify-center mt-5 sm:mt-6 md:mt-8 opacity-0"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? undefined : "visible"}
                transition={{ delay: reduce ? 0 : t.headerDuration + 0.2 }}
              >
                <ShinyLink
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="schedule-call-btn inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-bold whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl transition-shadow"
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
          </div>
        <span className="sr-only">Hero background illustration</span>
        <span className="sr-only">Device mockups are decorative</span>
      </motion.section>

      {/* Trust & Reviews */}
      <motion.section
        id="trust"
        className="anchor-target"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16">
          <SectionHeader as="h2">Trusted by local businesses across Acadiana</SectionHeader>
          <motion.div
            className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.span className="pill text-xs sm:text-sm" variants={staggerItem}>Plumbing</motion.span>
            <motion.span className="pill text-xs sm:text-sm" variants={staggerItem}>Landscaping</motion.span>
            <motion.span className="pill text-xs sm:text-sm" variants={staggerItem}>Painting</motion.span>
            <motion.span className="pill text-xs sm:text-sm" variants={staggerItem}>Home Services</motion.span>
          </motion.div>
          <ReviewsScroller reviews={REVIEWS} className="mt-6 sm:mt-8" />
          <p className="mt-4 text-[11px] sm:text-xs text-[var(--muted-foreground)] text-center max-w-md mx-auto leading-relaxed">
            Built the right way. Loads fast on any phone. Same-day support.
          </p>
        </div>
      </motion.section>

      {/* Offer / Features / Comparison */}
      <motion.section
        id="offer"
        className="anchor-target"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={sectionReveal}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 lg:py-20">
          <SectionHeader as="h2" className="mb-6 sm:mb-8">Our Plan</SectionHeader>
          {/* Card wrapper: removed on mobile for breathing room, elevated surface on md+ */}
          <div className="md:surface-elevated md:rounded-3xl md:p-8 lg:p-10 md:overflow-visible md:ring-1 md:ring-black/5 dark:md:ring-white/5">

            {/* Main grid: narrative + sticky proof */}
            <div className="grid gap-10 md:gap-8 lg:gap-10 md:grid-cols-[1.4fr_1fr]">
              {/* Narrative column */}
              <div className="space-y-10 md:space-y-8 min-w-0">
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

              {/* Proof column (sticky) - card styling only on md+ */}
              <aside id="plan-performance" className="self-start md:sticky md:top-24">
                <div className="md:surface md:rounded-2xl md:p-6">
                  {/* Mobile: centered stacked layout | Desktop: side-by-side */}
                  <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:gap-6">
                    <PerformanceGauge value={95} />
                    <div className="flex gap-3 md:flex-col md:gap-2">
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
                  <ul className="mt-5 md:mt-5 space-y-2 text-sm text-[var(--muted-foreground)] text-center md:text-left">
                    <li className="flex items-start justify-center md:justify-start gap-2">
                      <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                      <span>Fast sites rank higher on Google</span>
                    </li>
                    <li className="flex items-start justify-center md:justify-start gap-2">
                      <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                      <span>Customers don&apos;t wait. Slow sites lose calls.</span>
                    </li>
                    <li className="flex items-start justify-center md:justify-start gap-2">
                      <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                      <span>Built the right way, works on every device</span>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>

            {/* Comparison */}
            <section id="plan-comparison" className="mt-10 md:mt-10">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] mb-5 sm:mb-6">Our Plan vs Traditional</h3>

              {/* Side-by-side comparison cards */}
              <div className="comparison-duel">
                {/* Our Plan - Hero Card */}
                <motion.div 
                  className="comparison-card comparison-card--hero"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="comparison-card__header">
                    <div className="comparison-card__badge comparison-card__badge--recommended">Recommended</div>
                    <h4 className="comparison-card__title">Our Plan</h4>
                    <div className="comparison-card__price">
                      <span className="comparison-card__price-amount">$199</span>
                      <span className="comparison-card__price-period">/mo</span>
                    </div>
                    <p className="comparison-card__subtitle">$0 upfront • Cancel anytime after 12 months</p>
                  </div>
                  <ul className="comparison-card__features">
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">Timeline</span><span className="comparison-feature-value comparison-feature-value--good">72 hours</span></li>
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">Hosting & SSL</span><span className="comparison-feature-value comparison-feature-value--good">Included</span></li>
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">Domain</span><span className="comparison-feature-value comparison-feature-value--good">Included</span></li>
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">Edits</span><span className="comparison-feature-value comparison-feature-value--good">Unlimited</span></li>
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">PageSpeed</span><span className="comparison-feature-value comparison-feature-value--good">95+</span></li>
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">Reviews Widget</span><span className="comparison-feature-value comparison-feature-value--good">Included</span></li>
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">Analytics</span><span className="comparison-feature-value comparison-feature-value--good">Monthly report</span></li>
                    <li><CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden /><span className="comparison-feature-label">Support</span><span className="comparison-feature-value comparison-feature-value--good">Same-day</span></li>
                  </ul>
                </motion.div>

                {/* VS Divider */}
                <div className="comparison-vs" aria-hidden>
                  <span>VS</span>
                </div>

                {/* Traditional Agency - Muted Card */}
                <motion.div 
                  className="comparison-card comparison-card--muted"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                >
                  <div className="comparison-card__header">
                    <div className="comparison-card__badge comparison-card__badge--legacy">The Old Way</div>
                    <h4 className="comparison-card__title">Traditional Agency</h4>
                    <div className="comparison-card__price">
                      <span className="comparison-card__price-amount">$3–5k+</span>
                      <span className="comparison-card__price-period">upfront</span>
                    </div>
                    <p className="comparison-card__subtitle">Plus monthly retainers & hourly fees</p>
                  </div>
                  <ul className="comparison-card__features">
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">Timeline</span><span className="comparison-feature-value comparison-feature-value--bad">4–8 weeks</span></li>
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">Hosting & SSL</span><span className="comparison-feature-value comparison-feature-value--bad">Extra cost</span></li>
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">Domain</span><span className="comparison-feature-value comparison-feature-value--bad">Bring your own</span></li>
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">Edits</span><span className="comparison-feature-value comparison-feature-value--bad">$75–150/hr</span></li>
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">PageSpeed</span><span className="comparison-feature-value comparison-feature-value--bad">60–80</span></li>
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">Reviews Widget</span><span className="comparison-feature-value comparison-feature-value--bad">Extra add-on</span></li>
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">Analytics</span><span className="comparison-feature-value comparison-feature-value--bad">DIY setup</span></li>
                    <li><XCircle className="comparison-icon comparison-icon--bad" aria-hidden /><span className="comparison-feature-label">Support</span><span className="comparison-feature-value comparison-feature-value--bad">Days to weeks</span></li>
                  </ul>
                </motion.div>
              </div>
            </section>
          </div>
        </div>
      </motion.section>

      {/* Industries We Serve */}
      <motion.section
        id="industries"
        className="anchor-target"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 lg:py-20">
          <SectionHeader as="h2">Industries We Serve</SectionHeader>
          <p className="text-center text-[var(--muted-foreground)] mt-3 sm:mt-4 max-w-xl mx-auto text-sm sm:text-base">
            Professional websites built for local service businesses.
          </p>

          <motion.div
            className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {[
              { name: "Plumbers", href: "/services/plumbers" },
              { name: "Landscapers", href: "/services/landscapers" },
              { name: "Painters", href: "/services/painters" },
              { name: "Contractors", href: "/services/contractors" },
              { name: "Electricians", href: "/services/electricians" },
              { name: "HVAC", href: "/services/hvac" },
              { name: "Roofers", href: "/services/roofers" },
              { name: "Pressure Washing", href: "/services/pressure-washing" },
              { name: "Cleaning", href: "/services/cleaning-services" },
              { name: "Pest Control", href: "/services/pest-control" },
              { name: "Tree Services", href: "/services/tree-services" },
              { name: "Fencing", href: "/services/fencing" },
            ].map((industry) => (
              <motion.div key={industry.href} variants={staggerItem}>
                <Link
                  href={industry.href}
                  className="group flex items-center justify-center gap-2 px-4 py-3 sm:py-4 rounded-xl surface ring-1 ring-black/5 dark:ring-white/5 hover:ring-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--primary))]/5 transition-all"
                >
                  <span className="text-sm sm:text-base text-[var(--foreground)] group-hover:text-[hsl(var(--primary))] transition-colors font-medium">
                    {industry.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* FAQs */}
      <motion.section
        id="faqs"
        className="anchor-target"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
      >
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
      </motion.section>

      {/* Final CTA / pricing */}
      <motion.section
        className="relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
      >
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
      </motion.section>

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
    </MotionConfig>
    </LazyMotion>
  );
}

