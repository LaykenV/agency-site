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

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export const scaleCard: Variants = {
  hidden: { opacity: 0, scale: 0.985 },
  visible: { opacity: 1, scale: 1 },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

type SplitWordsProps = {
  text: string;
  className?: string;
};

export function SplitWords({ text, className }: SplitWordsProps) {
  const words = text.trim().split(/\s+/);
  return (
    <div className="relative">
      {/* Background glow layer - renders text without gradient clipping so shadow works */}
      <h1 
        className={`${className} heading-gradient-glow-only`}
        aria-hidden="true"
        style={{ 
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        {text}
      </h1>
      
      {/* Animated text layer with gradient */}
      <motion.h1
        className={`${className} relative z-[1]`}
        aria-label={text}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
        }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="inline-block motion-will-change"
            variants={wordVariants}
          >
            {word}
            <span aria-hidden="true">&nbsp;</span>
          </motion.span>
        ))}
      </motion.h1>
    </div>
  );
}

const WORD_STAGGER = 0.06; // seconds between words
const WORD_PAD = 0.20;     // slight padding after words complete

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


