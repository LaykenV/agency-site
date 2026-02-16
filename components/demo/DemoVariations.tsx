"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type DemoData = {
  businessName: string;
  description: string;
  phone?: string;
  primaryColor?: string;
  imageUrl?: string;
  review?: {
    author: string;
    text: string;
    rating: number;
  };
};

const CAL_LINK =
  "https://cal.com/layken-varholdt/agency-prospect?utm_source=demo&utm_medium=cta&utm_campaign=marketing";

function renderStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(clamped)}${"☆".repeat(5 - clamped)}`;
}

function callHref(phone?: string) {
  return phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
}

function StarIcons({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="h-4 w-4"
          fill={i < Math.round(rating) ? color : "#d1d5db"}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIATION 1 — CLEAN CARD
// White bg, stacked cards, rounded corners,
// the business's color as a warm accent stripe
// ─────────────────────────────────────────────
function CleanCard({ data }: { data: DemoData }) {
  const color = data.primaryColor ?? "#2563eb";
  return (
    <div className="min-h-screen bg-[#f8f9fb] pb-24">
      {/* Accent top stripe */}
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
        {/* Logo / Business Name */}
        <div className="text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg"
            style={{ backgroundColor: color }}
          >
            {data.businessName.charAt(0)}
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {data.businessName}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-500">
            {data.description}
          </p>
        </div>

        {/* Image card */}
        {data.imageUrl ? (
          <div className="mt-10 overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
            <img
              src={data.imageUrl}
              alt={data.businessName}
              className="h-56 w-full object-cover md:h-72"
            />
          </div>
        ) : null}

        {/* Review card */}
        {data.review ? (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 md:p-8">
            <StarIcons rating={data.review.rating} color={color} />
            <blockquote className="mt-3 text-[15px] leading-relaxed text-slate-700">
              &ldquo;{data.review.text}&rdquo;
            </blockquote>
            <p className="mt-3 text-sm font-medium text-slate-400">
              — {data.review.author}
            </p>
          </div>
        ) : null}

        {/* CTA card */}
        <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 md:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Ready for a website that works as hard as you do?
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            $0 down &middot; launched in 72 hours &middot; updated monthly
          </p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={CAL_LINK}
              className="inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] sm:w-auto"
              style={{
                backgroundColor: color,
                boxShadow: `0 4px 14px ${color}35`,
              }}
            >
              Schedule a Free Call
            </a>
            {callHref(data.phone) ? (
              <a
                href={callHref(data.phone)}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 sm:w-auto"
              >
                Call {data.phone}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIATION 2 — SPLIT HERO
// Big left/right split with image prominence,
// bold CTA, strong trust signals, very direct
// ─────────────────────────────────────────────
function SplitHero({ data }: { data: DemoData }) {
  const color = data.primaryColor ?? "#2563eb";
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Image — full width on mobile, right half on desktop */}
      <div className="relative h-64 bg-slate-100 md:fixed md:inset-y-0 md:right-0 md:h-auto md:w-1/2">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.businessName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}
          >
            <span className="text-8xl font-bold" style={{ color: `${color}20` }}>
              {data.businessName.charAt(0)}
            </span>
          </div>
        )}
        {/* Review floating card — only on desktop over image */}
        {data.review ? (
          <div className="absolute bottom-6 left-6 right-6 hidden rounded-xl bg-white/95 p-5 shadow-xl backdrop-blur md:block md:right-auto md:max-w-sm">
            <StarIcons rating={data.review.rating} color={color} />
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              &ldquo;{data.review.text}&rdquo;
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              — {data.review.author}
            </p>
          </div>
        ) : null}
      </div>

      {/* Text content — full width on mobile, left half on desktop */}
      <div className="relative md:w-1/2">
        <div className="px-6 py-10 md:px-12 md:py-20 lg:px-20">
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: color }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/60" />
            Website Preview
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            {data.businessName}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500">
            {data.description}
          </p>

          {/* CTA row */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={CAL_LINK}
              className="inline-flex items-center rounded-xl px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: color,
                boxShadow: `0 6px 20px ${color}30`,
              }}
            >
              Schedule a Free Call
            </a>
            {callHref(data.phone) ? (
              <a
                href={callHref(data.phone)}
                className="inline-flex items-center rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Call {data.phone}
              </a>
            ) : null}
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center gap-4 text-[12px] text-slate-400 md:gap-5">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              $0 down
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              72-hr launch
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Unlimited edits
            </span>
          </div>

          {/* Review — inline on mobile */}
          {data.review ? (
            <div className="mt-10 rounded-xl bg-slate-50 p-5 md:hidden">
              <StarIcons rating={data.review.rating} color={color} />
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                &ldquo;{data.review.text}&rdquo;
              </p>
              <p className="mt-2 text-xs font-medium text-slate-400">
                — {data.review.author}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIATION 3 — EDITORIAL / MAGAZINE
// Serif type, asymmetric layout, fine lines
// ─────────────────────────────────────────────
function Editorial({ data }: { data: DemoData }) {
  const color = data.primaryColor ?? "#1a1a1a";
  return (
    <div className="min-h-screen bg-[#faf9f6] pb-24">
      {/* Masthead */}
      <header className="border-b border-black/10 px-6 py-6 text-center">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.5em]"
          style={{ color }}
        >
          Acadiana Web Design Presents
        </p>
        <div
          className="mx-auto mt-2 h-px w-12"
          style={{ backgroundColor: color }}
        />
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-20">
        {/* Title block */}
        <div className="text-center">
          <h1
            className="text-5xl font-light leading-[1.1] tracking-tight md:text-7xl lg:text-8xl"
            style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              color: "#1a1a1a",
            }}
          >
            {data.businessName}
          </h1>
          <div className="mx-auto mt-6 h-px w-24 bg-black/20" />
          <p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-black/50"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            {data.description}
          </p>
        </div>

        {/* Image — full bleed with overlap */}
        {data.imageUrl ? (
          <div className="relative mx-auto mt-12 max-w-3xl">
            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={data.imageUrl}
                alt={data.businessName}
                className="h-full w-full object-cover grayscale transition-all duration-700 hover:grayscale-0"
              />
            </div>
            <div
              className="absolute -bottom-3 -right-3 h-full w-full border"
              style={{ borderColor: `${color}30` }}
            />
          </div>
        ) : null}

        {/* Review — pull quote style */}
        {data.review ? (
          <div className="mx-auto mt-20 max-w-2xl text-center">
            <div
              className="mx-auto mb-6 h-8 w-px"
              style={{ backgroundColor: color }}
            />
            <blockquote
              className="text-2xl font-light italic leading-relaxed text-black/80 md:text-3xl"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              &ldquo;{data.review.text}&rdquo;
            </blockquote>
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.3em] text-black/40">
              {data.review.author} · {renderStars(data.review.rating)}
            </p>
            <div
              className="mx-auto mt-6 h-8 w-px"
              style={{ backgroundColor: color }}
            />
          </div>
        ) : null}

        {/* CTA — minimal */}
        <div className="mx-auto mt-16 max-w-md text-center">
          <p
            className="text-sm uppercase tracking-[0.2em] text-black/40"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Begin the conversation
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <a
              href={CAL_LINK}
              className="inline-flex items-center gap-2 border px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] transition-all hover:bg-black hover:text-white"
              style={{ borderColor: color, color }}
            >
              Schedule a Call
            </a>
            {callHref(data.phone) ? (
              <a
                href={callHref(data.phone)}
                className="text-xs tracking-wider text-black/40 underline underline-offset-4 transition-colors hover:text-black"
              >
                Or call {data.phone}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIATION 4 — ORGANIC / WARM / SOFT
// Rounded shapes, warm palette, natural feel
// ─────────────────────────────────────────────
function Organic({ data }: { data: DemoData }) {
  const color = data.primaryColor ?? "#c2703e";
  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: `linear-gradient(180deg, #fef9f3 0%, #f5ebe0 100%)`,
      }}
    >
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-20">
        {/* Pill label */}
        <div className="flex justify-center">
          <span
            className="rounded-full border px-4 py-1.5 text-[11px] font-medium tracking-wide"
            style={{
              borderColor: `${color}30`,
              color,
              backgroundColor: `${color}10`,
            }}
          >
            Your Website Preview
          </span>
        </div>

        {/* Title */}
        <h1
          className="mt-8 text-center text-4xl font-semibold leading-tight tracking-tight md:text-6xl"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            color: "#2c1810",
          }}
        >
          {data.businessName}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-center text-base leading-relaxed text-[#6b5344]">
          {data.description}
        </p>

        {/* Image — blob mask */}
        {data.imageUrl ? (
          <div className="relative mx-auto mt-12 max-w-lg">
            <div
              className="absolute -inset-4 rounded-[3rem] opacity-20 blur-2xl"
              style={{ backgroundColor: color }}
            />
            <div className="relative overflow-hidden rounded-[2rem] shadow-2xl">
              <img
                src={data.imageUrl}
                alt={data.businessName}
                className="h-72 w-full object-cover md:h-96"
              />
            </div>
          </div>
        ) : null}

        {/* Review card */}
        {data.review ? (
          <div className="mx-auto mt-14 max-w-lg rounded-3xl bg-white/80 p-8 shadow-sm backdrop-blur">
            <StarIcons rating={data.review.rating} color={color} />
            <blockquote
              className="mt-4 text-lg leading-relaxed"
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                color: "#3d2a1e",
              }}
            >
              &ldquo;{data.review.text}&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-medium text-[#8b6f5e]">
              {data.review.author}
            </p>
          </div>
        ) : null}

        {/* CTA */}
        <div className="mt-14 text-center">
          <a
            href={CAL_LINK}
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
            style={{
              backgroundColor: color,
              boxShadow: `0 8px 30px ${color}40`,
            }}
          >
            Schedule a Call
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
          {callHref(data.phone) ? (
            <p className="mt-4 text-sm text-[#8b6f5e]">
              or call{" "}
              <a
                href={callHref(data.phone)}
                className="underline underline-offset-2"
                style={{ color }}
              >
                {data.phone}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIATION 5 — LUXURY / DARK / CINEMATIC
// Dark bg, gold accents, dramatic imagery
// ─────────────────────────────────────────────
function Luxury({ data }: { data: DemoData }) {
  const gold = "#c9a96e";
  return (
    <div className="min-h-screen bg-[#0c0c0c] pb-24 text-white">
      {/* Full-bleed hero */}
      <div className="relative">
        {data.imageUrl ? (
          <>
            <img
              src={data.imageUrl}
              alt={data.businessName}
              className="h-[50vh] w-full object-cover md:h-[60vh]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/60 to-transparent" />
          </>
        ) : (
          <div className="h-[40vh] bg-gradient-to-b from-[#1a1a1a] to-[#0c0c0c]" />
        )}
        {/* Overlay content */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-12 md:px-12 md:pb-16">
          <div className="mx-auto max-w-5xl">
            <div
              className="mb-4 h-px w-16"
              style={{ backgroundColor: gold }}
            />
            <p
              className="text-[10px] font-medium uppercase tracking-[0.5em]"
              style={{ color: gold }}
            >
              Website Preview
            </p>
            <h1
              className="mt-3 text-4xl font-light leading-[1.1] tracking-tight md:text-7xl"
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
              }}
            >
              {data.businessName}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 md:px-12">
        {/* Description */}
        <div className="grid gap-12 py-16 md:grid-cols-[1fr_1px_1fr] md:py-24">
          <div>
            <p className="max-w-md text-base leading-relaxed text-white/50">
              {data.description}
            </p>
          </div>
          <div className="hidden md:block" style={{ backgroundColor: `${gold}20` }} />
          <div className="flex flex-col justify-center">
            {data.review ? (
              <>
                <blockquote
                  className="text-lg font-light italic leading-relaxed text-white/70"
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                  }}
                >
                  &ldquo;{data.review.text}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className="h-px w-8"
                    style={{ backgroundColor: gold }}
                  />
                  <span className="text-xs uppercase tracking-[0.3em] text-white/30">
                    {data.review.author}
                  </span>
                  <span className="text-xs" style={{ color: gold }}>
                    {renderStars(data.review.rating)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/30">
                Discover what we can build together.
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div
          className="border-t py-16 md:py-20"
          style={{ borderColor: `${gold}15` }}
        >
          <div className="flex flex-col items-center text-center">
            <p
              className="text-xs uppercase tracking-[0.4em]"
              style={{ color: gold }}
            >
              The next step
            </p>
            <h2
              className="mt-4 text-3xl font-light md:text-4xl"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              Ready to elevate your presence?
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href={CAL_LINK}
                className="group relative overflow-hidden border px-10 py-4 text-xs font-medium uppercase tracking-[0.3em] transition-colors"
                style={{ borderColor: gold, color: gold }}
              >
                <span className="relative z-10 transition-colors group-hover:text-black">
                  Schedule a Call
                </span>
                <div
                  className="absolute inset-0 translate-y-full transition-transform group-hover:translate-y-0"
                  style={{ backgroundColor: gold }}
                />
              </a>
              {callHref(data.phone) ? (
                <a
                  href={callHref(data.phone)}
                  className="border border-white/10 px-10 py-4 text-xs uppercase tracking-[0.3em] text-white/40 transition-colors hover:border-white/30 hover:text-white/70"
                >
                  Call {data.phone}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLE PICKER
// ─────────────────────────────────────────────
const STYLES = [
  { id: 0, label: "Classic", desc: "Clean & professional" },
  { id: 1, label: "Modern", desc: "Minimal cards" },
  { id: 2, label: "Bold", desc: "Big hero image" },
  { id: 3, label: "Elegant", desc: "Refined & editorial" },
  { id: 4, label: "Warm", desc: "Soft & inviting" },
  { id: 5, label: "Premium", desc: "Dark & cinematic" },
] as const;

type DemoVariationsProps = {
  data: DemoData;
  originalContent: React.ReactNode;
};

export function DemoVariations({ data, originalContent }: DemoVariationsProps) {
  const [active, setActive] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const current = STYLES[active];

  return (
    <>
      {/* Backdrop — closes picker on tap outside */}
      <AnimatePresence>
        {pickerOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={() => setPickerOpen(false)}
          />
        ) : null}
      </AnimatePresence>

      {/* Floating style picker — anchored bottom-right, above banner */}
      <div className="fixed bottom-16 right-4 z-50 flex flex-col items-end md:bottom-[72px] md:right-6">
        {/* Menu — grows upward from button */}
        <AnimatePresence>
          {pickerOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{ transformOrigin: "bottom right" }}
              className="mb-2 w-56 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            >
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold text-slate-900">Choose your style</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Tap any option to preview it</p>
              </div>
              <motion.div
                className="p-1.5"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
                }}
              >
                {STYLES.map((s) => (
                  <motion.button
                    key={s.id}
                    variants={{
                      hidden: { opacity: 0, x: -8 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    onClick={() => {
                      setActive(s.id);
                      setPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active === s.id
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        active === s.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {s.id + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${active === s.id ? "text-slate-900" : "text-slate-700"}`}>
                        {s.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{s.desc}</p>
                    </div>
                    {active === s.id ? (
                      <motion.svg
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.1 }}
                        className="ml-auto h-4 w-4 shrink-0 text-slate-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </motion.svg>
                    ) : null}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Toggle button — always anchored here */}
        <motion.button
          onClick={() => setPickerOpen(!pickerOpen)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-lg ring-1 ring-slate-200"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-xs font-medium text-slate-700">
            {current?.label}
          </span>
          <motion.svg
            animate={{ rotate: pickerOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="h-3 w-3 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </motion.button>
      </div>

      {/* Active variation */}
      {active === 0 && originalContent}
      {active === 1 && <CleanCard data={data} />}
      {active === 2 && <SplitHero data={data} />}
      {active === 3 && <Editorial data={data} />}
      {active === 4 && <Organic data={data} />}
      {active === 5 && <Luxury data={data} />}
    </>
  );
}
