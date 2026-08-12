"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StickyAuth } from "@/components/StickyAuth";
import { ConceptIntakeForm } from "@/components/admin/concepts/ConceptIntakeForm";
import { ConceptReviewCard } from "@/components/admin/concepts/ConceptReviewCard";
import { cn } from "@/lib/utils";

/**
 * The website-concept generator.
 *
 * One workflow, end to end: enter a business found on Facebook, enrich it from
 * Google and its existing site, add whatever logo and photos exist, generate a
 * bespoke homepage, review it, publish an unlisted link, and copy a Messenger
 * draft. It is not a CRM, an outreach platform, or a prospect pipeline — when a
 * lead turns into a real opportunity, the prospect is created by hand in the
 * existing admin flow.
 */

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "matching", label: "Needs match" },
  { id: "content_review", label: "Content review" },
  { id: "review", label: "To review" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  enriching: "Enriching",
  harvesting: "Harvesting",
  matching: "Needs match",
  content_review: "Content review",
  generating: "Generating",
  review: "To review",
  published: "Published",
  failed: "Failed",
};

function statusDot(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-500";
    case "review":
      return "bg-blue-500";
    case "matching":
    case "content_review":
      return "bg-amber-500";
    case "failed":
      return "bg-red-500";
    case "enriching":
    case "harvesting":
    case "generating":
      return "bg-violet-500";
    default:
      return "bg-neutral-400";
  }
}

export default function ConceptsAdminPage() {
  return (
    <StickyAuth
      loadingFallback={
        <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            <p>Loading concepts...</p>
          </div>
        </div>
      }
      unauthenticatedFallback={
        <div className="flex min-h-[calc(100dvh_-_var(--global-header-height))] items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">
              Please sign in to access admin
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              You must be authenticated to view this page.
            </p>
          </div>
        </div>
      }
    >
      <ConceptsAdminContent />
    </StickyAuth>
  );
}

function ConceptsAdminContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] =
    useState<Id<"website_concepts"> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const concepts = useQuery(api.concepts.admin.list, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      {/* Mounted here rather than in the root layout, matching the portal. */}
      <Toaster position="top-center" richColors />

      <header className="mb-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Website concepts</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Manual Facebook lead in, reviewed homepage concept out.
        </p>
      </header>

      {/*
        Single column on a phone, list beside detail from lg up. Concept review
        happens at a desk, but intake often happens on a phone right after the
        Messenger conversation that produced the lead.
      */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
          >
            {showForm ? "Close" : "New concept"}
          </button>

          {showForm ? (
            <ConceptIntakeForm
              onCreated={(conceptId) => {
                setSelectedId(conceptId);
                setShowForm(false);
                setStatusFilter("all");
              }}
            />
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter.id === statusFilter
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {concepts === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
              </div>
            ) : concepts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                No concepts yet.
              </p>
            ) : (
              concepts.map((concept) => (
                <button
                  key={concept._id}
                  type="button"
                  onClick={() => setSelectedId(concept._id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    concept._id === selectedId
                      ? "border-[var(--primary)] bg-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 flex-none rounded-full",
                        statusDot(concept.status),
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {concept.businessName}
                    </span>
                    {concept.viewCount > 0 ? (
                      <span className="flex-none text-xs text-[var(--muted-foreground)]">
                        {concept.viewCount} open
                        {concept.viewCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 pl-4 text-xs text-[var(--muted-foreground)]">
                    {STATUS_LABELS[concept.status] ?? concept.status}
                    {concept.sentAt ? " · sent" : ""}
                    {/* Pack state is worth a word in the list: a concept sitting
                        in Draft with unanalyzed material cannot be generated,
                        and the list is where that is otherwise invisible. */}
                    {concept.facebookPackItemCount > 0 &&
                    concept.facebookPackState === "collecting"
                      ? " · pack not analyzed"
                      : concept.facebookPackState === "analyzing"
                        ? " · analyzing pack"
                        : concept.facebookPackState === "failed"
                          ? " · pack needs retry"
                          : concept.facebookApprovedFactCount > 0
                            ? ` · ${concept.facebookApprovedFactCount} FB fact${concept.facebookApprovedFactCount === 1 ? "" : "s"}`
                            : ""}
                    {concept.assetCount > 0
                      ? ` · ${concept.assetCount} image${concept.assetCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="min-w-0">
          {selectedId ? (
            <ConceptReviewCard
              conceptId={selectedId}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted-foreground)]">
              Select a concept, or create one to get started.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
