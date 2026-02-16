"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { SectionHeader } from "@/components/SectionHeader";
import { clsx } from "clsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Tab = "searches" | "leads" | "followups";

type LeadStatusFilter =
  | "all"
  | "qualified"
  | "contacted"
  | "follow_up"
  | "converted"
  | "disqualified"
  | "error";

type MarketingSearchRow = {
  _id: Id<"marketing_searches">;
  searchQuery: string;
  status: string;
  totalFound: number;
  totalQualified: number;
  createdAt: number;
};

type ScrapedLeadRow = {
  _id: Id<"scraped_leads">;
  searchId: Id<"marketing_searches">;
  status: string;
  contactEmail?: string;
  adminNotes?: string;
  followUpAt?: number;
  emailSentAt?: number;
  calledAt?: number;
  demoToken?: string;
  demoViewedAt?: number;
  contactAttempts: number;
  googleData: {
    businessName: string;
    formattedAddress: string;
    phone?: string;
    websiteUrl?: string;
    topReview?: {
      author: string;
      text: string;
      rating: number;
    };
  };
  websiteData?: {
    screenshotUrl?: string;
  };
  pageSpeedData?: {
    performanceScore: number;
  };
  aiAnalysis?: {
    fitScore: number;
    painPoints: Array<string>;
  };
};

const STATE_OPTIONS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
] as const;

const INDUSTRY_OPTIONS = [
  "plumber",
  "roofer",
  "landscaper",
  "hvac",
  "electrician",
  "painter",
  "pest control",
  "cleaning",
  "tree service",
  "pressure washing",
  "fencing",
  "towing",
  "general contractor",
  "other",
] as const;

const STATUS_FILTERS: Array<LeadStatusFilter> = [
  "all",
  "qualified",
  "contacted",
  "follow_up",
  "converted",
  "disqualified",
  "error",
];

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  scraping: "Scraping",
  scraped: "Scraped",
  analyzing: "Analyzing",
  qualified: "Qualified",
  disqualified: "Disqualified",
  contacted: "Contacted",
  follow_up: "Follow-up",
  responded: "Responded",
  converted: "Converted",
  not_interested: "Not Interested",
  error: "Error",
};

function formatDate(ts?: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function statusBadgeClass(status: string): string {
  if (["searching", "scraping", "analyzing"].includes(status)) {
    return "bg-blue-100 text-blue-700";
  }
  if (["completed", "qualified", "converted"].includes(status)) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (["failed", "error", "disqualified", "not_interested"].includes(status)) {
    return "bg-red-100 text-red-700";
  }
  if (["contacted", "follow_up", "responded"].includes(status)) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

export default function MarketingAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("searches");
  const [selectedSearchId, setSelectedSearchId] =
    useState<Id<"marketing_searches"> | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<Id<"scraped_leads"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("all");

  const [city, setCity] = useState("");
  const [state, setState] = useState<(typeof STATE_OPTIONS)[number]>("LA");
  const [industry, setIndustry] = useState<(typeof INDUSTRY_OPTIONS)[number]>("plumber");
  const [isCreating, setIsCreating] = useState(false);

  const [leadEmailDrafts, setLeadEmailDrafts] = useState<Record<string, string>>({});
  const [leadNotesDrafts, setLeadNotesDrafts] = useState<Record<string, string>>({});
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>({});

  const searches = useQuery(api.marketing.search.listSearches, { limit: 50 }) as
    | Array<MarketingSearchRow>
    | undefined;
  const leadsForSearch = useQuery(
    api.marketing.search.getLeadsBySearch,
    selectedSearchId
      ? {
          searchId: selectedSearchId,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 250,
        }
      : "skip"
  ) as Array<ScrapedLeadRow> | undefined;
  const latestLeads = useQuery(api.marketing.search.listLeads, {
    status: selectedSearchId
      ? undefined
      : statusFilter === "all"
        ? undefined
        : statusFilter,
    limit: 250,
  }) as Array<ScrapedLeadRow> | undefined;

  const followUps = useQuery(api.marketing.search.listFollowUps, {}) as
    | Array<ScrapedLeadRow>
    | undefined;

  const createSearch = useMutation(api.marketing.search.createSearch);
  const cancelSearch = useMutation(api.marketing.search.cancelSearch);
  const updateLeadNotes = useMutation(api.marketing.search.updateLeadNotes);
  const updateLeadContactEmail = useMutation(api.marketing.search.updateLeadContactEmail);
  const markCalled = useMutation(api.marketing.search.markCalled);
  const setFollowUp = useMutation(api.marketing.search.setFollowUp);
  const updateLeadStatus = useMutation(api.marketing.search.updateLeadStatus);
  const triggerMockupEmail = useMutation(api.marketing.search.triggerMockupEmail);
  const triggerFollowUpEmail = useMutation(api.marketing.search.triggerFollowUpEmail);
  const convertToProspect = useMutation(api.marketing.search.convertToProspect);

  const activeLeads = selectedSearchId ? leadsForSearch : latestLeads;

  const pipelineCounts = useMemo(() => {
    const items = activeLeads ?? [];
    const countFor = (status: string) => items.filter((lead) => lead.status === status).length;

    return {
      new: countFor("new"),
      qualified: countFor("qualified"),
      contacted: countFor("contacted"),
      followUp: countFor("follow_up"),
      converted: countFor("converted"),
    };
  }, [activeLeads]);

  const handleCreateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) {
      alert("City is required");
      return;
    }

    setIsCreating(true);
    try {
      const searchId = await createSearch({
        city: city.trim(),
        state,
        industry,
      });
      setSelectedSearchId(searchId);
      setActiveTab("searches");
      setCity("");
    } catch (error) {
      console.error(error);
      alert("Failed to create search");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveEmail = async (leadId: Id<"scraped_leads">) => {
    const value = leadEmailDrafts[leadId];
    if (!value?.trim()) {
      return;
    }

    try {
      await updateLeadContactEmail({
        leadId,
        contactEmail: value,
      });
    } catch (error) {
      console.error(error);
      alert("Failed to save contact email");
    }
  };

  const handleSaveNotes = async (leadId: Id<"scraped_leads">) => {
    try {
      await updateLeadNotes({
        leadId,
        adminNotes: leadNotesDrafts[leadId] ?? "",
      });
    } catch (error) {
      console.error(error);
      alert("Failed to save notes");
    }
  };

  const handleScheduleFollowUp = async (leadId: Id<"scraped_leads">) => {
    const dateInput = followUpDrafts[leadId];
    if (!dateInput) {
      alert("Pick a follow-up date first");
      return;
    }

    const ts = new Date(dateInput).getTime();
    if (Number.isNaN(ts)) {
      alert("Invalid follow-up date");
      return;
    }

    try {
      await setFollowUp({ leadId, followUpAt: ts });
    } catch (error) {
      console.error(error);
      alert("Failed to set follow-up");
    }
  };

  const handleSendMockupEmail = async (lead: ScrapedLeadRow) => {
    const fallback = lead.contactEmail ?? "";
    const recipientEmail = window.prompt("Recipient email", fallback)?.trim();
    if (!recipientEmail) return;

    try {
      await triggerMockupEmail({
        leadId: lead._id,
        recipientEmail,
      });
      alert("Mockup email queued");
    } catch (error) {
      console.error(error);
      alert("Failed to queue email");
    }
  };

  const handleSendFollowupEmail = async (lead: ScrapedLeadRow) => {
    const fallback = lead.contactEmail ?? "";
    const recipientEmail = window.prompt("Recipient email", fallback)?.trim();
    if (!recipientEmail) return;

    try {
      await triggerFollowUpEmail({
        leadId: lead._id,
        recipientEmail,
      });
      alert("Follow-up email queued");
    } catch (error) {
      console.error(error);
      alert("Failed to queue follow-up email");
    }
  };

  const handleConvertToProspect = async (leadId: Id<"scraped_leads">) => {
    try {
      const prospectId = await convertToProspect({ leadId });
      alert(`Lead converted. Prospect ID: ${prospectId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to convert lead");
    }
  };

  const handleDisqualify = async (leadId: Id<"scraped_leads">) => {
    try {
      await updateLeadStatus({ leadId, status: "disqualified" });
    } catch (error) {
      console.error(error);
      alert("Failed to disqualify lead");
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader as="h1" align="left" size="md" className="max-w-none mx-0">
            Marketing Pipeline
          </SectionHeader>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Admin
          </Link>
        </div>

        <div className="mb-6 border-b border-[hsl(var(--border))]">
          <nav className="flex gap-4 md:gap-6 overflow-x-auto" aria-label="Marketing tabs">
            {(["searches", "leads", "followups"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "px-1.5 py-3 text-sm font-semibold -mb-px border-b-2 capitalize",
                  activeTab === tab
                    ? "border-[hsl(var(--primary))] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {tab === "followups" ? "Follow-ups" : tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "searches" ? (
          <div className="space-y-6">
            <form
              onSubmit={handleCreateSearch}
              className="rounded-xl border border-slate-200 bg-white p-4 md:p-5"
            >
              <h2 className="text-lg font-semibold text-slate-900">Create Search</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lafayette"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value as (typeof STATE_OPTIONS)[number])}
                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    {STATE_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) =>
                      setIndustry(e.target.value as (typeof INDUSTRY_OPTIONS)[number])
                    }
                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    {INDUSTRY_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                disabled={isCreating}
              >
                {isCreating ? "Starting..." : "Start Search"}
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Query</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Found</th>
                      <th className="px-4 py-3">Qualified</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searches?.map((search) => (
                      <tr key={search._id}>
                        <td className="px-4 py-3 text-slate-600">{formatDate(search.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{search.searchQuery}</td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                              statusBadgeClass(search.status)
                            )}
                          >
                            {search.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{search.totalFound}</td>
                        <td className="px-4 py-3">{search.totalQualified}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedSearchId(search._id);
                                setActiveTab("leads");
                              }}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              View Leads
                            </button>
                            {search.status === "searching" ||
                            search.status === "scraping" ||
                            search.status === "analyzing" ? (
                              <button
                                onClick={() => cancelSearch({ searchId: search._id })}
                                className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!searches?.length ? (
                <p className="px-4 py-6 text-sm text-slate-500">No searches yet.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "leads" ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{pipelineCounts.new} New</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    {pipelineCounts.qualified} Qualified
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                    {pipelineCounts.contacted} Contacted
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                    {pipelineCounts.followUp} Follow-up
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    {pipelineCounts.converted} Converted
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LeadStatusFilter)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "All statuses" : LEAD_STATUS_LABELS[status] ?? status}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSelectedSearchId(null)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {selectedSearchId ? "Show All Searches" : "Latest"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {activeLeads?.map((lead) => {
                const fitScore = lead.aiAnalysis?.fitScore;
                const fitClass =
                  typeof fitScore === "number"
                    ? fitScore >= 7
                      ? "bg-emerald-100 text-emerald-700"
                      : fitScore >= 5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-700";
                const speedScore = lead.pageSpeedData?.performanceScore;

                return (
                  <div key={lead._id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <button
                      onClick={() =>
                        setExpandedLeadId((prev) => (prev === lead._id ? null : lead._id))
                      }
                      className="flex w-full flex-wrap items-center gap-2 text-left"
                    >
                      <h3 className="text-base font-semibold text-slate-900">{lead.googleData.businessName}</h3>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          statusBadgeClass(lead.status)
                        )}
                      >
                        {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      {typeof fitScore === "number" ? (
                        <span className={clsx("rounded-full px-2 py-1 text-xs font-semibold", fitClass)}>
                          Fit {fitScore}/10
                        </span>
                      ) : null}
                      {typeof speedScore === "number" ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          Speed {speedScore}/100
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-slate-500">{lead.googleData.formattedAddress}</span>
                    </button>

                    {expandedLeadId === lead._id ? (
                      <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                        <div className="space-y-3">
                          {lead.websiteData?.screenshotUrl ? (
                            <img
                              src={lead.websiteData.screenshotUrl}
                              alt={`${lead.googleData.businessName} current site`}
                              className="h-44 w-full rounded-md border border-slate-200 object-cover"
                            />
                          ) : null}

                          {lead.demoToken ? (
                            <Link
                              href={`/demo/${lead.demoToken}`}
                              target="_blank"
                              className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-500"
                            >
                              View Demo Page
                            </Link>
                          ) : (
                            <p className="text-xs text-slate-500">No demo token yet.</p>
                          )}

                          <div className="text-sm text-slate-700">
                            <p>
                              <strong>Phone:</strong> {lead.googleData.phone ?? "-"}
                            </p>
                            <p>
                              <strong>Website:</strong>{" "}
                              {lead.googleData.websiteUrl ? (
                                <a
                                  href={lead.googleData.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600"
                                >
                                  {lead.googleData.websiteUrl}
                                </a>
                              ) : (
                                "None"
                              )}
                            </p>
                            <p>
                              <strong>Demo Viewed:</strong> {formatDate(lead.demoViewedAt)}
                            </p>
                          </div>

                          {lead.googleData.topReview ? (
                            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                              <p className="font-semibold">Top Review ({lead.googleData.topReview.rating}/5)</p>
                              <p className="mt-1">{lead.googleData.topReview.text}</p>
                              <p className="mt-1 text-xs text-slate-500">- {lead.googleData.topReview.author}</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label>Contact Email</Label>
                            <Input
                              defaultValue={lead.contactEmail ?? ""}
                              onChange={(e) =>
                                setLeadEmailDrafts((prev) => ({
                                  ...prev,
                                  [lead._id]: e.target.value,
                                }))
                              }
                              onBlur={() => void handleSaveEmail(lead._id)}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label>Admin Notes</Label>
                            <Textarea
                              defaultValue={lead.adminNotes ?? ""}
                              onChange={(e) =>
                                setLeadNotesDrafts((prev) => ({
                                  ...prev,
                                  [lead._id]: e.target.value,
                                }))
                              }
                              onBlur={() => void handleSaveNotes(lead._id)}
                              rows={5}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label>Follow-up Date</Label>
                            <Input
                              type="date"
                              value={followUpDrafts[lead._id] ?? ""}
                              onChange={(e) =>
                                setFollowUpDrafts((prev) => ({
                                  ...prev,
                                  [lead._id]: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              onClick={() => void handleSendMockupEmail(lead)}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              Send Mockup Email
                            </button>
                            <button
                              onClick={() => markCalled({ leadId: lead._id })}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Mark Called
                            </button>
                            <button
                              onClick={() => void handleScheduleFollowUp(lead._id)}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Schedule Follow-up
                            </button>
                            <button
                              onClick={() => void handleConvertToProspect(lead._id)}
                              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                            >
                              Convert to Prospect
                            </button>
                            <button
                              onClick={() => void handleDisqualify(lead._id)}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              Disqualify
                            </button>
                          </div>

                          {Array.isArray(lead.aiAnalysis?.painPoints) && lead.aiAnalysis.painPoints.length ? (
                            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                              <p className="font-semibold">Pain Points</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                {lead.aiAnalysis.painPoints.map((point: string) => (
                                  <li key={point}>{point}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {!activeLeads?.length ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No leads found for this filter.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "followups" ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Follow-up Date</th>
                    <th className="px-4 py-3">Last Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {followUps?.map((lead) => {
                    const overdue = typeof lead.followUpAt === "number" && lead.followUpAt < Date.now();
                    return (
                      <tr key={lead._id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{lead.googleData.businessName}</td>
                        <td className={clsx("px-4 py-3", overdue ? "text-red-700 font-semibold" : "text-slate-700")}>
                          {formatDate(lead.followUpAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(Math.max(lead.emailSentAt ?? 0, lead.calledAt ?? 0) || undefined)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                              statusBadgeClass(lead.status)
                            )}
                          >
                            {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => markCalled({ leadId: lead._id })}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Call Now
                            </button>
                            <button
                              onClick={() => void handleSendFollowupEmail(lead)}
                              className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Send Follow-up
                            </button>
                            <button
                              onClick={() => void handleConvertToProspect(lead._id)}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Convert
                            </button>
                            <button
                              onClick={() =>
                                setFollowUp({
                                  leadId: lead._id,
                                  followUpAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                                })
                              }
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Snooze 1 Week
                            </button>
                            <button
                              onClick={() =>
                                updateLeadStatus({
                                  leadId: lead._id,
                                  status: "not_interested",
                                })
                              }
                              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              Not Interested
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!followUps?.length ? (
              <p className="px-4 py-6 text-sm text-slate-500">No follow-ups due in the next 7 days.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
