"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Phone, MessageSquare, ExternalLink, Users } from "lucide-react";

interface RecentLeadsProps {
  projectId: string;
  limit?: number;
}

const sourceLabels: Record<string, string> = {
  "contact-form": "Contact Form",
  "footer-form": "Footer Form",
  phone: "Phone Call",
};

export function RecentLeads({ projectId, limit = 10 }: RecentLeadsProps) {
  const leads = useQuery(api.clientLeads.listByProject, { projectId, limit });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (leads === undefined) {
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

  if (leads.length === 0) {
    return (
      <div className="surface p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)]">
            <Users className="h-4.5 w-4.5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recent Leads</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Contact form submissions</p>
          </div>
        </div>
        <div className="py-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--muted)] mb-4">
            <Mail className="h-7 w-7 text-[var(--muted-foreground)]" />
          </div>
          <p className="text-sm font-medium mb-1">No leads yet</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            They&apos;ll appear here when visitors submit your contact form.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)]">
            <Users className="h-4.5 w-4.5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Recent Leads</h3>
            <p className="text-xs text-[var(--muted-foreground)]">Contact form submissions</p>
          </div>
        </div>
        <span className="text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded-full">
          {leads.length} total
        </span>
      </div>
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
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={lead._id}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden transition-shadow hover:shadow-sm"
            >
              {/* Compact row - always visible */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : lead._id)}
                className="w-full p-4 flex items-center justify-between gap-4 hover:bg-[hsl(var(--muted)/0.2)] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-sm font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{lead.data.name}</p>
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
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isExpanded ? "bg-[hsl(var(--primary)/0.1)]" : "bg-[var(--muted)]"
                  }`}>
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
                <div className="px-4 pb-4 pt-2 border-t border-[var(--border)] bg-[var(--muted)]/20">
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
                    <div className="mt-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
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
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
