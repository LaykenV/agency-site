"use client";

import Image from "next/image";
import {
  Check,
  ExternalLink,
  ImageIcon,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HarvestImageReviewItem = {
  id: string;
  sourceUrl: string;
  roleHint: "logo" | "photo";
  alt?: string;
  stageStatus?: "staging" | "ready" | "failed" | "rejected";
  importError?: string;
  approvedKind?: "logo" | "photo";
};

export function ConceptHarvestImages({
  candidates,
  previewUrls,
  isBusy,
  onRetry,
  onApprove,
  onReject,
  canRegenerate,
  onRegenerate,
}: {
  candidates: Array<HarvestImageReviewItem>;
  previewUrls: Record<string, string | null>;
  isBusy: boolean;
  onRetry: (candidateId: string) => Promise<unknown>;
  onApprove: (candidateId: string, kind: "logo" | "photo") => Promise<unknown>;
  onReject: (candidateId: string) => Promise<unknown>;
  canRegenerate: boolean;
  onRegenerate: () => Promise<unknown>;
}) {
  const visible = candidates.filter(
    (candidate) => candidate.stageStatus !== "rejected",
  );
  const rejectedCount = candidates.length - visible.length;
  if (candidates.length === 0) return null;

  return (
    <section className="min-w-0 border-t border-[var(--border)] pt-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">Website logo &amp; photos</h4>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
            Safely copied into this concept for review. Nothing is used until
            you choose Logo or Photo.
          </p>
        </div>
        <span className="flex-none rounded-full bg-[var(--muted)] px-2 py-1 text-[10px] font-medium text-[var(--muted-foreground)]">
          {visible.length} found
        </span>
      </div>
      {visible.length > 1 ? (
        <p className="mt-2 text-[11px] text-[var(--muted-foreground)] sm:hidden">
          Swipe sideways to review each image.
        </p>
      ) : null}

      <div className="-mx-1 mt-3 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {visible.map((candidate) => {
          const previewUrl = previewUrls[candidate.id];
          const ready = candidate.stageStatus === "ready" && previewUrl;
          const failed = candidate.stageStatus === "failed";
          const primaryKind = candidate.roleHint;
          const alternateKind = primaryKind === "logo" ? "photo" : "logo";

          return (
            <article
              key={candidate.id}
              className={cn(
                "w-[85%] min-w-[15rem] flex-none snap-start overflow-hidden rounded-lg border bg-[var(--background)] sm:w-auto sm:min-w-0",
                candidate.approvedKind
                  ? "border-emerald-500/50"
                  : "border-[var(--border)]",
              )}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--muted)]">
                {ready ? (
                  <Image
                    src={previewUrl}
                    alt={candidate.alt ?? "Harvested website image"}
                    fill
                    unoptimized
                    sizes="(max-width: 429px) 100vw, (max-width: 639px) 50vw, 33vw"
                    className={cn(
                      candidate.roleHint === "logo"
                        ? "object-contain p-3"
                        : "object-cover",
                    )}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-[var(--muted-foreground)]">
                    {failed ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )}
                    <span>
                      {failed ? "Preview failed" : "Preparing preview"}
                    </span>
                  </div>
                )}

                {candidate.approvedKind ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white">
                    <Check className="h-3 w-3" />
                    Used as {candidate.approvedKind}
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 space-y-2 p-3">
                <p className="line-clamp-2 break-words text-xs font-medium leading-snug [overflow-wrap:anywhere]">
                  {candidate.alt ??
                    (candidate.roleHint === "logo"
                      ? "Possible website logo"
                      : "Website photo")}
                </p>
                <a
                  href={candidate.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 text-[11px] text-[var(--muted-foreground)] underline underline-offset-2"
                >
                  <span className="truncate">View source page</span>
                  <ExternalLink className="h-3 w-3 flex-none" />
                </a>

                {failed ? (
                  <div className="space-y-2">
                    <p className="break-words text-[11px] leading-relaxed text-amber-700 [overflow-wrap:anywhere] dark:text-amber-300">
                      {candidate.importError ??
                        "This image could not be copied."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={isBusy}
                      onClick={() => void onRetry(candidate.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry preview
                    </Button>
                  </div>
                ) : ready ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={
                        isBusy || candidate.approvedKind === primaryKind
                      }
                      onClick={() => void onApprove(candidate.id, primaryKind)}
                    >
                      {primaryKind === "logo" ? "Use as logo" : "Add photo"}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-w-0 px-2 text-xs"
                        disabled={
                          isBusy || candidate.approvedKind === alternateKind
                        }
                        onClick={() =>
                          void onApprove(candidate.id, alternateKind)
                        }
                      >
                        As {alternateKind}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="min-w-0 px-2 text-xs"
                        disabled={isBusy}
                        onClick={() => void onReject(candidate.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {rejectedCount > 0 ? (
        <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          {rejectedCount} image{rejectedCount === 1 ? "" : "s"} rejected.
          Re-scan the website to see them again.
        </p>
      ) : null}

      {candidates.some((candidate) => candidate.approvedKind) ? (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3">
          <Button
            type="button"
            className="w-full"
            disabled={isBusy || !canRegenerate}
            onClick={() => void onRegenerate()}
          >
            Regenerate with selected images
          </Button>
          {!canRegenerate ? (
            <p className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]">
              Approve or ignore the harvested facts below first; that action
              will regenerate with these images.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
