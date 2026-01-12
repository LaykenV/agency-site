"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: number; // Percentage change (positive = up, negative = down)
  trendLabel?: string;
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
}: StatCardProps) {
  const hasTrend = typeof trend === "number";
  const trendIcon =
    trend && trend > 0 ? (
      <TrendingUp className="h-3.5 w-3.5" />
    ) : trend && trend < 0 ? (
      <TrendingDown className="h-3.5 w-3.5" />
    ) : (
      <Minus className="h-3.5 w-3.5" />
    );

  const trendColor =
    trend && trend > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : trend && trend < 0
        ? "text-red-600 dark:text-red-400"
        : "text-[var(--muted-foreground)]";

  return (
    <div className="surface p-4 rounded-xl flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          {icon}
        </div>
        {hasTrend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            {trendIcon}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-1">
        <p className="text-2xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
          {label}
          {trendLabel && hasTrend && (
            <span className="ml-1 opacity-75">{trendLabel}</span>
          )}
        </p>
      </div>
    </div>
  );
}
