"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatCard } from "./StatCard";
import { Eye, UserPlus, Users, TrendingUp } from "lucide-react";

interface DashboardStatsProps {
  projectId: string;
}

export function DashboardStats({ projectId }: DashboardStatsProps) {
  const analyticsSummary = useQuery(api.clientAnalytics.getSummary, { projectId });
  const leadCounts = useQuery(api.clientLeads.getCountsByStatus, { projectId });

  const isLoading = analyticsSummary === undefined || leadCounts === undefined;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="surface p-4 rounded-xl animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-[hsl(var(--secondary))]" />
              <div className="w-12 h-4 rounded bg-[hsl(var(--secondary))]" />
            </div>
            <div className="mt-3">
              <div className="w-16 h-7 rounded bg-[hsl(var(--secondary))]" />
              <div className="w-24 h-3 rounded bg-[hsl(var(--secondary))] mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<Eye className="h-5 w-5" />}
        label="Page Views"
        value={analyticsSummary.thisMonth.pageViews}
        trend={analyticsSummary.trend}
        trendLabel="vs last month"
      />
      <StatCard
        icon={<UserPlus className="h-5 w-5" />}
        label="New Leads"
        value={leadCounts.new}
      />
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Total Leads"
        value={leadCounts.total}
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Won Leads"
        value={leadCounts.won}
      />
    </div>
  );
}
