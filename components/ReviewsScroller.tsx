"use client";

import { useCallback, useMemo, useRef, useState, useEffect, UIEvent } from "react";

import { cn } from "@/lib/utils";

type Review = {
  quote: string;
  name: string;
  role: string;
  rating?: number;
};

interface ReviewsScrollerProps {
  reviews: Review[];
  className?: string;
}

export function ReviewsScroller({ reviews, className }: ReviewsScrollerProps) {
  const items = useMemo(() => reviews.filter(Boolean), [reviews]);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      if (!container) return;
      const totalWidth = container.scrollWidth - container.clientWidth;
      if (totalWidth <= 0) {
        setActiveIndex(0);
        return;
      }

      const cardWidthEstimate = container.scrollWidth / items.length;
      const centerScrollPosition =
        container.scrollLeft + container.clientWidth / 2;

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
    card.scrollIntoView({ behavior: "smooth", inline: "center" });
    setActiveIndex(index);
  }, []);

  // Ensure the active index is correct on mount and when items change
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
    <div className={cn("reviews-section", className)}>
      <div className="hidden md:grid md:grid-cols-3 md:gap-4">
        {items.map((review, index) => (
          <figure
            key={`${review.name}-${index}`}
            className="review-card surface"
          >
            <div className="review-rating" aria-hidden>
              {"★".repeat(review.rating ?? 5)}
            </div>
            <blockquote className="review-quote">“{review.quote}”</blockquote>
            <figcaption className="review-author">
              {review.name}
              {review.role ? <span>, {review.role}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="md:hidden">
        <div className="relative">
          <div
            ref={trackRef}
            onScroll={handleScroll}
            className={cn(
              "reviews-track",
              // Center snapping like the example + hide scrollbar on iOS
              "snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:hidden"
            )}
            role="region"
            aria-label="Customer reviews"
            tabIndex={0}
          >
            {items.map((review, index) => (
              <figure
                key={`${review.name}-${index}`}
                id={`review-card-${index}`}
                className="review-card review-card-mobile surface"
              >
                <div className="review-rating" aria-hidden>
                  {"★".repeat(review.rating ?? 5)}
                </div>
                <blockquote className="review-quote">“{review.quote}”</blockquote>
                <figcaption className="review-author">
                  {review.name}
                  {review.role ? <span>, {review.role}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="reviews-dots" role="tablist" aria-label="Review index">
            {items.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                className={cn(
                  "reviews-dot",
                  index === activeIndex && "reviews-dot-active"
                )}
                aria-label={`Show review ${index + 1}`}
                aria-selected={index === activeIndex}
                aria-controls={`review-card-${index}`}
                onClick={() => scrollToIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

