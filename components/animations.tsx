"use client";

import { m as motion } from "framer-motion";
import type { Variants } from "framer-motion";

export const motionDefaults = {
  transition: { duration: 0.56, ease: [0.22, 1, 0.36, 1] as const },
};

const WORD_STAGGER = 0.05; // seconds between words
const WORD_DELAY_OFFSET = 0.02; // initial delay before first word animates
const WORD_DURATION = 0.42; // duration of each word animation
const WORD_PAD = 0.2; // slight padding after words complete

const headingRevealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...motionDefaults.transition,
      delayChildren: WORD_DELAY_OFFSET,
      staggerChildren: WORD_STAGGER,
    },
  },
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
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: WORD_DURATION,
      ease: motionDefaults.transition.ease,
    },
  },
};

type SplitWordsProps = {
  text: string;
  className?: string;
};

export function SplitWords({ text, className }: SplitWordsProps) {
  const words = text.trim().split(/\s+/);
  return (
    <motion.h1
      className={className}
      initial="hidden"
      animate="visible"
      variants={headingRevealVariants}
    >
      {words.map((word, i) => {
        const textWithSpace = i === words.length - 1 ? word : `${word}\u00A0`;
        return (
          <motion.span
            key={`word-${i}`}
            data-text={textWithSpace}
            className="heading-word heading-gradient inline-block motion-will-change"
            variants={wordVariants}
          >
            {textWithSpace}
          </motion.span>
        );
      })}
    </motion.h1>
  );
}

export function useHeroTimings(headerText: string) {
  const wordCount = Math.max(headerText.trim().split(/\s+/).length, 1);
  const wordsCompleteAt = WORD_DELAY_OFFSET + (wordCount - 1) * WORD_STAGGER + WORD_DURATION;
  const headerDuration = wordsCompleteAt + WORD_PAD;

  const cardStart = wordsCompleteAt + 0.02;
  const cardDuration = 0.52;
  const cardContentStart = cardStart + cardDuration + 0.06;
  const ctaStart = cardContentStart + 0.36;

  return { headerDuration, cardStart, cardContentStart, ctaStart, wordStagger: WORD_STAGGER };
}


