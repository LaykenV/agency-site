"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Inbox,
  Layers3,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { StickyAuth } from "@/components/StickyAuth";

type LeadFilter = "allowed" | "spam" | "untriaged" | "fanout_paused" | "all";

const ALL_CLIENTS = "__all_clients__";
const PAGE_SIZE = 25;

const FILTERS: Array<{
  id: LeadFilter;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  {
    id: "allowed",
    label: "Allowed",
    description: "Approved by lead filtering",
    icon: ShieldCheck,
  },
  {
    id: "untriaged",
    label: "Untriaged",
    description: "Awaiting triage or fan-out paused",
    icon: Clock3,
  },
  {
    id: "fanout_paused",
    label: "Fan-out paused",
    description: "Stored without paid notifications",
    icon: ShieldAlert,
  },
  {
    id: "spam",
    label: "Spam",
    description: "Filtered submissions",
    icon: ShieldAlert,
  },
  {
    id: "all",
    label: "All",
    description: "Includes legacy and pre-v2 review",
    icon: Layers3,
  },
];

const sourceLabels: Record<string, string> = {
  "contact-form": "Contact form",
  "footer-form": "Footer form",
  phone: "Phone",
};

const reasonLabels: Record<string, string> = {
  link_spam: "Suspicious links",
  seo_solicitation: "SEO solicitation",
  crypto_scam: "Crypto scam",
  irrelevant: "Unrelated",
  gibberish: "Gibberish",
  duplicate: "Duplicate",
  suspicious_email: "Suspicious email",
  promotional: "Promotion",
  prompt_injection: "Prompt injection",
};

export default function AdminLeadsPage() {
  return (
    <StickyAuth
      loadingFallback={<FullPageLoading label="Loading client leads..." />}
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
      <LeadsDashboard />
    </StickyAuth>
  );
}

function LeadsDashboard() {
  const [filter, setFilter] = useState<LeadFilter>("allowed");
  const [selectedClient, setSelectedClient] = useState(ALL_CLIENTS);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);

  const clients = useQuery(api.adminLeads.listClients);
  const containment = useQuery(api.adminLeads.containmentStats);
  const queryArgs =
    selectedClient === ALL_CLIENTS
      ? { filter }
      : { filter, projectId: selectedClient };
  const { results, status, loadMore } = usePaginatedQuery(
    api.adminLeads.list,
    queryArgs,
    { initialNumItems: PAGE_SIZE },
  );

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

  const clientLabels = useMemo(
    () =>
      new Map(sortedClients.map((client) => [client.projectId, client.label])),
    [sortedClients],
  );

  const activeFilter = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
  const isFirstPageLoading = status === "LoadingFirstPage";

  const changeFilter = (nextFilter: LeadFilter) => {
    setFilter(nextFilter);
    setExpandedLeadId(null);
  };

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
              Cross-client inbox
            </p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl font-extrabold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
              Client leads
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
              Every website inquiry in one operational view, with allowed leads
              surfaced first.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.82)] px-4 py-3 shadow-sm backdrop-blur">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                Loaded now
              </p>
              <p className="text-xl font-extrabold tabular-nums text-[var(--foreground)]">
                {isFirstPageLoading ? "—" : results.length}
              </p>
            </div>
          </div>
        </header>

        {containment && (
          <section
            aria-label="Containment stats"
            className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatChip
              label="Accepted / 429 (UTC today)"
              value={`${containment.acceptedTodayUtc} / ${containment.rateLimitedTodayUtc}`}
              hint={`${containment.rateLimitedIngestTodayUtc} ingest · ${containment.rateLimitedVisitorTodayUtc} visitor · ${containment.rateLimitedNoTrustedTodayUtc} fallback · ${containment.projectMismatchTodayUtc} project mismatch`}
            />
            <StatChip
              label="Fan-out paused (today / total)"
              value={`${containment.fanoutPausedTodayUtc} / ${formatCapped(
                containment.fanoutPaused,
                containment.fanoutPausedCapped,
              )}`}
              hint={`Untriaged total: ${formatCapped(containment.untriaged, containment.untriagedCapped)}`}
            />
            <StatChip
              label="Allow / spam (24h)"
              value={`${formatCapped(containment.allowLast24h, containment.leadScanCapped)} / ${containment.spamLast24h}`}
              hint={`Legacy review 24h: ${containment.reviewLast24h}`}
            />
            <StatChip
              label="SMS sent / blocked (24h)"
              value={`${formatCapped(containment.smsSentLast24h, containment.activityScanCapped)} / ${containment.smsBlockedVerdictLast24h + containment.smsBlockedCeilingLast24h}`}
              hint={`${containment.smsBlockedVerdictLast24h} verdict · ${containment.smsBlockedCeilingLast24h} ceiling · ${containment.thresholdAlertsDeliveredLast24h} alerts`}
            />
          </section>
        )}

        <section
          aria-label="Lead filters"
          className="mb-6 grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end"
        >
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Triage
            </div>
            <div className="grid gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.45)] p-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {FILTERS.map((item) => {
                const Icon = item.icon;
                const isActive = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => changeFilter(item.id)}
                    className={`group flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
                      isActive
                        ? "bg-[hsl(var(--card))] text-[var(--foreground)] shadow-[0_2px_8px_rgba(15,23,42,0.08)] ring-1 ring-[hsl(var(--border))]"
                        : "text-[var(--muted-foreground)] hover:bg-[hsl(var(--card)/0.65)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${
                        item.id === "spam" && isActive
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                          : isActive
                            ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                            : "bg-[hsl(var(--muted))] text-[var(--muted-foreground)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">
                        {item.label}
                      </span>
                      <span className="block truncate text-[11px] opacity-75">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block xl:min-w-72">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              <Building2 className="h-3.5 w-3.5" />
              Client
            </span>
            <select
              value={selectedClient}
              disabled={clients === undefined}
              onChange={(event) => {
                setSelectedClient(event.target.value);
                setExpandedLeadId(null);
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
                {activeFilter.label} lead stream
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Newest submissions appear first.
              </p>
            </div>
            {selectedClient !== ALL_CLIENTS && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClient(ALL_CLIENTS);
                  setExpandedLeadId(null);
                }}
                className="cursor-pointer rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-bold text-[var(--muted-foreground)] transition-colors duration-200 hover:bg-[hsl(var(--muted))] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
              >
                Clear client filter
              </button>
            )}
          </div>

          {isFirstPageLoading ? (
            <LeadSkeleton />
          ) : results.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {results.map((lead) => (
                <LeadRow
                  key={lead._id}
                  lead={lead}
                  clientLabel={
                    clientLabels.get(lead.projectId) ??
                    `Client ${lead.projectId.slice(0, 8)}`
                  }
                  expanded={expandedLeadId === lead._id}
                  onToggle={() =>
                    setExpandedLeadId((current) =>
                      current === lead._id ? null : lead._id,
                    )
                  }
                />
              ))}
            </div>
          )}

          {(status === "CanLoadMore" || status === "LoadingMore") && (
            <div className="border-t border-[hsl(var(--border))] p-4 text-center">
              <button
                type="button"
                disabled={status === "LoadingMore"}
                onClick={() => loadMore(PAGE_SIZE)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[hsl(var(--foreground))] px-5 py-2.5 text-sm font-bold text-[hsl(var(--background))] transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {status === "LoadingMore" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {status === "LoadingMore" ? "Loading..." : "Load more leads"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type LeadRowProps = {
  lead: {
    _id: string;
    projectId: string;
    source: string;
    createdAt: number;
    triageVerdict?: string;
    fanoutPaused?: boolean;
    fanoutPausedReason?: string;
    triage?: {
      reasons: Array<string>;
      summary?: string;
    };
    data: {
      name: string;
      email: string;
      phone?: string;
      message?: string;
    };
  };
  clientLabel: string;
  expanded: boolean;
  onToggle: () => void;
};

function LeadRow({ lead, clientLabel, expanded, onToggle }: LeadRowProps) {
  const received = formatReceivedAt(lead.createdAt);
  const initials = getInitials(lead.data.name);

  return (
    <article className="group transition-colors duration-200 hover:bg-[hsl(var(--muted)/0.22)]">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="grid w-full cursor-pointer gap-4 px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--ring))] sm:px-6 lg:grid-cols-[minmax(13rem,0.9fr)_minmax(14rem,1.15fr)_minmax(13rem,1fr)_auto] lg:items-center"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${avatarClasses(lead.triageVerdict)}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--foreground)]">
              {lead.data.name}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {lead.data.email}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 lg:px-2">
          <Building2 className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
          <span className="truncate text-sm font-semibold text-[var(--foreground)]">
            {clientLabel}
          </span>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm text-[var(--muted-foreground)]">
            {lead.data.message || "No message included"}
          </p>
          <p className="mt-1 text-[11px] font-medium text-[var(--muted-foreground)]">
            {sourceLabels[lead.source] || lead.source}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge verdict={lead.triageVerdict} />
            {lead.fanoutPaused && (
              <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange-900 dark:bg-orange-950/60 dark:text-orange-300">
                Fan-out paused
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 text-xs tabular-nums text-[var(--muted-foreground)]"
              title={received.full}
            >
              <Clock3 className="h-3.5 w-3.5" />
              {received.short}
            </span>
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--muted))] text-[var(--muted-foreground)] transition-colors duration-200 group-hover:text-[var(--foreground)]">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.18)] px-4 py-5 sm:px-6 lg:pl-[5.75rem]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(15rem,0.75fr)]">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </p>
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                  {lead.data.message ||
                    "No message was included with this submission."}
                </p>
              </div>

              {lead.triage?.summary && (
                <p className="mt-3 text-xs italic leading-5 text-[var(--muted-foreground)]">
                  {lead.triage.summary}
                </p>
              )}

              {lead.triage?.reasons && lead.triage.reasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lead.triage.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)]"
                    >
                      {reasonLabels[reason] || reason.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Contact
              </p>
              <div className="space-y-2">
                <a
                  href={`mailto:${lead.data.email}?subject=${encodeURIComponent(`Re: Your inquiry to ${clientLabel}`)}`}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors duration-200 hover:border-[hsl(var(--primary)/0.55)] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{lead.data.email}</span>
                </a>
                {lead.data.phone && (
                  <a
                    href={`tel:${lead.data.phone}`}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors duration-200 hover:border-[hsl(var(--primary)/0.55)] hover:text-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {lead.data.phone}
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
                Received {received.full} via{" "}
                {sourceLabels[lead.source] || lead.source}.
                {lead.fanoutPaused
                  ? ` Paid fan-out paused${lead.fanoutPausedReason ? ` (${lead.fanoutPausedReason})` : ""}.`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/** Render a bounded scan honestly: "500+" rather than a truncated count. */
function formatCapped(value: number, capped: boolean): string {
  return capped ? `${value}+` : String(value);
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

function VerdictBadge({ verdict }: { verdict?: string }) {
  const config =
    verdict === "allow"
      ? {
          label: "Allowed",
          classes:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
        }
      : verdict === "spam"
        ? {
            label: "Spam",
            classes:
              "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
          }
        : verdict === "review"
          ? {
              label: "Review",
              classes:
                "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
            }
          : verdict === "untriaged"
            ? {
                label: "Untriaged",
                classes:
                  "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
              }
            : {
                label: "Legacy",
                classes:
                  "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
              };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

function LeadSkeleton() {
  return (
    <div
      aria-label="Loading leads"
      className="divide-y divide-[hsl(var(--border))]"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid animate-pulse gap-4 px-4 py-5 sm:px-6 lg:grid-cols-4"
        >
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
          <div className="h-10 rounded-lg bg-[hsl(var(--muted))]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filter }: { filter: LeadFilter }) {
  const isSpam = filter === "spam";
  const Icon = isSpam ? ShieldCheck : Inbox;
  return (
    <div className="px-6 py-20 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(var(--muted))] text-[var(--muted-foreground)]">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-5 font-[var(--font-display)] text-xl font-extrabold text-[var(--foreground)]">
        {isSpam ? "No spam here" : "No matching leads"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">
        Try another client or triage filter. New website submissions will appear
        here automatically.
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

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}

function avatarClasses(verdict?: string) {
  if (verdict === "spam") {
    return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300";
  }
  if (verdict === "review") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
  }
  return "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]";
}

function formatReceivedAt(timestamp: number) {
  const date = new Date(timestamp);
  return {
    short: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
    full: new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date),
  };
}
