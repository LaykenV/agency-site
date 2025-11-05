"use client";

import React, { UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type HorizontalScrollerProps = {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  cardClassName?: string;
  ariaLabel?: string;
};

export function HorizontalScroller({
  children,
  className,
  trackClassName,
  cardClassName,
  ariaLabel,
}: HorizontalScrollerProps) {
  const items = useMemo(() => React.Children.toArray(children).filter(Boolean), [children]);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      if (!container || items.length === 0) return;
      const totalWidth = container.scrollWidth - container.clientWidth;
      if (totalWidth <= 0) {
        setActiveIndex(0);
        return;
      }

      const cardWidthEstimate = container.scrollWidth / items.length;
      const centerScrollPosition = container.scrollLeft + container.clientWidth / 2;

      let newIndex = Math.floor(centerScrollPosition / cardWidthEstimate);
      newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }
    },
    [activeIndex, items.length]
  );

  const scrollToIndex = useCallback((index: number) => {
    const container = trackRef.current;
    if (!container) return;
    const card = container.children[index] as HTMLElement | undefined;
    if (!card) return;
    const targetLeft = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  // Initialize the active index on mount and when item count changes
  useEffect(() => {
    const container = trackRef.current;
    if (!container || items.length === 0) return;
    const totalWidth = container.scrollWidth - container.clientWidth;
    if (totalWidth <= 0) {
      setActiveIndex(0);
      return;
    }
    const cardWidthEstimate = container.scrollWidth / items.length;
    const centerScrollPosition = container.scrollLeft + container.clientWidth / 2;
    let newIndex = Math.floor(centerScrollPosition / cardWidthEstimate);
    newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    setActiveIndex(newIndex);
  }, [items.length]);

  return (
    <div className={cn(className)}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className={cn("hscroll-track", trackClassName)}
        role="region"
        aria-label={ariaLabel ?? "Horizontal scroller"}
        tabIndex={0}
      >
        {items.map((child, index) => (
          <div
            key={index}
            id={`hscroll-card-${index}`}
            className={cn("hscroll-card", cardClassName)}
          >
            {child}
          </div>
        ))}
      </div>
      <div className="hscroll-dots" role="tablist" aria-label="Scroller index">
        {items.map((_, index) => (
          <button
            key={`hscroll-dot-${index}`}
            type="button"
            className={cn("hscroll-dot", index === activeIndex && "hscroll-dot-active")}
            aria-label={`Show item ${index + 1}`}
            aria-selected={index === activeIndex}
            aria-controls={`hscroll-card-${index}`}
            onClick={() => scrollToIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}


