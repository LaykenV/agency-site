The Agency Design Plan

Document Version: 1.0
Last Updated: October 31, 2025

Overview

This plan defines the color tokens, gradients, and reusable UI utilities added to `app/globals.css` for the agency portal and marketing pages. It adopts the exact HSL color scheme from the previous chat app (for light/dark), adapted to this project’s flows in `agency.md`. The themes use very off‑white and off‑black bases with high‑contrast typography and refined brand accents, matching the preferences for softer backgrounds and more apparent gradients.

Theme Philosophy

- Off‑white (light) and off‑black (dark) bases to reduce glare and improve reading comfort.
- High‑contrast text and CTAs; brand is a luminous azure with amber as a supporting accent.
- Subtle layered gradients and soft glows to add depth without clutter.
- Clean borders and gentle elevation cues for strong information hierarchy.

Core Tokens (HSL with numeric tuples)

- Background and foreground: Very light background with deep neutral foreground (light); reversed in dark.
- Brand: `--primary` is luminous azure; amber is available for highlights.
- Neutrals: `--secondary`, `--muted`, and `--border` shape surfaces and inputs.

Key variables in `:root` (light) and `.dark`:

- `--background`, `--foreground`: Page base and text.
- `--card`, `--card-foreground`: Elevated surface base.
- `--primary`, `--primary-foreground`: Brand and on‑primary.
- `--secondary`, `--accent`, `--muted`: Neutral surfaces.
- `--border`, `--input`, `--ring`: Borders, inputs, focus rings.
- Brand helpers: `--brand-amber`, `--glow-primary`, `--glow-amber`.
- Gradients: `--gradient-hero`, `--gradient-section`, `--gradient-surface`.

Implementation note: Colors are declared as numeric HSL tuples (e.g., `--background: 225 38% 95%`) and consumed via `hsl(var(--background))` in the `@theme inline` mapping. This matches the old project and ensures accurate rendering.

Gradient System

- Section/hero surfaces: Use radial blends (`--gradient-hero`, `--gradient-section`) for subtle page texture.
- Card/surface backgrounds: `--gradient-surface` pairs with `--card` for layered depth.

Reusable Utilities

Surfaces and Cards

- `surface`: Default elevated card; soft gradient, subtle shadow, crisp border.
- `surface-soft`: Neutral, flatter surface for secondary content.
- `surface-elevated`: Stronger border and deeper shadow for featured blocks.
- `card-surface`: Minimal card base (existing); good when Tailwind utilities will add layout/padding.

Glows

- `glow-primary`: Luminous brand glow for feature tiles, CTAs, or emphasis.
- `glow-amber`: Warm glow for notices and highlights.

Buttons

- `btn-cta`: Primary call‑to‑action (gradient, glow‑ready, accessible focus ring).
- `btn-soft`: Neutral action on tinted background.
- `btn-outline-strong`: High‑contrast outline with brand‑tinted border.
- `btn-ghost`: Text‑like action with brand‑tinted foreground.
- `btn-icon` (existing): Icon button; pairs well with `glow-*` when elevated.

Badges & Pills

- `badge`: Neutral inline label for metadata.
- `badge-primary`: On‑brand badge for important labels.
- `pill`: Soft, rounded chip for statuses/filters.

Progress & Stats

- `progress-track` + `progress-fill`: Luminous progress with brand tint.
- `stat-pill`, `stat-pill-label`, `stat-pill-value`: Compact stat blocks for overviews.

Info Banners & Overlays

- `info-banner`: Inline message/notice with subtle gradient.
- `beams-overlay`: Non‑interactive overlay layer for ambient lines/beams.

Layout Guidance

- Page wrappers: Use `surface-hero` or `surface-section` on parent containers for ambient gradients.
- Content width: Favor `max-w-5xl` to `max-w-6xl` for portal; `px-4 sm:px-6` for comfortable edges.
- Spacing: Use `space-y-6` between sections for a calm rhythm.

Accessibility & Typography

- High contrast by default; brand foreground on buttons/text is automatically set.
- Respect focus: Native focus is enhanced via `--ring`; never remove `:focus-visible` outlines.
- Prefer larger line-height for body copy; use `leading-relaxed` and letter-spacing utilities as needed.

Usage Recipes

Cards and sections

```tsx
<section className="surface p-6 rounded-lg">
  <h2 className="text-lg font-semibold">Section title</h2>
  <p className="text-muted-foreground mt-2">Supporting copy…</p>
</section>
```

Feature tile with glow

```tsx
<div className="surface-elevated glow-primary p-6 rounded-xl">
  <h3 className="font-semibold">Featured</h3>
  <p className="text-muted-foreground">Why this matters…</p>
</div>
```

CTA button

```tsx
<button className="btn-cta inline-flex items-center gap-2 px-4 py-2">
  <span>Get Started</span>
</button>
```

Stats row

```tsx
<div className="flex gap-3">
  <div className="stat-pill">
    <div className="stat-pill-label">Leads</div>
    <div className="stat-pill-value">124</div>
  </div>
  <div className="stat-pill">
    <div className="stat-pill-label">Projects</div>
    <div className="stat-pill-value">12</div>
  </div>
</div>
```

Inline progress

```tsx
<div className="progress-track">
  <div className="progress-fill" style={{ width: "68%" }} />
  {/* Wrap your fill in relative container if you need labels */}
</div>
```

Do / Don’t

- Do: Use `surface`/`surface-elevated` for primary content blocks; reserve intense glows for a few key CTAs or highlights.
- Do: Prefer semantic tokens (e.g., `bg-background`, `text-foreground`, `border-border`) for consistency.
- Do: Build gradients with provided variables; avoid hardcoded colors.
- Don’t: Overuse shadows or multiple glows on the same element.
- Don’t: Introduce new border styles; tint existing borders via utilities if needed.

Notes

- Theming choices follow the user’s preference for very soft backgrounds with visible yet tasteful gradients and glows, while keeping typography highly legible. These utilities are intentionally general‑purpose and avoid chat‑specific or fixed layout patterns from the old project.



## Landing Page Implementation Map

- Hero: `surface-hero`, `offer-bar`, `badge`, `device-stack`, CTAs use `btn-cta` and `btn-soft`. Copy from `landingPage.md`.
- Local trust strip: `surface-section`, `badge`, static stars text.
- Problem → Solution: Two `surface` cards; solution card accented with `glow-amber`.
- What’s included: Grid of `surface` tiles (2–3 columns responsive); microcopy “One plan. Zero surprises. You email; we ship.”
- Speed & performance proof: `gauge` with inline `--value`; `stat-pill` for before/after; bullet list.
- Showcase: `before-after` wrapper for MVP images; width/height set to prevent CLS.
- How it works: Section id `how-it-works` with `anchor-target`; four `surface` step tiles.
- Pricing: Section id `pricing` with `anchor-target`; CTAs with UTM; fine print links to `/legal/terms`.
- Testimonials: Optional `StarRating` row above `surface` quote tiles; static 5‑star rows.
- FAQs: Section id `faqs` with `anchor-target`; accessible `<details><summary>` pairs in `surface` cards.
- Final CTA: `surface-section` with dual CTAs (`btn-cta`, `btn-soft`) and UTM `cta=final`.
