"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
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
  demoScreenshotUrl?: string;
  convertedToProspectId?: string;
  contactAttempts: number;
  error?: string;
  googleData: {
    businessName: string;
    formattedAddress: string;
    phone?: string;
    websiteUrl?: string;
    rating?: number;
    reviewCount?: number;
    googleMapsUrl?: string;
    primaryType?: string;
    photoUrl?: string;
    topReview?: {
      author: string;
      text: string;
      rating: number;
    };
  };
  websiteData?: {
    primaryColor?: string;
    heroImageUrl?: string;
    technology?: string;
    metaTitle?: string;
    metaDescription?: string;
    screenshotUrl?: string;
    hasHttps?: boolean;
    scrapedAt: number;
  };
  pageSpeedData?: {
    performanceScore: number;
    fcp?: number;
    lcp?: number;
    cls?: number;
    fetchedAt: number;
  };
  aiAnalysis?: {
    fitScore: number;
    businessDescription: string;
    painPoints: Array<string>;
    sellingPoints: Array<string>;
    outreachAngle: string;
    analyzedAt: number;
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
    return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (["completed", "qualified", "converted"].includes(status)) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (["failed", "error", "disqualified", "not_interested"].includes(status)) {
    return "bg-red-500/15 text-red-700 dark:text-red-300";
  }
  if (["contacted", "follow_up", "responded"].includes(status)) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  return "bg-muted text-muted-foreground";
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
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Marketing Pipeline
          </h1>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to Admin
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-border">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Marketing tabs">
            {(["searches", "leads", "followups"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "relative px-4 py-3 text-sm font-medium -mb-px transition-colors capitalize",
                  activeTab === tab
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "followups" ? "Follow-ups" : tab}
                {activeTab === tab && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* SEARCHES TAB */}
        {activeTab === "searches" ? (
          <div className="space-y-6">
            {/* Create Search Form */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-card-foreground">Create Search</h2>
              <form onSubmit={handleCreateSearch} className="mt-4">
                <div className="grid gap-4 md:grid-cols-4">
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
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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
                  className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  disabled={isCreating}
                >
                  {isCreating ? "Starting..." : "Start Search"}
                </button>
              </form>
            </div>

            {/* Searches Table */}
            <div className="rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Query</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Found</th>
                      <th className="px-4 py-3">Qualified</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {searches?.map((search) => (
                      <tr key={search._id} className="transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(search.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{search.searchQuery}</td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              statusBadgeClass(search.status)
                            )}
                          >
                            {search.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground">{search.totalFound}</td>
                        <td className="px-4 py-3 text-foreground">{search.totalQualified}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedSearchId(search._id);
                                setActiveTab("leads");
                              }}
                              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              View Leads
                            </button>
                            {search.status === "searching" ||
                            search.status === "scraping" ||
                            search.status === "analyzing" ? (
                              <button
                                onClick={() => cancelSearch({ searchId: search._id })}
                                className="rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/25 dark:text-red-300"
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
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No searches yet.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* LEADS TAB */}
        {activeTab === "leads" ? (
          <div className="space-y-6">
            {/* Pipeline summary bar */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">{pipelineCounts.new} New</span>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-700 dark:text-emerald-300">
                    {pipelineCounts.qualified} Qualified
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-700 dark:text-amber-300">
                    {pipelineCounts.contacted} Contacted
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-700 dark:text-amber-300">
                    {pipelineCounts.followUp} Follow-up
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-700 dark:text-emerald-300">
                    {pipelineCounts.converted} Converted
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as LeadStatusFilter)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "All statuses" : LEAD_STATUS_LABELS[status] ?? status}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setSelectedSearchId(null)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {selectedSearchId ? "Show All Searches" : "Latest"}
                  </button>
                </div>
              </div>
            </div>

            {/* Lead cards */}
            <div className="space-y-3">
              {activeLeads?.map((lead) => {
                const fitScore = lead.aiAnalysis?.fitScore;
                const fitClass =
                  typeof fitScore === "number"
                    ? fitScore >= 7
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : fitScore >= 5
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "bg-red-500/15 text-red-700 dark:text-red-300"
                    : "bg-muted text-muted-foreground";
                const speedScore = lead.pageSpeedData?.performanceScore;
                const tech = lead.websiteData?.technology;
                const gRating = lead.googleData.rating;
                const reviewCount = lead.googleData.reviewCount;

                return (
                  <div key={lead._id} className="rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
                    <button
                      onClick={() =>
                        setExpandedLeadId((prev) => (prev === lead._id ? null : lead._id))
                      }
                      className="flex w-full flex-wrap items-center gap-2 p-4 text-left"
                    >
                      <h3 className="text-base font-semibold text-card-foreground">{lead.googleData.businessName}</h3>
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          statusBadgeClass(lead.status)
                        )}
                      >
                        {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                      {typeof fitScore === "number" ? (
                        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", fitClass)}>
                          Fit {fitScore}/10
                        </span>
                      ) : null}
                      {typeof gRating === "number" ? (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          ★ {gRating}{reviewCount ? ` (${reviewCount})` : ""}
                        </span>
                      ) : null}
                      {typeof speedScore === "number" ? (
                        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", speedScore < 50 ? "bg-red-500/15 text-red-700 dark:text-red-300" : speedScore < 80 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
                          Speed {speedScore}
                        </span>
                      ) : null}
                      {tech ? (
                        <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                          {tech}
                        </span>
                      ) : null}
                      <span className="ml-auto text-xs text-muted-foreground">{lead.googleData.formattedAddress}</span>
                    </button>

                    {expandedLeadId === lead._id ? (
                      <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
                        {/* Left column: visuals + google data */}
                        <div className="space-y-3">
                          {(lead.websiteData?.heroImageUrl || lead.googleData.photoUrl) ? (
                            <div className="flex gap-3">
                              {lead.websiteData?.heroImageUrl ? (
                                <div className="flex-1 space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Website Hero</p>
                                  <a href={lead.websiteData.heroImageUrl} target="_blank" rel="noopener noreferrer">
                                    <Image
                                      src={lead.websiteData.heroImageUrl}
                                      alt={`${lead.googleData.businessName} hero`}
                                      width={400}
                                      height={144}
                                      unoptimized
                                      className="h-36 w-full rounded-lg border border-border object-cover transition-shadow hover:ring-2 hover:ring-primary/40"
                                    />
                                  </a>
                                </div>
                              ) : null}
                              {lead.googleData.photoUrl ? (
                                <div className="flex-1 space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Google Photo</p>
                                  <a href={lead.googleData.photoUrl} target="_blank" rel="noopener noreferrer">
                                    <Image
                                      src={lead.googleData.photoUrl}
                                      alt={`${lead.googleData.businessName} google`}
                                      width={400}
                                      height={144}
                                      unoptimized
                                      className="h-36 w-full rounded-lg border border-border object-cover transition-shadow hover:ring-2 hover:ring-primary/40"
                                    />
                                  </a>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {lead.websiteData?.screenshotUrl ? (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Current Site Screenshot</p>
                              <Image
                                src={lead.websiteData.screenshotUrl}
                                alt={`${lead.googleData.businessName} current site`}
                                width={600}
                                height={176}
                                unoptimized
                                className="h-44 w-full rounded-lg border border-border object-cover"
                              />
                            </div>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-3">
                            {lead.demoToken ? (
                              <Link
                                href={`/demo/${lead.demoToken}`}
                                target="_blank"
                                className="inline-flex text-sm font-semibold text-primary hover:text-primary/80"
                              >
                                View Demo Page
                              </Link>
                            ) : (
                              <p className="text-xs text-muted-foreground">No demo token yet.</p>
                            )}
                            {lead.googleData.googleMapsUrl ? (
                              <a
                                href={lead.googleData.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-primary hover:text-primary/80"
                              >
                                Google Maps
                              </a>
                            ) : null}
                          </div>

                          <div className="text-sm text-foreground space-y-1">
                            <p>
                              <span className="font-medium text-muted-foreground">Phone:</span>{" "}
                              {lead.googleData.phone ? (
                                <a href={`tel:${lead.googleData.phone.replace(/[^\d+]/g, "")}`} className="text-primary">
                                  {lead.googleData.phone}
                                </a>
                              ) : "-"}
                            </p>
                            <p>
                              <span className="font-medium text-muted-foreground">Website:</span>{" "}
                              {lead.googleData.websiteUrl ? (
                                <a
                                  href={lead.googleData.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary"
                                >
                                  {lead.googleData.websiteUrl}
                                </a>
                              ) : (
                                <span className="text-red-600 dark:text-red-400 font-medium">No website</span>
                              )}
                            </p>
                            {lead.googleData.primaryType ? (
                              <p><span className="font-medium text-muted-foreground">Type:</span> {lead.googleData.primaryType}</p>
                            ) : null}
                            <p><span className="font-medium text-muted-foreground">HTTPS:</span> {lead.websiteData?.hasHttps === true ? "Yes" : lead.websiteData?.hasHttps === false ? "No" : "-"}</p>
                            <p><span className="font-medium text-muted-foreground">Demo Viewed:</span> {formatDate(lead.demoViewedAt)}</p>
                            {lead.emailSentAt ? <p><span className="font-medium text-muted-foreground">Email Sent:</span> {formatDate(lead.emailSentAt)}</p> : null}
                            {lead.calledAt ? <p><span className="font-medium text-muted-foreground">Last Called:</span> {formatDate(lead.calledAt)}</p> : null}
                            <p><span className="font-medium text-muted-foreground">Contact Attempts:</span> {lead.contactAttempts}</p>
                            {lead.error ? <p className="text-red-600 dark:text-red-400"><span className="font-medium">Error:</span> {lead.error}</p> : null}
                          </div>

                          {/* Website metadata */}
                          {lead.websiteData?.metaTitle || lead.websiteData?.metaDescription ? (
                            <div className="rounded-lg bg-muted/60 p-3 text-sm text-foreground">
                              <p className="font-semibold">Site Metadata</p>
                              {lead.websiteData.metaTitle ? <p className="mt-1"><span className="font-medium text-muted-foreground">Title:</span> {lead.websiteData.metaTitle}</p> : null}
                              {lead.websiteData.metaDescription ? <p className="mt-1"><span className="font-medium text-muted-foreground">Description:</span> {lead.websiteData.metaDescription}</p> : null}
                            </div>
                          ) : null}

                          {/* PageSpeed details */}
                          {lead.pageSpeedData ? (
                            <div className="rounded-lg bg-muted/60 p-3 text-sm text-foreground">
                              <p className="font-semibold">PageSpeed (Mobile)</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <p><span className="font-medium text-muted-foreground">Score:</span> <span className={speedScore && speedScore < 50 ? "text-red-600 dark:text-red-400 font-semibold" : ""}>{lead.pageSpeedData.performanceScore}/100</span></p>
                                {typeof lead.pageSpeedData.fcp === "number" ? <p><span className="font-medium text-muted-foreground">FCP:</span> {(lead.pageSpeedData.fcp / 1000).toFixed(1)}s</p> : null}
                                {typeof lead.pageSpeedData.lcp === "number" ? <p><span className="font-medium text-muted-foreground">LCP:</span> {(lead.pageSpeedData.lcp / 1000).toFixed(1)}s</p> : null}
                                {typeof lead.pageSpeedData.cls === "number" ? <p><span className="font-medium text-muted-foreground">CLS:</span> {lead.pageSpeedData.cls.toFixed(3)}</p> : null}
                              </div>
                            </div>
                          ) : null}

                          {/* Primary color swatch */}
                          {lead.websiteData?.primaryColor ? (
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              <span className="font-medium text-muted-foreground">Brand Color:</span>
                              <div className="h-6 w-6 rounded border border-border" style={{ backgroundColor: lead.websiteData.primaryColor }} />
                              <code className="text-xs text-muted-foreground">{lead.websiteData.primaryColor}</code>
                            </div>
                          ) : null}

                          {/* Top Review */}
                          {lead.googleData.topReview ? (
                            <div className="rounded-lg bg-muted/60 p-3 text-sm text-foreground">
                              <p className="font-semibold">Top Review ({lead.googleData.topReview.rating}/5) {"★".repeat(Math.round(lead.googleData.topReview.rating))}</p>
                              <p className="mt-1">&ldquo;{lead.googleData.topReview.text}&rdquo;</p>
                              <p className="mt-1 text-xs text-muted-foreground">- {lead.googleData.topReview.author}</p>
                            </div>
                          ) : null}
                        </div>

                        {/* Right column: AI analysis + actions */}
                        <div className="space-y-3">
                          {/* AI Description */}
                          {lead.aiAnalysis?.businessDescription ? (
                            <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-foreground">
                              <p className="font-semibold text-blue-700 dark:text-blue-300">AI Description</p>
                              <p className="mt-1">{lead.aiAnalysis.businessDescription}</p>
                            </div>
                          ) : null}

                          {/* Outreach Angle */}
                          {lead.aiAnalysis?.outreachAngle ? (
                            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-foreground">
                              <p className="font-semibold text-emerald-700 dark:text-emerald-300">Outreach Angle</p>
                              <p className="mt-1">{lead.aiAnalysis.outreachAngle}</p>
                            </div>
                          ) : null}

                          {/* Pain Points */}
                          {lead.aiAnalysis?.painPoints?.length ? (
                            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-foreground">
                              <p className="font-semibold text-red-700 dark:text-red-300">Pain Points</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                {lead.aiAnalysis.painPoints.map((point: string) => (
                                  <li key={point}>{point}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {/* Selling Points */}
                          {lead.aiAnalysis?.sellingPoints?.length ? (
                            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-foreground">
                              <p className="font-semibold text-emerald-700 dark:text-emerald-300">Selling Points</p>
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                {lead.aiAnalysis.sellingPoints.map((point: string) => (
                                  <li key={point}>{point}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

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
                              rows={4}
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
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              Send Mockup Email
                            </button>
                            <button
                              onClick={() => markCalled({ leadId: lead._id })}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              Mark Called
                            </button>
                            <button
                              onClick={() => void handleScheduleFollowUp(lead._id)}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              Schedule Follow-up
                            </button>
                            <button
                              onClick={() => void handleConvertToProspect(lead._id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                            >
                              Convert to Prospect
                            </button>
                            <button
                              onClick={() => void handleDisqualify(lead._id)}
                              className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-500/25 dark:text-red-300"
                            >
                              Disqualify
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {!activeLeads?.length ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No leads found for this filter.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* FOLLOW-UPS TAB */}
        {activeTab === "followups" ? (
          <div className="rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Follow-up Date</th>
                    <th className="px-4 py-3">Last Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {followUps?.map((lead) => {
                    const overdue = typeof lead.followUpAt === "number" && lead.followUpAt < Date.now();
                    return (
                      <tr key={lead._id} className="transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium text-foreground">{lead.googleData.businessName}</td>
                        <td className={clsx("px-4 py-3", overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-foreground")}>
                          {formatDate(lead.followUpAt)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatDate(Math.max(lead.emailSentAt ?? 0, lead.calledAt ?? 0) || undefined)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
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
                              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              Call Now
                            </button>
                            <button
                              onClick={() => void handleSendFollowupEmail(lead)}
                              className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-500/25 dark:text-blue-300"
                            >
                              Send Follow-up
                            </button>
                            <button
                              onClick={() => void handleConvertToProspect(lead._id)}
                              className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/25 dark:text-emerald-300"
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
                              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
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
                              className="rounded-md bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/25 dark:text-red-300"
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
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No follow-ups due in the next 7 days.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
