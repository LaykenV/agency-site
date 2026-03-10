"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MessageSquare,
  ExternalLink,
  Users,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface RecentLeadsProps {
  projectId: string;
  limit?: number;
}

const sourceLabels: Record<string, string> = {
  "contact-form": "Contact Form",
  "footer-form": "Footer Form",
  phone: "Phone Call",
};

// Human-readable labels for triage reason codes
const reasonLabels: Record<string, string> = {
  seo_pitch: "SEO Pitch",
  link_building: "Link Building",
  guest_post: "Guest Post",
  marketing_solicitation: "Marketing",
  contains_links: "Contains Links",
  gibberish: "Gibberish",
  duplicate: "Duplicate",
  legit_service_inquiry: "Service Inquiry",
  triage_error: "Triage Error",
  parse_error: "Parse Error",
  low_confidence_upgrade: "Low Confidence",
};

type TabId = "inbox" | "spam";

export function RecentLeads({ projectId, limit = 50 }: RecentLeadsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("inbox");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch all leads (inbox view) — excludes spam client-side
  const allLeads = useQuery(api.clientLeads.listByProject, { projectId, limit });
  // Fetch spam leads specifically using the index
  const spamLeads = useQuery(api.clientLeads.listByProject, {
    projectId,
    limit,
    triageVerdict: "spam" as const,
  });

  const markNotSpam = useMutation(api.clientLeads.markNotSpam);

  // Derive inbox leads (everything except spam)
  const inboxLeads = allLeads?.filter((l) => l.triageVerdict !== "spam");

  const isLoading = allLeads === undefined || spamLeads === undefined;
  const leads = activeTab === "inbox" ? inboxLeads : spamLeads;
  const spamCount = spamLeads?.length ?? 0;

  if (isLoading) {
    return (
      <div className="surface p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-[hsl(var(--secondary))] animate-pulse" />
          <div className="h-5 w-28 rounded bg-[hsl(var(--secondary))] animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-[hsl(var(--secondary)/0.3)] animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[hsl(var(--secondary))]" />
                  <div>
                    <div className="h-4 w-24 rounded bg-[hsl(var(--secondary))]" />
                    <div className="h-3 w-32 rounded bg-[hsl(var(--secondary))] mt-2" />
                  </div>
                </div>
                <div className="h-4 w-16 rounded bg-[hsl(var(--secondary))]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-6 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)]">
            <Users className="h-4.5 w-4.5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Leads</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Contact form submissions</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg border border-[color-mix(in_hsl,hsl(var(--border)),hsl(var(--primary))_14%)] bg-[hsl(var(--muted)/0.5)]">
        <button
          type="button"
          onClick={() => { setActiveTab("inbox"); setExpandedId(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "inbox"
              ? "bg-[var(--background)] text-[hsl(var(--primary))] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_color-mix(in_hsl,hsl(var(--border)),hsl(var(--primary))_22%)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[hsl(var(--muted)/0.5)]"
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          Inbox
          {inboxLeads && inboxLeads.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
              {inboxLeads.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("spam"); setExpandedId(null); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === "spam"
              ? "bg-[var(--background)] text-[hsl(var(--primary))] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_color-mix(in_hsl,hsl(var(--border)),hsl(var(--primary))_22%)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[hsl(var(--muted)/0.5)]"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Spam
          {spamCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {spamCount}
            </span>
          )}
        </button>
      </div>

      {/* Empty state */}
      {(!leads || leads.length === 0) && (
        <div className="py-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--muted)] mb-4">
            {activeTab === "inbox" ? (
              <Mail className="h-7 w-7 text-[var(--muted-foreground)]" />
            ) : (
              <ShieldCheck className="h-7 w-7 text-[var(--muted-foreground)]" />
            )}
          </div>
          <p className="text-sm font-medium mb-1">
            {activeTab === "inbox" ? "No leads yet" : "No spam"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {activeTab === "inbox"
              ? "They\u2019ll appear here when visitors submit your contact form."
              : "Filtered spam submissions will appear here."}
          </p>
        </div>
      )}

      {/* Lead list */}
      {leads && leads.length > 0 && (
        <div className="space-y-2">
          {leads.map((lead) => {
            const isExpanded = expandedId === lead._id;
            const date = new Date(lead.createdAt);
            const formattedDate = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const formattedTime = date.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

            // Get initials for avatar
            const initials = lead.data.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            // Triage badge
            const triageBadge = getTriageBadge(lead.triageVerdict);

            return (
              <div
                key={lead._id}
                className="rounded-xl border border-[color-mix(in_hsl,hsl(var(--border)),hsl(var(--primary))_14%)] bg-[var(--background)] overflow-hidden transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-[color-mix(in_hsl,hsl(var(--border)),hsl(var(--primary))_28%)]"
              >
                {/* Compact row - always visible */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : lead._id)}
                  className="w-full p-4 flex items-center justify-between gap-4 hover:bg-[hsl(var(--muted)/0.2)] transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      activeTab === "spam"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{lead.data.name}</p>
                        {triageBadge}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        {lead.data.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-medium">{formattedDate}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{formattedTime}</p>
                    </div>
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        isExpanded ? "bg-[hsl(var(--primary)/0.1)]" : "bg-[var(--muted)]"
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[hsl(var(--primary))]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[color-mix(in_hsl,hsl(var(--border)),hsl(var(--primary))_10%)] bg-[hsl(var(--muted)/0.15)]">
                    {/* Triage reason chips (for spam/review) */}
                    {lead.triage?.reasons && lead.triage.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {lead.triage.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          >
                            {reasonLabels[reason] || reason}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Triage summary */}
                    {lead.triage?.summary && (
                      <p className="text-xs text-[var(--muted-foreground)] mb-3 italic">
                        {lead.triage.summary}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {/* Email */}
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--background)]">
                        <Mail className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                        <a
                          href={`mailto:${lead.data.email}`}
                          className="text-[hsl(var(--primary))] hover:underline truncate text-sm"
                        >
                          {lead.data.email}
                        </a>
                      </div>

                      {/* Phone */}
                      {lead.data.phone && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--background)]">
                          <Phone className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                          <a
                            href={`tel:${lead.data.phone}`}
                            className="text-[hsl(var(--primary))] hover:underline text-sm"
                          >
                            {lead.data.phone}
                          </a>
                        </div>
                      )}

                      {/* Source */}
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--background)]">
                        <ExternalLink className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                        <span className="text-[var(--muted-foreground)] text-sm">
                          {sourceLabels[lead.source] || lead.source}
                        </span>
                      </div>

                      {/* Date on mobile */}
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--background)] sm:hidden">
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {formattedDate} at {formattedTime}
                        </span>
                      </div>
                    </div>

                    {/* Message */}
                    {lead.data.message && (
                      <div className="mt-3 p-3 rounded-lg bg-[var(--background)] border border-[color-mix(in_hsl,hsl(var(--border)),hsl(var(--primary))_12%)]">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                            {lead.data.message}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeTab === "spam" ? (
                        <NotSpamButton
                          projectId={projectId}
                          leadId={lead._id}
                          markNotSpam={markNotSpam}
                        />
                      ) : (
                        <>
                          <a
                            href={`mailto:${lead.data.email}?subject=Re: Your inquiry`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Reply via Email
                          </a>
                          {lead.data.phone && (
                            <a
                              href={`tel:${lead.data.phone}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              Call
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Triage badge helper
// ---------------------------------------------------------------------------

function getTriageBadge(verdict?: string) {
  switch (verdict) {
    case "untriaged":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          Checking
        </span>
      );
    case "review":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertTriangle className="h-2.5 w-2.5" />
          Review
        </span>
      );
    case "spam":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <ShieldAlert className="h-2.5 w-2.5" />
          Spam
        </span>
      );
    // "allow" and undefined (legacy leads) get no badge
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Not Spam button with loading state
// ---------------------------------------------------------------------------

function NotSpamButton({
  projectId,
  leadId,
  markNotSpam,
}: {
  projectId: string;
  leadId: Id<"client_leads">;
  markNotSpam: ReturnType<typeof useMutation>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          await markNotSpam({ projectId, leadId });
        } catch (err) {
          console.error("Failed to mark as not spam", err);
        } finally {
          setIsLoading(false);
        }
      }}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" />
      )}
      Not Spam
    </button>
  );
}
