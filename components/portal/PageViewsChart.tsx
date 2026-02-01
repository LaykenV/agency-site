"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

interface PageViewsChartProps {
  projectId: string;
  days?: number;
}

export function PageViewsChart({ projectId, days = 30 }: PageViewsChartProps) {
  const dailyStats = useQuery(api.clientAnalytics.getDailyStats, {
    projectId,
    days,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fill in missing dates with 0 views
  const chartData = useMemo(() => {
    if (!dailyStats) return null;

    const dataMap = new Map(dailyStats.map((d) => [d.date, d.pageViews]));
    const result: Array<{ date: string; pageViews: number; label: string }> = [];

    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      result.push({
        date: dateStr,
        pageViews: dataMap.get(dateStr) || 0,
        label,
      });
    }

    return result;
  }, [dailyStats, days]);

  const maxViews = useMemo(() => {
    if (!chartData) return 0;
    return Math.max(...chartData.map((d) => d.pageViews), 1);
  }, [chartData]);

  const totalViews = useMemo(() => {
    if (!chartData) return 0;
    return chartData.reduce((sum, d) => sum + d.pageViews, 0);
  }, [chartData]);

  if (!chartData) {
    return (
      <div className="surface p-6 rounded-2xl h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="h-5 w-36 rounded bg-[hsl(var(--secondary))] animate-pulse" />
          <div className="h-4 w-24 rounded bg-[hsl(var(--secondary))] animate-pulse" />
        </div>
        <div className="h-40 flex items-end gap-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[hsl(var(--secondary))] rounded-t animate-pulse"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const hoveredData = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  const CHART_HEIGHT_PX = 140;

  return (
    <div className="surface p-6 rounded-2xl h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)]">
            <BarChart3 className="h-4.5 w-4.5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Daily Page Views</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Last {days} days{totalViews > 0 ? " • Hover or tap a bar" : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          {hoveredData ? (
            <div>
              <p className="text-lg font-bold tabular-nums">{hoveredData.pageViews.toLocaleString()}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{hoveredData.label}</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold tabular-nums">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Total views</p>
            </div>
          )}
        </div>
      </div>

      {totalViews === 0 ? (
        <div className="flex-1 min-h-[140px] flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)]">
              <BarChart3 className="h-6 w-6 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">No page views recorded yet</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="-mx-1 px-1 sm:mx-0 sm:px-0 overflow-x-auto overflow-y-hidden">
            <div
              className="h-[140px] flex items-end gap-[3px] min-w-max sm:min-w-0 sm:w-full"
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ height: CHART_HEIGHT_PX }}
            >
              {chartData.map((day, index) => {
                const heightPercent = (day.pageViews / maxViews) * 100;
                const isActive = hoveredIndex === index;

                return (
                  <button
                    key={day.date}
                    type="button"
                    className={[
                      // sizing: fixed width on mobile, flexible on sm+
                      "h-full flex-none w-[10px] sm:flex-1 sm:w-auto sm:min-w-[4px]",
                      // layout: keep fill pinned to bottom (bar-chart behavior)
                      "flex flex-col justify-end",
                      // track
                      "rounded-md bg-[hsl(var(--primary)/0.06)] ring-1 ring-[hsl(var(--border))] overflow-hidden",
                      // interaction
                      "transition-colors",
                      "hover:bg-[hsl(var(--primary)/0.09)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                    ].join(" ")}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    onTouchStart={() => setHoveredIndex(index)}
                    aria-label={`${day.label}: ${day.pageViews.toLocaleString()} page views`}
                    title={`${day.label}: ${day.pageViews.toLocaleString()} views`}
                  >
                    <div
                      className={[
                        "w-full mt-auto",
                        "transition-all duration-150",
                        isActive
                          ? "bg-[hsl(var(--primary))] shadow-[0_8px_18px_-10px_hsl(var(--primary)/0.55)]"
                          : "bg-[hsl(var(--primary)/0.40)]",
                      ].join(" ")}
                      style={{
                        height: `${heightPercent}%`,
                        minHeight: day.pageViews > 0 ? 3 : 0,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-3 pt-3 border-t border-[var(--border)]">
            <span className="text-[11px] text-[var(--muted-foreground)]">{chartData[0]?.label}</span>
            <span className="text-[11px] text-[var(--muted-foreground)]">{chartData[Math.floor(chartData.length / 2)]?.label}</span>
            <span className="text-[11px] text-[var(--muted-foreground)]">{chartData[chartData.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
