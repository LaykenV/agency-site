'use client';

import { useRef, useState, useLayoutEffect } from 'react';
import { m as motion, useReducedMotion } from 'framer-motion';

type FaqItemProps = {
  question: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function FaqItem({ question, children, defaultOpen }: FaqItemProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(!!defaultOpen);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [isOpenAttr, setIsOpenAttr] = useState<boolean>(!!defaultOpen);
  const prefersReduced = useReducedMotion();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const PADDING_EXPANDED_PX = 16;

  const handleToggle = () => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      // Measure content height before expanding to avoid jump when padding/height updates
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
      setIsOpenAttr(true);
      setIsExpanded(true);
    }
  };

  // Recalculate content height when expanded or children change (covers dynamic content)
  useLayoutEffect(() => {
    if (isExpanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded, children]);

  return (
    <details
      className="faq-item surface-elevated"
      open={isOpenAttr}
    >
      <summary className="faq-summary" onClick={(e) => {
        e.preventDefault();
        handleToggle();
      }}
      aria-expanded={isExpanded}>
        <span className="faq-question">{question}</span>
        <motion.svg
          className="faq-chevron"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ rotate: isExpanded ? 0 : 180 }}
          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22 }}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </summary>
      <div className="faq-answer">
        <motion.div
          initial={false}
          animate={{ 
            height: isExpanded ? contentHeight + PADDING_EXPANDED_PX : 0, 
            opacity: isExpanded ? 1 : 0
          }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { 
                  height: { type: 'spring', stiffness: 260, damping: 26, bounce: 0 },
                  opacity: { duration: 0.2, ease: 'easeOut' }
                }
          }
          onAnimationComplete={() => {
            if (!isExpanded) {
              setIsOpenAttr(false);
            }
          }}
          style={{ overflow: 'hidden' }}
          aria-hidden={!isExpanded}
        >
          <div ref={contentRef}>{children}</div>
        </motion.div>
      </div>
    </details>
  );
}



