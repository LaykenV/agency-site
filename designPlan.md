## Visual Design Plan: Color, Gradients, Backgrounds

This plan concentrates on backgrounds and gradients to achieve a beautiful, breathable aesthetic with excellent contrast. It honors your preference for softer tinted off‑white/off‑gray bases with more apparent gradients [[memory:10223702]].

### Objectives
- Make backgrounds feel premium yet calm (no stark white/black).
- Use layered radial/conic gradients that read well in both light and dark.
- Maintain strong text contrast and legibility across surfaces.
- Keep performance high (pure CSS; no heavy images).

### Palette Tokens (HSL)
- Neutrals: `--background`, `--foreground`, `--card`, `--secondary`, `--muted`, `--border`
- Brand: `--primary` (cool blue), `--accent` (deeper blue), `--brand-amber` (warm accent)
- Foreground on brand: `--primary-foreground`

Light theme anchors (soft off‑white base):
- Background: `--background: 225 38% 95%`
- Primary: `--primary: 215 85% 55%`
- Accent: `--accent: 215 60% 94%`

Dark theme anchors (soft off‑gray base):
- Background: `--background: 220 28% 11%`
- Primary: `--primary: 215 80% 60%`
- Accent: `--accent: 215 35% 24%`

### Gradient System (tokens)
- `--gradient-page` (body): two large radial washes from top and bottom; tuned a bit stronger for presence.
- `--gradient-hero`: stronger corner glows for the landing hero.
- `--gradient-section`: subtle sectional background for emphasis blocks/CTAs.
- `--gradient-surface`: soft vertical wash for surfaces/cards.

Light intensity targets
- Page: top `primary / 0.26`, bottom `accent / 0.20`
- Hero corners: `primary / 0.26`, `accent / 0.20`

Dark intensity targets
- Page: top `primary / 0.46`, bottom `accent / 0.36`
- Hero corners: `primary / 0.35`, `accent / 0.28`

### Beams Overlay
Purpose: add an elegant, diffused beam effect for the hero using only CSS. Applied via a positioned element `.beams-overlay` with layered conic+radial gradients, blurred and masked to keep edges subtle.

Usage:
```tsx
<section className="relative overflow-hidden surface-hero">
  {/* content */}
  <div className="beams-overlay" aria-hidden />
</section>
```

Behavior:
- Beams saturate slightly and blur for a filmic glow.
- Mask fades out edges to avoid visual noise near text.
- Works in both themes via HSL tokens; no hard‑coded colors.

### Surface Utilities
- `surface`: default elevated card with soft gradient and refined border.
- `surface-hero`: hero‑scale background gradients (no image needed).
- `surface-section`: sectional background wash for CTAs/alternating bands.

### Accessibility & Contrast
- Headings/body text stay on `--foreground` over `surface`/`secondary` backgrounds for WCAG‑friendly contrast.
- Brand CTAs use `--primary` with light inner highlights for tactility; hover slightly increases saturation and depth.

### Composition Guidelines
- Page level: rely on `--gradient-page` for overall ambiance; avoid additional images.
- Hero: combine `surface-hero` + `.beams-overlay` for the most impact.
- Alternating sections: use `surface-section` for visual pacing; keep content areas inside `.surface` as needed.
- Cards: keep `surface` for primary content containers; use `.surface-elevated` sparingly for standout modules.

### Tuning Knobs (quick adjustments)
- Presence: decrease/increase the alpha of `--gradient-page` stops by ±0.04.
- Warmth: increase `--brand-amber` presence in CTA or hero conic gradients.
- Calm: raise neutral lightness (light theme `--background` to 96–97%, or dark theme to 12–14%) if you want more air.

### Performance Notes
- Pure CSS gradients (no images); GPU‑friendly.
- Avoid background‑attachment: fixed (mobile perf). Use large radial sizes instead.

### Future Enhancements (optional)
- Micro‑parallax: translate beams slightly on scroll for depth.
- Very subtle grain (SVG/data‑URI) toggle if you want a paper texture.

