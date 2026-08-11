"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { harvestCompleteness } from "@/lib/concepts/harvest";
import { cn } from "@/lib/utils";

export type HarvestReviewCandidate = {
  id: string;
  kind:
    | "tagline"
    | "about"
    | "service"
    | "serviceArea"
    | "differentiator"
    | "sensitiveClaim"
    | "phone"
    | "hours"
    | "quote";
  value: string;
  detail?: string;
  evidence: string;
  sourceUrl: string;
  risk: "standard" | "sensitive";
};

const KIND_LABELS: Record<HarvestReviewCandidate["kind"], string> = {
  tagline: "Tagline",
  about: "About",
  service: "Service",
  serviceArea: "Service area",
  differentiator: "Differentiator",
  sensitiveClaim: "Claim",
  phone: "Phone",
  hours: "Hours",
  quote: "Testimonial",
};

function isApprovable(candidate: HarvestReviewCandidate): boolean {
  if (candidate.kind === "phone") return false;
  if (candidate.kind === "quote" && !candidate.detail?.trim()) return false;
  return true;
}

function sourceLabel(url: string): string {
  try {
    return new URL(url).pathname === "/"
      ? "Homepage"
      : new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "Source page";
  }
}

function CandidateRow({
  candidate,
  checked,
  disabled,
  onToggle,
}: {
  candidate: HarvestReviewCandidate;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const approvable = isApprovable(candidate);
  return (
    <li
      className={cn(
        "rounded-lg border p-3",
        checked
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-[var(--border)] bg-[var(--background)]",
      )}
    >
      <label className={cn("flex gap-3", approvable && "cursor-pointer")}>
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 flex-none accent-emerald-600"
          checked={checked}
          disabled={disabled || !approvable}
          onChange={onToggle}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {KIND_LABELS[candidate.kind]}
            </span>
            {candidate.risk === "sensitive" ? (
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                Approve individually
              </span>
            ) : null}
          </span>
          <span className="mt-1 block text-sm font-medium leading-snug">
            {candidate.value}
          </span>
          {candidate.detail ? (
            <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
              {candidate.detail}
            </span>
          ) : null}
          {!approvable ? (
            <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">
              {candidate.kind === "phone"
                ? "Change the verified phone in Edit brief instead."
                : "This testimonial has no visible attribution and cannot be used."}
            </span>
          ) : null}
        </span>
      </label>

      <details className="mt-2 pl-7 text-[11px] text-[var(--muted-foreground)]">
        <summary className="cursor-pointer select-none">
          Check source evidence
        </summary>
        <p className="mt-1 leading-relaxed">{candidate.evidence}</p>
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 underline underline-offset-2"
        >
          {sourceLabel(candidate.sourceUrl)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </details>
    </li>
  );
}

export function ConceptHarvestReview({
  candidates,
  approvedCandidateIds,
  reviewState,
  snapshotKey,
  isBusy,
  onApproveAndGenerate,
  onSkipAndGenerate,
  onRefresh,
  placeMatchResolved,
  hasPhone,
  hasLogo,
  photoCount,
  manualQuoteCount,
}: {
  candidates: Array<HarvestReviewCandidate>;
  approvedCandidateIds: Array<string>;
  reviewState: "pending" | "approved" | "skipped";
  snapshotKey: number;
  isBusy: boolean;
  onApproveAndGenerate: (candidateIds: Array<string>) => Promise<void>;
  onSkipAndGenerate: () => Promise<void>;
  onRefresh: () => Promise<void>;
  placeMatchResolved: boolean;
  hasPhone: boolean;
  hasLogo: boolean;
  photoCount: number;
  manualQuoteCount: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(approvedCandidateIds),
  );
  const approvedKey = approvedCandidateIds.join("\0");

  useEffect(() => {
    setSelected(new Set(approvedKey ? approvedKey.split("\0") : []));
  }, [approvedKey, snapshotKey]);

  const standard = useMemo(
    () => candidates.filter((candidate) => candidate.risk === "standard"),
    [candidates],
  );
  const sensitive = useMemo(
    () => candidates.filter((candidate) => candidate.risk === "sensitive"),
    [candidates],
  );
  const standardApprovableIds = standard
    .filter(isApprovable)
    .map((candidate) => candidate.id);
  const selectedCandidates = candidates.filter((candidate) =>
    selected.has(candidate.id),
  );
  const completeness = harvestCompleteness({
    placeMatchResolved,
    hasPhone,
    serviceCount: selectedCandidates.filter(
      (candidate) => candidate.kind === "service",
    ).length,
    hasAbout: selectedCandidates.some(
      (candidate) => candidate.kind === "about",
    ),
    hasLogo,
    photoCount,
    approvedQuoteCount:
      manualQuoteCount +
      selectedCandidates.filter(
        (candidate) => candidate.kind === "quote" && candidate.detail?.trim(),
      ).length,
  });

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectStandard = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of standardApprovableIds) next.add(id);
      return next;
    });
  };

  return (
    <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
      <div>
        <h4 className="text-sm font-semibold">
          Choose what the new page may say
        </h4>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          “Needs care” is a subset of the facts above. Those claims and
          testimonials are separated below so they can never be approved in
          bulk.
        </p>
      </div>

      <details
        open={reviewState === "pending"}
        className="rounded-lg border border-[var(--border)] p-3"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Standard facts ({standard.length})
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBusy || standardApprovableIds.length === 0}
            onClick={selectStandard}
          >
            <Check className="h-3.5 w-3.5" />
            Select standard facts
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isBusy || selected.size === 0}
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {standard.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              checked={selected.has(candidate.id)}
              disabled={isBusy}
              onToggle={() => toggle(candidate.id)}
            />
          ))}
        </ul>
      </details>

      <details
        open={reviewState === "pending"}
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
      >
        <summary className="cursor-pointer text-sm font-semibold text-amber-800 dark:text-amber-200">
          Needs care ({sensitive.length})
        </summary>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Check each credential, guarantee, price, year, statistic, emergency
          claim, or testimonial against the linked page before selecting it.
        </p>
        <ul className="mt-3 space-y-2">
          {sensitive.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              checked={selected.has(candidate.id)}
              disabled={isBusy}
              onToggle={() => toggle(candidate.id)}
            />
          ))}
        </ul>
      </details>

      <div className="rounded-lg border border-[var(--border)] p-3">
        <h4 className="text-sm font-semibold">Generation brief</h4>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {completeness.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"
            >
              <span
                className={cn(
                  "flex h-4 w-4 flex-none items-center justify-center rounded-full border",
                  row.met
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-[var(--border)]",
                )}
              >
                {row.met ? <Check className="h-3 w-3" /> : null}
              </span>
              <span>
                {row.label}
                {row.requirement === "recommended" && !row.met
                  ? " recommended"
                  : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
        <Button
          type="button"
          className="w-full"
          disabled={isBusy || selected.size === 0}
          onClick={() => void onApproveAndGenerate([...selected])}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {reviewState === "approved"
            ? "Save and regenerate"
            : "Approve and regenerate"}
          {selected.size > 0 ? ` (${selected.size})` : ""}
        </Button>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => void onSkipAndGenerate()}
          >
            Ignore content and regenerate
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isBusy}
            onClick={() => void onRefresh()}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Re-scan website
          </Button>
        </div>
      </div>
    </div>
  );
}
