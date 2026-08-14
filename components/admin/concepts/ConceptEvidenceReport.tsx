"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import {
  isEvidenceCandidateApprovable,
  summarizeEvidenceDecisions,
  type EvidenceCandidate,
  type EvidenceDecision,
} from "@/lib/concepts/evidence";

/**
 * What the evidence reviewer kept, what it left out, and why.
 *
 * Shared by both sources because both now get exactly one review with exactly
 * one contract, and showing them differently would imply a difference that no
 * longer exists.
 *
 * It is a report, not a form. The corrections available are the ones that
 * change the input — remove pack material, re-scan the website, edit the brief
 * — and those live in the cards that own them. What this must do well is make a
 * wrong decision visible, which is why omissions are listed with the reviewer's
 * reason rather than counted.
 */

const KIND_LABELS: Record<EvidenceCandidate["kind"], string> = {
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

export function ConceptEvidenceReport({
  candidates,
  decisions,
  conflicts,
  emptyMessage,
}: {
  candidates: Array<EvidenceCandidate>;
  decisions: Array<EvidenceDecision>;
  conflicts: Array<string>;
  emptyMessage: string;
}) {
  const summary = summarizeEvidenceDecisions({ candidates, decisions });
  const approvedIds = new Set(
    decisions
      .filter((decision) => decision.decision === "approved")
      .map((decision) => decision.candidateId),
  );
  const reasonById = new Map(
    decisions.map((decision) => [decision.candidateId, decision.reason]),
  );

  const isKept = (candidate: EvidenceCandidate) =>
    approvedIds.has(candidate.id) && isEvidenceCandidateApprovable(candidate);
  const accepted = candidates.filter(isKept);
  const omitted = candidates.filter((candidate) => !isKept(candidate));

  return (
    <div className="min-w-0">
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Facts kept</dt>
          <dd className="font-medium">{summary.approved}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Omitted</dt>
          <dd className="font-medium">{summary.rejected}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Held-to claims</dt>
          <dd className="font-medium">{summary.sensitiveApproved}</dd>
        </div>
      </dl>

      {conflicts.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
          <p className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 flex-none" />
            Conflicting evidence
          </p>
          <ul className="mt-1.5 space-y-1">
            {conflicts.map((conflict) => (
              <li
                key={conflict}
                className="break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]"
              >
                {conflict}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {candidates.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyMessage}</p>
      ) : null}

      {accepted.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {accepted.map((candidate) => (
            <li key={candidate.id} className="flex min-w-0 items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-blue-600 dark:text-blue-400" />
              <span className="min-w-0 break-words text-xs leading-relaxed [overflow-wrap:anywhere]">
                <span className="text-muted-foreground">
                  {KIND_LABELS[candidate.kind]}:{" "}
                </span>
                {candidate.value}
                {candidate.detail ? (
                  <span className="text-muted-foreground">
                    {" "}
                    — {candidate.detail}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {omitted.length > 0 ? (
        <details className="mt-3 rounded-lg border border-border p-2.5">
          <summary className="cursor-pointer text-xs font-medium">
            {omitted.length} fact{omitted.length === 1 ? "" : "s"} left out
          </summary>
          <ul className="mt-2 space-y-2">
            {omitted.map((candidate) => (
              <li key={candidate.id} className="flex min-w-0 items-start gap-2">
                <X className="mt-0.5 h-3.5 w-3.5 flex-none text-muted-foreground" />
                <span className="min-w-0 break-words text-[11px] leading-relaxed [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">
                    {KIND_LABELS[candidate.kind]}:{" "}
                  </span>
                  {candidate.value}
                  <span className="block text-muted-foreground">
                    {candidate.kind === "phone"
                      ? "Phone numbers are set in the brief, not taken from evidence."
                      : candidate.kind === "quote" && !candidate.detail?.trim()
                        ? "A testimonial needs visible attribution."
                        : (reasonById.get(candidate.id) ??
                          "The reviewer did not approve this.")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
