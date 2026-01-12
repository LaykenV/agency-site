"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface TopPagesProps {
  projectId: string;
  limit?: number;
}

export function TopPages({ projectId, limit = 5 }: TopPagesProps) {
  const analyticsSummary = useQuery(api.clientAnalytics.getSummary, { projectId });

  if (!analyticsSummary) {
    return (
      <div className="surface p-5 rounded-2xl">
        <div className="h-5 w-24 rounded bg-[hsl(var(--secondary))] animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 w-32 rounded bg-[hsl(var(--secondary))] animate-pulse" />
              <div className="h-4 w-12 rounded bg-[hsl(var(--secondary))] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const topPages = analyticsSummary.thisMonth.topPages.slice(0, limit);
  const maxViews = topPages.length > 0 ? topPages[0].views : 1;

  return (
    <div className="surface p-5 rounded-2xl">
      <h3 className="text-sm font-semibold mb-4">Top Pages</h3>

      {topPages.length === 0 ? (
        <div className="py-6 text-center text-sm text-[var(--muted-foreground)]">
          No page data yet
        </div>
      ) : (
        <ul className="space-y-3">
          {topPages.map((page, index) => {
            const widthPercent = (page.views / maxViews) * 100;
            return (
              <li key={page.path} className="relative">
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-[hsl(var(--primary)/0.08)] rounded"
                  style={{ width: `${widthPercent}%` }}
                />
                {/* Content */}
                <div className="relative flex items-center justify-between py-1.5 px-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-medium text-[var(--muted-foreground)] w-4 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span
                      className="text-sm truncate"
                      title={page.path}
                    >
                      {page.path}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-[var(--muted-foreground)] ml-3 flex-shrink-0">
                    {page.views.toLocaleString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
