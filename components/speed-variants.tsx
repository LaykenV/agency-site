"use client";

import { useEffect, useRef, useState } from "react";
import {
  m as motion,
  useInView,
  useMotionValue,
  animate,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  Gauge,
  MousePointerClick,
  ShieldCheck,
  TrendingUp,
  Timer,
  Zap,
} from "lucide-react";
import { fadeUp, sectionReveal } from "@/components/animations";

/* ─── copy ─── */
const SECTION_LABEL = "Why Speed Matters";
const HEADLINE = "Fast pages rank higher and convert better.";
const BODY =
  "Google directly rewards faster sites. Customers do too. If your page stalls for even a few seconds, they bounce and call your competitor instead.";
const BENEFITS = [
  {
    icon: TrendingUp,
    text: 'Show up when someone Googles "plumber near me" in your area.',
  },
  {
    icon: MousePointerClick,
    text: "More call clicks and form submissions on mobile.",
  },
  {
    icon: ShieldCheck,
    text: "Visitors trust you before they even scroll.",
  },
];

/* ─── Mobile browser card with gauge ring ─── */
function MobileBrowser({
  label,
  loadTime,
  fast,
  score,
  reduce,
}: {
  label: string;
  loadTime: string;
  fast: boolean;
  score: number;
  reduce: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  const r = 32;
  const C = 2 * Math.PI * r;
  const mv = useMotionValue(reduce ? score : 0);
  const offset = useTransform(mv, (v) => C - (C * v) / 100);
  const [n, setN] = useState(reduce ? score : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    const delay = fast ? 800 : 3000;
    const timeout = setTimeout(() => {
      animate(mv, score, { duration: 1, ease: "easeOut" });
      animate(0, score, {
        duration: 1,
        ease: "easeOut",
        onUpdate: (v) => setN(Math.round(v)),
      });
    }, delay);
    return () => clearTimeout(timeout);
  }, [inView, score, fast, mv, reduce]);

  return (
    <div
      ref={ref}
      className={`flex-1 min-w-0 rounded-2xl border-2 overflow-hidden ${
        fast
          ? "border-[hsl(var(--primary))]/30 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.2)]"
          : "border-[hsl(var(--border))] opacity-80"
      }`}
    >
      {/* Phone chrome */}
      <div
        className={`px-3 py-2 flex items-center justify-center border-b ${
          fast
            ? "border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/[0.06]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40"
        }`}
      >
        <div
          className={`rounded-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            fast
              ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
              : "bg-[hsl(var(--muted))] text-[var(--muted-foreground)]"
          }`}
        >
          {label}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-5 sm:py-6 flex flex-col items-center">
        {/* Loading bar */}
        <div className="w-full h-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
          <motion.div
            className={`h-full rounded-full ${
              fast
                ? "bg-[hsl(var(--primary))]"
                : "bg-[hsl(var(--destructive))]/40"
            }`}
            initial={reduce ? false : { width: 0 }}
            animate={reduce ? { width: "100%" } : inView ? { width: "100%" } : { width: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    duration: fast ? 0.6 : 2.8,
                    delay: 0.3,
                    ease: fast ? [0.22, 1, 0.36, 1] : "linear",
                  }
            }
          />
        </div>

        {/* Gauge ring */}
        <motion.div
          className="mt-4 flex flex-col items-center gap-2"
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={reduce ? undefined : inView ? { opacity: 1, scale: 1 } : {}}
          transition={reduce ? { duration: 0 } : { delay: fast ? 1.0 : 3.4, duration: 0.3 }}
        >
          <div className="relative">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="5"
                strokeLinecap="round"
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                }}
              />
              <motion.circle
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke={
                  fast
                    ? "hsl(var(--primary))"
                    : "hsl(var(--destructive) / 0.5)"
                }
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={C}
                style={
                  {
                    strokeDashoffset: offset,
                    transform: "rotate(-90deg)",
                    transformOrigin: "center",
                  } as unknown as React.CSSProperties
                }
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-base font-extrabold font-[family-name:var(--font-display)] ${
                  fast
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                {n}%
              </span>
            </div>
          </div>

          {/* Timer pill */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              fast
                ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "bg-[hsl(var(--muted))] text-[var(--muted-foreground)]"
            }`}
          >
            <Timer className="h-2.5 w-2.5" />
            {loadTime}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Exported section ─── */
export function SpeedVariant5() {
  const reduce = !!useReducedMotion();
  const initial = reduce ? false : "hidden";

  return (
    <motion.section
      id="speed"
      className="anchor-target"
      initial={initial}
      whileInView={reduce ? undefined : "visible"}
      viewport={{ once: true, amount: 0.18 }}
      variants={sectionReveal}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        {/* Centered header */}
        <motion.div className="text-center" variants={fadeUp}>
          <div className="inline-flex items-center gap-3">
            <div className="h-px w-8 bg-[hsl(var(--primary))]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))] sm:text-xs">
              {SECTION_LABEL}
            </span>
            <div className="h-px w-8 bg-[hsl(var(--primary))]" />
          </div>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl font-[family-name:var(--font-display)]">
            {HEADLINE}
          </h2>
        </motion.div>

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16 sm:mt-12">
          {/* Left: Two mobile browsers side by side */}
          <motion.div className="relative flex flex-col items-center text-center" variants={fadeUp}>
            {/* Decorative glow */}
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-3xl opacity-60"
              style={{
                background:
                  "radial-gradient(400px 300px at 50% 50%, hsl(var(--primary) / 0.10), transparent 70%)",
              }}
            />

            {/* Phone pair */}
            <div className="flex gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm">
              <MobileBrowser label="Our Build" loadTime="0.9s" fast score={95} reduce={reduce} />
              <MobileBrowser label="Typical" loadTime="3.9s" fast={false} score={62} reduce={reduce} />
            </div>

            {/* 4.3x faster badge */}
            <div className="mt-5 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
              <span className="text-sm font-bold text-[hsl(var(--primary))]">
                4.3x faster
              </span>
            </div>

            {/* Hand-tuned badge */}
            <div className="mt-2 flex items-center justify-center gap-2">
              <Gauge className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Hand-tuned for speed
              </span>
            </div>
          </motion.div>

          {/* Right: Copy */}
          <motion.div className="text-center lg:text-left" variants={fadeUp}>
            <p className="mx-auto lg:mx-0 max-w-[48ch] text-base leading-snug font-semibold tracking-tight text-[var(--foreground)] sm:text-lg md:text-xl font-[family-name:var(--font-display)]">
              {BODY}
            </p>
            <ul className="mt-5 space-y-2.5 text-sm sm:text-base inline-block text-left">
              {BENEFITS.map((b) => (
                <li
                  key={b.text}
                  className="flex items-start gap-2.5 text-[var(--foreground)]"
                >
                  <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
