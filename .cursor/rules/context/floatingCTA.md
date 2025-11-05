## Floating CTA Tray Plan (Landing Page)

### Goal
- Add a bottom-right floating CTA bubble (FAB). When tapped, it expands into a wide bottom tray showing “Schedule Call” and “Start Onboarding.”
- Show the FAB only after the hero CTAs scroll out of view. Close the tray on outside click, Escape, or re‑tapping the bubble.

### High-level UX
- Initial state: Nothing visible at page load if hero CTAs are in view.
- When the hero CTAs leave the viewport, a circular trigger appears with a subtle enter animation.
- The trigger and the tray are the same element (a single morphing shell). When toggled open, the circle expands left into a bar.
- On mobile, expansion goes full width to the left (anchored at bottom-right). On large screens, the bar grows just wide enough for the buttons.
- Close via outside click (scrim), Escape, or tapping the trigger again. Reduced-motion users see short opacity-only transitions.

### State and behavior
- Visibility trigger: IntersectionObserver watches two sentinels placed after the desktop and mobile CTA blocks. The FAB is shown when neither usable sentinel is intersecting the viewport. If one sentinel is hidden due to responsive layout, only the visible/usable sentinel is considered.
- Expansion: Local state toggled by clicking the FAB (bubble persists while open). Close on scrim click or Escape.
- Focus handling: On open, focus the first CTA; on close, return focus to the FAB.
- Route change: Close on navigation.

### Component architecture
- Client component `components/FloatingCtaTray.tsx`, rendered from `app/page.tsx`.
- Renders into `document.body` via a portal for simple z-index/outside-click management.
- Observers: Two sentinels (`cta-hero-desktop-sentinel`, `cta-hero-mobile-sentinel`). The shell is visible only when none of the usable sentinels are intersecting.
- Single-element shell: A `motion.div` with `layout` morphs between a 56px circle and a horizontal bar. The morph is anchored to the right (expands left) via `transform-origin: right center`.
- Interaction: When collapsed, the shell behaves as the trigger. When expanded, the shell becomes the container for horizontally arranged CTAs and includes a small collapse button at the far right (the same physical area as the circle when collapsed).

### Files to touch
- `app/page.tsx`: Keep sentinel elements after the hero CTAs; import and render `FloatingCtaTray` at the bottom of the page content.
- `app/globals.css`: Update styles for the single-element shell/scrim using existing tokens and surfaces.

### Animations (Framer Motion best practices)
- Library: framer-motion (`bun add framer-motion`).
- Use `layout` on the shell to animate size/shape morphs without distorting children. Animate `borderRadius` from `9999px` (circle) to `var(--radius)` (bar).
- Anchor growth to the right (expands left) by setting `style={{ transformOrigin: "right center" }}` on the shell.
- Use `AnimatePresence` for the scrim only; the shell remains mounted and uses `layout` transitions for enter/exit morphs.
- Avoid mixing Optimized Appear WAAPI on the same element as layout animations (can conflict with measurements). Keep layout and optimized appear separate.
- Reduced motion: `useReducedMotion()` to switch to short opacity-only transitions and simpler state toggles.

References (Motion/Framer Motion)
- AnimatePresence for mount/unmount with exit states (avoid removing before exit completes).
- `layout` transitions for shape/size morphs; animate border-radius and transforms, not layout properties.
- Avoid mixing Optimized Appear WAAPI + layout animations on the same element to prevent conflicts.

### Accessibility
- Shell (collapsed): acts as the trigger with `role="button"`, `aria-expanded`, `aria-controls`, and an `aria-label` (e.g., "Open quick actions" / "Close quick actions").
- Shell (expanded): becomes `role="region"` with `aria-label="Quick actions"`, keeps `aria-expanded=true`, and includes a distinct collapse button at the far right. The collapse control has its own accessible name (e.g., "Close quick actions").
- Keyboard: Enter/Space toggles when collapsed; Escape closes when expanded; Tab order starts on the first CTA when open.
- Focus: Move focus to the first CTA on open; on close, return focus to the shell trigger area.

### CSS design (`app/globals.css`)
- Reuse tokens (`--card`, `--border`, `--primary`, `--radius`, glows/shadows) for cohesion.
- Classes:
  - `.floating-cta`: fixed wrapper at bottom-right; safe-area padding via `bottom: calc(1rem + env(safe-area-inset-bottom))`; high z-index.
  - `.floating-cta__shell`: the single morphing element (circle ↔ bar), `will-change: transform, opacity`; right-anchored growth with `transform-origin: right center`.
  - `.floating-cta__scrim`: full-viewport, very low opacity, captures outside clicks.
  - `.floating-cta__content`: internal content row (buttons) that becomes visible only when expanded; on mobile it fills available space; on desktop it uses natural (content-based) width.
  - `.floating-cta__collapse`: icon/button area at the far right to collapse when expanded (occupies the same physical space as the collapsed circle).

Suggested CSS additions:
```css
.floating-cta { position: fixed; right: 1rem; bottom: calc(1rem + env(safe-area-inset-bottom)); z-index: 70; }
.floating-cta__scrim { position: fixed; inset: 0; z-index: 60; }

/* Single morphing shell */
.floating-cta__shell {
  border: 1px solid var(--border);
  background: var(--card);
  transform-origin: right center;
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0; /* grows padding only when expanded via data-attr */
}
.floating-cta__shell[data-expanded="false"] {
  inline-size: 56px; block-size: 56px; border-radius: 9999px; cursor: pointer;
}
.floating-cta__shell[data-expanded="true"] {
  block-size: 56px; border-radius: var(--radius);
  /* Mobile: full-width grow to the left */
  inline-size: calc(100vw - 2rem - env(safe-area-inset-left) - env(safe-area-inset-right));
  padding-inline: 0.5rem; padding-block: 0.25rem;
}
@media (min-width: 768px) {
  /* Desktop: only as wide as needed for content */
  .floating-cta__shell[data-expanded="true"] {
    inline-size: auto; max-inline-size: 720px;
  }
}

.floating-cta__content {
  display: none; gap: 0.5rem; flex: 1 1 auto; justify-content: flex-start;
}
.floating-cta__shell[data-expanded="true"] .floating-cta__content { display: flex; }

.floating-cta__collapse {
  margin-inline-start: auto; inline-size: 40px; block-size: 40px;
  border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center;
}
```

### Component sketch (not final code)
```tsx
// components/FloatingCtaTray.tsx (client) — single-element shell
"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ONBOARDING_CAL_LINK } from "@/lib/config";

export function FloatingCtaTray() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false); // hero CTAs scrolled out
  const [expanded, setExpanded] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const firstCtaRef = useRef<HTMLAnchorElement | null>(null);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Close on route change
  useEffect(() => { setExpanded(false); }, [pathname]);

  // IntersectionObserver for sentinels (robust to hidden/mobile-only elements)
  useEffect(() => {
    const desktop = document.getElementById("cta-hero-desktop-sentinel") as HTMLElement | null;
    const mobile = document.getElementById("cta-hero-mobile-sentinel") as HTMLElement | null;
    if (!desktop && !mobile) { setVisible(true); return; }
    const isUsable = (el: HTMLElement | null) => !!el && el.offsetParent !== null;
    const isInViewport = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      return !(r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw);
    };
    const desktopUsable = isUsable(desktop);
    const mobileUsable = isUsable(mobile);
    const status = {
      desktop: desktopUsable && desktop ? isInViewport(desktop) : false,
      mobile: mobileUsable && mobile ? isInViewport(mobile) : false,
    };
    const recompute = () => setVisible(!((desktopUsable && status.desktop) || (mobileUsable && status.mobile)));
    const onIntersect: IntersectionObserverCallback = (entries) => {
      for (const e of entries) {
        if (e.target.id === "cta-hero-desktop-sentinel") status.desktop = e.isIntersecting;
        if (e.target.id === "cta-hero-mobile-sentinel") status.mobile = e.isIntersecting;
      }
      recompute();
    };
    const io = new IntersectionObserver(onIntersect, { root: null, threshold: 0 });
    if (desktopUsable && desktop) io.observe(desktop);
    if (mobileUsable && mobile) io.observe(mobile);
    recompute();
    return () => io.disconnect();
  }, []);

  // Keyboard ESC and focus management
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (expanded) firstCtaRef.current?.focus(); }, [expanded]);

  if (!mounted) return null;
  return createPortal(
    <>
      {/* Scrim (under the shell) */}
      <AnimatePresence>
        {visible && expanded && (
          <motion.div
            className="floating-cta__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.02 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Fixed wrapper and single morphing shell (circle ↔ bar) */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="floating-cta"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={prefersReduced ? { duration: 0.12 } : { duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              ref={shellRef}
              className="floating-cta__shell surface-elevated glow-primary"
              data-expanded={expanded}
              layout
              style={{ transformOrigin: "right center" }}
              aria-expanded={expanded}
              aria-controls="floating-cta-tray"
              aria-label={expanded ? "Close quick actions" : "Open quick actions"}
              role={expanded ? "region" : "button"}
              onClick={() => { if (!expanded) setExpanded(true); }}
              initial={false}
              animate={{ borderRadius: expanded ? 12 : 9999 }}
              transition={prefersReduced ? { duration: 0.12 } : { type: "spring", stiffness: 280, damping: 24 }}
            >
              {/* Content: only visible when expanded */}
              <div id="floating-cta-tray" className="floating-cta__content">
                <a
                  ref={firstCtaRef}
                  className="btn-secondary"
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                >
                  Schedule Call
                </a>
                <Link
                  className="btn-cta"
                  href="/onboarding?utm_source=fab&cta=fab_tray"
                  onClick={() => setExpanded(false)}
                >
                  Start Onboarding
                </Link>
              </div>

              {/* Collapse control at far right (same physical spot as the circle) */}
              {expanded && (
                <button
                  type="button"
                  className="floating-cta__collapse btn-cta"
                  aria-label="Close quick actions"
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
```

### Changes in `app/page.tsx` (plan only)
- Keep the sentinel elements right after the CTA blocks:
  - Desktop CTAs (inside the hero card): `<div id="cta-hero-desktop-sentinel" aria-hidden />` directly after the desktop CTA container.
  - Mobile CTAs (below the card): `<div id="cta-hero-mobile-sentinel" aria-hidden />` after the mobile CTA grid.
- Import and render `<FloatingCtaTray />` at the end of the page content.

### Changes in `app/globals.css` (plan only)
- Add `.floating-cta`, `.floating-cta__bubble`, `.floating-cta__bar`, `.floating-cta__scrim`, `.floating-cta__content` using existing tokens and surfaces.
- Ensure safe-area padding, high z-index; `.floating-cta__bubble` uses `cursor: pointer`; `.floating-cta__bar` uses `width: min(92vw, 720px)`.

### Performance considerations
- Use `layout` animations for size/shape morphs to avoid child distortion and keep measurements accurate.
- Set `transform-origin: right center` to expand left while staying anchored to bottom-right.
- Only use `AnimatePresence` for the scrim; keep the shell mounted and use `layout` for the morph.
- Avoid mixing Optimized Appear WAAPI with layout animation on the same element.
- `will-change: transform, opacity` on the shell for smoother transitions; keep observers lightweight and disconnected on unmount.

### Testing checklist
- Shell hidden when hero CTAs are visible; appears immediately after they scroll out (desktop/mobile). Refresh not required.
- Shell morphs from circle to bar expanding left; on mobile it reaches full width, on desktop it fits content.
- Close works via outside click (scrim), the right-hand collapse control, and Escape.
- Focus management works; reduced motion uses opacity-only.
- Safe-area insets respected; links open as expected.

### Implementation sequence
1) Keep sentinels in `app/page.tsx` below hero CTA sections (desktop + mobile).
2) Refactor `components/FloatingCtaTray.tsx` to a single-element shell using `layout`, anchored to the right (expands left). Remove the separate bubble/bar elements.
3) Update CSS in `app/globals.css` for `.floating-cta__shell`, `.floating-cta__content`, `.floating-cta__collapse`, and `.floating-cta__scrim`.
4) Install/confirm Framer Motion with `bun add framer-motion`.
5) Wire `ONBOARDING_CAL_LINK` and onboarding URL; ensure collapse control and scrim close the tray.
6) Validate accessibility (collapsed = role="button", expanded = role="region"), focus management, and reduced-motion behavior.

### Upgrade plan (single-element morph)
- Remove `.floating-cta__bubble` and `.floating-cta__bar` usage in the component. Replace with a single `.floating-cta__shell` with `layout` and `data-expanded`.
- Add `transform-origin: right center` to the shell and use `layout` to animate width/height and border-radius.
- On mobile, set the shell’s expanded `inline-size` to full width minus safe-area/margins. On desktop, rely on content width via `inline-size: auto` with a reasonable `max-inline-size`.
- Render CTAs inside the shell and a dedicated collapse control at the far right. Prevent collapsing when clicking CTAs by stopping propagation on the collapse control only.
- Keep `AnimatePresence` only for the scrim to avoid layout measurement conflicts.
- Maintain sentinel-based visibility logic.
