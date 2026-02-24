"use client";

import { useState, useEffect, useCallback } from "react";
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

function PhoneIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// VARIANT 0 — CLASSIC
// Clean full-page business site with hero,
// services hint, testimonial, phone CTA footer
// ─────────────────────────────────────────────
function Classic({ data, isPortrait }: { data: DemoData; isPortrait: boolean }) {
  const color = data.primaryColor ?? "#2563eb";
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Hero */}
      {data.imageUrl ? (
        isPortrait ? (
          <div className="mx-auto grid max-w-6xl gap-0 md:grid-cols-2">
            <div className="flex flex-col justify-center px-6 py-12 md:px-12 md:py-20">
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-5xl">
                {data.businessName}
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500">
                {data.description}
              </p>
              {callHref(data.phone) ? (
                <a
                  href={callHref(data.phone)}
                  className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: color, boxShadow: `0 4px 14px ${color}35` }}
                >
                  <PhoneIcon />
                  Call {data.phone}
                </a>
              ) : null}
            </div>
            <div className="relative h-72 md:h-auto md:min-h-[500px]">
              <img src={data.imageUrl} alt={data.businessName} className="h-full w-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="relative h-[50vh] min-h-[350px] md:h-[60vh]">
            <img src={data.imageUrl} alt={data.businessName} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-6 pb-10 md:px-12 md:pb-14">
              <div className="mx-auto max-w-5xl">
                <h1 className="text-4xl font-bold leading-[1.1] text-white md:text-6xl">
                  {data.businessName}
                </h1>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-white/80">
                  {data.description}
                </p>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="mx-auto max-w-5xl px-6 py-16 md:px-12 md:py-24">
          <div
            className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {data.businessName.charAt(0)}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            {data.businessName}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
            {data.description}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 md:px-12">
        {/* Services hint */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Quality Service",
              desc: "Dedicated to delivering results that exceed expectations",
              icon: (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
            },
            {
              label: "Local Expertise",
              desc: "Deep roots in the community with years of trusted experience",
              icon: (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
            },
            {
              label: "Customer First",
              desc: "Your satisfaction is at the heart of everything we do",
              icon: (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-5">
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: color }}
              >
                {item.icon}
              </div>
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Review */}
        {data.review ? (
          <div className="mt-12 rounded-2xl bg-slate-50 p-6 md:p-8">
            <StarIcons rating={data.review.rating} color={color} />
            <blockquote className="mt-3 text-[15px] leading-relaxed text-slate-700">
              &ldquo;{data.review.text}&rdquo;
            </blockquote>
            <p className="mt-3 text-sm font-medium text-slate-400">
              — {data.review.author}
            </p>
          </div>
        ) : null}

        {/* Phone CTA footer */}
        {callHref(data.phone) ? (
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-400">Ready to get started?</p>
            <a
              href={callHref(data.phone)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: color, boxShadow: `0 6px 20px ${color}30` }}
            >
              <PhoneIcon />
              Call {data.phone}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 1 — MODERN
// Minimal geometric, grid-based, thin borders
// ─────────────────────────────────────────────
function Modern({ data, isPortrait }: { data: DemoData; isPortrait: boolean }) {
  const color = data.primaryColor ?? "#2563eb";
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Nav bar */}
      <nav className="border-b border-slate-100 px-6 py-4 md:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-sm font-bold tracking-tight text-slate-900">{data.businessName}</span>
          {callHref(data.phone) ? (
            <a href={callHref(data.phone)} className="text-xs font-medium" style={{ color }}>
              {data.phone}
            </a>
          ) : null}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-12 md:px-12 md:py-20">
        {/* Hero grid */}
        {data.imageUrl ? (
          isPortrait ? (
            <div className="grid gap-8 md:grid-cols-[1fr_320px]">
              <div className="flex flex-col justify-center">
                <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                  {data.businessName}
                </h1>
                <div className="mt-4 h-px w-16" style={{ backgroundColor: color }} />
                <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500">
                  {data.description}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <img src={data.imageUrl} alt={data.businessName} className="h-80 w-full object-cover md:h-full" />
              </div>
            </div>
          ) : (
            <div>
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <img src={data.imageUrl} alt={data.businessName} className="h-64 w-full object-cover md:h-80" />
              </div>
              <div className="mt-10">
                <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
                  {data.businessName}
                </h1>
                <div className="mt-4 h-px w-16" style={{ backgroundColor: color }} />
                <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
                  {data.description}
                </p>
              </div>
            </div>
          )
        ) : (
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              {data.businessName}
            </h1>
            <div className="mt-4 h-px w-16" style={{ backgroundColor: color }} />
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-500">
              {data.description}
            </p>
          </div>
        )}

        {/* Info grid */}
        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 sm:grid-cols-3">
          {["About", "Service", "Contact"].map((label, i) => (
            <div key={label} className="bg-white p-6">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-300">{label}</p>
              <p className="mt-2 text-sm text-slate-600">
                {i === 0 && data.description.slice(0, 80) + (data.description.length > 80 ? "…" : "")}
                {i === 1 && `Professional services by ${data.businessName}`}
                {i === 2 && (data.phone ?? "Get in touch")}
              </p>
            </div>
          ))}
        </div>

        {/* Review */}
        {data.review ? (
          <div className="mt-12 border-l-2 pl-6" style={{ borderColor: color }}>
            <StarIcons rating={data.review.rating} color={color} />
            <blockquote className="mt-3 text-base leading-relaxed text-slate-700">
              &ldquo;{data.review.text}&rdquo;
            </blockquote>
            <p className="mt-3 text-sm font-medium text-slate-400">— {data.review.author}</p>
          </div>
        ) : null}

        {/* Phone CTA */}
        {callHref(data.phone) ? (
          <div className="mt-16 flex flex-col gap-4 rounded-2xl border border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <div>
              <p className="text-lg font-bold text-slate-900">Get in touch</p>
              <p className="mt-1 text-sm text-slate-400">We&apos;d love to hear from you</p>
            </div>
            <a
              href={callHref(data.phone)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white sm:w-auto"
              style={{ backgroundColor: color }}
            >
              <PhoneIcon />
              Call {data.phone}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 2 — BOLD
// Full-viewport dramatic hero, dark overlay,
// massive typography, strong color accent CTA
// ─────────────────────────────────────────────
function Bold({ data }: { data: DemoData }) {
  const color = data.primaryColor ?? "#2563eb";
  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      {/* Full-screen hero */}
      <div className="relative flex min-h-screen items-end">
        {data.imageUrl ? (
          <>
            <img
              src={data.imageUrl}
              alt={data.businessName}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
        )}

        <div className="relative w-full px-6 pb-16 pt-32 md:px-12 md:pb-24">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl lg:text-8xl">
              {data.businessName}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">
              {data.description}
            </p>
            {callHref(data.phone) ? (
              <a
                href={callHref(data.phone)}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold text-white shadow-2xl transition-transform hover:scale-105"
                style={{ backgroundColor: color, boxShadow: `0 8px 30px ${color}50` }}
              >
                <PhoneIcon />
                Call {data.phone}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Review section */}
      {data.review ? (
        <div className="mx-auto max-w-5xl px-6 py-16 md:px-12 md:py-24">
          <div className="flex items-start gap-6">
            <div className="hidden h-24 w-1 shrink-0 rounded-full md:block" style={{ backgroundColor: color }} />
            <div>
              <StarIcons rating={data.review.rating} color={color} />
              <blockquote className="mt-4 text-xl font-light leading-relaxed text-white/80 md:text-2xl">
                &ldquo;{data.review.text}&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-medium text-white/40">— {data.review.author}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Bottom CTA */}
      {callHref(data.phone) ? (
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="border-t border-white/10 pt-12 text-center">
            <p className="text-sm uppercase tracking-widest text-white/30">Ready to connect?</p>
            <a
              href={callHref(data.phone)}
              className="mt-4 inline-flex items-center gap-2 text-lg font-semibold transition-colors hover:opacity-80"
              style={{ color }}
            >
              <PhoneIcon />
              {data.phone}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 3 — ELEGANT
// Serif editorial, masthead, fine dividers,
// grayscale image, pull-quote review
// ─────────────────────────────────────────────
function Elegant({ data, isPortrait }: { data: DemoData; isPortrait: boolean }) {
  const color = data.primaryColor ?? "#1a1a1a";
  const serif = "'Georgia', 'Times New Roman', serif";
  return (
    <div className="min-h-screen bg-[#faf9f6] pb-24">
      {/* Masthead */}
      <header className="border-b border-black/10 px-6 py-6 text-center">
        <h1
          className="text-lg font-normal tracking-[0.15em]"
          style={{ fontFamily: serif, color }}
        >
          {data.businessName}
        </h1>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-20">
        {/* Title block */}
        <div className="text-center">
          <h2
            className="text-5xl font-light leading-[1.1] tracking-tight md:text-7xl lg:text-8xl"
            style={{ fontFamily: serif, color: "#1a1a1a" }}
          >
            {data.businessName}
          </h2>
          <div className="mx-auto mt-6 h-px w-24 bg-black/20" />
          <p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-black/50"
            style={{ fontFamily: serif }}
          >
            {data.description}
          </p>
        </div>

        {/* Image */}
        {data.imageUrl ? (
          <div className="relative mx-auto mt-12 max-w-3xl">
            {isPortrait ? (
              <div className="mx-auto max-w-sm">
                <div className="overflow-hidden border border-black/10 p-3">
                  <img
                    src={data.imageUrl}
                    alt={data.businessName}
                    className="w-full object-cover grayscale transition-all duration-700 hover:grayscale-0"
                  />
                </div>
              </div>
            ) : (
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={data.imageUrl}
                  alt={data.businessName}
                  className="h-full w-full object-cover grayscale transition-all duration-700 hover:grayscale-0"
                />
              </div>
            )}
            <div
              className="absolute -bottom-3 -right-3 h-full w-full border"
              style={{ borderColor: `${color}30` }}
            />
          </div>
        ) : null}

        {/* Review — pull quote style */}
        {data.review ? (
          <div className="mx-auto mt-20 max-w-2xl text-center">
            <div className="mx-auto mb-6 h-8 w-px" style={{ backgroundColor: color }} />
            <blockquote
              className="text-2xl font-light italic leading-relaxed text-black/80 md:text-3xl"
              style={{ fontFamily: serif }}
            >
              &ldquo;{data.review.text}&rdquo;
            </blockquote>
            <p className="mt-6 text-xs font-medium uppercase tracking-[0.3em] text-black/40">
              {data.review.author} · {renderStars(data.review.rating)}
            </p>
            <div className="mx-auto mt-6 h-8 w-px" style={{ backgroundColor: color }} />
          </div>
        ) : null}

        {/* Phone CTA */}
        {callHref(data.phone) ? (
          <div className="mx-auto mt-16 max-w-md text-center">
            <p
              className="text-sm uppercase tracking-[0.2em] text-black/40"
              style={{ fontFamily: serif }}
            >
              Get in touch
            </p>
            <div className="mt-6">
              <a
                href={callHref(data.phone)}
                className="inline-flex items-center gap-2 border px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] transition-all hover:bg-black hover:text-white"
                style={{ borderColor: color, color }}
              >
                <PhoneIcon />
                Call {data.phone}
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 4 — WARM
// Soft rounded shapes, warm earth tones,
// friendly serif headings, blob shadows
// ─────────────────────────────────────────────
function Warm({ data }: { data: DemoData }) {
  const color = data.primaryColor ?? "#c2703e";
  const serif = "'Georgia', 'Times New Roman', serif";
  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "linear-gradient(180deg, #fef9f3 0%, #f5ebe0 100%)" }}
    >
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-20">
        {/* Title */}
        <h1
          className="text-center text-4xl font-semibold leading-tight tracking-tight md:text-6xl"
          style={{ fontFamily: serif, color: "#2c1810" }}
        >
          {data.businessName}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-center text-base leading-relaxed text-[#6b5344]">
          {data.description}
        </p>

        {/* Image — rounded with blob shadow */}
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
              style={{ fontFamily: serif, color: "#3d2a1e" }}
            >
              &ldquo;{data.review.text}&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-medium text-[#8b6f5e]">
              {data.review.author}
            </p>
          </div>
        ) : null}

        {/* Phone CTA */}
        {callHref(data.phone) ? (
          <div className="mt-14 text-center">
            <a
              href={callHref(data.phone)}
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: color, boxShadow: `0 8px 30px ${color}40` }}
            >
              <PhoneIcon />
              Call {data.phone}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VARIANT 5 — PREMIUM
// Dark cinematic, near-black bg, gold accents,
// dramatic imagery, split content grid
// ─────────────────────────────────────────────
function Premium({ data, isPortrait }: { data: DemoData; isPortrait: boolean }) {
  const gold = "#c9a96e";
  const serif = "'Georgia', 'Times New Roman', serif";
  return (
    <div className="min-h-screen bg-[#0c0c0c] pb-24 text-white">
      {/* Hero */}
      <div className="relative">
        {data.imageUrl ? (
          isPortrait ? (
            <div className="mx-auto grid max-w-6xl md:grid-cols-[1fr_400px]">
              <div className="flex flex-col justify-center px-6 py-16 md:px-12 md:py-24">
                <div className="mb-4 h-px w-16" style={{ backgroundColor: gold }} />
                <h1
                  className="text-4xl font-light leading-[1.1] tracking-tight md:text-6xl"
                  style={{ fontFamily: serif }}
                >
                  {data.businessName}
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-white/50">
                  {data.description}
                </p>
              </div>
              <div className="relative h-72 md:h-auto">
                <img src={data.imageUrl} alt={data.businessName} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0c] via-transparent to-transparent md:block hidden" />
              </div>
            </div>
          ) : (
            <>
              <img
                src={data.imageUrl}
                alt={data.businessName}
                className="h-[50vh] w-full object-cover md:h-[60vh]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-6 pb-12 md:px-12 md:pb-16">
                <div className="mx-auto max-w-5xl">
                  <div className="mb-4 h-px w-16" style={{ backgroundColor: gold }} />
                  <h1
                    className="text-4xl font-light leading-[1.1] tracking-tight md:text-7xl"
                    style={{ fontFamily: serif }}
                  >
                    {data.businessName}
                  </h1>
                </div>
              </div>
            </>
          )
        ) : (
          <div className="px-6 py-16 md:px-12 md:py-24">
            <div className="mx-auto max-w-5xl">
              <div className="mb-4 h-px w-16" style={{ backgroundColor: gold }} />
              <h1
                className="text-4xl font-light leading-[1.1] tracking-tight md:text-7xl"
                style={{ fontFamily: serif }}
              >
                {data.businessName}
              </h1>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-6 md:px-12">
        {/* Description + Review grid */}
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
                  style={{ fontFamily: serif }}
                >
                  &ldquo;{data.review.text}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px w-8" style={{ backgroundColor: gold }} />
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

        {/* Phone CTA */}
        {callHref(data.phone) ? (
          <div className="border-t py-16 md:py-20" style={{ borderColor: `${gold}15` }}>
            <div className="flex flex-col items-center text-center">
              <p className="text-xs uppercase tracking-[0.4em]" style={{ color: gold }}>
                Get in touch
              </p>
              <a
                href={callHref(data.phone)}
                className="group relative mt-6 overflow-hidden border px-10 py-4 text-xs font-medium uppercase tracking-[0.3em] transition-colors"
                style={{ borderColor: gold, color: gold }}
              >
                <span className="relative z-10 flex items-center gap-2 transition-colors group-hover:text-black">
                  <PhoneIcon />
                  Call {data.phone}
                </span>
                <div
                  className="absolute inset-0 translate-y-full transition-transform group-hover:translate-y-0"
                  style={{ backgroundColor: gold }}
                />
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLE PICKER
// ─────────────────────────────────────────────
const STYLES = [
  { id: 0, label: "Classic", desc: "Clean & professional" },
  { id: 1, label: "Modern", desc: "Minimal & geometric" },
  { id: 2, label: "Bold", desc: "Dramatic & powerful" },
  { id: 3, label: "Elegant", desc: "Refined & editorial" },
  { id: 4, label: "Warm", desc: "Soft & inviting" },
  { id: 5, label: "Premium", desc: "Dark & cinematic" },
] as const;

type DemoVariationsProps = {
  data: DemoData;
};

export function DemoVariations({ data }: DemoVariationsProps) {
  const [active, setActive] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const current = STYLES[active];

  const dismissHint = useCallback(() => {
    setShowHint(false);
    setHintDismissed(true);
  }, []);

  // Show hint after 1.5s delay, auto-dismiss after 5s visible
  useEffect(() => {
    if (hintDismissed) return;
    const showTimer = setTimeout(() => setShowHint(true), 1500);
    return () => clearTimeout(showTimer);
  }, [hintDismissed]);

  useEffect(() => {
    if (!showHint || hintDismissed) return;
    const hideTimer = setTimeout(dismissHint, 5000);
    return () => clearTimeout(hideTimer);
  }, [showHint, hintDismissed, dismissHint]);

  // Dismiss hint when picker opens
  useEffect(() => {
    if (pickerOpen && showHint) dismissHint();
  }, [pickerOpen, showHint, dismissHint]);

  return (
    <>
      {/* Hidden image to detect orientation */}
      {data.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.imageUrl}
          alt=""
          className="hidden"
          onLoad={(e) => {
            const img = e.currentTarget;
            setIsPortrait(img.naturalHeight > img.naturalWidth);
          }}
        />
      ) : null}

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

        {/* Hint tooltip */}
        <AnimatePresence>
          {showHint && !pickerOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: [0, -3, 0],
                scale: 1,
              }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
                y: {
                  duration: 2.5,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                },
              }}
              className="mb-2.5 flex items-end justify-end"
            >
              <div className="relative rounded-xl bg-slate-900 px-3.5 py-2 shadow-xl">
                <p className="whitespace-nowrap text-xs font-medium text-white">
                  Try different styles
                </p>
                {/* Arrow pointing down to button */}
                <div className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-slate-900" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Toggle button — always anchored here */}
        <motion.div
          className="relative"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          {/* Animated gradient border — always visible */}
          <div
            className="absolute -inset-[2px] rounded-full"
            style={{
              background: "conic-gradient(from var(--border-angle, 0deg), #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)",
              animation: "spin-border 2.5s linear infinite",
            }}
          />
          <style>{`
            @property --border-angle {
              syntax: "<angle>";
              initial-value: 0deg;
              inherits: false;
            }
            @keyframes spin-border {
              to { --border-angle: 360deg; }
            }
          `}</style>

          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="relative flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-lg"
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
          </button>
        </motion.div>
      </div>

      {/* Active variation */}
      {active === 0 && <Classic data={data} isPortrait={isPortrait} />}
      {active === 1 && <Modern data={data} isPortrait={isPortrait} />}
      {active === 2 && <Bold data={data} />}
      {active === 3 && <Elegant data={data} isPortrait={isPortrait} />}
      {active === 4 && <Warm data={data} />}
      {active === 5 && <Premium data={data} isPortrait={isPortrait} />}
    </>
  );
}
