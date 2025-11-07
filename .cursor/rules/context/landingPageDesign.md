## Landing Page — Design and Implementation Plan

This plan specifies the landing page’s UX, layout, visual language, components, and implementation details. It aligns with the offer and flow in `agency.md`, follows the structure in `landingPage.md`, uses the theme utilities in `designPlan.md`, and builds on tokens/utilities defined in `app/globals.css`.

### Goals
- Deliver a high‑conversion page for local, service‑based businesses.
- Showcase the $0 down, $199/mo, 12‑month minimum plan and the 72‑hour go‑live from build stage promise.
- Premium, calm aesthetic with off‑white/off‑black bases, visible yet tasteful gradients, clear hierarchy, and accessible, mobile‑first UX.

### Page Anatomy (order) — Current Implementation
1. Sticky header (all breakpoints) — `components/global-header.tsx`
2. Hero (`#hero`) — Word-by-word animated heading, hero card with icon trio, star rating, plan bullets, CTAs
3. Trust & Reviews (`#trust`) — Section header, category pills, `ReviewsScroller` component
4. Offer/Features/Comparison (`#offer`) — Combined section with:
   - How it works (`#plan-steps`) — `HowItWorks` component
   - What you get (`#plan-inclusions`) — Grid of 4 cards (desktop) / horizontal scroller (mobile)
   - Performance proof (`#plan-performance`) — `PerformanceGauge` component with stat pills
   - Comparison (`#plan-comparison`) — Table (desktop) / horizontal scroller (mobile)
5. FAQs (`#faqs`) — `FaqItem` components in grid layout
6. Final CTA — Section with pills, subhead, fine print, dual CTAs
7. Footer — Copyright, badges, Terms link
8. Floating CTA Tray — `FloatingCtaTray` component (portal-rendered)

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

### Components & Files (current implementation)
- `app/page.tsx` — Main landing page with all sections inline
- `components/animations.tsx` — Shared animation variants, `SplitWords`, `useHeroTimings`
- `components/star-rating.tsx` — Animated 5-star rating component
- `components/ReviewsScroller.tsx` — Horizontal scrolling reviews with desktop grid fallback
- `components/our-plan/HowItWorks.tsx` — Timeline component with 3 steps
- `components/our-plan/PerformanceGauge.tsx` — Animated circular gauge with percentage
- `components/faq/FaqItem.tsx` — Accordion-style FAQ item with smooth animations
- `components/FloatingCtaTray.tsx` — Floating action button that morphs to reveal CTAs
- `components/HorizontalScroller.tsx` — Reusable horizontal scroll component for mobile
- `components/SectionHeader.tsx` — Consistent section heading component

All sections are implemented directly in `app/page.tsx` with proper semantic HTML and anchor targets for navigation.

## Sections — Specs and Implementation Notes

### 1) Hero (current implementation)
- Purpose: Present the offer with animated word-by-word heading, hero card containing icon trio, plan details, and CTAs.
- Layout
  - Single column centered layout with `max-w-6xl`
  - Hero card uses `surface` class with rounded corners
  - Background gradient via `.page-gradient` utility class
- Content
  - H1: "A 5‑Star Website for Your Business in Acadiana" — animated word-by-word using `SplitWords` component
  - Hero card contains:
    - Icon trio (3 icons with labels): "Tell us your vision", "We Build Your Website", "Launch and Grow"
    - Subhead: "Done‑for‑you website and hosting. Unlimited edit requests via the client portal. Built to bring in calls."
    - Star rating component (animated sequentially)
    - Plan heading: "All‑inclusive plan"
    - Plan bullets: "$199/mo • $0 down", "72‑hour go‑live from build", "Unlimited edit requests via the client portal"
  - CTAs: Primary "Start Onboarding" → `/onboarding?utm_source=lp&cta=hero`; Secondary "Schedule Call" → `ONBOARDING_CAL_LINK`
  - CTAs positioned: inside card bottom-right on desktop, below card on mobile
- Visuals
  - Hero card has aspect ratio `aspect-[21/9] sm:aspect-[24/9] md:aspect-[32/9]`
  - Overlay fade animation via `.hero-overlay` class
  - Background gradient via `.page-gradient` positioned absolutely
- Animation
  - Word-by-word heading reveal (50ms stagger, 420ms per word)
  - Card scale-in animation
  - Icon trio stagger animation
  - Content reveal gated by `cardContentVisible` state
  - Star rating animates sequentially (350ms per star)
- Accessibility/Interaction
  - `prefers-reduced-motion`: static rendering, state variables initialize to `true`
  - Proper ARIA labels and semantic HTML
  - Viewport trigger: `amount: 0.20, once: true`

### 2) Trust & Reviews (`#trust`) — Current Implementation
- Section header: "Trusted by local pros across Acadiana" using `SectionHeader` component
- Category pills: "Plumbing", "Landscaping", "Painting", "Home Services" using `.pill` class
- Reviews: `ReviewsScroller` component with 3 reviews
  - Desktop: 3-column grid layout
  - Mobile: Horizontal scrolling track with snap points and dot indicators
  - Each review card shows: screenshot image, star rating, quote, author name/role, "Visit site" link
- Layout: `max-w-6xl` container with `px-6` padding

### 3) Offer/Features/Comparison (`#offer`) — Current Implementation
- Combined section with multiple subsections
- Layout: `surface-elevated` container with `max-w-6xl`
- Grid layout: `md:grid-cols-[1.4fr_1fr]` — narrative column + sticky proof column

### 3a) How it works (`#plan-steps`) — Current Implementation
- Component: `HowItWorks` from `components/our-plan/HowItWorks.tsx`
- Layout: Timeline component with 3 steps
- Steps: "Talk for 15 Minutes", "We Build Your Website", "Launch and Grow"
- Animation: Each step fades up on scroll with staggered delays
- Icons: CalendarCheck2, FolderCog, Rocket from lucide-react

### 3b) What you get (`#plan-inclusions`) — Current Implementation
- Section header: "What you get"
- Desktop: 2x2 grid (`md:grid-cols-2`) with `surface` cards
- Mobile: Horizontal scroller using `HorizontalScroller` component
- 4 cards: Build & Performance, Hosting & Domain, Conversion, Support & Insights
- Each card contains title and checklist items with CheckCircle2 icons

### 3c) Performance proof (`#plan-performance`) — Current Implementation
- Component: `PerformanceGauge` from `components/our-plan/PerformanceGauge.tsx`
- Layout: Sticky aside (`md:sticky md:top-24`) in right column
- Gauge: Animated circular SVG gauge showing 95% performance
- Stat pills: "Before: 3.9s" and "After: 0.9s" using `.stat-pill` classes
- Value bullets: 3 items explaining benefits
- Animation: Gauge animates on scroll into view (1.2s duration, easeOut)

### 3d) Comparison (`#plan-comparison`) — Current Implementation
- Section header: "Our Plan vs Traditional"
- Desktop: Table layout (`.compare-table`) with 10 comparison rows
- Mobile: Horizontal scroller with individual comparison cards
- Features compared: Price, Timeline, Hosting & SSL, Domain, Unlimited edits, PageSpeed target, Reviews widget, Analytics, Support, Contract term
- Visual indicators: `badge-good` (CheckCircle2) vs `badge-bad` (XCircle) icons

### 4) FAQs (`#faqs`) — Current Implementation
- Section header: "FAQs" using `SectionHeader` component
- Layout: `.faq-grid` (CSS Grid, responsive columns)
- Component: `FaqItem` from `components/faq/FaqItem.tsx`
- Features: Smooth accordion animation, chevron rotation, height-based expansion
- 5 FAQ items covering: unlimited edits, launch speed, domain ownership, website ownership, cancellation
- Animation: Spring-based height animation with opacity fade

### 5) Final CTA — Current Implementation
- Section header: "Launch Your 5‑Star Website" (centered)
- Layout: `cta-card` with `surface-elevated` styling and `beams-overlay` background
- Content:
  - Pills: "72‑hour go‑live", "Unlimited edits", "$0 down", "Managed hosting + SSL"
  - Subhead: Description of offer
  - Fine print: Pricing and terms with Terms link
  - CTAs: Primary "Start Onboarding" → `/onboarding?utm_source=lp&cta=final`; Secondary "Schedule Call" → `ONBOARDING_CAL_LINK`
- Layout: `md:grid-cols-[1fr_auto]` with CTAs in right column on desktop, stacked on mobile
- Bottom gradient fade via `.page-gradient-fade` utility

### 6) Footer — Current Implementation
- Layout: `.footer-container` with `.footer-content` wrapper
- Copyright: "© {YEAR} Acadiana Web Design"
- Badges: "Vet Owned", "Serving Acadiana", "Local Developer" using `.footer-badges`
- Link: "Terms" → `/legal/terms` using `.footer-link`

### 7) Floating CTA Tray — Current Implementation
- Component: `FloatingCtaTray` from `components/FloatingCtaTray.tsx`
- Behavior: Portal-rendered, appears when hero CTAs scroll out of viewport
- Detection: Uses IntersectionObserver to track `[data-floating-cta-anchor]` elements
- Animation: Morphs from circular logo button to horizontal bar with spring animation
- CTAs: "Schedule Call" and "Start Onboarding" with proper UTM tracking
- Accessibility: Keyboard navigation, ESC to close, focus management


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


