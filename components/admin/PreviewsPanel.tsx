"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { api } from "@/convex/_generated/api";

function formatDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PreviewsPanel() {
  const previews = useQuery(api.previewViews.listPreviews, {});
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/preview/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (previews === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Loading previews…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-card-foreground">Preview Concepts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Unlisted concepts sent to outbound leads. Opens are counted every time,
        so a re-open after a follow-up shows here. Add{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">?notrack=1</code>{" "}
        when checking your own work.
      </p>

      {previews.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No previews defined in <code>lib/lead-demos.ts</code>.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {previews.map((preview) => (
            <li
              key={preview.slug}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {preview.businessName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {preview.tagline}
                  </p>
                </div>

                <span
                  className={
                    preview.viewCount > 0
                      ? "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      : "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {preview.viewCount > 0 ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {preview.viewCount === 0
                    ? "Never opened"
                    : `${preview.viewCount} open${preview.viewCount === 1 ? "" : "s"}`}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">First opened</dt>
                  <dd className="tabular-nums text-foreground">
                    {formatDate(preview.firstViewedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Last opened</dt>
                  <dd className="tabular-nums text-foreground">
                    {formatDate(preview.lastViewedAt)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/preview/${preview.slug}?notrack=1`}
                  target="_blank"
                  className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => void copyLink(preview.slug)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {copiedSlug === preview.slug ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
