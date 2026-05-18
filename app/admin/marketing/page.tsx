"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Eye, Mail } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { clsx } from "clsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StickyAuth } from "@/components/StickyAuth";

type Tab = "searches" | "leads" | "followups";

type LeadStatusFilter =
  | "all"
  | "qualified"
  | "contacted"
  | "follow_up"
  | "converted"
  | "disqualified"
  | "error";

type PhysicalPresenceStatus =
  | "walk_in_likely"
  | "office_or_yard_likely"
  | "service_area_only"
  | "uncertain"
  | "not_operational";

type PhysicalPresenceFilter = "all" | PhysicalPresenceStatus;
type BooleanLeadFilter = "all" | "yes" | "no";

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
    types?: Array<string>;
    businessStatus?: string;
    pureServiceAreaBusiness?: boolean;
    location?: {
      latitude: number;
      longitude: number;
    };
    regularOpeningHours?: {
      openNow?: boolean;
      weekdayDescriptions?: Array<string>;
    };
    currentOpeningHours?: {
      openNow?: boolean;
      weekdayDescriptions?: Array<string>;
    };
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
  physicalPresence?: {
    status: PhysicalPresenceStatus;
    confidence: number;
    reasons: Array<string>;
    inferredAt: number;
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
const ALL_SEARCHES_FILTER = "__all_searches__";
const PHYSICAL_PRESENCE_FILTERS: Array<PhysicalPresenceFilter> = [
  "all",
  "walk_in_likely",
  "office_or_yard_likely",
  "service_area_only",
  "uncertain",
  "not_operational",
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

const PHYSICAL_PRESENCE_LABELS: Record<PhysicalPresenceStatus, string> = {
  walk_in_likely: "Walk-in likely",
  office_or_yard_likely: "Office/yard likely",
  service_area_only: "Service-area only",
  uncertain: "Uncertain",
  not_operational: "Not operational",
};

const PHYSICAL_REASON_LABELS: Record<string, string> = {
  operational_on_google: "Operational",
  not_marked_service_area_only: "Not service-area only",
  pure_service_area_business: "Service-area business",
  public_formatted_address: "Public address",
  precise_map_location: "Precise map pin",
  street_level_address: "Street address",
  structured_address: "Structured address",
  business_hours_listed: "Hours listed",
  walk_in_or_office_category: "Walk-in category",
  office_or_yard_category: "Office/yard category",
  mobile_service_category: "Mobile service category",
  limited_google_location_signals: "Limited signals",
  business_status_closed_temporarily: "Temporarily closed",
  business_status_closed_permanently: "Permanently closed",
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

function physicalPresenceBadgeClass(status?: PhysicalPresenceStatus): string {
  if (status === "walk_in_likely") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "office_or_yard_likely") {
    return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  }
  if (status === "service_area_only") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  if (status === "not_operational") {
    return "bg-red-500/15 text-red-700 dark:text-red-300";
  }
  return "bg-muted text-muted-foreground";
}

export default function MarketingAdminPage() {
  return (
    <StickyAuth
      loadingFallback={
        <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            <p>Loading marketing admin...</p>
          </div>
        </div>
      }
      unauthenticatedFallback={
        <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Please sign in to access admin</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              You must be authenticated to view this page.
            </p>
          </div>
        </div>
      }
    >
      <MarketingAdminContent />
    </StickyAuth>
  );
}

function MarketingAdminContent() {
  const [activeTab, setActiveTab] = useState<Tab>("searches");
  const [selectedSearchId, setSelectedSearchId] =
    useState<Id<"marketing_searches"> | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<Id<"scraped_leads"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("all");
  const [physicalPresenceFilter, setPhysicalPresenceFilter] =
    useState<PhysicalPresenceFilter>("all");
  const [emailFilter, setEmailFilter] = useState<BooleanLeadFilter>("all");
  const [auditViewedFilter, setAuditViewedFilter] = useState<BooleanLeadFilter>("all");

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
  const triggerAuditEmail = useMutation(api.marketing.search.triggerAuditEmail);
  const triggerFollowUpEmail = useMutation(api.marketing.search.triggerFollowUpEmail);
  const triggerPortfolioEmail = useMutation(api.marketing.search.triggerPortfolioEmail);
  const convertToProspect = useMutation(api.marketing.search.convertToProspect);
  const triggerBulkAuditEmail = useMutation(api.marketing.search.triggerBulkAuditEmail);

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ scheduled: number; skipped: number } | null>(null);

  const activeLeads = selectedSearchId ? leadsForSearch : latestLeads;
  const selectedSearch = useMemo(() => {
    if (!selectedSearchId || !searches) {
      return null;
    }
    return searches.find((search) => search._id === selectedSearchId) ?? null;
  }, [searches, selectedSearchId]);

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

  const filteredActiveLeads = useMemo(() => {
    let items = activeLeads ?? [];

    if (physicalPresenceFilter !== "all") {
      items = items.filter((lead) => lead.physicalPresence?.status === physicalPresenceFilter);
    }

    if (emailFilter !== "all") {
      items = items.filter((lead) => Boolean(lead.contactEmail) === (emailFilter === "yes"));
    }

    if (auditViewedFilter !== "all") {
      items = items.filter(
        (lead) => Boolean(lead.demoViewedAt) === (auditViewedFilter === "yes")
      );
    }

    return activeLeads ? items : activeLeads;
  }, [activeLeads, auditViewedFilter, emailFilter, physicalPresenceFilter]);

  const sortedActiveLeads = useMemo(() => {
    if (!filteredActiveLeads) {
      return filteredActiveLeads;
    }

    return filteredActiveLeads
      .map((lead, index) => ({ lead, index }))
      .sort((a, b) => {
        const aFit = a.lead.aiAnalysis?.fitScore;
        const bFit = b.lead.aiAnalysis?.fitScore;

        if (typeof aFit === "number" && typeof bFit === "number") {
          return bFit - aFit || a.index - b.index;
        }

        if (typeof aFit === "number") {
          return -1;
        }

        if (typeof bFit === "number") {
          return 1;
        }

        return a.index - b.index;
      })
      .map(({ lead }) => lead);
  }, [filteredActiveLeads]);

  // Bulk selection computed values
  const eligibleLeads = useMemo(() => {
    return (filteredActiveLeads ?? []).filter((l) => l.contactEmail && l.demoToken);
  }, [filteredActiveLeads]);

  const selectedEligible = useMemo(() => {
    return eligibleLeads.filter((l) => selectedLeadIds.has(l._id));
  }, [eligibleLeads, selectedLeadIds]);

  const selectedAlreadySent = useMemo(() => {
    return selectedEligible.filter((l) => l.emailSentAt);
  }, [selectedEligible]);

  const selectedIneligible = useMemo(() => {
    return (filteredActiveLeads ?? []).filter(
      (l) => selectedLeadIds.has(l._id) && (!l.contactEmail || !l.demoToken)
    );
  }, [filteredActiveLeads, selectedLeadIds]);

  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  }, []);

  const selectAllEligible = useCallback(() => {
    setSelectedLeadIds(new Set(eligibleLeads.map((l) => l._id)));
  }, [eligibleLeads]);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  const handleBulkSend = async () => {
    setBulkSending(true);
    try {
      const leads = selectedEligible.map((l) => ({
        leadId: l._id as Id<"scraped_leads">,
        recipientEmail: l.contactEmail!,
        recipientName: l.googleData.businessName,
      }));
      const result = await triggerBulkAuditEmail({ leads });
      setBulkResult(result);
    } catch (error) {
      console.error(error);
      alert("Failed to send bulk emails");
    } finally {
      setBulkSending(false);
    }
  };

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

  const handleSendAuditEmail = async (lead: ScrapedLeadRow) => {
    const fallback = lead.contactEmail ?? "";
    const recipientEmail = window.prompt("Recipient email", fallback)?.trim();
    if (!recipientEmail) return;

    try {
      await triggerAuditEmail({
        leadId: lead._id,
        recipientEmail,
      });
      alert("Audit email queued");
    } catch (error) {
      console.error(error);
      alert("Failed to queue email");
    }
  };

  const handleSendPortfolioEmail = async (lead: ScrapedLeadRow) => {
    const fallback = lead.contactEmail ?? "";
    const recipientEmail = window.prompt("Recipient email", fallback)?.trim();
    if (!recipientEmail) return;

    try {
      await triggerPortfolioEmail({
        leadId: lead._id,
        recipientEmail,
      });
      alert("Portfolio email queued");
    } catch (error) {
      console.error(error);
      alert("Failed to queue portfolio email");
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

  const handleResetLeadFilters = () => {
    setStatusFilter("all");
    setPhysicalPresenceFilter("all");
    setEmailFilter("all");
    setAuditViewedFilter("all");
    setSelectedSearchId(null);
    setExpandedLeadId(null);
    setSelectedLeadIds(new Set());
  };

  return (
    <div className="min-h-[calc(100dvh_-_var(--global-header-height))] px-4 py-6 md:px-8 md:py-8">
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
                    onChange={(e) => {
                      setStatusFilter(e.target.value as LeadStatusFilter);
                      setExpandedLeadId(null);
                      setSelectedLeadIds(new Set());
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    {STATUS_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status === "all" ? "All statuses" : LEAD_STATUS_LABELS[status] ?? status}
                      </option>
                    ))}
                  </select>
                  <select
                    value={physicalPresenceFilter}
                    onChange={(e) => {
                      setPhysicalPresenceFilter(e.target.value as PhysicalPresenceFilter);
                      setExpandedLeadId(null);
                      setSelectedLeadIds(new Set());
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    {PHYSICAL_PRESENCE_FILTERS.map((status) => (
                      <option key={status} value={status}>
                        {status === "all"
                          ? "All location types"
                          : PHYSICAL_PRESENCE_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={emailFilter}
                    onChange={(e) => {
                      setEmailFilter(e.target.value as BooleanLeadFilter);
                      setExpandedLeadId(null);
                      setSelectedLeadIds(new Set());
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    <option value="all">All email states</option>
                    <option value="yes">Has email</option>
                    <option value="no">No email</option>
                  </select>
                  <select
                    value={auditViewedFilter}
                    onChange={(e) => {
                      setAuditViewedFilter(e.target.value as BooleanLeadFilter);
                      setExpandedLeadId(null);
                      setSelectedLeadIds(new Set());
                    }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    <option value="all">All audit views</option>
                    <option value="yes">Audit viewed</option>
                    <option value="no">Audit not viewed</option>
                  </select>
                  <select
                    value={selectedSearchId ?? ALL_SEARCHES_FILTER}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedSearchId(
                        value === ALL_SEARCHES_FILTER
                          ? null
                          : (value as Id<"marketing_searches">)
                      );
                      setExpandedLeadId(null);
                      setSelectedLeadIds(new Set());
                    }}
                    className="h-9 max-w-[360px] rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
                  >
                    <option value={ALL_SEARCHES_FILTER}>All searches</option>
                    {searches?.map((search) => (
                      <option key={search._id} value={search._id}>
                        {search.searchQuery} ({new Date(search.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleResetLeadFilters}
                    disabled={
                      statusFilter === "all" &&
                      physicalPresenceFilter === "all" &&
                      emailFilter === "all" &&
                      auditViewedFilter === "all" &&
                      !selectedSearchId
                    }
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {selectedSearch
                  ? `Showing leads for: ${selectedSearch.searchQuery}`
                  : "Showing leads from all searches"}
              </p>
            </div>

            {/* Bulk action toolbar */}
            {selectedLeadIds.size > 0 && (
              <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-card p-3 shadow-lg">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-foreground">
                    {selectedLeadIds.size} selected
                  </span>
                  <button
                    onClick={selectAllEligible}
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    Select all eligible ({eligibleLeads.length})
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <button
                  onClick={() => {
                    setBulkResult(null);
                    setBulkModalOpen(true);
                  }}
                  disabled={selectedEligible.length === 0}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Send Audit Email ({selectedEligible.length})
                </button>
              </div>
            )}

            {/* Bulk send confirmation modal */}
            {bulkModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
                  {bulkResult ? (
                    // Success state
                    <div className="space-y-4 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                        <span className="text-2xl text-emerald-600">&#10003;</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">Emails Scheduled</h3>
                      <p className="text-sm text-muted-foreground">
                        {bulkResult.scheduled} email{bulkResult.scheduled !== 1 ? "s" : ""} scheduled
                        {bulkResult.skipped > 0 &&
                          `, ${bulkResult.skipped} skipped (missing audit/deleted)`}
                      </p>
                      <button
                        onClick={() => {
                          setBulkModalOpen(false);
                          setBulkResult(null);
                          clearSelection();
                        }}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    // Confirmation state
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Send Audit Emails
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedEligible.length} recipient{selectedEligible.length !== 1 ? "s" : ""} will receive an audit email.
                      </p>

                      {selectedAlreadySent.length > 0 && (
                        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                          {selectedAlreadySent.length} lead{selectedAlreadySent.length !== 1 ? "s have" : " has"} already been emailed. Sending again will be a re-send.
                        </div>
                      )}

                      {selectedIneligible.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedIneligible.length} selected lead{selectedIneligible.length !== 1 ? "s" : ""} will be skipped (missing email or audit).
                        </p>
                      )}

                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                        <div className="divide-y divide-border">
                          {selectedEligible.map((lead) => (
                            <div key={lead._id} className="flex items-center justify-between px-3 py-2 text-sm">
                              <span className="font-medium text-foreground">{lead.googleData.businessName}</span>
                              <span className="text-muted-foreground">{lead.contactEmail}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setBulkModalOpen(false)}
                          disabled={bulkSending}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void handleBulkSend()}
                          disabled={bulkSending || selectedEligible.length === 0}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          {bulkSending
                            ? "Sending..."
                            : `Send ${selectedEligible.length} Email${selectedEligible.length !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lead cards */}
            <div className="space-y-3">
              {sortedActiveLeads?.map((lead) => {
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
                const physicalPresence = lead.physicalPresence;

                return (
                  <div key={lead._id} className="rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
                    <div className="flex flex-wrap items-center gap-2 p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead._id)}
                        onChange={() => toggleLeadSelection(lead._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
                      />
                      <button
                        onClick={() =>
                          setExpandedLeadId((prev) => (prev === lead._id ? null : lead._id))
                        }
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
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
                        {lead.contactEmail ? (
                          <span
                            title={`Email: ${lead.contactEmail}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300"
                          >
                            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Has email</span>
                          </span>
                        ) : null}
                        {lead.demoViewedAt ? (
                          <span
                            title={`Audit viewed ${formatDate(lead.demoViewedAt)}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Audit viewed</span>
                          </span>
                        ) : null}
                        {tech ? (
                          <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {tech}
                          </span>
                        ) : null}
                        {physicalPresence ? (
                          <span
                            className={clsx(
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              physicalPresenceBadgeClass(physicalPresence.status)
                            )}
                          >
                            {PHYSICAL_PRESENCE_LABELS[physicalPresence.status]}{" "}
                            {physicalPresence.confidence}%
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            Location unknown
                          </span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">{lead.googleData.formattedAddress}</span>
                      </button>
                      <Link
                        href={`/admin/marketing/call?id=${lead._id}`}
                        className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-500/25 dark:text-blue-300"
                      >
                        Call Help
                      </Link>
                    </div>

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
                                href={`/audit/${lead.demoToken}`}
                                target="_blank"
                                className="inline-flex text-sm font-semibold text-primary hover:text-primary/80"
                              >
                                View Audit Report
                              </Link>
                            ) : (
                              <p className="text-xs text-muted-foreground">No audit token yet.</p>
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
                            {lead.googleData.businessStatus ? (
                              <p><span className="font-medium text-muted-foreground">Google Status:</span> {lead.googleData.businessStatus}</p>
                            ) : null}
                            {typeof lead.googleData.pureServiceAreaBusiness === "boolean" ? (
                              <p>
                                <span className="font-medium text-muted-foreground">Pure Service Area:</span>{" "}
                                {lead.googleData.pureServiceAreaBusiness ? "Yes" : "No"}
                              </p>
                            ) : null}
                            <p><span className="font-medium text-muted-foreground">HTTPS:</span> {lead.websiteData?.hasHttps === true ? "Yes" : lead.websiteData?.hasHttps === false ? "No" : "-"}</p>
                            <p><span className="font-medium text-muted-foreground">Audit Viewed:</span> {formatDate(lead.demoViewedAt)}</p>
                            {lead.emailSentAt ? <p><span className="font-medium text-muted-foreground">Email Sent:</span> {formatDate(lead.emailSentAt)}</p> : null}
                            {lead.calledAt ? <p><span className="font-medium text-muted-foreground">Last Called:</span> {formatDate(lead.calledAt)}</p> : null}
                            <p><span className="font-medium text-muted-foreground">Contact Attempts:</span> {lead.contactAttempts}</p>
                            {lead.error ? <p className="text-red-600 dark:text-red-400"><span className="font-medium">Error:</span> {lead.error}</p> : null}
                          </div>

                          {physicalPresence ? (
                            <div className="rounded-lg bg-muted/60 p-3 text-sm text-foreground">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">Physical Presence</p>
                                <span
                                  className={clsx(
                                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                                    physicalPresenceBadgeClass(physicalPresence.status)
                                  )}
                                >
                                  {PHYSICAL_PRESENCE_LABELS[physicalPresence.status]} ·{" "}
                                  {physicalPresence.confidence}%
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {physicalPresence.reasons.map((reason) => (
                                  <span
                                    key={reason}
                                    className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                                  >
                                    {PHYSICAL_REASON_LABELS[reason] ?? reason.replaceAll("_", " ")}
                                  </span>
                                ))}
                              </div>
                              {lead.googleData.regularOpeningHours?.weekdayDescriptions?.length ? (
                                <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                                  {lead.googleData.regularOpeningHours.weekdayDescriptions.map((line) => (
                                    <p key={line}>{line}</p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

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
                            <Link
                              href={`/admin/marketing/call?id=${lead._id}`}
                              className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-500/25 dark:text-blue-300"
                            >
                              Call Help
                            </Link>
                            <button
                              onClick={() => void handleSendAuditEmail(lead)}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              Send Audit Email
                            </button>
                            <button
                              onClick={() => void handleSendPortfolioEmail(lead)}
                              className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                              Send Portfolio Email
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

              {!sortedActiveLeads?.length ? (
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
                            <Link
                              href={`/admin/marketing/call?id=${lead._id}`}
                              className="rounded-md bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-500/25 dark:text-blue-300"
                            >
                              Call Help
                            </Link>
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
