"use client";

import Link from "next/link";
import { useState } from "react";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import StarRating from "@/components/star-rating";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { FloatingCtaTray } from "@/components/FloatingCtaTray";
import { ReviewsScroller } from "@/components/ReviewsScroller";
import { HorizontalScroller } from "@/components/HorizontalScroller";
import { HowItWorks } from "@/components/our-plan/HowItWorks";
import { PerformanceGauge } from "@/components/our-plan/PerformanceGauge";
import { FaqItem } from "@/components/faq/FaqItem";
import { SectionHeader } from "@/components/SectionHeader";
import { LazyMotion, domAnimation, MotionConfig, m as motion, useReducedMotion } from "framer-motion";
import {
  motionDefaults,
  containerStagger,
  fadeUp,
  scaleCard,
  popIn,
  fadeIn,
  SplitWords,
  useHeroTimings,
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
  const TITLE = "A 5‑Star Website for Your Business in Acadiana";
  const t = useHeroTimings(TITLE);
  const [cardRevealed, setCardRevealed] = useState(false);
  return (
    <main className="w-full flex flex-col relative">
      <div aria-hidden className="absolute inset-x-0 -top-16 md:-top-20 -z-10 page-gradient h-[90vh] sm:h-[78vh] md:h-[68vh] pointer-events-none" />
      {/* Hero */}
      <motion.section id="hero" className="anchor-target relative overflow-hidden" viewport={{ once: true, amount: 0.20 }}>
        <div className="mx-auto max-w-6xl px-6 pt-2 md:pt-4 pb-10 md:pb-16">
          <LazyMotion features={domAnimation} strict>
            <MotionConfig transition={motionDefaults.transition}>
              {reduce ? (
                <h1 className="text-center text-4xl md:text-6xl font-semibold tracking-tight leading-tight mx-auto max-w-[22ch] heading-gradient">
                  {TITLE}
                </h1>
              ) : (
                <SplitWords
                  text={TITLE}
                  className="text-center text-4xl md:text-6xl font-semibold tracking-tight leading-tight mx-auto max-w-[22ch] heading-gradient"
                />
              )}

              <div className="mt-8 md:mt-12">
                <motion.div
                  className="surface rounded-xl overflow-hidden motion-will-change"
                  variants={scaleCard}
                  initial={reduce ? false : "hidden"}
                  whileInView={reduce ? undefined : "visible"}
                  transition={{ ...motionDefaults.transition, delay: reduce ? 0 : t.cardStart }}
                  viewport={{ once: true, amount: 0.20 }}
                  onAnimationComplete={() => setCardRevealed(true)}
                >
                  <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] md:aspect-[32/9] hero-media">
                    {/* Fade the overlay in, not the gradient tokens */}
                    <motion.div
                      className="absolute inset-0 motion-will-change hero-overlay opacity-0"
                      variants={fadeIn}
                      initial={reduce ? false : "hidden"}
                      animate={reduce ? undefined : "visible"}
                      transition={{ delay: reduce ? 0 : t.cardStart + 0.06 }}
                    />
                    <div className="absolute inset-0 flex items-center">
                      <motion.ul
                        className="w-full relative z-[1] grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-8"
                        role="list"
                        variants={containerStagger}
                        initial={reduce ? false : "hidden"}
                        animate={reduce ? undefined : (cardRevealed ? "visible" : "hidden")}
                        transition={{ delay: reduce ? 0 : 0.04 }}
                      >
                      <motion.li className="flex flex-col items-center text-center" variants={popIn}>
                        <div className="icon-badge">
                          <svg
                            className="h-10 w-10 md:h-12 md:w-12"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <path
                              d="M10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90532 10.1147 9.8278C10.1147 9.8278 10.1147 9.8278 10.1147 9.8278C10.1146 9.82792 8.99588 10.9468 11.0245 12.9755C13.0525 15.0035 14.1714 13.8861 14.1722 13.8853C14.1722 13.8853 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4557 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C14.1588 20.0658 10.9183 19.5829 7.6677 16.3323C4.41713 13.0817 3.93421 9.84122 4.00655 7.93309C4.04952 6.7996 4.7008 5.77423 5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617Z"
                              fill="#2b7cee"
                            />
                            <path
                              d="M13.2595 1.87983C13.3257 1.47094 13.7122 1.19357 14.1211 1.25976C14.1464 1.26461 14.2279 1.27983 14.2705 1.28933C14.3559 1.30834 14.4749 1.33759 14.6233 1.38082C14.9201 1.46726 15.3347 1.60967 15.8323 1.8378C16.8286 2.29456 18.1544 3.09356 19.5302 4.46936C20.906 5.84516 21.705 7.17097 22.1617 8.16725C22.3899 8.66487 22.5323 9.07947 22.6187 9.37625C22.6619 9.52466 22.6912 9.64369 22.7102 9.72901C22.7197 9.77168 22.7267 9.80594 22.7315 9.83125L22.7373 9.86245C22.8034 10.2713 22.5286 10.6739 22.1197 10.7401C21.712 10.8061 21.3279 10.53 21.2601 10.1231C21.258 10.1121 21.2522 10.0828 21.2461 10.0551C21.2337 9.9997 21.2124 9.91188 21.1786 9.79572C21.1109 9.56339 20.9934 9.21806 20.7982 8.79238C20.4084 7.94207 19.7074 6.76789 18.4695 5.53002C17.2317 4.29216 16.0575 3.59117 15.2072 3.20134C14.7815 3.00618 14.4362 2.88865 14.2038 2.82097C14.0877 2.78714 13.9417 2.75363 13.8863 2.7413C13.4793 2.67347 13.1935 2.28755 13.2595 1.87983Z"
                              fill="#2b7cee"
                            />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M13.4857 5.3293C13.5995 4.93102 14.0146 4.7004 14.4129 4.81419L14.2069 5.53534C14.4129 4.81419 14.4129 4.81419 14.4129 4.81419L14.4144 4.81461L14.4159 4.81505L14.4192 4.81602L14.427 4.81834L14.4468 4.8245C14.4618 4.82932 14.4807 4.8356 14.5031 4.84357C14.548 4.85951 14.6074 4.88217 14.6802 4.91337C14.8259 4.97581 15.0249 5.07223 15.2695 5.21694C15.7589 5.50662 16.4271 5.9878 17.2121 6.77277C17.9971 7.55775 18.4782 8.22593 18.7679 8.7154C18.9126 8.95991 19.009 9.15897 19.0715 9.30466C19.1027 9.37746 19.1254 9.43682 19.1413 9.48173C19.1493 9.50418 19.1555 9.52301 19.1604 9.53809L19.1665 9.55788L19.1688 9.56563L19.1698 9.56896L19.1702 9.5705C19.1702 9.5705 19.1707 9.57194 18.4495 9.77798L19.1707 9.57194C19.2845 9.97021 19.0538 10.3853 18.6556 10.4991C18.2607 10.6119 17.8492 10.3862 17.7313 9.99413L17.7276 9.98335C17.7223 9.96832 17.7113 9.93874 17.6928 9.89554C17.6558 9.8092 17.5887 9.66797 17.4771 9.47938C17.2541 9.10264 16.8514 8.53339 16.1514 7.83343C15.4515 7.13348 14.8822 6.73078 14.5055 6.50781C14.3169 6.39619 14.1757 6.32909 14.0893 6.29209C14.0461 6.27358 14.0165 6.26254 14.0015 6.25721L13.9907 6.25352C13.5987 6.13564 13.3729 5.72419 13.4857 5.3293Z"
                              fill="#2b7cee"
                            />
                          </svg>
                        </div>
                        <h3 className="mt-3 text-xs sm:text-sm md:text-base font-semibold text-[var(--foreground)]">Tell us your vision</h3>
                        <p className="hidden sm:block mt-1 text-[10px] sm:text-xs md:text-sm text-[var(--muted-foreground)]">Schedule a call and do a deep dive on your business, brand, and goals.</p>
                      </motion.li>
                      <motion.li className="flex flex-col items-center text-center" variants={popIn}>
                        <div className="icon-badge">
                          <svg
                            className="h-10 w-10 md:h-12 md:w-12"
                            viewBox="0 0 32 32"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <path
                              d="M30,28H2c-0.3,0-0.7-0.2-0.9-0.5c-0.2-0.3-0.2-0.7,0-1l2-3C3.3,23.2,3.6,23,4,23h24c0.4,0,0.7,0.2,0.9,0.6l2,3 c0.2,0.3,0.1,0.7,0,1C30.7,27.8,30.3,28,30,28z"
                              fill="#2b7cee"
                            />
                            <path
                              d="M27,5H5C4.4,5,4,5.4,4,6v14c0,0.6,0.4,1,1,1h22c0.6,0,1-0.4,1-1V6C28,5.4,27.6,5,27,5z M11.7,15.3c0.4,0.4,0.4,1,0,1.4 C11.5,16.9,11.3,17,11,17s-0.5-0.1-0.7-0.3l-3-3c-0.4-0.4-0.4-1,0-1.4l3-3c0.4-0.4,1-0.4,1.4,0s0.4,1,0,1.4L9.4,13L11.7,15.3z M18.9,9.4l-4,8C14.7,17.8,14.4,18,14,18c-0.2,0-0.3,0-0.4-0.1c-0.5-0.2-0.7-0.8-0.4-1.3l4-8c0.2-0.5,0.8-0.7,1.3-0.4 C18.9,8.4,19.1,9,18.9,9.4z M24.7,13.7l-3,3C21.5,16.9,21.3,17,21,17s-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l2.3-2.3l-2.3-2.3 c-0.4-0.4-0.4-1,0-1.4s1-0.4,1.4,0l3,3C25.1,12.7,25.1,13.3,24.7,13.7z"
                              fill="#2b7cee"
                            />
                          </svg>
                        </div>
                        <h3 className="mt-3 text-xs sm:text-sm md:text-base font-semibold text-[var(--foreground)]">We Build Your Website</h3>
                        <p className="hidden sm:block mt-1 text-[10px] sm:text-xs md:text-sm text-[var(--muted-foreground)]">Our team designs and develops a custom, high-performance website that&apos;s built to convert.</p>
                      </motion.li>
                      <motion.li className="flex flex-col items-center text-center" variants={popIn}>
                        <div className="icon-badge">
                          <svg
                            className="h-10 w-10 md:h-12 md:w-12"
                            viewBox="0 0 32 32"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <path
                              d="M30.43,1.484C28.488-0.458,19.154-1.42,14.123,3.61c-1.499,1.499-2.653,2.806-3.588,4.062 c-1.836-0.335-3.524,0.215-4.92,1.61L2.07,12.827c-0.392,0.392-0.392,1.027,0,1.418l1.422,1.422c0.392,0.392,1.027,0.392,1.418,0 c0.857-0.857,1.757-1.143,2.734-0.864c-0.027,1.678,0.467,3.279,1.476,4.778c-0.241,0.345-0.546,0.738-0.808,1.064 c-0.321,0.399-0.287,0.973,0.074,1.335l1.548,1.548c0.362,0.362,0.936,0.395,1.335,0.074c0.326-0.262,0.718-0.568,1.064-0.808 c1.499,1.009,3.1,1.502,4.778,1.476c0.279,0.977-0.007,1.876-0.864,2.734c-0.392,0.392-0.392,1.027,0,1.418l1.422,1.422 c0.392,0.392,1.027,0.392,1.418,0l3.546-3.546c1.396-1.396,1.945-3.085,1.609-4.921c1.256-0.934,2.563-2.089,4.062-3.588 C33.334,12.76,32.372,3.426,30.43,1.484z M8.882,13.136c-1.61-0.713-3.218-0.555-4.625,0.459l-0.059-0.059l2.836-2.836 c0.975-0.975,2.074-1.299,3.344-1.006C9.687,10.817,9.159,11.967,8.882,13.136z M10.714,21.472L10.442,21.2 c1.262-1.876,3.153-4.241,5.373-6.515l1.06,0.353l0.353,1.06C14.957,18.316,12.588,20.211,10.714,21.472z M21.213,24.881 l-2.836,2.836l-0.059-0.059c1.015-1.408,1.172-3.015,0.46-4.625c1.169-0.277,2.32-0.806,3.441-1.495 C22.513,22.808,22.188,23.906,21.213,24.881z M18.052,22.185l-0.39,0.043c-1.217,0.133-2.36-0.092-3.466-0.665l-0.183-0.094 c-0.277-0.153-0.55-0.344-0.823-0.543c1.387-1.059,3.208-2.572,5.188-4.551l-0.709-2.127l-2.127-0.709 c-1.98,1.98-3.493,3.801-4.551,5.188c-0.2-0.273-0.389-0.546-0.543-0.823l-0.094-0.184c-0.573-1.106-0.798-2.249-0.665-3.465 l0.042-0.39c0.427-2.51,2.333-5.355,5.812-8.834c4.373-4.373,12.591-3.008,13.471-2.127c0.88,0.88,2.246,9.099-2.127,13.471 C23.407,19.851,20.561,21.757,18.052,22.185z M6.725,24.272c-0.376-0.376-0.862-0.575-1.407-0.575c-1.372,0-2.755,1.314-3.019,1.577 C0.026,27.548,0,30.857,0,30.997V32h1.003c0.14,0,3.449-0.026,5.722-2.299c1.252-1.252,2.266-3.163,1.003-4.426L6.725,24.272z M5.307,28.283c-0.972,0.971-2.254,1.392-3.168,1.573c0.18-0.908,0.6-2.185,1.576-3.161c0.472-0.469,1.246-0.991,1.591-1.004 l0.989,0.973C6.341,26.898,5.893,27.692,5.307,28.283z M22.631,5.272c-2.215,0-4.011,1.796-4.011,4.011 c0,2.215,1.796,4.011,4.011,4.011s4.011-1.796,4.011-4.011C26.642,7.068,24.846,5.272,22.631,5.272z M22.631,12.291 c-1.658,0-3.008-1.35-3.008-3.008c0-1.658,1.35-3.008,3.008-3.008c1.659,0,3.008,1.35,3.008,3.008 C25.639,10.941,24.289,12.291,22.631,12.291z"
                              fill="#2b7cee"
                            />
                          </svg>
                        </div>
                        <h3 className="mt-3 text-xs sm:text-sm md:text-base font-semibold text-[var(--foreground)]">Launch and Grow</h3>
                        <p className="hidden sm:block mt-1 text-[10px] sm:text-xs md:text-sm text-[var(--muted-foreground)]">We handle the launch, hosting, and all future updates, so you can enjoy a worry-free online presence.</p>
                      </motion.li>
                      </motion.ul>
                    </div>
                  </div>
                  <div className="pt-6 px-6 pb-4 md:grid md:grid-cols-[1fr_auto] md:gap-6 md:items-end">
                <div>
                  <motion.p
                    className="text-lg md:text-xl font-semibold text-[var(--foreground)] opacity-0"
                    variants={fadeUp}
                    initial={reduce ? false : "hidden"}
                    animate={reduce ? undefined : (cardRevealed ? "visible" : "hidden")}
                    transition={{ delay: reduce ? 0 : 0.08 }}
                  >
                    Done‑for‑you website and hosting. Unlimited edit requests via the client portal. Built to bring in calls.
                  </motion.p>
                  <div className="mt-2">
                    <StarRating align="left" start={reduce ? true : cardRevealed} />
                  </div>
                  <motion.h2
                    className="mt-4 font-semibold text-[var(--foreground)] opacity-0"
                    variants={fadeUp}
                    initial={reduce ? false : "hidden"}
                    animate={reduce ? undefined : (cardRevealed ? "visible" : "hidden")}
                    transition={{ delay: reduce ? 0 : 0.16 }}
                  >
                    All‑inclusive plan
                  </motion.h2>
                  <motion.ul
                    className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]"
                    variants={containerStagger}
                    initial={reduce ? false : "hidden"}
                    animate={reduce ? undefined : (cardRevealed ? "visible" : "hidden")}
                    transition={{ delay: reduce ? 0 : 0.20 }}
                  >
                    <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                      <span>$199/mo • $0 down</span>
                    </li>
                    <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[hsl(var(--primary))]" />
                      <span>72‑hour go‑live from build</span>
                    </li>
                    <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                      <span>Unlimited edit requests via the client portal</span>
                    </li>
                  </motion.ul>
                </div>
                {/* CTAs on large screens inside the card, bottom-right */}
                <motion.div
                  data-floating-cta-anchor
                  className="hidden md:flex flex-col items-end gap-3 md:justify-self-end md:self-end opacity-0"
                  variants={fadeUp}
                  initial={reduce ? false : "hidden"}
                  animate={reduce ? undefined : (cardRevealed ? "visible" : "hidden")}
                  transition={{ delay: reduce ? 0 : 0.36 }}
                >
                  <div className="flex flex-row items-center gap-3">
                    <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap">
                      Schedule Call
                    </Link>
                    <Link href="/onboarding?utm_source=lp&cta=hero" className="btn-cta inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap">
                      Start Onboarding
                    </Link>
                  </div>
                </motion.div>
                  </div>
                </motion.div>
              </div>
            </MotionConfig>
          </LazyMotion>
            {/* CTAs on mobile below the card */}
            <div className="mt-4 md:hidden">
              <div
                data-floating-cta-anchor
                className="grid grid-cols-2 gap-3"
              >
                <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-secondary w-full inline-flex items-center justify-center gap-2 px-6 py-2 whitespace-nowrap">
                  Schedule Call
                </Link>
                <Link href="/onboarding?utm_source=lp&cta=hero" className="btn-cta w-full inline-flex items-center justify-center gap-2 px-6 py-2 whitespace-nowrap">
                  Start Onboarding
                </Link>
              </div>
            </div>
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
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Elite performance</span></li>
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
                        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Unlimited edit requests</span></li>
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
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Elite performance</span></li>
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
                <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-secondary w-full inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap">
                  Schedule Call
                </Link>
                <Link href="/onboarding?utm_source=lp&cta=final" className="btn-cta w-full inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap">
                  Start Onboarding
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
