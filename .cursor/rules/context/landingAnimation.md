### Landing page hero animation — Implementation (Framer Motion)

This documents the hero animation we implemented with Framer Motion. It’s tasteful, performant, and respects our soft gradient aesthetic [[memory:10223702]].

Summary
- Header animates from the bottom with a single gradient heading that reveals word-by-word (50 ms stagger, ~420 ms per word), using the `.heading-word` utility for a synced glow.
- Hero subtext fades up after the heading completes.
- Hero CTA fades up after the subtext.
- The card begins only after the CTA has finished animating, then all card content follows.
- Card frame floats in first (`floatCard` variant) with a soft spring and brief de‑blur, then icon trio animates in with stagger (`containerStagger` + `popIn`).
- Supporting copy, star rating, plan bullets, and CTAs wait for `cardContentVisible` state (set after icon animation completes) before revealing.
- State management: `cardFrameDone` tracks card scale completion, `cardContentVisible` gates content reveal.
- Overlay fades shortly after the card lands (non‑destructive).
- Icons, supporting copy, and bullets stagger in.
- Motion respects reduced‑motion; hero/card viewport amount is 0.20 and runs once.

Dependencies
- `framer-motion` (installed with bun): `bun add framer-motion` [[memory:10223697]].

Key files
- `components/animations.tsx`: shared variants, `SplitWords`, and `useHeroTimings`.
- `app/page.tsx`: hero wired with `LazyMotion`, `MotionConfig`, and variants.
- `app/globals.css`: `.hero-overlay` helper to fade the hero overlay instead of animating gradients.

Core imports in `app/page.tsx`

```14:24:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
import { LazyMotion, domAnimation, MotionConfig, m as motion, useReducedMotion } from "framer-motion";
import {
  motionDefaults,
  containerStagger,
  fadeUp,
  floatCard,
  popIn,
  fadeIn,
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
  const [cardFrameDone, setCardFrameDone] = useState(reduce);
  const [cardContentVisible, setCardContentVisible] = useState(reduce);

  useEffect(() => {
    if (reduce) {
      setCardFrameDone(true);
      setCardContentVisible(true);
    }
  }, [reduce]);
```

Header: word‑by‑word (reduced‑motion fallback is static)

The `SplitWords` component renders a single gradient heading and relies on the `.heading-word` helper (pseudo-element glow) for each word. Word-by-word animation is driven by a 50 ms stagger and ~420 ms word duration so the glow and text move in lockstep.
The hero card sequencing runs in phases: (1) card frame floats in on a spring, (2) icon trio animates sequentially, (3) supporting content and star rating fade up once the icons complete.

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

Hero card land + overlay fade (we fade a child overlay, not gradient tokens)

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
      setCardFrameDone(true);
    }
  }}
>
```

```105:111:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
<motion.div
  className="absolute inset-0 motion-will-change hero-overlay opacity-0"
  variants={fadeIn}
  initial={reduce ? false : "hidden"}
  animate={reduce ? undefined : "visible"}
  transition={{ delay: reduce ? 0 : t.cardStart + 0.06 }}
/>
```

Icons and content stagger

```113:125:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
<motion.ul
  className="w-full relative z-[1] grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-8"
  role="list"
  variants={containerStagger}
  initial={reduce ? false : "hidden"}
  animate={reduce ? undefined : (cardFrameDone ? "visible" : "hidden")}
  transition={{ delay: reduce ? 0 : 0.04 }}
  onAnimationComplete={() => {
    if (!reduce) {
      setCardContentVisible(true);
    }
  }}
>
```

Supporting copy, rating, heading, bullets

These are gated by `cardContentVisible` (using `animate={cardContentVisible ? "visible" : "hidden"}`) to ensure they reveal only after the icon trio animation completes. The star rating component receives `start={cardContentVisible}` prop to trigger its sequential star fill animation.

Overlay helper in CSS

```234:239:/Users/laykenvarholdt/projects/agency-site/app/globals.css
.hero-overlay {
  background:
    linear-gradient(180deg, hsl(var(--background) / 0.00) 0%, hsl(var(--background) / 0.00) 70%, hsl(var(--background) / 0.06) 100%),
    radial-gradient(100% 60% at 50% 0%, hsl(var(--primary) / 0.10) 0%, transparent 70%);
  pointer-events: none;
}
```

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
5. `cardFrameDone` flips once the card scale animation completes (via `onAnimationComplete`), triggering the icon trio list to animate (`containerStagger` + `popIn`).
6. When the icon list finishes (via its `onAnimationComplete`), `cardContentVisible` flips, revealing the supporting copy, star rating (via `start={cardContentVisible}` prop), plan bullets, etc.
7. Each content element uses `fadeUp` variant with increasing delays (0.08s, 0.16s, 0.20s, 0.36s) for staggered reveal.

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
- Transforms/opacity only; no gradient stop animation. We fade a child overlay, preserving gradients [[memory:10223702]].
- Card uses a spring-based float-in (y+scale) with a light de‑blur for an airy feel.
- Hero uses `viewport={{ once: true, amount: 0.20 }}` to reveal only once.
- Order is: heading → subtext → CTA → card → card content.
- Card frame animation completes first, then `cardFrameDone` triggers icon trio animation.
- Icons and supporting content are gated by `cardContentVisible` so they only appear after the icon animation completes.
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
- Normal motion: header words → card lands/overlay fades → icons/copy → CTAs.
- Visuals match the brand’s soft gradients; no flicker or harsh transitions.
