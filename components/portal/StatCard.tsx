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
      <TrendingUp className="h-3 w-3" />
    ) : trend && trend < 0 ? (
      <TrendingDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    );

  const trendColor =
    trend && trend > 0
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : trend && trend < 0
        ? "bg-red-500/10 text-red-600 dark:text-red-400"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";

  return (
    <div className="surface p-5 rounded-xl flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          {icon}
        </div>
        {hasTrend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColor}`}>
            {trendIcon}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {label}
          {trendLabel && hasTrend && (
            <span className="ml-1 opacity-75 text-xs">{trendLabel}</span>
          )}
        </p>
      </div>
    </div>
  );
}
