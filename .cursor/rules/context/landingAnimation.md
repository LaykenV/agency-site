### Landing page hero animation — Implementation (Framer Motion)

This documents the hero animation we implemented with Framer Motion. It’s tasteful, performant, and respects our soft gradient aesthetic [[memory:10223702]].

Summary
- Header animates from the bottom with a single gradient heading that reveals word-by-word (50 ms stagger, ~420 ms per word), using the `.heading-word` utility for a synced glow.
- Hero card lands ~20ms after the final word finishes animating, so it follows immediately without overlap.
- Icon trio animates in first; supporting copy, star rating, and CTAs wait for that phase to finish before revealing.
- Overlay fades shortly after the card lands (non‑destructive).
- Icons, supporting copy, and bullets stagger in; CTAs animate last.
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
  scaleCard,
  popIn,
  fadeIn,
  SplitWords,
  useHeroTimings,
} from "@/components/animations";
```

Hero setup and timings

```57:62:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
export default function Home() {
  const reduce = useReducedMotion();
  const TITLE = "A 5‑Star Website for Your Business in Acadiana";
  const t = useHeroTimings(TITLE);
  const [cardRevealed, setCardRevealed] = useState(false);
```

Header: word‑by‑word (reduced‑motion fallback is static)

The `SplitWords` component renders a single gradient heading and relies on the `.heading-word` helper (pseudo-element glow) for each word. Word-by-word animation is driven by a 50 ms stagger and ~420 ms word duration so the glow and text move in lockstep.
The hero card sequencing runs in phases: (1) card frame scales in, (2) icon trio animates sequentially, (3) supporting content and star rating fade up once the icons complete.

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

```82:90:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
<motion.div
  className="surface rounded-xl overflow-hidden motion-will-change"
  variants={scaleCard}
  initial={reduce ? false : "hidden"}
  whileInView={reduce ? undefined : "visible"}
  transition={{ ...motionDefaults.transition, delay: reduce ? 0 : t.cardStart }}
  viewport={{ once: true, amount: 0.20 }}
  onAnimationComplete={() => setCardRevealed(true)}
>
```

```90:98:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
<motion.div
  className="absolute inset-0 motion-will-change hero-overlay opacity-0"
  variants={fadeIn}
  initial={reduce ? false : "hidden"}
  animate={reduce ? undefined : "visible"}
  transition={{ delay: reduce ? 0 : t.cardStart + 0.06 }}
/>
```

Icons and content stagger

```101:107:/Users/laykenvarholdt/projects/agency-site/app/page.tsx
<motion.ul
  className="w-full relative z-[1] grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-8"
  role="list"
  variants={containerStagger}
  initial={reduce ? false : "hidden"}
  animate={reduce ? undefined : (cardRevealed ? "visible" : "hidden")}
  transition={{ delay: reduce ? 0 : 0.04 }}
>
```

Supporting copy, rating, heading, bullets

These are gated by `cardRevealed` (using `animate={cardRevealed ? "visible" : "hidden"}`) to ensure they reveal only after the card finishes.

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

Hero card choreography (within `app/page.tsx`):
1. Scale animation (`scaleCard`) plays on the card shell.
2. `cardFrameDone` flips once the scale animation completes, triggering the icon trio list to animate (`containerStagger` + `popIn`).
3. When the icon list finishes, `cardContentVisible` flips, revealing the supporting copy, star rating (via `start` prop), plan bullets, and CTAs.

```82:96:/Users/laykenvarholdt/projects/agency-site/components/animations.tsx
export function useHeroTimings(headerText: string) {
  return useMemo(() => {
    const words = headerText.trim().split(/\s+/);
    // Account for per-word animation duration from MotionConfig defaults
    const WORD_ANIM_DURATION = motionDefaults.transition.duration;
    const headerDuration = (Math.max(words.length - 1, 0) * WORD_STAGGER) + WORD_ANIM_DURATION + WORD_PAD;

    // Start hero card after header fully completes
    const cardStart = headerDuration + 0.08;
    const cardDuration = 0.52;
    const cardContentStart = cardStart + cardDuration + 0.06;
    const ctaStart = cardContentStart + 0.36;

    return { headerDuration, cardStart, cardContentStart, ctaStart, wordStagger: WORD_STAGGER };
  }, [headerText]);
}
```

Behavioral notes
- Transforms/opacity only; no gradient stop animation. We fade a child overlay, preserving gradients [[memory:10223702]].
- Hero uses `viewport={{ once: true, amount: 0.20 }}` to reveal only once.
- Icons and supporting content are gated by `cardRevealed` so they only appear after the card finishes.
- Reduced‑motion short‑circuits animations to static or simple fade.
- Bundle‑aware: `LazyMotion` + `domAnimation` are used.
- **Glow fix**: The heading uses a dual-layer approach where a static blurred background provides the glow effect, while the foreground text animates word-by-word. This prevents the glow from animating separately and causing a visual delay.

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
