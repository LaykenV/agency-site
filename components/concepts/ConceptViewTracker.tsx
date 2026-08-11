"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Record that a published concept was opened.
 *
 * Tracking runs in the browser rather than in the server component on purpose.
 * The first thing that fetches one of these URLs is Facebook's crawler building
 * the Messenger link preview the moment Layken pastes it — server-side counting
 * would log an "open" before the prospect has seen anything, which is exactly
 * the signal being measured. Crawlers do not run this mutation.
 *
 * The trade-off is that a recipient with JavaScript disabled goes uncounted.
 * That is the right way to be wrong here: an undercount is honest, whereas
 * counting our own paste as the prospect's first open is not.
 */
export function ConceptViewTracker({
  token,
  track,
}: {
  token: string;
  track: boolean;
}) {
  const recordView = useMutation(api.concepts.public.recordView);
  const recorded = useRef(false);

  useEffect(() => {
    if (!track || recorded.current) return;
    // React 18+ development remounts effects; without this a single open would
    // count twice locally and skew the only metric this feature produces.
    recorded.current = true;

    void recordView({ token }).catch(() => {
      // A failed count must never break the page the prospect came to see.
    });
  }, [recordView, token, track]);

  return null;
}
