### Landing page hero animation — Implementation (Framer Motion)

This documents the hero animation we implemented with Framer Motion. It’s tasteful, performant, and respects our soft gradient aesthetic [[memory:10223702]].

Summary
- Header animates from the bottom with a single gradient heading that reveals word-by-word (50 ms stagger, ~420 ms per word), using the `.heading-word` utility for a synced glow.
- Hero subtext fades up after the heading completes.
- Hero CTA fades up after the subtext.
- The card begins only after the CTA has finished animating, then supporting content follows.
- Card frame floats in first (`floatCard` variant) with a soft spring and brief de‑blur; the hero image renders statically inside the card (no inner animations).
- Supporting copy, star rating, and plan bullets:
  - Mobile (<md): reveal after the card float‑in completes via `cardContentVisible`.
  - md+ (≥768px): wait until scrolled into view using `useInView` with `inViewDefaults`.
- State management: `cardContentVisible` gates content reveal; `cardFrameDone` has been removed.
- No overlay fade is used inside the hero media; gradients remain static.
- Supporting copy and bullets still use subtle staggered fades.
- Motion respects reduced‑motion; hero/card viewport amount is 0.20 and runs once.

md+ in‑view gating (star line + lower panel)

- On mobile (<md): after the card float‑in completes, `cardContentVisible` gates the star line, heading, and bullets (unchanged).
- On md+ (≥768px): the lower panel content (star rating, “All‑inclusive plan” heading, and bullets) waits until it is scrolled into view, using `useInView` and a breakpoint hook.
- This ensures the star animation and related text don’t play until the user scrolls to that area on larger screens.

Key helpers

```12:40:/Users/laykenvarholdt/projects/agency-site/components/animations.tsx
export function useIsMdUp() {
  const [mdUp, setMdUp] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = () => setMdUp(mql.matches);
    apply();
    const handler = (e: MediaQueryListEvent) => setMdUp(e.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    } else {
      // @ts-expect-error - legacy
      mql.addListener(handler);
      return () => {
        // @ts-expect-error - legacy
        mql.removeListener(handler);
      };
    }
  }, []);
  return mdUp;
}

export const inViewDefaults = { once: true, amount: 0.45 } as const;
```

Usage in `app/page.tsx`

```152:176:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
const contentRef = useRef<HTMLDivElement | null>(null);
const mdUp = useIsMdUp();
const isInView = useInView(contentRef, inViewDefaults);

const contentMotionProps =
  reduce
    ? { initial: false }
    : mdUp
    ? ({ initial: "hidden", whileInView: "visible", viewport: inViewDefaults })
    : ({ initial: "hidden", animate: (cardContentVisible ? "visible" : "hidden") as "visible" | "hidden" });
```

Star rating start trigger and gated content

```156:176:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
<div ref={contentRef} className="relative z-[1]">
  <div className="mt-2">
    <StarRating align="left" start={reduce ? true : !!(mdUp ? isInView : cardContentVisible)} />
  </div>
  <motion.h2
    className="mt-4 font-semibold text-[var(--foreground)] opacity-0"
    variants={fadeUp}
    {...contentMotionProps}
    transition={{ delay: reduce ? 0 : 0.16 }}
  >
    All‑inclusive plan
  </motion.h2>
  <motion.ul
    className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]"
    variants={containerStagger}
    {...contentMotionProps}
    transition={{ delay: reduce ? 0 : 0.20 }}
  >
    {/* li items */}
  </motion.ul>
</div>
```

Dependencies
- `framer-motion` (installed with bun): `bun add framer-motion` [[memory:10223697]].

Key files
- `components/animations.tsx`: shared variants, `SplitWords`, and `useHeroTimings`.
- `app/page.tsx`: hero wired with `LazyMotion`, `MotionConfig`, and variants.
- `app/globals.css`: gradients remain static; no `.hero-overlay` animation inside the hero media.

Core imports in `app/page.tsx`

```14:24:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
import { LazyMotion, domAnimation, MotionConfig, m as motion, useReducedMotion } from "framer-motion";
import {
  motionDefaults,
  containerStagger,
  fadeUp,
  floatCard,
  SplitWords,
  useHeroTimings,
} from "@/components/animations";
```

Hero setup and timings

```57:69:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
export default function Home() {
  const reduce = useReducedMotion();
  const TITLE = "A 5‑Star Website for Your Business in Acadiana";
  const t = useHeroTimings(TITLE);
  const [cardContentVisible, setCardContentVisible] = useState(reduce);

  useEffect(() => {
    if (reduce) {
      setCardContentVisible(true);
    }
  }, [reduce]);
```

Header: word‑by‑word (reduced‑motion fallback is static)

The `SplitWords` component renders a single gradient heading and relies on the `.heading-word` helper (pseudo-element glow) for each word. Word-by-word animation is driven by a 50 ms stagger and ~420 ms word duration so the glow and text move in lockstep.
The hero card sequencing runs in phases: (1) card frame floats in on a spring, (2) supporting content and star rating fade up once the card completes. The image inside the card is static (no inner animations).

```64:77:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
{reduce ? (
  <h1 className="text-center text-4xl md:text-6xl font-semibold tracking-tight leading-tight mx-auto max-w-[22ch] heading-gradient">
    {TITLE}
  </h1>
) : (
  <SplitWords
    text={TITLE}
    className="text-center text-4xl md:text-6xl font-semibold tracking-tight leading-tight mx-auto max-w-[22ch]"
  />
)}
```

Hero card land; hero image renders statically

```90:102:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
<motion.div
  className="surface rounded-xl overflow-hidden motion-will-change"
  variants={floatCard}
  initial={reduce ? false : "hidden"}
  whileInView={reduce ? undefined : "visible"}
  custom={reduce ? 0 : t.cardStart}
  viewport={{ once: true, amount: 0.20 }}
  onAnimationComplete={() => {
    if (!reduce) {
      setCardContentVisible(true);
    }
  }}
>
```

Hero media markup:

```tsx
<div className="relative w-full aspect-[16/9] md:aspect-[16/9] hero-media">
  <picture>
    <img
      src="/heroimg.png"
      alt="Website preview"
      className="absolute inset-0 h-full w-full object-cover"
      decoding="async"
    />
  </picture>
  {/* Image is decorative; no inner animations */}
  {/* CTA and heading are outside this container */}
  {/* Lower panel content is gated as described below */}
</div>
```

Supporting content timing (mobile vs md+)

When the card's `onAnimationComplete` fires, `cardContentVisible` becomes `true` on mobile; downstream elements (rating line, plan heading, bullets) animate in with `fadeUp`. On md+, the same elements are gated by `useInView` and reveal only when scrolled into view. Both modes use small staggered delays.

Supporting copy, rating, heading, bullets

These are gated by `cardContentVisible` (using `animate={cardContentVisible ? "visible" : "hidden"}`) to ensure they reveal only after the icon trio animation completes. The star rating component receives `start={cardContentVisible}` prop to trigger its sequential star fill animation.

Overlay helper in CSS

No animated overlay is used in the hero media; gradients remain static.

Shared animation primitives (`components/animations.tsx`)

```1:19:/Users/laykenvarholdt/projects/agency-site/components/animations.tsx
"use client";

import { m as motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useMemo } from "react";

export const motionDefaults = {
  transition: { duration: 0.56, ease: [0.22, 1, 0.36, 1] as const },
};

export const containerStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};
```

`SplitWords` implementation (single heading with per-word glow helper)

The component renders one `motion.h1` and maps words to `.heading-word` spans. The pseudo-element on `.heading-word` recreates the glow, so both glow and gradient share the same animation timeline, while the 50 ms stagger and ~420 ms word duration define the pacing.

Hero choreography and order (within `app/page.tsx`):
1. Heading reveals word‑by‑word.
2. Hero subtext fades up.
3. Hero CTA fades up.
4. Float-in spring (`floatCard`) plays on the card shell after the CTA completes (y+scale with soft overshoot and blur → crisp).
5. On card completion, `cardContentVisible` flips to true, revealing the supporting copy, star rating (via `start={cardContentVisible}` prop), plan bullets, etc.
6. Each content element uses `fadeUp` variant with increasing delays (0.08s, 0.16s, 0.20s, 0.36s) for staggered reveal.

```101:112:/Users/laykenvarholdt/projects/agency-site/components/animations.tsx
export function useHeroTimings(headerText: string) {
  const wordCount = Math.max(headerText.trim().split(/\s+/).length, 1);
  const wordsCompleteAt = WORD_DELAY_OFFSET + (wordCount - 1) * WORD_STAGGER + WORD_DURATION;
  const headerDuration = wordsCompleteAt + WORD_PAD;

  // Ensure visible order: h1 -> subtext -> CTA -> card -> card content
  const HERO_SUBTEXT_DELAY = 0.10;
  const HERO_CTA_DELAY = 0.20;
  const AFTER_CTA_PAD = 0.04; // buffer to let CTA settle before card begins

  // Start card after CTA completes its fadeUp transition
  const cardStart = headerDuration + HERO_CTA_DELAY + motionDefaults.transition.duration + AFTER_CTA_PAD;
  const cardDuration = 0.52;
  const cardContentStart = cardStart + cardDuration + 0.06;
  const ctaStart = cardContentStart + 0.36;

  return { headerDuration, cardStart, cardContentStart, ctaStart, wordStagger: WORD_STAGGER };
}
```

Constants used:
- `WORD_STAGGER = 0.05` (50ms between words)
- `WORD_DELAY_OFFSET = 0.02` (initial delay before first word)
- `WORD_DURATION = 0.42` (420ms per word animation)
- `WORD_PAD = 0.2` (padding after words complete)

Behavioral notes
- Transforms/opacity only; no gradient stop animation. No inner overlay fade; gradients remain static [[memory:10223702]].
- Card uses a spring-based float-in (y+scale) with a light de‑blur for an airy feel.
- Hero uses `viewport={{ once: true, amount: 0.20 }}` to reveal only once.
- Order is: heading → subtext → CTA → card → card content.
- Card frame animation completes first, then `cardContentVisible` gates the supporting content.
- Reduced‑motion short‑circuits animations: both state variables initialize to `true` when `reduce` is true, skipping all animations.
- Bundle‑aware: `LazyMotion` + `domAnimation` are used.
- **Glow fix**: The heading uses a dual-layer approach where a static blurred background provides the glow effect, while the foreground text animates word-by-word. This prevents the glow from animating separately and causing a visual delay.
- Star rating component animates sequentially (350ms per star) when `start` prop becomes true.

Adjustments
- Global transition: tweak `motionDefaults.transition` in `components/animations.tsx`.
- Sequence timings: tweak `useHeroTimings` return values.
- Trigger amount: adjust `viewport.amount` on the hero/card containers.

Optional performance hint
Not added by default; you can enable a compositor hint class:

```css
.motion-will-change { will-change: transform, opacity; }
```

Testing checklist
- With reduced‑motion enabled, hero renders statically (or subtle fades only).
- Normal motion: header words → card lands → content reveals → CTAs.
- Visuals match the brand’s soft gradients; no flicker or harsh transitions.
