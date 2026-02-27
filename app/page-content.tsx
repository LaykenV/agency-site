"use client";

import Link from "next/link";
import Image from "next/image";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { ShinyLink } from "@/components/ui/shiny-button";
import { CheckCircle2, XCircle, ArrowRight, MapPin, Quote, Shield, Star, Zap } from "lucide-react";
import { FloatingCtaTray } from "@/components/FloatingCtaTray";
import { FaqItem } from "@/components/faq/FaqItem";
import { SpeedVariant5 } from "@/components/speed-variants";
import { LazyMotion, domAnimation, MotionConfig, m as motion, useReducedMotion } from "framer-motion";
import {
  motionDefaults,
  fadeUp,
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
    imageWidth: 2940,
    imageHeight: 1656,
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
    imageWidth: 1916,
    imageHeight: 992,
  },
  {
    quote:
      "They made the whole process easy and our new site looks clean and professional. We have already had customers mention they found us online and loved how simple it is to use.",
    name: "Bordelon's Tree Service",
    role: "Tree Service Website",
    location: "Louisiana",
    rating: 5,
    siteUrl: "https://bordelons-tree-service.vercel.app/",
    imageSrc: "/client-bordelons.png",
    imageAlt: "Bordelon's Tree Service website homepage screenshot",
    imageWidth: 2940,
    imageHeight: 1660,
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
  const initial = reduce ? false : "hidden";

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig transition={motionDefaults.transition}>
        <main className="w-full flex flex-col relative">
          <div aria-hidden className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[120vh] sm:h-[110vh] md:h-[100vh] pointer-events-none" />

          {/* ── Hero — Split Asymmetric (from variant 1) ── */}
          <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid min-h-[calc(100vh-80px)] items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16 pt-8 pb-20 lg:pt-0 lg:pb-0">
              {/* Left — Copy */}
              <div className="max-w-xl">
                <motion.h1
                  className="font-[family-name:var(--font-sora)]"
                  variants={fadeUp}
                  initial={initial}
                  animate={reduce ? undefined : "visible"}
                  transition={{ delay: 0.15 }}
                >
                  <span className="block text-5xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-[4rem] font-black tracking-tight leading-[1.08] text-[hsl(var(--primary-foreground))] hero-title">
                    One website.
                  </span>
                  <span className="block text-5xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-[4rem] font-black tracking-tight leading-[1.08] text-[hsl(var(--primary-foreground))]/70 hero-title mt-1">
                    One monthly fee.
                  </span>
                  <span className="block text-5xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-[4rem] font-[family-name:var(--font-instrument-serif)] italic font-normal tracking-tight leading-[1.08] text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,65%)] mt-1">
                    Zero headaches.
                  </span>
                </motion.h1>

                <motion.p
                  className="mt-6 text-base sm:text-lg text-[hsl(var(--primary-foreground))]/80 leading-relaxed max-w-[42ch] font-[family-name:var(--font-sora)]"
                  variants={fadeUp}
                  initial={initial}
                  animate={reduce ? undefined : "visible"}
                  transition={{ delay: 0.3 }}
                >
                  We hand-code fast, professional websites for local service businesses.
                  Hosting, SSL, edits, and support — all included for{" "}
                  <span className="font-[family-name:var(--font-instrument-serif)] italic text-2xl sm:text-3xl text-[hsl(215,88%,56%)] dark:text-[hsl(215,80%,65%)] leading-none align-baseline">$199/mo</span>.
                </motion.p>

                {/* Trust pills */}
                <motion.div
                  className="mt-6 flex flex-wrap gap-2.5 text-sm font-medium"
                  variants={staggerContainer}
                  initial={initial}
                  animate={reduce ? undefined : "visible"}
                >
                  <motion.span variants={staggerItem} className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 backdrop-blur-md px-3.5 py-2 text-[var(--foreground)] shadow-sm whitespace-nowrap cursor-default">
                    <Shield className="h-4 w-4 text-[hsl(var(--brand-amber))]" />
                    Veteran Owned
                  </motion.span>
                  <motion.span variants={staggerItem} className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 backdrop-blur-md px-3.5 py-2 text-[var(--foreground)] shadow-sm whitespace-nowrap cursor-default">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-[hsl(var(--brand-amber))] text-[hsl(var(--brand-amber))]" />
                      ))}
                    </div>
                    5.0 from every client
                  </motion.span>
                </motion.div>

                {/* CTA */}
                <motion.div
                  data-floating-cta-anchor
                  className="mt-8"
                  variants={fadeUp}
                  initial={initial}
                  animate={reduce ? undefined : "visible"}
                  transition={{ delay: 0.5 }}
                >
                  <ShinyLink
                    href={ONBOARDING_CAL_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="schedule-call-btn inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-bold whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl transition-shadow font-[family-name:var(--font-sora)]"
                  >
                    Schedule 15-Min Call
                  </ShinyLink>
                </motion.div>
              </div>

              {/* Right — Dashboard Mockup */}
              <motion.div
                className="relative"
                initial={reduce ? false : { opacity: 0, x: 40, scale: 0.96 }}
                animate={reduce ? undefined : { opacity: 1, x: 0, scale: 1 }}
                transition={{
                  delay: 0.4,
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div
                  aria-hidden
                  className="absolute -inset-8 -z-10 rounded-3xl opacity-60 blur-3xl"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 40%, hsl(var(--primary) / 0.15), transparent 70%)",
                  }}
                />

                <div className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-400/70" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                      <div className="h-3 w-3 rounded-full bg-green-400/70" />
                    </div>
                    <div className="ml-3 flex-1 rounded-md bg-[hsl(var(--muted))] px-3 py-1 text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-sora)]">
                      yourbusiness.com
                    </div>
                  </div>

                  <Image
                    src="/client-tb-tree.png"
                    alt="Client website screenshot"
                    width={1916}
                    height={992}
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    priority
                    className="w-full object-cover object-top"
                  />

                  <div className="border-t border-[hsl(var(--border))] px-3 py-2.5 sm:px-5 sm:py-3 font-[family-name:var(--font-sora)]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-[hsl(var(--brand-amber))] text-[hsl(var(--brand-amber))]" />
                        ))}
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-[var(--foreground)]">TB Tree Service</span>
                    </div>
                    <p className="text-[10px] sm:text-xs leading-snug text-[var(--muted-foreground)] line-clamp-2">
                      &ldquo;Best decision I made for my business. I went from zero web presence to 4 leads a month.&rdquo;
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

          </section>

          {/* ── PageSpeed comparison — after hero ── */}
          <SpeedVariant5 />

          {/* ── Reviews — after pagespeed ── */}
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
                      <div className="review-screenshot rounded-2xl">
                        <a
                          href={review.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full"
                          aria-label={`Visit ${review.name} website`}
                        >
                          <Image
                            src={review.imageSrc}
                            alt={review.imageAlt}
                            width={review.imageWidth}
                            height={review.imageHeight}
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

          {/* ── Our Plan vs Traditional ── */}
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
            <div
              aria-hidden
              className="absolute inset-0 -z-10 pointer-events-none"
              style={{
                background: "radial-gradient(600px 600px at 50% 28%, hsl(var(--primary) / 0.12), transparent 70%), radial-gradient(400px 400px at 50% 32%, hsl(var(--brand-amber) / 0.08), transparent 65%)",
              }}
            />
            <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28 text-center">
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
