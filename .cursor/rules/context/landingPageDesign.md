## Landing Page — Design and Implementation Plan

This plan specifies the landing page’s UX, layout, visual language, components, and implementation details. It aligns with the offer and flow in `agency.md`, follows the structure in `landingPage.md`, uses the theme utilities in `designPlan.md`, and builds on tokens/utilities defined in `app/globals.css`.

### Goals
- Deliver a high‑conversion page for local, service‑based businesses.
- Showcase the $0 down, $199/mo, 12‑month minimum plan and the 72‑hour go‑live from build stage promise.
- Premium, calm aesthetic with off‑white/off‑black bases, visible yet tasteful gradients, clear hierarchy, and accessible, mobile‑first UX.

### Page Anatomy (order)
1. Sticky header (all breakpoints)
2. Hero (5‑star animation, reputation-led headline, offer bar, dual CTAs, device visuals)
3. Local trust strip
4. Problem → Solution
5. What’s included (benefit grid)
6. Speed & performance proof
7. Showcase (before/after)
8. How it works (72‑hour promise)
9. Pricing (terms visible)
10. Testimonials
11. FAQs
12. Final CTA
13. Footer

### Global Layout & Navigation
- Use `components/global-header.tsx` with sticky behavior already in place. On the landing route (`/`), surface in-header nav links: `Examples`, `How it works`, `Pricing`, `FAQs`, plus the primary CTA `Start for $0`.
- Header behavior:
  - Height: 72px desktop, 64px mobile.
  - `position: sticky; top: 0; z-index: 50;` with subtle border and blur (already implemented).
  - Anchor targets use scroll margins to avoid being hidden: add `scroll-mt` on section wrappers (see Styles below).
- Max content width: prefer `max-w-6xl` (landing) or `max-w-7xl` in header container, with `px-6` side padding.

### Color, Gradients, Surfaces
- Use tokens from `app/globals.css` via Tailwind’s `@theme inline` mapping:
  - Backgrounds/surfaces: `bg-background`, `surface`, `surface-section`, `surface-hero`.
  - Foreground and muted: `text-foreground`, `text-muted-foreground`.
  - Accents/brand: `btn-cta`, `glow-primary`, `glow-amber`, `badge`, `badge-primary`, `pill`.
- Gradients:
  - Hero/backdrops: `surface-hero`.
  - Section backgrounds: `surface-section`.
  - Cards: `surface` (uses `--gradient-surface`).
- Buttons: use `btn-cta` (primary) and `btn-soft`/`btn-outline-strong`/`btn-ghost` as needed. You can also wrap `components/ui/button.tsx` with these classes for the gradient look.

### Components & Files (suggested)
- `components/landing/SiteHeaderNav.tsx` (optional enhancement wrapper around `GlobalHeader` to inject landing anchors + CTA)
- `components/landing/Hero.tsx`
- `components/landing/LocalTrustStrip.tsx`
- `components/landing/ProblemSolution.tsx`
- `components/landing/FeaturesGrid.tsx`
- `components/landing/SpeedProof.tsx`
- `components/landing/Showcase.tsx`
- `components/landing/HowItWorks.tsx`
- `components/landing/Pricing.tsx`
- `components/landing/Testimonials.tsx`
- `components/landing/FAQs.tsx`
- `components/landing/FinalCTA.tsx`

Route composition in `app/page.tsx` can import and render the above sequentially. Keep sections as self‑contained, responsive components for reordering/experimentation.

## Sections — Specs and Implementation Notes

### 1) Hero
- Purpose: Validate identity and pride (5‑star reputation), present the offer ($0 down, $199/mo, 12‑month minimum), and the 72‑hour go‑live (from build stage). Drive into `/onboarding` or Cal link.
- Layout
  - Desktop (≥1024px): Two columns with ~56–72px gap; left copy, right visuals. Min-height ~80vh minus header.
  - Mobile: Single column; keep CTAs visible within first viewport.
- Content
  - 5‑star animation row (use `components/star-rating.tsx`) with microcopy: “Built for 5‑star local businesses with 4.5+ Google ratings.”
  - Headline: “Your 5‑Star Reputation Deserves a 5‑Star Website”
  - Subhead: Outcome-led statement per `landingPage.md`.
  - Offer bar: “$0 down • $199/mo • 12‑month minimum • Go live within 72 hours once we start your build”
  - CTAs: Primary `Start for $0` → `/onboarding?utm_source=lp&cta=hero`; Secondary `Book a 15‑min Call` → `ONBOARDING_CAL_LINK` from `lib/config.ts`.
  - Micro trust badges row (icons/text): 95+ PageSpeed target • Managed on Vercel with SSL • Unlimited edits via email • Powered by Next.js
- Visuals
  - Right column: Overlapping device mockups (mobile in front, laptop behind) using `.device-stack` utilities (see Styles). Use placeholder images in `public/` initially.
  - Background: Apply `surface-hero` with subtle radial gradients.
- Accessibility/Interaction
  - `prefers-reduced-motion`: render stars statically filled.
  - Ensure button sizes ≥44px height and clear focus rings.

Example skeleton:
```tsx
<section id="hero" className="relative overflow-hidden rounded-2xl surface-hero ring-1 ring-[var(--border)]">
  <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 grid gap-12 md:grid-cols-2 md:items-center">
    <div>
      <div className="mb-3"><StarRating /></div>
      <p className="text-sm text-muted-foreground">Built for 5‑star local businesses with 4.5+ Google ratings.</p>
      <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight">Your 5‑Star Reputation Deserves a 5‑Star Website</h1>
      <p className="mt-5 max-w-[60ch] text-muted-foreground">We design, build, host, and maintain a lightning‑fast professional website—and handle unlimited edits—for one simple monthly price.</p>
      <div className="mt-5 offer-bar">
        <span>$0 down</span><span>•</span><span>$199/mo</span><span>•</span><span>12‑month minimum</span><span>•</span><span>72‑hour go‑live from build</span>
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/onboarding?utm_source=lp&cta=hero" className="btn-cta inline-flex items-center gap-2 px-6 py-3">Start for $0</Link>
        <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer" className="btn-soft inline-flex items-center gap-2 px-6 py-3">Book a 15‑min Call</Link>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="badge">95+ PageSpeed target</span>
        <span className="badge">Managed on Vercel with SSL</span>
        <span className="badge">Unlimited edits via email</span>
        <span className="badge">Powered by Next.js</span>
      </div>
    </div>
    <div className="relative">
      <div className="device-stack">
        <div className="device-frame device-frame--laptop" />
        <div className="device-frame device-frame--mobile glow-primary" />
      </div>
    </div>
  </div>
  <div className="beams-overlay" aria-hidden />
  <span className="sr-only">Hero background illustration</span>
  <span className="sr-only">Device mockups are decorative</span>
  
  {/* Reduced motion: render static filled stars via prop or media query */}
</section>
```

### 2) Local Trust Strip
- Copy: “Trusted by local service pros in [City/Region]”.
- Visuals: Row of local logos or category icons (Plumbing, Landscaping, Painting, Consulting). Add a static 5‑star row with: “Clients love the unlimited edits.”
- Layout: `surface-section`, centered content, `gap-6`, responsive wrapping.
- Implementation: Use `.badge` for simple logo pills; swap real logos as available.

### 3) Problem → Solution
- Headline: “Your Reputation Is 5‑Star. Your Website Is Holding You Back.”
- Pains (bulleted): slow/DIY site; outdated look; no one to email for changes.
- Solution box: “The All‑Inclusive Plan: $0 Down, $199/mo …”
- Layout: Two-column on desktop (`grid-cols-2`), stack on mobile. Use `surface` cards with `glow-amber` sparingly for emphasis.

### 4) What’s Included (Benefit Grid)
- Headline: “Everything You Need. Nothing You Don’t.”
- Grid: 2–3 columns responsive (`sm:grid-cols-2 md:grid-cols-3`) with `surface` tiles.
- Include bullets from `landingPage.md` (custom 7‑page site, 95+ PageSpeed, managed hosting/SSL, domain included, reviews widget, contact form, unlimited edits, monthly analytics).

### 5) Speed & Performance Proof
- Headline: “Fast Sites Convert More Calls”.
- Visuals: Lighthouse-style gauge and “Old: 3.9s → New: 0.9s”.
- Implementation: Use `.gauge` utilities (see Styles). Put a small “95+” badge inside the gauge.

### 6) Showcase (Before/After)
- Headline: “See the Difference”.
- Cards: 3–6 examples (e.g., “Landscaper in Austin”), with swipeable Before → After on mobile.
- MVP: static side-by-side; optionally a simple range‑based overlay slider later.

### 7) How It Works (with 72‑hour promise)
- Headline: “From Sign‑Up to Live in 4 Simple Steps”.
- Steps per `landingPage.md` with the 72‑hour go‑live explicitly tied to the Build Stage.
- Layout: 4 columns on desktop, stacked on mobile; `surface-section` outer, `surface` tiles inner.
- Anchor: `id="how-it-works"` with scroll margin.

### 8) Pricing
- Headline: “One Plan. Zero Surprises.”
- Plan card: “The All‑Inclusive Plan — $0 down, then $199/month — 12‑month minimum”.
- Fine print visible: minimum commitment, auto‑renewal, early termination policy; link to `/legal/terms`.
- CTAs: Primary to `/onboarding?utm_source=lp&cta=pricing`; secondary to `ONBOARDING_CAL_LINK`.
- Anchor: `id="pricing"`.

### 9) Testimonials
- 3–5 quotes with static 5‑star rows and attribution.
- Optionally reuse the animated `StarRating` component above the grid.

### 10) FAQs
- Use top 5–6 entries from `landingPage.md`.
- MVP: use `<details><summary>` for accessible accordions; later, upgrade to a custom accordion component if needed.
- Anchor: `id="faqs"`.

### 11) Final CTA
- Headline: “Launch Your 5‑Star Website”.
- Subhead: `$0 down • $199/mo • Unlimited edits • 72‑hour go‑live from build`.
- Scarcity line: “Limited spots per city each month …”.
- Dual CTAs as in Hero, with appropriate UTM (`cta=final`).

### 12) Footer
- Links: Terms (versioned), Privacy, Contact.
- Business details (phone, email). Subtle tech badges (Next.js, Vercel, Stripe).

## Styles — Utilities (available in `app/globals.css`)
The following utilities are added in the `@layer utilities` block and are ready to use.

```css
/* Anchor offset so in-header links don’t hide section titles */
.anchor-target { scroll-margin-top: 76px; }

/* Offer bar (inline pill with separators) */
.offer-bar {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid color-mix(in hsl, hsl(var(--border)), hsl(var(--primary)) 20%);
  background: linear-gradient(
    180deg,
    color-mix(in hsl, hsl(var(--secondary)), hsl(var(--primary)) 6%) 0%,
    color-mix(in hsl, hsl(var(--secondary)), hsl(var(--primary)) 2%) 100%
  );
  color: var(--foreground);
  font-weight: 600;
  font-size: 0.9rem;
}
.offer-bar > span { opacity: 0.9; }

/* Device mockup stack for hero visuals */
.device-stack { position: relative; min-height: 360px; }
.device-frame {
  position: absolute;
  border-radius: 1rem;
  border: 1px solid color-mix(in hsl, hsl(var(--border)), hsl(var(--primary)) 22%);
  background: var(--card);
  box-shadow:
    0 24px 60px -28px hsl(0 0% 0% / 0.35),
    0 12px 28px -16px hsl(0 0% 0% / 0.22),
    inset 0 1px 0 hsl(0 0% 100% / 0.45);
}
.device-frame--laptop { left: 0; bottom: 0; width: 78%; aspect-ratio: 16 / 10; }
.device-frame--mobile { right: 0; top: 12%; width: 32%; aspect-ratio: 9 / 19; border-radius: 1.25rem; }

/* Lighthouse-like gauge for speed proof */
.gauge {
  --value: 95; /* set via inline style per instance */
  width: 140px; height: 140px; border-radius: 999px; position: relative;
  background:
    conic-gradient(hsl(var(--primary)) calc(var(--value) * 1%), hsl(var(--muted)) 0);
  box-shadow: 0 14px 32px -18px color-mix(in hsl, hsl(var(--primary)), hsl(var(--background)) 50%);
}
.gauge::before {
  content: "";
  position: absolute; inset: 10px; border-radius: 999px; 
  background: var(--card); border: 1px solid var(--border);
  box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.35);
}
.gauge-badge {
  position: absolute; inset: 0; display: grid; place-items: center; 
  font-weight: 800; color: var(--foreground);
}

/* Simple before/after container (MVP) */
.before-after { position: relative; overflow: hidden; border-radius: var(--radius); }
.before-after > img { display: block; width: 100%; height: auto; }
.before-after__after { position: absolute; inset: 0; width: 50%; overflow: hidden; }
.before-after__after > img { width: 200%; height: auto; transform: translateX(-25%); }

/* Soft large shadow helper */
.shadow-soft-lg { box-shadow: 0 24px 60px -28px hsl(0 0% 0% / 0.30); }
```

Usage notes:
- Add `className="anchor-target"` to each section with an `id` used by header links.
- Device frames can host actual screenshots later via `background-image` or an `<img>` inside each frame.
- For the gauge, set `style={{ '--value': 95 } as React.CSSProperties }` per instance.

## Header Nav — Landing Anchors
- Enhance `components/global-header.tsx` for `/` route:
  - In‑header links: `Examples` (to showcase), `How it works` (`#how-it-works`), `Pricing` (`#pricing`), `FAQs` (`#faqs`).
  - Right‑side primary CTA: `Start for $0` → `/onboarding?utm_source=lp&cta=nav` using `btn-cta` or `Button` with gradient classes.
  - Keep existing portal links logic for `/portal` routes.

## CTA & Link Mapping
- Primary CTAs: `/onboarding` with UTM source and cta keys per placement (e.g., `?utm_source=lp&cta=hero|pricing|final`).
- Call scheduler: Use `ONBOARDING_CAL_LINK` from `lib/config.ts`.
- Terms link: `/legal/terms` (versioned copy).

## Accessibility, Performance, and SEO
- Respect `prefers-reduced-motion` (static stars, reduced transitions).
- Ensure all interactive elements have focus outlines (already via tokens; don’t remove `:focus-visible`).
- Optimize images (device mockups, showcase); add width/height to prevent CLS.
- Add `alt` text for meaningful images; mark decorative ones with empty `alt`.
- Preload key hero font weights if needed; defer non-critical images via `loading="lazy"`.

## Implementation Checklist
- Header
  - Add landing anchor links + primary CTA.
- Hero
  - Integrate `StarRating`; add offer bar and device stack visuals.
- Local Trust Strip
  - Logo/category row with badges.
- Problem → Solution
  - Two‑column content; solution box within `surface`.
- What’s Included
  - 6–8 `surface` tiles, responsive grid.
- Speed Proof
  - Gauge with badge and 3 bullets.
- Showcase
  - Before/after (MVP static or simple overlay slider).
- How It Works
  - 4 steps, emphasize 72‑hour promise; anchor id.
- Pricing
  - Plan card + fine print; dual CTAs; anchor id.
- Testimonials
  - 3–5 quotes with stars.
- FAQs
  - `<details>` based; anchor id.
- Final CTA
  - Repeat headline, subhead, and dual CTAs with UTM.
- Footer
  - Terms, privacy, contact; subtle tech badges.

## Notes
- Follow the calm, premium aesthetic using soft backgrounds, visible yet tasteful gradients, and luminous but restrained glows defined in `app/globals.css` and `designPlan.md`.
- Keep content containers consistent (`max-w-6xl`, `px-6`), and use `surface-hero` / `surface-section` on section wrappers for ambient gradients.


