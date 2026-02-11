"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import StarRating from "@/components/star-rating";
import { ShinyLink } from "@/components/ui/shiny-button";
import { CheckCircle2, Clock, XCircle, ArrowRight, Gauge, MapPin, Quote, Shield, Star, TrendingUp, Zap } from "lucide-react";
import { FloatingCtaTray } from "@/components/FloatingCtaTray";
import { PerformanceGauge } from "@/components/our-plan/PerformanceGauge";
import { FaqItem } from "@/components/faq/FaqItem";
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
    quote:
      "We got 3 new calls in the first week. The site loads instantly, looks professional, and I did not have to worry about any of the tech stuff.",
    name: "All About Towing",
    role: "Towing Services in Alexandria",
    location: "Alexandria, LA",
    rating: 5,
    siteUrl: "https://allabouttowingservice.com/",
    imageSrc: "/client-all-about-towin.png",
    imageAlt: "All About Towing Service website homepage screenshot",
  },
  {
    quote:
      "Best decision I made for my business. I went from zero web presence to 4 leads a month. For $199 a month, I do not have to think about any of it.",
    name: "TB Tree Service",
    role: "Tree Services in Central Louisiana",
    location: "Central Louisiana",
    rating: 5,
    siteUrl: "https://tbtreeservice.org/",
    imageSrc: "/client-tb-tree.png",
    imageAlt: "TB Tree Service website homepage screenshot",
  },
] as const;

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Book your 15-minute call",
    description:
      "We look at your current site, your services, and what is blocking conversions right now.",
  },
  {
    number: "02",
    title: "Approve your custom build",
    description:
      "We hand-code your new site for speed, mobile UX, and local search visibility. You approve before launch.",
  },
  {
    number: "03",
    title: "Launch and keep improving",
    description:
      "Go live in 72 hours. Then send edits any time through your portal and we handle the rest.",
  },
] as const;

const COMPARISON_ROWS = [
  { label: "Upfront Cost", good: "$0", bad: "$3k-$5k+" },
  { label: "Launch Timeline", good: "72 hours", bad: "4-8 weeks" },
  { label: "Hosting + SSL", good: "Included", bad: "Extra fee" },
  { label: "Domain", good: "Included", bad: "Bring your own" },
  { label: "Edits", good: "Unlimited", bad: "$75-$150/hr" },
  { label: "PageSpeed", good: "95+", bad: "60-80" },
  { label: "Support", good: "Same-day", bad: "Days to weeks" },
] as const;

const INDUSTRIES = [
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
] as const;

export function PageContent() {
  const reduce = useReducedMotion();
  const TITLE = "Your website should be your best employee.";
  const t = useHeroTimings(TITLE);
  const [cardContentVisible, setCardContentVisible] = useState(reduce);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const mdUp = useIsMdUp();
  const isInView = useInView(contentRef, inViewDefaults);
  const initial = reduce ? false : "hidden";

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

          <motion.section id="hero" className="anchor-target relative overflow-hidden" viewport={{ once: true, amount: 0.2 }}>
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

              <motion.p
                className="text-center text-sm sm:text-base md:text-lg text-[hsl(var(--primary-foreground))]/90 mt-4 sm:mt-6 md:mt-8 mx-auto max-w-[38ch] sm:max-w-[42ch] leading-relaxed opacity-0"
                variants={fadeUp}
                initial={reduce ? false : "hidden"}
                animate={reduce ? undefined : "visible"}
                transition={{ delay: reduce ? 0 : t.headerDuration + 0.1 }}
              >
                We build, host, and manage your website for one flat monthly fee. $0 upfront. Live in 72 hours. Unlimited changes included.
              </motion.p>

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
                  viewport={{ once: true, amount: 0.2 }}
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
                    <div aria-hidden className="absolute inset-0 pointer-events-none z-0 hero-glass-overlay" />
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
                        transition={{ delay: reduce ? 0 : 0.2 }}
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

          <motion.section
            id="speed"
            className="anchor-target"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.18 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
              <div className="grid items-center gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12">
                <motion.div className="surface-elevated rounded-3xl p-6 sm:p-8" variants={fadeUp}>
                  <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
                    <PerformanceGauge value={95} />
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-2">
                      <div className="stat-pill">
                        <div className="stat-pill-label">Typical Site</div>
                        <div className="stat-pill-value">3.9s</div>
                      </div>
                      <div className="stat-pill">
                        <div className="stat-pill-label">Our Builds</div>
                        <div className="stat-pill-value">0.9s</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-2 md:justify-start">
                    <Gauge className="h-4 w-4 text-[hsl(var(--primary))]" />
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      Hand-tuned for speed
                    </span>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <div className="flex items-center gap-3">
                    <div className="h-px w-10 bg-[hsl(var(--primary))]/45" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))] sm:text-xs">
                      Why Speed Matters
                    </span>
                  </div>
                  <h2 className="mt-5 max-w-[22ch] text-3xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)]">
                    Fast pages rank higher and convert better.
                  </h2>
                  <p className="mt-5 max-w-[60ch] text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
                    Google directly rewards faster sites. Customers do too. If
                    your page stalls for even a few seconds, they bounce and call
                    your competitor instead.
                  </p>
                  <ul className="mt-5 space-y-2.5 text-sm sm:text-base">
                    <li className="flex items-start gap-2.5 text-[var(--foreground)]">
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                      <span>Show up when someone Googles &ldquo;plumber near me&rdquo; in your area.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-[var(--foreground)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                      <span>More call clicks and form submissions on mobile.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-[var(--foreground)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                      <span>Visitors trust you before they even scroll.</span>
                    </li>
                  </ul>
                </motion.div>
              </div>
            </div>
          </motion.section>

          <motion.section
            id="reviews"
            className="anchor-target bg-[hsl(var(--primary))]/[0.04]"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.12 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
              <div className="text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="h-px w-8 bg-[hsl(var(--primary))]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))] sm:text-xs">
                    Real Client Results
                  </span>
                  <div className="h-px w-8 bg-[hsl(var(--primary))]" />
                </div>
                <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)]">
                  Reviews from businesses we serve.
                </h2>
              </div>

              <motion.div
                className="mt-10 space-y-8 sm:mt-12 sm:space-y-10"
                variants={staggerContainer}
                initial={initial}
                whileInView={reduce ? undefined : "visible"}
                viewport={{ once: true, amount: 0.16 }}
              >
                {REVIEWS.map((review, index) => (
                  <motion.article
                    key={review.name}
                    variants={staggerItem}
                    className="surface-elevated grid gap-6 rounded-3xl p-5 sm:gap-8 sm:p-7 lg:grid-cols-2 lg:items-center lg:p-8"
                  >
                    <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                      <div className="review-screenshot !aspect-[16/10] rounded-2xl">
                        <a
                          href={review.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-full w-full"
                          aria-label={`Visit ${review.name} website`}
                        >
                          <Image
                            src={review.imageSrc}
                            alt={review.imageAlt}
                            fill
                            sizes="(min-width: 1024px) 44vw, 100vw"
                            className="review-screenshot-img"
                          />
                        </a>
                      </div>
                    </div>

                    <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
                      <Quote className="h-8 w-8 text-[hsl(var(--primary))]/25 sm:h-9 sm:w-9" aria-hidden />
                      <blockquote className="mt-4 text-xl font-extrabold leading-[1.2] tracking-tight text-[var(--foreground)] sm:text-2xl md:text-3xl font-[family-name:var(--font-display)]">
                        &ldquo;{review.quote}&rdquo;
                      </blockquote>
                      <div className="mt-5 flex items-center gap-1" aria-hidden>
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={`${review.name}-star-${i}`} className="h-4 w-4 fill-[hsl(var(--brand-amber))] text-[hsl(var(--brand-amber))]" />
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-[var(--foreground)]">{review.name}</span>
                        <span className="text-[var(--muted-foreground)]">{review.role}</span>
                        <span className="text-[var(--muted-foreground)]">- {review.location}</span>
                      </div>
                      <div className="mt-4">
                        <a
                          href={review.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-cta inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold sm:text-sm"
                        >
                          Visit site <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            id="comparison"
            className="anchor-target"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.12 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)]">
                  Our Plan vs Traditional
                </h2>
                <p className="mx-auto mt-4 max-w-[60ch] text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
                  Same goal, very different experience. We remove the giant
                  upfront invoice and the slow agency process.
                </p>
              </div>

              <div className="comparison-duel mt-10 sm:mt-12">
                <motion.div
                  className="comparison-card comparison-card--hero"
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.24 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <div className="comparison-card__header">
                    <div className="comparison-card__badge comparison-card__badge--recommended">Recommended</div>
                    <h3 className="comparison-card__title">Our Plan</h3>
                    <div className="comparison-card__price">
                      <span className="comparison-card__price-amount">$199</span>
                      <span className="comparison-card__price-period">/mo</span>
                    </div>
                    <p className="comparison-card__subtitle">$0 upfront, all-in support</p>
                  </div>
                  <ul className="comparison-card__features">
                    {COMPARISON_ROWS.map((row) => (
                      <li key={`good-${row.label}`}>
                        <CheckCircle2 className="comparison-icon comparison-icon--good" aria-hidden />
                        <span className="comparison-feature-label">{row.label}</span>
                        <span className="comparison-feature-value comparison-feature-value--good">{row.good}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <div className="comparison-vs" aria-hidden>
                  <span>VS</span>
                </div>

                <motion.div
                  className="comparison-card comparison-card--muted"
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.24 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
                >
                  <div className="comparison-card__header">
                    <div className="comparison-card__badge comparison-card__badge--legacy">The Old Way</div>
                    <h3 className="comparison-card__title">Traditional Agency</h3>
                    <div className="comparison-card__price">
                      <span className="comparison-card__price-amount">$3k-$5k+</span>
                      <span className="comparison-card__price-period">upfront</span>
                    </div>
                    <p className="comparison-card__subtitle">Then retainers, add-ons, and hourly edits</p>
                  </div>
                  <ul className="comparison-card__features">
                    {COMPARISON_ROWS.map((row) => (
                      <li key={`bad-${row.label}`}>
                        <XCircle className="comparison-icon comparison-icon--bad" aria-hidden />
                        <span className="comparison-feature-label">{row.label}</span>
                        <span className="comparison-feature-value comparison-feature-value--bad">{row.bad}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </motion.section>

          <motion.section
            id="developer"
            className="anchor-target relative overflow-hidden"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.1 }}
            variants={sectionReveal}
          >
            {/* Radial glow backdrop */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 pointer-events-none"
              style={{
                background: "radial-gradient(600px 600px at 50% 28%, hsl(var(--primary) / 0.12), transparent 70%), radial-gradient(400px 400px at 50% 32%, hsl(var(--brand-amber) / 0.08), transparent 65%)",
              }}
            />
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28 text-center">
              {/* Circular portrait with glow rings */}
              <motion.div className="flex justify-center" variants={fadeUp}>
                <div className="portrait-glow-ring relative h-48 w-48 sm:h-56 sm:w-56 lg:h-64 lg:w-64 rounded-full overflow-hidden border-4 border-[hsl(var(--background))] shadow-soft-lg">
                  <Image
                    src="/portrait.jpeg"
                    alt="Portrait of the developer"
                    fill
                    sizes="256px"
                    className="object-cover object-top"
                  />
                </div>
              </motion.div>

              {/* Massive centered headline */}
              <motion.blockquote
                className="mt-10 text-4xl font-extrabold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl lg:text-7xl font-[family-name:var(--font-display)]"
                variants={fadeUp}
              >
                One developer.
                <br />
                <span className="text-[hsl(var(--primary))]">One point of contact.</span>
                <br />
                No runaround.
              </motion.blockquote>

              <motion.p
                className="mx-auto mt-6 max-w-[52ch] text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base md:text-lg"
                variants={fadeUp}
              >
                No support tickets. No being bounced between departments. The person
                you talk to is the person building your site. When your business
                changes, your site changes fast.
              </motion.p>

              {/* Stat chips row */}
              <motion.div
                className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
                variants={staggerContainer}
                initial={initial}
                whileInView={reduce ? undefined : "visible"}
                viewport={{ once: true, amount: 0.3 }}
              >
                <motion.span variants={staggerItem} className="pill text-xs sm:text-sm">
                  <Shield className="h-3.5 w-3.5 text-[hsl(var(--brand-amber))]" aria-hidden />
                  Veteran Owned
                </motion.span>
                <motion.span variants={staggerItem} className="pill text-xs sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 text-[hsl(var(--primary))]" aria-hidden />
                  Lafayette, LA
                </motion.span>
                <motion.span variants={staggerItem} className="pill text-xs sm:text-sm">
                  <Zap className="h-3.5 w-3.5 text-[hsl(var(--primary))]" aria-hidden />
                  Same-Day Support
                </motion.span>
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            id="steps"
            className="anchor-target"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.12 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
              <div className="text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="h-px w-8 bg-[hsl(var(--primary))]/40" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))] sm:text-xs">
                    The Process
                  </span>
                  <div className="h-px w-8 bg-[hsl(var(--primary))]/40" />
                </div>
                <h2 className="mx-auto mt-5 max-w-[22ch] text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)]">
                  Three steps. That&apos;s it.
                </h2>
              </div>

              <motion.div
                className="mt-10 grid gap-0 border border-[hsl(var(--border))] md:mt-12 md:grid-cols-3"
                variants={staggerContainer}
                initial={initial}
                whileInView={reduce ? undefined : "visible"}
                viewport={{ once: true, amount: 0.12 }}
              >
                {PROCESS_STEPS.map((step, index) => (
                  <motion.article
                    key={step.number}
                    variants={staggerItem}
                    className={`relative p-6 sm:p-8 ${
                      index < PROCESS_STEPS.length - 1 ? "md:border-r md:border-[hsl(var(--border))]" : ""
                    } ${index > 0 ? "border-t border-[hsl(var(--border))] md:border-t-0" : ""}`}
                  >
                    <div className="text-6xl leading-none font-extrabold tracking-tighter text-[hsl(var(--primary))]/14 sm:text-7xl font-[family-name:var(--font-display)]">
                      {step.number}
                    </div>
                    <h3 className="mt-4 text-xl font-bold tracking-tight text-[var(--foreground)] font-[family-name:var(--font-display)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
                      {step.description}
                    </p>
                    {index < PROCESS_STEPS.length - 1 ? (
                      <div
                        aria-hidden
                        className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] md:flex"
                      >
                        <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                      </div>
                    ) : null}
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            id="industries"
            className="anchor-target"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.12 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
              <div className="text-center mb-10 sm:mb-14">
                <div className="mx-auto mb-5 h-px w-16 bg-[hsl(var(--primary))]/30" />
                <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)]">
                  Built for trades that live on the phone.
                </h2>
                <p className="mt-4 text-sm text-[var(--muted-foreground)] sm:text-base max-w-lg mx-auto">
                  Twelve industries. One goal: turn Google searches into calls.
                </p>
                <div className="mx-auto mt-5 h-px w-16 bg-[hsl(var(--primary))]/30" />
              </div>

              <motion.div
                className="grid gap-0 md:grid-cols-2 md:gap-x-12 lg:gap-x-20 max-w-4xl mx-auto"
                variants={staggerContainer}
                initial={initial}
                whileInView={reduce ? undefined : "visible"}
                viewport={{ once: true, amount: 0.1 }}
              >
                {INDUSTRIES.map((ind, i) => (
                  <motion.div key={ind.href} variants={staggerItem}>
                    <Link href={ind.href} className="editorial-row">
                      <span className="editorial-row__num">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="editorial-row__name">{ind.name}</span>
                      <ArrowRight className="editorial-row__arrow h-4 w-4" />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.section>

          <motion.section
            id="faqs"
            className="anchor-target"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 md:py-16 lg:py-20">
              <h2 className="text-center text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)]">
                Frequently Asked Questions
              </h2>
              <div className="mt-6 sm:mt-8 faq-grid max-w-3xl mx-auto">
                <FaqItem question='What does "unlimited edits" include?'>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">Swap a photo, fix a typo, add a new service, change your hours. Submit requests through your portal anytime. If you want a full redesign, we&apos;ll give you a simple quote. No nickel-and-diming.</p>
                </FaqItem>

                <FaqItem question="How fast can we launch?">
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">After our kickoff call, most sites go live in 72 hours. Send us your logo and photos, and we move fast.</p>
                </FaqItem>

                <FaqItem question="Do I keep my domain?">
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">We register and manage it for you while you&apos;re subscribed. After 12 months, it&apos;s yours to transfer if you want. Details in the <Link href="/legal/terms" className="underline hover:text-[var(--foreground)] transition-colors">Terms</Link>.</p>
                </FaqItem>

                <FaqItem question="Who owns the website?">
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">Your content is yours — copy, photos, logo. We handle the design and code while you&apos;re subscribed. It&apos;s all spelled out in the <Link href="/legal/terms" className="underline hover:text-[var(--foreground)] transition-colors">Terms</Link>.</p>
                </FaqItem>

                <FaqItem question="How do I cancel?">
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">Just email us. We ask that you stay for the first 12 months. After that, cancel anytime with a month&apos;s notice. No hoops.</p>
                </FaqItem>
              </div>
            </div>
          </motion.section>

          <motion.section
            id="cta"
            className="relative"
            initial={initial}
            whileInView={reduce ? undefined : "visible"}
            viewport={{ once: true, amount: 0.12 }}
            variants={sectionReveal}
          >
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                {/* Left: Price lockup */}
                <motion.div className="text-center lg:text-left" variants={fadeUp}>
                  <p className="text-lg font-semibold text-[var(--muted-foreground)] line-through decoration-2 opacity-50 sm:text-xl">
                    $5,000 upfront
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)]">
                    <span className="text-7xl font-extrabold tracking-tighter text-[var(--foreground)] sm:text-8xl md:text-9xl">$199</span>
                    <span className="text-2xl font-bold text-[var(--muted-foreground)] sm:text-3xl">/mo</span>
                  </p>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)] sm:text-base">
                    $0 upfront. Stay 12 months, then cancel anytime.
                  </p>
                </motion.div>

                {/* Right: Headline + CTA */}
                <motion.div className="text-center lg:text-left" variants={fadeUp}>
                  <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)] leading-[1.08]">
                    Your next customer is Googling right now.
                  </h2>
                  <p className="mt-5 max-w-[50ch] mx-auto lg:mx-0 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
                    Every day without a fast, professional site is a day your competitor answers the phone instead. Book the call. We handle the rest.
                  </p>
                  <div className="mt-8">
                    <ShinyLink
                      href={ONBOARDING_CAL_LINK}
                      target="_blank"
                      rel="noreferrer"
                      className="schedule-call-btn inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-bold whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                    >
                      Schedule 15-Min Call
                    </ShinyLink>
                  </div>
                  <p className="mt-4 text-[11px] sm:text-xs text-[var(--muted-foreground)]/60">
                    $199/mo. 12-month minimum. See{" "}
                    <Link href="/legal/terms" className="underline hover:text-[var(--foreground)] transition-colors">Terms</Link>.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.section>

          <footer className="footer-container pb-6 sm:pb-8">
            <div className="footer-content">
              <div className="footer-info">
                <p className="footer-copyright text-xs sm:text-sm">© {new Date().getFullYear()} Acadiana Web Design</p>
                <div className="footer-badges text-[10px] sm:text-xs">
                  <span>Veteran Owned</span>
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
