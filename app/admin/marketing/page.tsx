"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Toaster } from "sonner";
import { ArrowLeft, Loader2, Plus, Search, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StickyAuth } from "@/components/StickyAuth";
import { ConceptIntakeForm } from "@/components/admin/concepts/ConceptIntakeForm";
import { ConceptReviewCard } from "@/components/admin/concepts/ConceptReviewCard";
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
 */

const QUEUE_FILTERS = [
  { id: "needs_you", label: "Needs you" },
  { id: "working", label: "Working" },
  { id: "published", label: "Published" },
  { id: "all", label: "All" },
] as const;

type QueueFilter = (typeof QUEUE_FILTERS)[number]["id"];

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
        <WorkspaceShell>
          <CenteredNote>
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
            <p>Loading concepts…</p>
          </CenteredNote>
        </WorkspaceShell>
      }
      unauthenticatedFallback={
        <WorkspaceShell>
          <CenteredNote>
            <h1 className="text-xl font-semibold">Sign in to open admin</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              This page is only for authenticated admins.
            </p>
          </CenteredNote>
        </WorkspaceShell>
      }
    >
      <Suspense
        fallback={
          <WorkspaceShell>
            <CenteredNote>
              <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
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
    <div className="flex h-[calc(100dvh_-_var(--global-header-height))] flex-col overflow-x-clip overflow-y-hidden bg-[var(--background)] text-[var(--foreground)]">
      {children}
    </div>
  );
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[var(--secondary)]">
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

      <header className="flex flex-none items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-md py-1 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Admin
            </Link>
          </div>
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            Concepts
          </h1>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex-none"
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-[var(--border)] lg:flex lg:w-[22.5rem] lg:flex-none lg:border-r",
            detailOpen ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex-none space-y-3 border-b border-[var(--border)] px-3 py-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or token"
                autoComplete="off"
                enterKeyHint="search"
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card)] pr-3 pl-9 text-base outline-none focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 md:text-sm"
              />
            </label>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setQueueFilter(filter.id)}
                  className={cn(
                    "flex-none rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                    filter.id === queueFilter
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                  )}
                >
                  {filter.label}
                  {concepts ? (
                    <span className="ml-1 tabular-nums opacity-70">
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
                <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
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
              <ul className="space-y-1">
                {visible.map((concept) => {
                  const selected = concept._id === selectedId;
                  return (
                    <li key={concept._id}>
                      <button
                        type="button"
                        onClick={() => selectConcept(concept._id)}
                        className={cn(
                          "flex w-full min-h-12 items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                          selected
                            ? "bg-[var(--accent)]"
                            : "hover:bg-[var(--muted)]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 flex-none rounded-full",
                            statusDot(concept.status),
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium">
                              {concept.businessName}
                            </span>
                            <span className="flex-none text-[11px] text-[var(--muted-foreground)]">
                              {relativeTime(concept.updatedAt)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">
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
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div className="max-w-sm">
                <p className="text-sm font-medium">Pick a concept</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  The queue on the left is what still needs a decision. New
                  concepts start as a Google match.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {showForm ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-concept-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--background)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 id="new-concept-title" className="text-base font-semibold">
                  New concept
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
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
      <p className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
        No concepts match that search.
      </p>
    );
  }

  if (filter === "needs_you") {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-sm font-medium">Nothing waiting</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Published and in-flight concepts are in the other filters.
        </p>
        <button
          type="button"
          onClick={onShowAll}
          className="mt-3 text-xs font-medium text-[var(--foreground)] underline underline-offset-2"
        >
          Show all concepts
        </button>
      </div>
    );
  }

  if (filter === "working") {
    return (
      <p className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
        Nothing is generating or enriching right now.
      </p>
    );
  }

  return (
    <div className="px-3 py-8 text-center">
      <p className="text-sm text-[var(--muted-foreground)]">No concepts yet.</p>
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
