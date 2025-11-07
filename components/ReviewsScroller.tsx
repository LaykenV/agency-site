"use client";

import { useCallback, useMemo, useRef, useState, useEffect, UIEvent } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type Review = {
  quote: string;
  name: string;
  role: string;
  rating?: number;
  siteUrl: string;
  imageSrc: string;
  imageAlt: string;
};

interface ReviewsScrollerProps {
  reviews: readonly Review[];
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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (items.length === 0) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = Math.min(items.length - 1, activeIndex + 1);
        if (next !== activeIndex) scrollToIndex(next);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        const prev = Math.max(0, activeIndex - 1);
        if (prev !== activeIndex) scrollToIndex(prev);
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
            <div className="review-screenshot">
              <a href={review.siteUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${review.name}'s website`} className="block h-full w-full">
                <Image
                  src={review.imageSrc}
                  alt={review.imageAlt}
                  fill
                  sizes="(max-width: 768px) 90vw, (max-width: 1200px) 33vw, 360px"
                  className="review-screenshot-img"
                  priority={index === 0}
                />
              </a>
            </div>
            <div className="review-rating" aria-hidden>
              {"★".repeat(review.rating ?? 5)}
            </div>
            <blockquote className="review-quote">“{review.quote}”</blockquote>
            <div className="review-footer">
              <figcaption className="review-author">
                {review.name}
                {review.role ? <span>, {review.role}</span> : null}
              </figcaption>
              <a
                href={review.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
                aria-label={`Visit ${review.name}'s website`}
              >
                Visit site <span aria-hidden>↗</span>
              </a>
            </div>
          </figure>
        ))}
      </div>

      <div className="md:hidden">
        <div className="relative">
          <div
            ref={trackRef}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
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
                <div className="review-screenshot">
                  <a href={review.siteUrl} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${review.name}'s website`} className="block h-full w-full">
                    <Image
                      src={review.imageSrc}
                      alt={review.imageAlt}
                      fill
                      sizes="90vw"
                      className="review-screenshot-img"
                    />
                  </a>
                </div>
                <div className="review-rating" aria-hidden>
                  {"★".repeat(review.rating ?? 5)}
                </div>
                <blockquote className="review-quote">“{review.quote}”</blockquote>
                <div className="review-footer">
                  <figcaption className="review-author">
                    {review.name}
                    {review.role ? <span>, {review.role}</span> : null}
                  </figcaption>
                  <a
                    href={review.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
                    aria-label={`Visit ${review.name}'s website`}
                  >
                    Visit site <span aria-hidden>↗</span>
                  </a>
                </div>
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

