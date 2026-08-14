"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Toaster } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Plus, Search, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StickyAuth } from "@/components/StickyAuth";
import { ConceptIntakeForm } from "@/components/admin/concepts/ConceptIntakeForm";
import { ConceptReviewCard } from "@/components/admin/concepts/ConceptReviewCard";
import {
  PipelineGauge,
  conceptTone,
} from "@/components/admin/concepts/ConceptChrome";
import { Button } from "@/components/ui/button";
import {
  conceptNextAction,
  conceptQueueBucket,
  matchesConceptSearch,
  relativeTime,
} from "@/lib/concepts/workspace";
import { cn } from "@/lib/utils";

/**
 * Hallmark · genre: modern-minimal · macrostructure: Narrative Workflow
 * tone: utilitarian · design-system: existing admin tokens · designed-as-app
 * audience: solo admin · use: Facebook lead → published concept
 *
 * Two columns and no page chrome above them: the queue owns its own header so
 * the viewport width goes to the work rather than to a title bar. With nothing
 * open, the right column is the triage board instead of a shrug — the same
 * counts as the filter chips, sized to be read at a glance.
 */

const QUEUE_FILTERS = [
  { id: "needs_you", label: "Needs you" },
  { id: "working", label: "Working" },
  { id: "published", label: "Published" },
  { id: "all", label: "All" },
] as const;

type QueueFilter = (typeof QUEUE_FILTERS)[number]["id"];

export default function ConceptsAdminPage() {
  return (
    <StickyAuth
      loadingFallback={
        <WorkspaceShell>
          <CenteredNote>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Loading concepts…</p>
          </CenteredNote>
        </WorkspaceShell>
      }
      unauthenticatedFallback={
        <WorkspaceShell>
          <CenteredNote>
            <h1 className="text-xl font-semibold text-foreground">
              Sign in to open admin
            </h1>
            <p>This page is only for authenticated admins.</p>
          </CenteredNote>
        </WorkspaceShell>
      }
    >
      <Suspense
        fallback={
          <WorkspaceShell>
            <CenteredNote>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p>Loading concepts…</p>
            </CenteredNote>
          </WorkspaceShell>
        }
      >
        <ConceptsAdminContent />
      </Suspense>
    </StickyAuth>
  );
}

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh_-_var(--global-header-height))] flex-col overflow-x-clip overflow-y-hidden bg-background text-foreground">
      {children}
    </div>
  );
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ConceptsAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = (searchParams.get("c") ??
    null) as Id<"website_concepts"> | null;

  const [queueFilter, setQueueFilter] = useState<QueueFilter>("needs_you");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const concepts = useQuery(api.concepts.admin.list, { limit: 100 });

  const counts = useMemo(() => {
    const next = { needs_you: 0, working: 0, published: 0, all: 0 };
    if (!concepts) return next;
    for (const concept of concepts) {
      next.all += 1;
      next[conceptQueueBucket(concept)] += 1;
    }
    return next;
  }, [concepts]);

  const visible = useMemo(() => {
    if (!concepts) return [];
    return concepts.filter((concept) => {
      if (
        queueFilter !== "all" &&
        conceptQueueBucket(concept) !== queueFilter
      ) {
        return false;
      }
      return matchesConceptSearch(concept, query);
    });
  }, [concepts, queueFilter, query]);

  /** The one that has waited longest, which is the one to open next. */
  const oldestWaiting = useMemo(() => {
    if (!concepts) return null;
    return (
      concepts
        .filter((concept) => conceptQueueBucket(concept) === "needs_you")
        .sort((a, b) => a.updatedAt - b.updatedAt)[0] ?? null
    );
  }, [concepts]);

  const selectConcept = (conceptId: Id<"website_concepts"> | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (conceptId) params.set("c", conceptId);
    else params.delete("c");
    const suffix = params.toString();
    router.push(suffix ? `/admin/marketing?${suffix}` : "/admin/marketing");
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (showForm) {
          setShowForm(false);
          return;
        }
        if (selectedId) selectConcept(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // selectConcept closes over searchParams; the listener only needs the
    // current selection and sheet state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, showForm, searchParams]);

  const detailOpen = Boolean(selectedId);

  return (
    <WorkspaceShell>
      <Toaster position="top-center" richColors />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-border bg-sidebar lg:flex lg:w-[23rem] lg:flex-none lg:border-r",
            detailOpen ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex-none border-b border-border px-3 py-3">
            <Link
              href="/admin"
              className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ArrowLeft className="h-3 w-3" />
              Admin
            </Link>

            <div className="mt-1 mb-3 flex items-center justify-between gap-3">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                Concepts
              </h1>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowForm(true)}
                className="flex-none"
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or token"
                autoComplete="off"
                enterKeyHint="search"
                className="h-10 w-full rounded-md border border-border bg-background pr-10 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:text-sm"
              />
              {query ? null : (
                <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:block">
                  /
                </kbd>
              )}
            </label>

            <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setQueueFilter(filter.id)}
                  className={cn(
                    "flex-none rounded-full px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    filter.id === queueFilter
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {filter.label}
                  {concepts ? (
                    <span className="ml-1.5 font-mono tabular-nums opacity-70">
                      {counts[filter.id]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {concepts === undefined ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <EmptyQueue
                filter={queueFilter}
                searching={query.trim().length > 0}
                onShowAll={() => {
                  setQueueFilter("all");
                  setQuery("");
                }}
                onNew={() => setShowForm(true)}
              />
            ) : (
              <ul>
                {visible.map((concept) => {
                  const selected = concept._id === selectedId;
                  return (
                    <li key={concept._id}>
                      <button
                        type="button"
                        onClick={() => selectConcept(concept._id)}
                        aria-current={selected ? "true" : undefined}
                        className={cn(
                          "relative min-h-12 w-full rounded-lg py-2.5 pr-3 pl-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          selected
                            ? "bg-primary/10"
                            : "hover:bg-foreground/[0.04]",
                        )}
                      >
                        {selected ? (
                          <span
                            className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-primary"
                            aria-hidden
                          />
                        ) : null}
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em]">
                            {concept.businessName}
                          </span>
                          <span className="flex-none font-mono text-[10px] tabular-nums text-muted-foreground">
                            {relativeTime(concept.updatedAt)}
                          </span>
                        </span>
                        <span className="mt-2 flex items-center gap-2">
                          <PipelineGauge
                            concept={concept}
                            tone={conceptTone(concept.status)}
                          />
                          <span className="truncate text-xs text-muted-foreground">
                            {conceptNextAction(concept)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col",
            detailOpen ? "flex" : "hidden lg:flex",
          )}
        >
          {selectedId ? (
            <ConceptReviewCard
              conceptId={selectedId}
              onDeleted={() => selectConcept(null)}
              onBack={() => selectConcept(null)}
            />
          ) : (
            <TriageBoard
              counts={counts}
              loading={concepts === undefined}
              oldestWaiting={oldestWaiting}
              onFilter={setQueueFilter}
              onOpen={selectConcept}
              onNew={() => setShowForm(true)}
            />
          )}
        </section>
      </div>

      {showForm ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-concept-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground shadow-2xl sm:max-w-lg sm:rounded-xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 id="new-concept-title" className="text-base font-semibold">
                  New concept
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Business name is enough to start the Google lookup.
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Close"
                onClick={() => setShowForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ConceptIntakeForm
              hideIntro
              onCreated={(conceptId) => {
                setShowForm(false);
                setQueueFilter("all");
                selectConcept(conceptId);
              }}
            />
          </div>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}

/**
 * The desktop resting state. The queue already carries these numbers in its
 * filter chips; repeating them here at size is what lets an unopened workspace
 * answer "is there anything to do" from across the room.
 */
function TriageBoard({
  counts,
  loading,
  oldestWaiting,
  onFilter,
  onOpen,
  onNew,
}: {
  counts: Record<QueueFilter, number>;
  loading: boolean;
  oldestWaiting: {
    _id: Id<"website_concepts">;
    businessName: string;
  } | null;
  onFilter: (filter: QueueFilter) => void;
  onOpen: (conceptId: Id<"website_concepts">) => void;
  onNew: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tiles = [
    { id: "needs_you" as const, label: "Needs you", value: counts.needs_you },
    { id: "working" as const, label: "Working", value: counts.working },
    { id: "published" as const, label: "Published", value: counts.published },
  ];

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
      <div className="w-full max-w-xl">
        <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Queue
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {counts.all === 0
            ? "No concepts yet."
            : counts.needs_you === 0
              ? "Nothing needs a decision."
              : counts.needs_you === 1
                ? "One concept needs a decision."
                : `${counts.needs_you} concepts need a decision.`}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {counts.all === 0
            ? "Start one with a business name. The Google lookup runs from there."
            : "Pick a row on the left, or jump to the one that has waited longest."}
        </p>

        {counts.all > 0 ? (
          <div className="mt-7 grid grid-cols-3 gap-2">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => onFilter(tile.id)}
                className="rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="block font-mono text-2xl tabular-nums">
                  {tile.value}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  {tile.label}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {oldestWaiting ? (
            <Button type="button" onClick={() => onOpen(oldestWaiting._id)}>
              Open {oldestWaiting.businessName}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant={oldestWaiting ? "outline" : "default"}
            onClick={onNew}
          >
            <Plus className="h-4 w-4" />
            New concept
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyQueue({
  filter,
  searching,
  onShowAll,
  onNew,
}: {
  filter: QueueFilter;
  searching: boolean;
  onShowAll: () => void;
  onNew: () => void;
}) {
  if (searching) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        No concepts match that search.
      </p>
    );
  }

  if (filter === "needs_you") {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-sm font-medium">Nothing waiting</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Published and in-flight concepts are in the other filters.
        </p>
        <button
          type="button"
          onClick={onShowAll}
          className="mt-3 text-xs font-medium text-primary underline underline-offset-2"
        >
          Show all concepts
        </button>
      </div>
    );
  }

  if (filter === "working") {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        Nothing is generating or enriching right now.
      </p>
    );
  }

  return (
    <div className="px-3 py-8 text-center">
      <p className="text-sm text-muted-foreground">No concepts yet.</p>
      <Button type="button" size="sm" className="mt-3" onClick={onNew}>
        <Plus className="h-3.5 w-3.5" />
        New concept
      </Button>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
