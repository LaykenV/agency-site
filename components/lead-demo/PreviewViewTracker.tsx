"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Records that an unlisted preview concept was opened.
 *
 * Renders nothing. Append `?notrack=1` to the URL to look at your own concept
 * without inflating the count — the whole value of this number is that it
 * reflects the lead, not you checking your work. The search param is read from
 * `window.location` rather than `useSearchParams` so the preview route stays
 * statically generated without a Suspense boundary.
 */
export function PreviewViewTracker({ slug }: { slug: string }) {
  const recordView = useMutation(api.previewViews.recordView);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    if (new URLSearchParams(window.location.search).has("notrack")) return;

    sent.current = true;
    void recordView({ slug });
  }, [recordView, slug]);

  return null;
}
