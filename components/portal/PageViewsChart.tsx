"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState, useRef } from "react";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { m as motion, useInView, AnimatePresence } from "framer-motion";

interface PageViewsChartProps {
  projectId: string;
  days?: number;
}

interface DayData {
  date: string;
  pageViews: number;
  label: string;
  fullLabel: string;
  dayOfWeek: string;
  isToday: boolean;
  isWeekend: boolean;
}

export function PageViewsChart({ projectId, days = 30 }: PageViewsChartProps) {
  const dailyStats = useQuery(api.clientAnalytics.getDailyStats, {
    projectId,
    days,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(chartRef, { once: true, amount: 0.3 });

  // Fill in missing dates with 0 views and add metadata
  const chartData = useMemo(() => {
    if (!dailyStats) return null;

    const dataMap = new Map(dailyStats.map((d) => [d.date, d.pageViews]));
    const result: DayData[] = [];

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      result.push({
        date: dateStr,
        pageViews: dataMap.get(dateStr) || 0,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        fullLabel: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        dayOfWeek,
        isToday: dateStr === todayStr,
        isWeekend,
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

  const averageViews = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return totalViews / chartData.length;
  }, [chartData, totalViews]);

  // Calculate trend vs previous period
  const trend = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;
    
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);
    
    const firstSum = firstHalf.reduce((sum, d) => sum + d.pageViews, 0);
    const secondSum = secondHalf.reduce((sum, d) => sum + d.pageViews, 0);
    
    if (firstSum === 0) return secondSum > 0 ? 100 : 0;
    
    return Math.round(((secondSum - firstSum) / firstSum) * 100);
  }, [chartData]);

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTooltipPosition(null);
  };

  if (!chartData) {
    return (
      <div className="surface p-6 rounded-2xl h-full">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[hsl(var(--secondary))] animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 rounded bg-[hsl(var(--secondary))] animate-pulse" />
              <div className="h-3 w-20 rounded bg-[hsl(var(--secondary))] animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-16 rounded-full bg-[hsl(var(--secondary))] animate-pulse" />
        </div>
        <div className="h-[160px] flex items-end gap-[2px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t animate-pulse"
              style={{ 
                height: `${20 + Math.random() * 60}%`,
                background: 'linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--muted)) 100%)'
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  const hoveredData = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  // Calculate comparison to average for tooltip
  const getComparisonToAverage = (views: number) => {
    if (averageViews === 0) return null;
    const diff = ((views - averageViews) / averageViews) * 100;
    return Math.round(diff);
  };

  return (
    <div ref={chartRef} className="surface p-6 rounded-2xl h-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] ring-1 ring-[hsl(var(--primary)/0.2)]">
            <BarChart3 className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Daily Page Views</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Last {days} days</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Trend pill */}
          {trend !== null && totalViews > 0 && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
              ${trend > 0 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                : trend < 0 
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }
            `}>
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{trend > 0 ? "+" : ""}{trend}%</span>
            </div>
          )}
          {/* Stats display */}
          <div className="text-right">
            <p className="text-xl font-bold tabular-nums tracking-tight">
              {totalViews.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Total views</p>
          </div>
        </div>
      </div>

      {totalViews === 0 ? (
        /* Enhanced Empty State */
        <div className="flex-1 min-h-[160px] flex items-center justify-center">
          <div className="text-center max-w-[240px]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--primary)/0.05)] ring-1 ring-[hsl(var(--primary)/0.1)]">
              <BarChart3 className="h-7 w-7 text-[hsl(var(--primary)/0.5)]" />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">No page views yet</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Traffic data will appear here once visitors start arriving
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Chart area with bars */}
          <div
            className="h-[160px] flex gap-[2px] relative"
            onMouseLeave={handleMouseLeave}
          >
            {/* Average line */}
            {averageViews > 0 && (
              <div 
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ bottom: `${(averageViews / maxViews) * 100}%` }}
              >
                <div className="w-full border-t border-dashed border-[hsl(var(--primary)/0.3)]" />
                <span className="absolute -top-2.5 right-0 text-[9px] font-medium text-[var(--muted-foreground)] bg-[var(--card)] px-1.5 py-0.5 rounded-sm">
                  avg
                </span>
              </div>
            )}

            {/* Animated bars */}
            <motion.div
              className="flex-1 flex gap-[2px] h-full"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={{
                hidden: {},
                visible: { 
                  transition: { 
                    staggerChildren: 0.012, 
                    delayChildren: 0.05 
                  } 
                }
              }}
            >
              {chartData.map((day, index) => {
                const height = (day.pageViews / maxViews) * 100;
                const isHovered = hoveredIndex === index;

                return (
                  <motion.div
                    key={day.date}
                    className="flex-1 min-w-[3px] relative cursor-pointer"
                    onMouseEnter={(e) => handleMouseMove(e, index)}
                    onMouseMove={(e) => handleMouseMove(e, index)}
                    onTouchStart={() => setHoveredIndex(index)}
                    variants={{
                      hidden: { scaleY: 0, opacity: 0 },
                      visible: { 
                        scaleY: 1, 
                        opacity: 1,
                        transition: { 
                          duration: 0.5, 
                          ease: [0.22, 1, 0.36, 1]
                        } 
                      }
                    }}
                    style={{ transformOrigin: "bottom" }}
                  >
                    {/* Weekend background indicator */}
                    {day.isWeekend && (
                      <div className="absolute inset-0 bg-[hsl(var(--muted)/0.3)] rounded-sm" />
                    )}
                    
                    {/* Bar */}
                    <div
                      className={`
                        absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-200
                        ${day.isToday ? "chart-bar-today" : "chart-bar"}
                      `}
                      style={{
                        height: `${Math.max(height, day.pageViews > 0 ? 4 : 0)}%`,
                        background: isHovered
                          ? `linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)`
                          : day.isToday
                            ? `linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 100%)`
                            : `linear-gradient(180deg, hsl(var(--primary) / 0.7) 0%, hsl(var(--primary) / 0.45) 100%)`,
                        boxShadow: isHovered
                          ? '0 0 16px 3px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.3)'
                          : day.isToday
                            ? '0 0 12px 2px hsl(var(--primary) / 0.25), inset 0 1px 0 hsl(0 0% 100% / 0.2)'
                            : 'inset 0 1px 0 hsl(0 0% 100% / 0.15)',
                      }}
                    />

                    {/* Today indicator dot */}
                    {day.isToday && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_6px_2px_hsl(var(--primary)/0.4)]" />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Floating Tooltip */}
            <AnimatePresence>
              {hoveredData && tooltipPosition && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute z-50 pointer-events-none"
                  style={{
                    left: Math.min(Math.max(tooltipPosition.x, 90), chartRef.current ? chartRef.current.offsetWidth - 90 : 200),
                    top: Math.max(tooltipPosition.y - 85, 10),
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="chart-tooltip surface-elevated px-3.5 py-2.5 rounded-xl min-w-[150px] text-center">
                    <p className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                      {hoveredData.fullLabel}
                    </p>
                    <p className="text-xl font-bold tabular-nums tracking-tight mt-0.5">
                      {hoveredData.pageViews.toLocaleString()}
                    </p>
                    {(() => {
                      const comparison = getComparisonToAverage(hoveredData.pageViews);
                      if (comparison === null) return null;
                      return (
                        <div className={`
                          flex items-center justify-center gap-1 text-xs mt-1
                          ${comparison > 0 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : comparison < 0 
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-[var(--muted-foreground)]"
                          }
                        `}>
                          {comparison > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : comparison < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          <span className="font-medium">
                            {comparison > 0 ? "+" : ""}{comparison}% vs avg
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-3 pt-3 border-t border-[var(--border)]">
            <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
              {chartData[0]?.label}
            </span>
            <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
              {chartData[Math.floor(chartData.length / 2)]?.label}
            </span>
            <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
              {chartData[chartData.length - 1]?.label}
              {chartData[chartData.length - 1]?.isToday && (
                <span className="ml-1 text-[hsl(var(--primary))]">Today</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
