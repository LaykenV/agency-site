"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Gauge,
  Globe2,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Phone,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { StickyAuth } from "@/components/StickyAuth";

const ALL_CLIENTS = "__all_clients__";

type ProjectAnalytics = {
  projectId: string;
  companyName: string | null;
  liveUrl: string | null;
  stagingUrl: string | null;
  projectStatus: string | null;
  pageSpeedSnapshot?: {
    performanceScore: number;
    fcp?: number;
    lcp?: number;
    cls?: number;
    fetchedAt: number;
  };
  pageSpeedSnapshotUrl: string | null;
  thisMonth: {
    pageViews: number;
    topPages: Array<{ path: string; views: number }>;
    topReferrers: Array<{ referrer: string; views: number }>;
    telClicks: number;
    emailClicks: number;
    directionsClicks: number;
    referrerClasses: {
      organic: number;
      social: number;
      direct: number;
      other: number;
    };
    daysWithData: number;
  };
  lastMonth: {
    pageViews: number;
    topPages: Array<{ path: string; views: number }>;
    topReferrers: Array<{ referrer: string; views: number }>;
    telClicks: number;
    emailClicks: number;
    directionsClicks: number;
    referrerClasses: {
      organic: number;
      social: number;
      direct: number;
      other: number;
    };
    daysWithData: number;
  };
  trend: number;
  last30Days: Array<{
    date: string;
    pageViews: number;
    telClicks: number;
    emailClicks: number;
    directionsClicks: number;
    referrerClasses: {
      organic: number;
      social: number;
      direct: number;
      other: number;
    };
    topPages: Array<{ path: string; views: number }>;
    topReferrers: Array<{ referrer: string; views: number }>;
  }>;
  lastActiveDate: string | null;
};

export default function AdminAnalyticsPage() {
  return (
    <StickyAuth
      loadingFallback={<FullPageLoading label="Loading client analytics..." />}
      unauthenticatedFallback={
        <div className="grid min-h-[calc(100dvh_-_var(--global-header-height))] place-items-center px-6">
          <div className="text-center">
            <h1 className="font-[var(--font-display)] text-2xl font-extrabold">
              Admin access required
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Sign in with an authorized account to continue.
            </p>
          </div>
        </div>
      }
    >
      <AnalyticsDashboard />
    </StickyAuth>
  );
}

function AnalyticsDashboard() {
  const [selectedClient, setSelectedClient] = useState(ALL_CLIENTS);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );

  const clients = useQuery(api.adminAnalytics.listClients);
  const queryArgs =
    selectedClient === ALL_CLIENTS ? {} : { projectId: selectedClient };
  const projects = useQuery(api.adminAnalytics.listByProject, queryArgs);

  const sortedClients = useMemo(() => {
    if (!clients) return [];
    const labeledClients = clients.map((client) => ({
      ...client,
      baseLabel: getClientLabel(
        client.companyName,
        client.liveUrl,
        client.projectId,
      ),
    }));
    const labelCounts = labeledClients.reduce<Map<string, number>>(
      (counts, client) => {
        counts.set(client.baseLabel, (counts.get(client.baseLabel) ?? 0) + 1);
        return counts;
      },
      new Map(),
    );

    return labeledClients
      .map((client) => ({
        ...client,
        label:
          (labelCounts.get(client.baseLabel) ?? 0) > 1
            ? `${client.baseLabel} · ${client.projectId.slice(0, 8)}`
            : client.baseLabel,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [clients]);

  const totals = useMemo(() => {
    if (!projects) return null;
    return projects.reduce(
      (acc, p) => {
        acc.pageViews += p.thisMonth.pageViews;
        acc.telClicks += p.thisMonth.telClicks;
        acc.emailClicks += p.thisMonth.emailClicks;
        acc.directionsClicks += p.thisMonth.directionsClicks;
        acc.projects += 1;
        return acc;
      },
      {
        pageViews: 0,
        telClicks: 0,
        emailClicks: 0,
        directionsClicks: 0,
        projects: 0,
      },
    );
  }, [projects]);

  const isLoading = projects === undefined;

  return (
    <main className="relative min-h-[calc(100dvh_-_var(--global-header-height))] overflow-hidden px-4 py-6 sm:px-6 md:px-8 md:py-9">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] bg-[radial-gradient(circle_at_18%_10%,hsl(var(--primary)/0.20),transparent_42%),radial-gradient(circle_at_84%_4%,hsl(var(--brand-amber)/0.13),transparent_34%)]"
      />

      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 border-b border-[hsl(var(--border))] pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-md text-sm font-semibold text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Link>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--primary))]">
              Cross-client telemetry
            </p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl font-extrabold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
              Client analytics
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
              Page views, conversion clicks, top pages, and referrer rollups
              grouped by project — including fields hidden from the client
              portal.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-3 shadow-sm backdrop-blur">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Projects with data
              </p>
              <p className="text-xl font-extrabold tabular-nums text-[var(--foreground)]">
                {isLoading ? "—" : (totals?.projects ?? 0)}
              </p>
            </div>
          </div>
        </header>

        {totals && (
          <section
            aria-label="This month totals"
            className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatChip
              label="Page views (this month)"
              value={totals.pageViews.toLocaleString()}
              hint="Summed across filtered projects"
            />
            <StatChip
              label="Tap-to-call clicks"
              value={totals.telClicks.toLocaleString()}
              hint="Taps, not completed calls"
            />
            <StatChip
              label="Email clicks"
              value={totals.emailClicks.toLocaleString()}
              hint="Mailto / email CTA taps"
            />
            <StatChip
              label="Directions clicks"
              value={totals.directionsClicks.toLocaleString()}
              hint="Map / directions CTA taps"
            />
          </section>
        )}

        <section aria-label="Client filter" className="mb-6">
          <label className="block max-w-md">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              <Building2 className="h-3.5 w-3.5" />
              Client
            </span>
            <select
              value={selectedClient}
              disabled={clients === undefined}
              onChange={(event) => {
                setSelectedClient(event.target.value);
                setExpandedProjectId(null);
              }}
              className="form-control w-full cursor-pointer disabled:cursor-wait"
            >
              <option value={ALL_CLIENTS}>All clients</option>
              {sortedClients.map((client) => (
                <option key={client.projectId} value={client.projectId}>
                  {client.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.88)] shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-4 sm:px-6">
            <div>
              <h2 className="font-[var(--font-display)] text-xl font-extrabold text-[var(--foreground)]">
                By project
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Sorted by page views this month. Expand a row for full detail.
              </p>
            </div>
            {selectedClient !== ALL_CLIENTS && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClient(ALL_CLIENTS);
                  setExpandedProjectId(null);
                }}
                className="cursor-pointer rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-bold text-[var(--muted-foreground)] transition-colors duration-200 hover:bg-[hsl(var(--muted))] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              >
                Clear client filter
              </button>
            )}
          </div>

          {isLoading ? (
            <ProjectSkeleton />
          ) : projects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {projects.map((project) => (
                <ProjectRow
                  key={project.projectId}
                  project={project}
                  expanded={expandedProjectId === project.projectId}
                  onToggle={() =>
                    setExpandedProjectId((current) =>
                      current === project.projectId ? null : project.projectId,
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProjectRow({
  project,
  expanded,
  onToggle,
}: {
  project: ProjectAnalytics;
  expanded: boolean;
  onToggle: () => void;
}) {
  const label = getClientLabel(
    project.companyName,
    project.liveUrl,
    project.projectId,
  );
  const clicks =
    project.thisMonth.telClicks +
    project.thisMonth.emailClicks +
    project.thisMonth.directionsClicks;

  return (
    <article className="group transition-colors duration-200 hover:bg-[hsl(var(--muted)/0.22)]">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="grid w-full cursor-pointer gap-4 px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--ring))] sm:px-6 lg:grid-cols-[minmax(14rem,1.2fr)_repeat(4,minmax(0,0.7fr))_auto] lg:items-center"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--foreground)]">
              {label}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {project.projectStatus ?? "No status"} ·{" "}
              {project.liveUrl
                ? project.liveUrl.replace(/^https?:\/\//, "")
                : project.projectId.slice(0, 8)}
            </p>
          </div>
        </div>

        <MetricCell
          icon={<Eye className="h-3.5 w-3.5" />}
          label="Views"
          value={project.thisMonth.pageViews}
          trend={project.trend}
        />
        <MetricCell
          icon={<Phone className="h-3.5 w-3.5" />}
          label="Call taps"
          value={project.thisMonth.telClicks}
        />
        <MetricCell
          icon={<Mail className="h-3.5 w-3.5" />}
          label="Email"
          value={project.thisMonth.emailClicks}
        />
        <MetricCell
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Directions"
          value={project.thisMonth.directionsClicks}
        />

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span className="text-xs tabular-nums text-[var(--muted-foreground)] lg:hidden">
            {clicks.toLocaleString()} clicks ·{" "}
            {project.thisMonth.pageViews.toLocaleString()} views
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[var(--muted-foreground)] transition-colors duration-200 group-hover:text-[var(--foreground)]">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </div>
      </button>

      {expanded && <ProjectDetail project={project} label={label} />}
    </article>
  );
}

function ProjectDetail({
  project,
  label,
}: {
  project: ProjectAnalytics;
  label: string;
}) {
  const { thisMonth, lastMonth, last30Days } = project;
  const maxDailyViews = Math.max(...last30Days.map((d) => d.pageViews), 1);

  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.18)] px-4 py-5 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Full rollup · {label}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Last active{" "}
            {project.lastActiveDate ? formatDate(project.lastActiveDate) : "—"}{" "}
            · last month {lastMonth.pageViews.toLocaleString()} views
          </p>
        </div>
        {project.liveUrl && (
          <a
            href={
              /^https?:\/\//i.test(project.liveUrl)
                ? project.liveUrl
                : `https://${project.liveUrl}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold text-[var(--foreground)] transition-colors hover:border-[hsl(var(--primary)/0.55)] hover:text-[hsl(var(--primary))]"
          >
            <Globe2 className="h-3.5 w-3.5" />
            Visit site
          </a>
        )}
      </div>

      {/* Conversion clicks — mirror portal SiteMetrics honesty */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <DetailTile
          icon={<Phone className="h-4 w-4" />}
          label="Tap-to-call clicks"
          value={thisMonth.telClicks}
          hint="Taps, not completed calls"
        />
        <DetailTile
          icon={<Mail className="h-4 w-4" />}
          label="Email clicks"
          value={thisMonth.emailClicks}
          hint="Mailto / email CTA taps"
        />
        <DetailTile
          icon={<MapPin className="h-4 w-4" />}
          label="Directions clicks"
          value={thisMonth.directionsClicks}
          hint="Map / directions CTA taps"
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <RankedList
          title="Top pages"
          subtitle="This month"
          icon={<FileText className="h-4 w-4" />}
          empty="No page data yet"
          items={thisMonth.topPages.map((p) => ({
            key: p.path,
            label: p.path === "/" ? "Homepage" : p.path,
            value: p.views,
          }))}
        />
        <RankedList
          title="Top referrers"
          subtitle="Host rollup · admin only"
          icon={<Link2 className="h-4 w-4" />}
          empty="No referrer data yet"
          items={thisMonth.topReferrers.map((r) => ({
            key: r.referrer,
            label: r.referrer,
            value: r.views,
          }))}
        />
      </div>

      {/* Referrer classes — hidden from clients, exposed here for ops */}
      <div className="mb-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[var(--foreground)]">
              Referrer classes
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Coarse pageview classes only (clicks do not increment). Direct is
              an unknown bucket — not “typed URL”. Admin-only surface.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["organic", thisMonth.referrerClasses.organic],
              ["social", thisMonth.referrerClasses.social],
              ["direct", thisMonth.referrerClasses.direct],
              ["other", thisMonth.referrerClasses.other],
            ] as const
          ).map(([name, count]) => (
            <div
              key={name}
              className="rounded-lg border border-[hsl(var(--border))] px-3 py-2"
            >
              <p className="text-lg font-extrabold tabular-nums">
                {count.toLocaleString()}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                {name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Last 30 days sparkline */}
      <div className="mb-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
            <div>
              <p className="text-sm font-bold">Daily page views</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Last 30 days with data ·{" "}
                {last30Days
                  .reduce((s, d) => s + d.pageViews, 0)
                  .toLocaleString()}{" "}
                total
              </p>
            </div>
          </div>
        </div>
        {last30Days.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
            No daily data in the last 30 days.
          </p>
        ) : (
          <div className="space-y-1.5">
            {last30Days.map((day) => {
              const width = (day.pageViews / maxDailyViews) * 100;
              const dayClicks =
                day.telClicks + day.emailClicks + day.directionsClicks;
              return (
                <div
                  key={day.date}
                  className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-xs"
                >
                  <span className="tabular-nums text-[var(--muted-foreground)]">
                    {formatDateShort(day.date)}
                  </span>
                  <div className="relative h-6 overflow-hidden rounded-md bg-[hsl(var(--muted)/0.55)]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md bg-[hsl(var(--primary)/0.45)]"
                      style={{
                        width: `${Math.max(width, day.pageViews > 0 ? 2 : 0)}%`,
                      }}
                    />
                    <span className="relative z-10 flex h-full items-center px-2 font-semibold tabular-nums text-[var(--foreground)]">
                      {day.pageViews.toLocaleString()} views
                    </span>
                  </div>
                  <span
                    className="min-w-[4.5rem] text-right tabular-nums text-[var(--muted-foreground)]"
                    title={`tel ${day.telClicks} · email ${day.emailClicks} · directions ${day.directionsClicks}`}
                  >
                    {dayClicks > 0 ? `${dayClicks} clicks` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PageSpeed snapshot */}
      {project.pageSpeedSnapshot && (
        <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
            <Gauge className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-2xl font-bold tabular-nums">
                {project.pageSpeedSnapshot.performanceScore}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                mobile performance
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Snapshot measured on{" "}
              {new Date(project.pageSpeedSnapshot.fetchedAt).toLocaleDateString(
                undefined,
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                },
              )}
              {project.pageSpeedSnapshotUrl ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="break-all">
                    {project.pageSpeedSnapshotUrl.replace(/^https?:\/\//, "")}
                  </span>
                </>
              ) : null}
              . Not a live score.
              {(project.pageSpeedSnapshot.fcp != null ||
                project.pageSpeedSnapshot.lcp != null ||
                project.pageSpeedSnapshot.cls != null) && (
                <>
                  {" "}
                  Lab metrics:{" "}
                  {project.pageSpeedSnapshot.fcp != null &&
                    `FCP ${formatMillisecondsAsSeconds(project.pageSpeedSnapshot.fcp)}`}
                  {project.pageSpeedSnapshot.lcp != null &&
                    ` · LCP ${formatMillisecondsAsSeconds(project.pageSpeedSnapshot.lcp)}`}
                  {project.pageSpeedSnapshot.cls != null &&
                    ` · CLS ${project.pageSpeedSnapshot.cls.toFixed(3)}`}
                  .
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] text-[var(--muted-foreground)]">
        projectId: {project.projectId}
        {project.stagingUrl ? ` · staging: ${project.stagingUrl}` : ""}
      </p>
    </div>
  );
}

function MetricCell({
  icon,
  label,
  value,
  trend,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  trend?: number;
}) {
  return (
    <div className="hidden min-w-0 lg:block">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <p className="text-sm font-extrabold tabular-nums text-[var(--foreground)]">
          {value.toLocaleString()}
        </p>
        {typeof trend === "number" && <TrendBadge trend={trend} />}
      </div>
    </div>
  );
}

function DetailTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">
          {value.toLocaleString()}
        </p>
        <p className="mt-1.5 text-xs font-semibold text-[var(--foreground)]">
          {label}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
          {hint}
        </p>
      </div>
    </div>
  );
}

function RankedList({
  title,
  subtitle,
  icon,
  empty,
  items,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  empty: string;
  items: Array<{ key: string; label: string; value: number }>;
}) {
  const max = items[0]?.value ?? 1;
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {subtitle}
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
          {empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => {
            const width = (item.value / max) * 100;
            return (
              <li key={item.key} className="relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg bg-[hsl(var(--primary)/0.06)]"
                  style={{ width: `${width}%` }}
                />
                <div className="relative flex items-center justify-between gap-3 px-2.5 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-[hsl(var(--muted))] text-[10px] font-bold text-[var(--muted-foreground)]">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {item.value.toLocaleString()}
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

function TrendBadge({ trend }: { trend: number }) {
  if (trend === 0) {
    return (
      <span
        title="Compared with the same period last month"
        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--muted-foreground)]"
      >
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const up = trend > 0;
  return (
    <span
      title="Compared with the same period last month"
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        up
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {up ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(trend)}%
    </span>
  );
}

function StatChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.85)] px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{hint}</p>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div
      aria-label="Loading analytics"
      className="divide-y divide-[hsl(var(--border))]"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid animate-pulse gap-4 px-4 py-5 sm:px-6 lg:grid-cols-5"
        >
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-20 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(var(--muted))] text-[var(--muted-foreground)]">
        <BarChart3 className="h-7 w-7" />
      </div>
      <h3 className="mt-5 font-[var(--font-display)] text-xl font-extrabold text-[var(--foreground)]">
        No analytics yet
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
        Projects appear here once a spoke posts pageviews or clicks to the Hub.
        Check Origin allowlists and publishable credentials if data is missing.
      </p>
    </div>
  );
}

function FullPageLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-[calc(100dvh_-_var(--global-header-height))] place-items-center">
      <div className="flex items-center gap-3 text-sm font-semibold text-[var(--muted-foreground)]">
        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" />
        {label}
      </div>
    </div>
  );
}

function getClientLabel(
  companyName: string | null,
  liveUrl: string | null,
  projectId: string,
) {
  if (companyName) return companyName;

  if (liveUrl) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(liveUrl)
        ? liveUrl
        : `https://${liveUrl}`;
      return new URL(normalizedUrl).hostname.replace(/^www\./, "");
    } catch {
      return liveUrl;
    }
  }

  return `Client ${projectId.slice(0, 8)}`;
}

function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function formatDateShort(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

function formatMillisecondsAsSeconds(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}
