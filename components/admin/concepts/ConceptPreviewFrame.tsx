"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CONCEPT_IFRAME_SANDBOX } from "@/lib/concepts/sandbox";
import { cn } from "@/lib/utils";

/**
 * Render a concept at a chosen device width, scaled to fit the review panel.
 *
 * The iframe is laid out at the true target width and then transformed down,
 * rather than being resized to the panel. A 1280px-wide iframe squeezed into a
 * 700px panel would trigger the concept's mobile media queries and show the
 * wrong layout; scaling shows the real desktop rendering, just smaller.
 *
 * No screenshot files are produced. This is the review surface the plan calls
 * for: mobile and desktop widths from the one stored document.
 */

const WIDTHS = [
  { id: "phone", label: "Phone", width: 390, height: 844 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "desktop", label: "Desktop", width: 1280, height: 900 },
] as const;

type WidthId = (typeof WIDTHS)[number]["id"];

export function ConceptPreviewFrame({
  html,
  businessName,
}: {
  html: string;
  businessName: string;
}) {
  const [widthId, setWidthId] = useState<WidthId>("phone");
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const device = WIDTHS.find((entry) => entry.id === widthId) ?? WIDTHS[0];

  const recomputeScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const available = container.clientWidth;
    if (available <= 0) return;
    // Never scale up: a phone-width concept should look phone-sized on a large
    // monitor, not stretched to fill it.
    setScale(Math.min(1, available / device.width));
  }, [device.width]);

  useEffect(() => {
    recomputeScale();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(recomputeScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [recomputeScale]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {WIDTHS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setWidthId(entry.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              entry.id === widthId
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
            )}
          >
            {entry.label}
            <span className="ml-1 opacity-60">{entry.width}px</span>
          </button>
        ))}
        <span className="text-xs text-[var(--muted-foreground)]">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]"
        // The scaled frame is absolutely sized, so the wrapper needs the
        // post-scale height or the panel below it would overlap.
        style={{ height: device.height * scale }}
      >
        <iframe
          // Identical to the recipient-facing sandbox, so this review reflects
          // what the prospect will actually be able to tap.
          sandbox={CONCEPT_IFRAME_SANDBOX}
          srcDoc={html}
          title={`${businessName} concept at ${device.width}px`}
          referrerPolicy="no-referrer"
          className="border-0 bg-white"
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
