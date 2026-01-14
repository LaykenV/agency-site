"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FileText } from "lucide-react";

interface TopPagesProps {
  projectId: string;
  limit?: number;
}

export function TopPages({ projectId, limit = 5 }: TopPagesProps) {
  const analyticsSummary = useQuery(api.clientAnalytics.getSummary, { projectId });

  if (!analyticsSummary) {
    return (
      <div className="surface p-6 rounded-2xl h-full">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-[hsl(var(--secondary))] animate-pulse" />
          <div className="h-5 w-24 rounded bg-[hsl(var(--secondary))] animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex justify-between items-center p-2">
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
    <div className="surface p-6 rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)]">
          <FileText className="h-4.5 w-4.5 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Top Pages</h3>
          <p className="text-xs text-[var(--muted-foreground)]">By views this month</p>
        </div>
      </div>

      {topPages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]">
              <FileText className="h-6 w-6 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">No page data yet</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2 flex-1">
          {topPages.map((page, index) => {
            const widthPercent = (page.views / maxViews) * 100;
            return (
              <li key={page.path} className="relative">
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-[hsl(var(--primary)/0.06)] rounded-lg transition-all"
                  style={{ width: `${widthPercent}%` }}
                />
                {/* Content */}
                <div className="relative flex items-center justify-between py-2.5 px-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--background)] text-xs font-semibold text-[var(--muted-foreground)] flex-shrink-0">
                      {index + 1}
                    </span>
                    <span
                      className="text-sm truncate"
                      title={page.path}
                    >
                      {page.path === "/" ? "Homepage" : page.path}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums ml-3 flex-shrink-0">
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
