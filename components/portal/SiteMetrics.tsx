"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Phone, Mail, MapPin, Gauge } from "lucide-react";

interface SiteMetricsProps {
  projectId: string;
  /** PageSpeed snapshot from getPortalProject (optional). */
  pageSpeedSnapshot?: {
    performanceScore: number;
    fcp?: number;
    lcp?: number;
    cls?: number;
    fetchedAt: number;
  } | null;
  pageSpeedSnapshotUrl?: string | null;
}

/**
 * Thin, self-contained Stage 3 metrics panel.
 * Stage 5 should register and reuse this component rather than rewrite it.
 *
 * Labels are honest: tel events are tap-to-call clicks, not completed calls.
 * Coarse referrer classes are not campaign or GBP attribution.
 */
export function SiteMetrics({
  projectId,
  pageSpeedSnapshot,
  pageSpeedSnapshotUrl,
}: SiteMetricsProps) {
  const analyticsSummary = useQuery(api.clientAnalytics.getSummary, { projectId });

  if (analyticsSummary === undefined) {
    return (
      <div className="surface p-6 rounded-2xl animate-pulse">
        <div className="h-5 w-40 rounded bg-[hsl(var(--secondary))] mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[hsl(var(--secondary))]" />
          ))}
        </div>
      </div>
    );
  }

  const { telClicks, emailClicks, directionsClicks } =
    analyticsSummary.thisMonth;

  const hasAnyClick = telClicks > 0 || emailClicks > 0 || directionsClicks > 0;
  const hasPageSpeed = Boolean(pageSpeedSnapshot);

  // Hide entirely when nothing Stage-3-specific is present yet
  if (!hasAnyClick && !hasPageSpeed) {
    return null;
  }

  const measuredLabel = pageSpeedSnapshot
    ? new Date(pageSpeedSnapshot.fetchedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="surface p-6 rounded-2xl space-y-5">
      <div>
        <h3 className="font-semibold text-base">Site activity</h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Tap-to-call and email clicks count taps, not completed calls or
          conversations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricTile
          icon={<Phone className="h-4 w-4" />}
          label="Tap-to-call clicks"
          value={telClicks}
        />
        <MetricTile
          icon={<Mail className="h-4 w-4" />}
          label="Email clicks"
          value={emailClicks}
        />
        <MetricTile
          icon={<MapPin className="h-4 w-4" />}
          label="Directions clicks"
          value={directionsClicks}
        />
      </div>

      {hasPageSpeed && pageSpeedSnapshot && (
        <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <Gauge className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl font-bold tabular-nums">
                {pageSpeedSnapshot.performanceScore}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                mobile performance
              </p>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Snapshot measured on {measuredLabel}
              {pageSpeedSnapshotUrl ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="break-all">
                    {pageSpeedSnapshotUrl.replace(/^https?:\/\//, "")}
                  </span>
                </>
              ) : null}
              . Not a live score.
            </p>
          </div>
        </div>
      )}

      {/*
        Referrer classes are deliberately NOT shown to clients (decided
        2026-08-05). The Hub still collects them and `getSummary` still returns
        them, so re-enabling is a display change only.

        Why hidden: `direct` is an unknown bucket, not a source — it absorbs QR
        scans, SMS links, in-app browsers, and any no-referrer policy — and a
        bare google.com referrer cannot separate search from the Business
        Profile listing. Clients read "direct 40" as "40 people typed my URL",
        which is false. Show sources again when Stage 8's UTM work can say
        something specific and true. See UPGRADE_PLAN.md § Stage 3.
      */}
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] p-4 flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1.5">{label}</p>
      </div>
    </div>
  );
}
