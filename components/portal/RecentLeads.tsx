"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";

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
      <div className="surface p-5 rounded-2xl">
        <div className="h-5 w-28 rounded bg-[hsl(var(--secondary))] animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-[hsl(var(--secondary)/0.3)] animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-24 rounded bg-[hsl(var(--secondary))]" />
                  <div className="h-4 w-32 rounded bg-[hsl(var(--secondary))]" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-12 rounded-full bg-[hsl(var(--secondary))]" />
                  <div className="h-4 w-16 rounded bg-[hsl(var(--secondary))]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="surface p-5 rounded-2xl">
        <h3 className="text-sm font-semibold mb-4">Recent Leads</h3>
        <div className="py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--primary)/0.1)] mb-3">
            <Mail className="h-6 w-6 text-[hsl(var(--primary))]" />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            No leads yet. They&apos;ll appear here when visitors submit your contact form.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface p-5 rounded-2xl">
      <h3 className="text-sm font-semibold mb-4">Recent Leads</h3>
      <div className="space-y-2">
        {leads.map((lead) => {
          const isExpanded = expandedId === lead._id;
          const date = new Date(lead.createdAt);
          const formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={lead._id}
              className="rounded-lg border border-[var(--border)] bg-[hsl(var(--card)/0.5)] overflow-hidden"
            >
              {/* Compact row - always visible */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : lead._id)}
                className="w-full p-3 flex items-center justify-between gap-3 hover:bg-[hsl(var(--muted)/0.3)] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{lead.data.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">
                      {lead.data.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {formattedDate}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-[var(--border)] bg-[hsl(var(--muted)/0.2)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {/* Email */}
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                      <a
                        href={`mailto:${lead.data.email}`}
                        className="text-[hsl(var(--primary))] hover:underline truncate"
                      >
                        {lead.data.email}
                      </a>
                    </div>

                    {/* Phone */}
                    {lead.data.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                        <a
                          href={`tel:${lead.data.phone}`}
                          className="text-[hsl(var(--primary))] hover:underline"
                        >
                          {lead.data.phone}
                        </a>
                      </div>
                    )}

                    {/* Source */}
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                      <span className="text-[var(--muted-foreground)]">
                        {sourceLabels[lead.source] || lead.source}
                      </span>
                    </div>

                    {/* Date (visible on mobile in expanded) */}
                    <div className="flex items-center gap-2 sm:hidden">
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Submitted {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* Message */}
                  {lead.data.message && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
                          {lead.data.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2">
                    <a
                      href={`mailto:${lead.data.email}?subject=Re: Your inquiry`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Reply
                    </a>
                    {lead.data.phone && (
                      <a
                        href={`tel:${lead.data.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border)] hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
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
