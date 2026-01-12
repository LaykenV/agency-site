"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";

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
      <div className="surface p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 rounded bg-[hsl(var(--secondary))] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[hsl(var(--secondary))] animate-pulse" />
        </div>
        <div className="h-32 flex items-end gap-1">
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

  return (
    <div className="surface p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Daily Page Views</h3>
        <div className="text-xs text-[var(--muted-foreground)]">
          {hoveredData ? (
            <span className="font-medium text-[var(--foreground)]">
              {hoveredData.label}: {hoveredData.pageViews.toLocaleString()} views
            </span>
          ) : (
            <span>Last {days} days: {totalViews.toLocaleString()} total</span>
          )}
        </div>
      </div>

      {totalViews === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-[var(--muted-foreground)]">
          No page views recorded yet
        </div>
      ) : (
        <div
          className="h-32 flex items-end gap-[2px]"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {chartData.map((day, index) => {
            const height = (day.pageViews / maxViews) * 100;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={day.date}
                className="flex-1 min-w-[4px] relative group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onTouchStart={() => setHoveredIndex(index)}
              >
                <div
                  className={`
                    w-full rounded-t transition-all duration-150
                    ${isHovered
                      ? "bg-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--primary)/0.6)]"
                    }
                  `}
                  style={{
                    height: `${Math.max(height, day.pageViews > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[10px] text-[var(--muted-foreground)]">
        <span>{chartData[0]?.label}</span>
        <span>{chartData[Math.floor(chartData.length / 2)]?.label}</span>
        <span>{chartData[chartData.length - 1]?.label}</span>
      </div>
    </div>
  );
}
