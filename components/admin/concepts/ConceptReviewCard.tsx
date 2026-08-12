"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConceptPreviewFrame } from "./ConceptPreviewFrame";
import { ConceptHarvestReview } from "./ConceptHarvestReview";
import { ConceptHarvestImages } from "./ConceptHarvestImages";
import { ConceptFacebookPack } from "./ConceptFacebookPack";
import { ConceptPackSummary } from "./ConceptPackSummary";
import { ConceptEvidenceReport } from "./ConceptEvidenceReport";
import { CONCEPT_STRUCTURES } from "@/lib/concepts/prompt";
import {
  conceptDraftPassedValidation,
  generationBlockedReason,
} from "@/lib/concepts/lifecycle";
import { harvestCandidatesToEvidence } from "@/lib/concepts/evidence";
import {
  buildMessengerDraft,
  conceptPreviewUrl,
} from "@/lib/concepts/messengerDraft";
import { cn } from "@/lib/utils";
import { preparePackImage } from "@/lib/concepts/preparePackImage";
import {
  defaultWorkspacePane,
  workspaceSteps,
  type WorkspacePane,
} from "@/lib/concepts/workspace";

/**
 * The human review gate.
 *
 * The deterministic validator catches unsafe markup, hotlinked assets, invented
 * phone numbers and fabricated testimonials. Everything else — whether it looks
 * right, sounds like them, and is worth sending — is checked here before
 * publish. That is why the publish control sits beneath the rendered concept
 * rather than next to the generate button.
 */

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  enriching: "Enriching",
  harvesting: "Harvesting website",
  matching: "Needs Google match",
  content_review: "Needs content review",
  generating: "Generating",
  review: "Ready to review",
  published: "Published",
  failed: "Failed",
};

/** Which gate rejected the draft, as a short heading above the reason. */
const GENERATION_FAILURE_LABELS: Record<string, string> = {
  html_invalid: "Failed HTML validation",
  claims_unsupported: "Failed the factual audit",
  audit_unreadable: "Audit did not complete",
  provider_error: "Model provider failed",
  provider_rate_limited: "Rate limited — not your fault",
};

function statusClass(status: string): string {
  switch (status) {
    case "published":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "review":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
    case "matching":
    case "content_review":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "failed":
      return "bg-red-500/15 text-red-700 dark:text-red-300";
    case "enriching":
    case "harvesting":
    case "generating":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
    default:
      return "bg-[var(--muted)] text-[var(--muted-foreground)]";
  }
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString();
}

/** One live Google Maps result, held in component state only. */
type PlaceCandidate = {
  placeId: string;
  businessName: string;
  formattedAddress: string;
  phone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
  primaryType?: string;
  businessStatus?: string;
};

async function copyText(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy. Copy it manually instead.");
  }
}

export function ConceptReviewCard({
  conceptId,
  onDeleted,
  onBack,
}: {
  conceptId: Id<"website_concepts">;
  onDeleted: () => void;
  onBack?: () => void;
}) {
  const data = useQuery(api.concepts.admin.get, { conceptId });

  const updateConcept = useMutation(api.concepts.admin.update);
  const confirmPlaceMatch = useAction(api.concepts.enrich.confirmPlaceMatch);
  const listPlaceCandidates = useAction(
    api.concepts.enrich.listPlaceCandidates,
  );
  const reEnrich = useMutation(api.concepts.admin.reEnrich);
  const harvestWebsiteContent = useMutation(
    api.concepts.admin.harvestWebsiteContent,
  );
  const skipHarvestReview = useMutation(api.concepts.admin.skipHarvestReview);
  const approveHarvestReview = useMutation(
    api.concepts.admin.approveHarvestReview,
  );
  const stageHarvestImages = useMutation(api.concepts.admin.stageHarvestImages);
  const approveHarvestImage = useMutation(
    api.concepts.admin.approveHarvestImage,
  );
  const rejectHarvestImage = useMutation(api.concepts.admin.rejectHarvestImage);
  const addPackImage = useMutation(api.concepts.admin.addPackImage);
  const addPackText = useMutation(api.concepts.admin.addPackText);
  const removePackItem = useMutation(api.concepts.admin.removePackItem);
  const analyzeFacebookPack = useMutation(
    api.concepts.admin.analyzeFacebookPack,
  );
  const generate = useMutation(api.concepts.admin.generate);
  const publish = useMutation(api.concepts.admin.publish);
  const unpublish = useMutation(api.concepts.admin.unpublish);
  const markSent = useMutation(api.concepts.admin.markSent);
  const removeConcept = useMutation(api.concepts.admin.remove);
  const generateUploadUrl = useMutation(api.concepts.admin.generateUploadUrl);
  const attachAsset = useMutation(api.concepts.admin.attachAsset);
  const removeAsset = useMutation(api.concepts.admin.removeAsset);

  const [structureId, setStructureId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [pane, setPane] = useState<WorkspacePane>("now");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Intake edit drafts, seeded from the server row and re-seeded when the
  // selected concept changes.
  const [draft, setDraft] = useState({
    businessName: "",
    facebookPageUrl: "",
    submittedWebsiteUrl: "",
    phone: "",
    serviceArea: "",
    notes: "",
  });
  const [quotes, setQuotes] = useState<
    Array<{ author: string; text: string; rating?: number }>
  >([]);

  // Places candidates are Google Maps content: fetched live for as long as this
  // panel is open, shown with attribution, and never written to our database.
  const [candidates, setCandidates] = useState<Array<PlaceCandidate>>([]);
  const [candidatesStatus, setCandidatesStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  const concept = data?.concept;

  useEffect(() => {
    if (!concept) return;
    setDraft({
      businessName: concept.businessName,
      facebookPageUrl: concept.facebookPageUrl ?? "",
      submittedWebsiteUrl: concept.submittedWebsiteUrl ?? "",
      phone: concept.phone ?? "",
      serviceArea: concept.serviceArea ?? "",
      notes: concept.notes ?? "",
    });
    setQuotes(concept.approvedQuotes);
    setStructureId(concept.structureId ?? "");
  }, [concept?._id, concept?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!concept) return;
    setPane(
      defaultWorkspacePane({
        status: concept.status,
        generatedHtml: concept.generatedHtml,
      }),
    );
    // Seed from the loaded row. `concept` as a dependency would reset the
    // pane on every reactive field change, including view counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept?._id, concept?.status, concept?.generatedHtml]);

  // Fetch the candidate list only when the match panel is actually on screen.
  // `cancelled` matters because switching concepts mid-request would otherwise
  // paint one business's listings under another's name.
  const isMatching = concept?.status === "matching";

  useEffect(() => {
    if (!isMatching) {
      setCandidates([]);
      setCandidatesStatus("idle");
      setCandidatesError(null);
      return;
    }

    let cancelled = false;
    setCandidatesStatus("loading");
    setCandidatesError(null);

    listPlaceCandidates({ conceptId })
      .then((result) => {
        if (cancelled) return;
        setCandidates(result);
        setCandidatesStatus("loaded");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCandidates([]);
        setCandidatesStatus("error");
        setCandidatesError(
          error instanceof Error ? error.message : "Google lookup failed.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [conceptId, isMatching, listPlaceCandidates]);

  const unstagedImageKey = (concept?.harvestImageCandidates ?? [])
    .filter(
      (candidate) =>
        candidate.stageStatus === undefined && !candidate.previewStorageId,
    )
    .map((candidate) => candidate.id)
    .join("\0");

  useEffect(() => {
    if (!unstagedImageKey) return;
    stageHarvestImages({ conceptId }).catch((error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Website image previews could not start.",
      );
    });
  }, [conceptId, stageHarvestImages, unstagedImageKey]);

  if (data === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (data === null || !concept) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-[var(--muted-foreground)]">
        <p>This concept no longer exists.</p>
        {onBack ? (
          <Button size="sm" variant="outline" onClick={onBack}>
            Back to queue
          </Button>
        ) : null}
      </div>
    );
  }

  const previewUrl = conceptPreviewUrl(concept.token);
  const isWorking =
    concept.status === "enriching" ||
    concept.status === "harvesting" ||
    concept.status === "generating";
  const needsMatch = isMatching;
  const draftPassedValidation = conceptDraftPassedValidation(concept);
  const harvestSourceUrl = concept.harvestSourceUrl;
  const harvestPending = concept.harvestReviewState === "pending";
  const harvestInFlight = Boolean(concept.harvestRequestId);
  const harvestImagesInFlight =
    concept.harvestImageAnalysisState === "processing";
  const sensitiveCount = (concept.harvestCandidates ?? []).filter(
    (candidate) => candidate.risk === "sensitive",
  ).length;
  const harvestImagePreviewUrls = Object.fromEntries(
    data.harvestImagePreviews.map((preview) => [
      preview.candidateId,
      preview.url,
    ]),
  );
  const packItems = concept.facebookPackItems ?? [];
  const packPreviewUrls = Object.fromEntries(
    data.packItemPreviews.map((preview) => [preview.itemId, preview.url]),
  );
  const generationBlocked = generationBlockedReason({
    placeMatchResolved: concept.placeMatchResolved,
    hasResearchBrief: Boolean(concept.researchBrief),
    harvestReviewState: concept.harvestReviewState,
    harvestInFlight,
    harvestImagesInFlight,
    facebookPackState: concept.facebookPackState,
    packItemCount: packItems.length,
  });

  /** Resolves true when the action succeeded, so a caller can clear its input. */
  const runAction = async (
    action: () => Promise<unknown>,
    success?: string,
  ): Promise<boolean> => {
    setIsBusy(true);
    try {
      await action();
      if (success) toast.success(success);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something failed.");
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const uploadFile = async (file: File, kind: "logo" | "photo") => {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name || "Clipboard item"} is not an image.`);
    }

    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Upload failed.");

    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    await attachAsset({ conceptId, storageId, kind });
  };

  const handleFiles = async (files: Array<File>, kind: "logo" | "photo") => {
    const selected = kind === "logo" ? files.slice(0, 1) : files;
    if (selected.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of selected) {
        await uploadFile(file, kind);
      }
      toast.success(
        kind === "logo"
          ? "Logo attached."
          : `${selected.length} photo${selected.length === 1 ? "" : "s"} attached.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (
    event: React.ClipboardEvent<HTMLElement>,
    kind: "logo" | "photo",
  ) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length === 0) {
      toast.error("The clipboard does not contain an image.");
      return;
    }

    event.preventDefault();
    void handleFiles(files, kind);
  };

  /**
   * Add pasted or uploaded material to the Facebook Pack.
   *
   * Each file is reported on its own rather than aborting the batch: pasting
   * four screenshots where the second is a repeat should attach the other
   * three, not make Layken paste them again.
   */
  const handlePackImages = async (files: Array<File>) => {
    setIsUploading(true);
    let attached = 0;
    let optimized = 0;
    try {
      for (const file of files) {
        try {
          if (!file.type.startsWith("image/")) {
            throw new Error(
              `${file.name || "Clipboard item"} is not an image.`,
            );
          }
          const prepared = await preparePackImage(file);
          if (prepared.optimized) optimized += 1;
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": prepared.file.type },
            body: prepared.file,
          });
          if (!response.ok) throw new Error("Upload failed.");

          const { storageId } = (await response.json()) as {
            storageId: Id<"_storage">;
          };
          await addPackImage({ conceptId, storageId });
          attached += 1;
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "That item was not added.",
          );
        }
      }
      if (attached > 0) {
        toast.success(
          `${attached} item${attached === 1 ? "" : "s"} added to the pack.${optimized > 0 ? ` Optimized ${optimized} large image${optimized === 1 ? "" : "s"}.` : ""}`,
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const hasHtml = Boolean(concept.generatedHtml);
  const steps = workspaceSteps({
    status: concept.status,
    placeMatchResolved: concept.placeMatchResolved,
    facebookPackState: concept.facebookPackState,
    facebookPackItemCount: packItems.length,
    harvestReviewState: concept.harvestReviewState,
    hasGeneratedHtml: hasHtml,
    sentAt: concept.sentAt,
    viewCount: concept.viewCount,
  });
  const panes: Array<{ id: WorkspacePane; label: string; hidden?: boolean }> = [
    { id: "now", label: "Now" },
    { id: "preview", label: "Preview", hidden: !hasHtml },
    { id: "pack", label: "Pack" },
    { id: "more", label: "More" },
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex-none border-b border-[var(--border)] bg-[var(--background)] px-3 py-3 sm:px-4">
        <div className="flex items-start gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:hidden"
              aria-label="Back to queue"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="truncate text-base font-semibold sm:text-lg">
                {concept.businessName}
              </h2>
              <span
                className={cn(
                  "inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  statusClass(concept.status),
                )}
              >
                {isWorking ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {STATUS_LABELS[concept.status] ?? concept.status}
              </span>
            </div>
            <ol className="mt-2 flex items-center gap-1 text-[11px]">
              {steps.map((step, index) => (
                <li key={step.id} className="flex min-w-0 items-center gap-1">
                  {index > 0 ? (
                    <span
                      className="text-[var(--border)]"
                      aria-hidden
                    >
                      /
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      step.state === "current" && "font-semibold text-[var(--foreground)]",
                      step.state === "done" && "text-[var(--muted-foreground)]",
                      step.state === "todo" && "text-[var(--muted-foreground)]/60",
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </header>

      <nav
        className="flex flex-none gap-1 overflow-x-auto border-b border-[var(--border)] px-3 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden"
        aria-label="Concept sections"
      >
        {panes
          .filter((entry) => !entry.hidden)
          .map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setPane(entry.id)}
              className={cn(
                "-mb-px flex-none border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                pane === entry.id
                  ? "border-[var(--foreground)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {entry.label}
            </button>
          ))}
      </nav>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 pb-28 sm:px-4">
      {/* --- Failures --- */}
      {concept.error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          {/* Naming the gate that rejected the draft, because the four
              failures need four different reactions: read the draft, reject
              the claims, retry now, or retry later. */}
          {concept.generationFailure ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-red-700/70 dark:text-red-300/70">
              {GENERATION_FAILURE_LABELS[concept.generationFailure]}
            </p>
          ) : null}
          <p className="flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            {concept.error}
          </p>
          {concept.validationViolations?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-8 text-xs text-red-700/90 dark:text-red-300/90">
              {concept.validationViolations.map((violation) => (
                <li key={violation}>{violation}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* --- Google Places match confirmation --- */}
      {needsMatch && pane === "now" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="text-sm font-semibold">Which business is this?</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Attaching the wrong listing would put another company&apos;s facts
            on the page, so this needs your confirmation before anything is
            generated.
          </p>

          <div className="mt-3 space-y-2">
            {candidatesStatus === "loading" ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-xs text-[var(--muted-foreground)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Looking these up on Google...
              </div>
            ) : null}

            {candidatesStatus === "error" ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
                {candidatesError ?? "Google lookup failed."} You can still build
                this concept from your notes with{" "}
                <strong>No Google listing</strong>.
              </div>
            ) : null}

            {candidatesStatus === "loaded" && candidates.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-xs text-[var(--muted-foreground)]">
                Google returned nothing for this name and area. Correct the name
                above and search again, or build from your notes.
              </div>
            ) : null}

            {candidates.map((candidate) => (
              <div
                key={candidate.placeId}
                className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-xs">
                  <p className="font-medium">{candidate.businessName}</p>
                  <p className="text-[var(--muted-foreground)]">
                    {candidate.formattedAddress}
                  </p>
                  <p className="mt-0.5 text-[var(--muted-foreground)]">
                    {candidate.phone ?? "No phone"}
                    {candidate.websiteUrl ? ` · ${candidate.websiteUrl}` : ""}
                  </p>
                  {candidate.googleMapsUrl ? (
                    <a
                      href={candidate.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[var(--muted-foreground)] underline underline-offset-2"
                    >
                      View on Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  disabled={isBusy}
                  className="flex-none"
                  onClick={() =>
                    runAction(
                      () =>
                        confirmPlaceMatch({
                          conceptId,
                          placeId: candidate.placeId,
                        }),
                      "Match confirmed. Preparing the draft...",
                    )
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                  This is them
                </Button>
              </div>
            ))}
          </div>

          {/* Exact text attribution is permitted for this compact mobile panel. */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
            <p>
              Live results for identification only. Only the place ID is kept.
            </p>
            <span
              translate="no"
              aria-label="Google Maps"
              className="whitespace-nowrap font-normal tracking-normal text-[#5e5e5e] dark:text-white"
            >
              Google Maps
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() =>
                runAction(
                  () =>
                    confirmPlaceMatch({
                      conceptId,
                      placeId: null,
                    }),
                  "Identity confirmed. Preparing the draft...",
                )
              }
            >
              No Google listing
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onClick={() =>
                runAction(() => reEnrich({ conceptId }), "Searching again...")
              }
            >
              Search again
            </Button>
          </div>
        </div>
      ) : null}

      {needsMatch && pane !== "now" ? (
        <button
          type="button"
          onClick={() => setPane("now")}
          className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left text-sm"
        >
          <span className="font-medium">Confirm the Google match first.</span>
          <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
            Generation stays locked until you pick the listing.
          </span>
        </button>
      ) : null}

      {pane === "now" && isWorking ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            {STATUS_LABELS[concept.status] ?? "Working"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            This page will update when the next step is ready.
          </p>
        </div>
      ) : null}

      {pane === "now" &&
      !needsMatch &&
      !isWorking &&
      concept.status !== "content_review" ? (
        <NowPane
          concept={concept}
          previewUrl={previewUrl}
          draftPassedValidation={draftPassedValidation}
          generationBlocked={generationBlocked}
          packItemCount={packItems.length}
          isBusy={isBusy}
          structureId={structureId}
          onStructureId={setStructureId}
          onOpenPack={() => setPane("pack")}
          onOpenPreview={() => setPane("preview")}
          onGenerate={() =>
            runAction(
              () =>
                generate({
                  conceptId,
                  structureId: structureId || undefined,
                }),
              "Generating...",
            )
          }
          onPublish={() =>
            runAction(() => publish({ conceptId }), "Published.")
          }
          onUnpublish={() =>
            runAction(
              () => unpublish({ conceptId }),
              "Unpublished. The link now returns not found.",
            )
          }
          onCopyLink={() => copyText(previewUrl, "Link copied.")}
          onCopyDraft={() =>
            copyText(
              buildMessengerDraft({
                businessName: concept.businessName,
                token: concept.token,
              }),
              "Messenger draft copied.",
            )
          }
          onToggleSent={() =>
            runAction(
              () => markSent({ conceptId, sent: !concept.sentAt }),
              concept.sentAt ? "Cleared." : "Marked as sent.",
            )
          }
        />
      ) : null}

      {/* --- Facebook Pack: the primary content source --- */}
      {pane === "pack" ? (
      <>
      <ConceptFacebookPack
        items={packItems}
        state={concept.facebookPackState}
        error={concept.facebookPackError}
        previewUrls={packPreviewUrls}
        isBusy={isBusy || isUploading}
        onAddImages={handlePackImages}
        onAddText={(text) =>
          runAction(
            () => addPackText({ conceptId, text }),
            "Text added to the pack.",
          )
        }
        onRemoveItem={(itemId) =>
          runAction(
            () => removePackItem({ conceptId, itemId }),
            "Item removed from the pack.",
          )
        }
        onAnalyze={() =>
          runAction(
            () => analyzeFacebookPack({ conceptId }),
            "Sorting the pack...",
          )
        }
      />

      {/* --- What the reviewer concluded. A report, not an approval form. --- */}
      {concept.facebookEvidence ? (
        <ConceptPackSummary
          candidates={concept.facebookEvidence.candidates}
          decisions={concept.facebookEvidence.decisions}
          conflicts={concept.facebookEvidence.conflicts}
          assets={concept.facebookEvidence.assets}
          items={packItems}
          previewUrls={packPreviewUrls}
        />
      ) : null}
      </>
      ) : null}

      {/* --- Harvested website content and factual approval --- */}
      {(harvestSourceUrl || concept.harvestReviewState) &&
      (harvestPending ? pane === "now" : pane === "more") ? (
        <div
          className={cn(
            "min-w-0 overflow-hidden rounded-xl border p-3 sm:p-4",
            harvestPending
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-[var(--border)] bg-[var(--card)]",
          )}
        >
          <h3 className="text-sm font-semibold">Website gap-fill</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {harvestPending
              ? "This harvest was collected before automatic review and still has a manual approval below. Approve or skip it once; new scans are reviewed for you."
              : harvestImagesInFlight
                ? "Website facts are reviewed. Images are still being copied and sorted before generation unlocks."
                : concept.harvestReviewState === "skipped"
                  ? "Nothing usable came back from their website. The page will be built from the Facebook Pack, your notes, and uploaded assets."
                  : "Found on their website and reviewed against its own source pages. Facebook material wins where the two disagree."}
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[var(--muted-foreground)]">Pages read</dt>
              <dd className="font-medium">
                {concept.harvestedPages?.length ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Facts found</dt>
              <dd className="font-medium">
                {concept.harvestCandidates?.length ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Held-to claims</dt>
              <dd className="font-medium">{sensitiveCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Images used</dt>
              <dd className="font-medium">
                {concept.importedWebsiteAssets?.length ?? 0} of{" "}
                {concept.harvestImageCandidates?.length ?? 0}
              </dd>
            </div>
          </dl>

          {/* The reviewed outcome. Legacy pending rows keep the old approval
              form below instead; they were harvested before this existed. */}
          {!harvestPending && concept.harvestReview ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <ConceptEvidenceReport
                candidates={harvestCandidatesToEvidence(
                  concept.harvestCandidates ?? [],
                )}
                decisions={concept.harvestReview.decisions}
                conflicts={concept.harvestReview.conflicts}
                emptyMessage="Their website supplied no usable facts."
              />
            </div>
          ) : null}
          {concept.harvestedPages?.length ? (
            <details className="mt-3 min-w-0 text-xs">
              <summary className="cursor-pointer font-medium text-[var(--muted-foreground)]">
                {concept.harvestedPages.length} source page
                {concept.harvestedPages.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-2 min-w-0 space-y-1.5">
                {concept.harvestedPages.map((page) => (
                  <li key={page.url} className="min-w-0">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block min-w-0 truncate text-[var(--muted-foreground)] underline underline-offset-2"
                    >
                      {page.title ?? page.url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {concept.harvestWarnings?.length ? (
            <ul className="mt-3 min-w-0 list-disc space-y-1 pl-4 text-xs text-[var(--muted-foreground)]">
              {concept.harvestWarnings.map((warning) => (
                <li
                  key={warning}
                  className="break-words [overflow-wrap:anywhere]"
                >
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}

          {/* Legacy only. A reviewed harvest attaches its own imagery, and a
              staged file nothing selected is deleted rather than offered. */}
          {harvestPending ? (
            <ConceptHarvestImages
              candidates={concept.harvestImageCandidates ?? []}
              previewUrls={harvestImagePreviewUrls}
              isBusy={isBusy || isWorking}
              canRegenerate={Boolean(concept.researchBrief)}
              onRetry={(candidateId) =>
                runAction(
                  () => stageHarvestImages({ conceptId, candidateId }),
                  "Retrying that website image...",
                )
              }
              onApprove={(candidateId, kind) =>
                runAction(
                  () => approveHarvestImage({ conceptId, candidateId, kind }),
                  kind === "logo"
                    ? "Website logo selected."
                    : "Website photo selected.",
                )
              }
              onReject={(candidateId) =>
                runAction(
                  () => rejectHarvestImage({ conceptId, candidateId }),
                  "Website image rejected.",
                )
              }
              onRegenerate={() =>
                runAction(
                  () =>
                    generate({
                      conceptId,
                      structureId: structureId || undefined,
                    }),
                  "Generating with the selected images...",
                )
              }
            />
          ) : null}

          {harvestPending ? (
            <ConceptHarvestReview
              candidates={concept.harvestCandidates ?? []}
              approvedCandidateIds={concept.approvedHarvestCandidateIds ?? []}
              reviewState="pending"
              snapshotKey={concept.harvestedAt ?? 0}
              isBusy={isBusy || isWorking}
              placeMatchResolved={concept.placeMatchResolved}
              hasPhone={Boolean(concept.phone)}
              hasLogo={Boolean(data.logoUrl)}
              photoCount={data.photos.length}
              manualQuoteCount={
                concept.approvedQuotes.filter(
                  (quote) => quote.sourceKind !== "website",
                ).length
              }
              onApproveAndGenerate={(candidateIds) =>
                runAction(async () => {
                  await approveHarvestReview({
                    conceptId,
                    approvedCandidateIds: candidateIds,
                  });
                  await generate({
                    conceptId,
                    structureId: structureId || undefined,
                  });
                }, "Approved content saved. Generating a new concept...")
              }
              onSkipAndGenerate={() =>
                runAction(async () => {
                  await skipHarvestReview({ conceptId });
                  await generate({
                    conceptId,
                    structureId: structureId || undefined,
                  });
                }, "Website content ignored. Generating from the brief...")
              }
              onRefresh={() =>
                runAction(
                  () => harvestWebsiteContent({ conceptId, refresh: true }),
                  "Re-scanning their website...",
                )
              }
            />
          ) : (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy || isWorking || harvestImagesInFlight}
                onClick={() =>
                  runAction(
                    () => harvestWebsiteContent({ conceptId, refresh: true }),
                    "Re-scanning their website...",
                  )
                }
              >
                Re-scan website
              </Button>
            </div>
          )}
        </div>
      ) : pane === "more" &&
        (concept.verifiedWebsiteUrl || concept.submittedWebsiteUrl) &&
        // Website is secondary: after the pack has been analyzed, or when there
        // is no pack material at all. Collecting/analyzing the pack first keeps
        // the card order honest and avoids spending Firecrawl while the primary
        // source is still mid-pass.
        (packItems.length === 0 ||
          concept.facebookPackState === "ready" ||
          concept.facebookPackState === "failed") ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="text-sm font-semibold">Fill gaps from website</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {harvestInFlight
              ? "Reading their website and reviewing what it says..."
              : "Optional. Fill missing services, about copy, or photos from their current site. One Firecrawl map plus up to six page reads, then automatic review. Facebook material wins where the two disagree."}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={isBusy || isWorking}
            onClick={() =>
              runAction(
                () => harvestWebsiteContent({ conceptId }),
                "Filling gaps from their website...",
              )
            }
          >
            {harvestInFlight ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {harvestInFlight ? "Reading website..." : "Fill gaps from website"}
          </Button>
        </div>
      ) : null}

      {/* --- Assets --- */}
      {pane === "more" ? (
      <>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="text-sm font-semibold">Manual images</h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Overrides for the Facebook Pack and website selections. Use when the
          owner sent better photos, or when the pack has none. Google photos are
          never used.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleFiles([file], "logo");
            }}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              await handleFiles(files, "photo");
            }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => logoInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {data.logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => photoInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Add photos
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isUploading}
            onPaste={(event) => handlePaste(event, "logo")}
            onClick={() => toast.info("Now press Command-V to paste the logo.")}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste logo
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isUploading}
            onPaste={(event) => handlePaste(event, "photo")}
            onClick={() =>
              toast.info("Now press Command-V to paste one or more photos.")
            }
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste photos
          </Button>
          {isUploading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
          For clipboard images, click the matching Paste button and press ⌘V.
          Screenshots and copied image files work; a copied image URL does not.
        </p>

        {data.logoUrl || data.photos.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {data.logoUrl ? (
              <AssetThumb
                url={data.logoUrl}
                label="Logo"
                onRemove={() =>
                  concept.logoStorageId
                    ? runAction(
                        () =>
                          removeAsset({
                            conceptId,
                            storageId: concept.logoStorageId!,
                          }),
                        "Logo removed.",
                      )
                    : undefined
                }
              />
            ) : null}
            {data.photos.map((photo) => (
              <AssetThumb
                key={photo.storageId}
                url={photo.url}
                label="Photo"
                onRemove={() =>
                  runAction(
                    () =>
                      removeAsset({ conceptId, storageId: photo.storageId }),
                    "Photo removed.",
                  )
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            No images yet. The generator will produce a typographic concept
            instead of inventing photography.
          </p>
        )}
      </div>

      {/* --- Brief editing --- */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <h3 className="px-4 py-3 text-sm font-semibold">Edit the brief</h3>
        <div className="space-y-3 border-t border-[var(--border)] p-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Business name</Label>
            <Input
              id="edit-name"
              value={draft.businessName}
              onChange={(event) =>
                setDraft({ ...draft, businessName: event.target.value })
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={draft.phone}
                onChange={(event) =>
                  setDraft({ ...draft, phone: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-area">Service area</Label>
              <Input
                id="edit-area"
                value={draft.serviceArea}
                onChange={(event) =>
                  setDraft({ ...draft, serviceArea: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-facebook">Facebook Page</Label>
              <Input
                id="edit-facebook"
                value={draft.facebookPageUrl}
                onChange={(event) =>
                  setDraft({ ...draft, facebookPageUrl: event.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-website">Existing website</Label>
              <Input
                id="edit-website"
                value={draft.submittedWebsiteUrl}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    submittedWebsiteUrl: event.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              rows={5}
              value={draft.notes}
              onChange={(event) =>
                setDraft({ ...draft, notes: event.target.value })
              }
            />
          </div>

          <QuotesEditor quotes={quotes} onChange={setQuotes} />

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={isBusy}
              onClick={() =>
                runAction(
                  () =>
                    updateConcept({
                      conceptId,
                      ...draft,
                      approvedQuotes: quotes.filter(
                        (quote) => quote.text.trim() && quote.author.trim(),
                      ),
                    }),
                  "Brief saved.",
                )
              }
            >
              Save brief
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() =>
                runAction(
                  () => reEnrich({ conceptId }),
                  "Re-running the Google lookup...",
                )
              }
            >
              Re-run enrichment
            </Button>
          </div>
        </div>
      </div>
      </>
      ) : null}

      {/* --- Review and publish --- */}
      {pane === "preview" && concept.generatedHtml ? (
        <div className="min-w-0 space-y-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4">
          <div>
            <h3 className="text-sm font-semibold">Review</h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {draftPassedValidation ? (
                <>
                  This draft passed the safety checks. Your job is the finished
                  page: does it look right, does it sound like them, and is it
                  something you would send? Publish is still your call.
                </>
              ) : (
                <>
                  This draft did not pass. It is shown so you can see what the
                  model produced — read the failure above before doing anything
                  with it. Do not publish it.
                </>
              )}
            </p>
          </div>

          <ConceptPreviewFrame
            html={concept.generatedHtml}
            businessName={concept.businessName}
          />

          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            <Button size="sm" variant="outline" asChild>
              {/* notrack keeps Layken's own checks out of the open count. */}
              <a
                href={`${previewUrl}?notrack=1`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open full page
              </a>
            </Button>
            {concept.status === "published" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyText(previewUrl, "Link copied.")}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* --- Delete --- */}
      {pane === "more" ? (
      <div className="rounded-xl border border-[var(--border)] p-4">
        <Button
          size="sm"
          variant="destructive"
          disabled={isBusy}
          onClick={() => {
            if (
              !window.confirm(
                `Delete the concept for ${concept.businessName}? This removes the page, its uploaded images, and public access to the link.`,
              )
            ) {
              return;
            }
            void runAction(async () => {
              await removeConcept({ conceptId });
              onDeleted();
            }, "Concept deleted.");
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete concept
        </Button>
      </div>
      ) : null}

      {pane === "preview" && concept.generatedHtml ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-[11px] text-[var(--muted-foreground)]">
          {concept.structureId ? (
            <>
              Shape:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {CONCEPT_STRUCTURES.find((s) => s.id === concept.structureId)
                  ?.name ?? concept.structureId}
              </span>
              {" · "}
            </>
          ) : null}
          {concept.model ? <>Model: {concept.model} · </> : null}
          {concept.promptVersion ? <>Prompt: {concept.promptVersion}</> : null}
          <span className="mt-1 block">
            {concept.viewCount} open{concept.viewCount === 1 ? "" : "s"}
            {concept.firstViewedAt
              ? ` · first ${formatDate(concept.firstViewedAt)}`
              : ""}
            {concept.sentAt ? ` · sent ${formatDate(concept.sentAt)}` : ""}
          </span>
        </div>
      ) : null}
      </div>

      <StickyWorkspaceBar
        status={concept.status}
        hasHtml={hasHtml}
        draftPassedValidation={draftPassedValidation}
        generationBlocked={generationBlocked}
        packNeedsAnalyze={
          packItems.length > 0 &&
          concept.facebookPackState !== "ready" &&
          concept.facebookPackState !== "analyzing"
        }
        isBusy={isBusy || isWorking || isUploading}
        onGenerate={() =>
          runAction(
            () =>
              generate({
                conceptId,
                structureId: structureId || undefined,
              }),
            "Generating...",
          )
        }
        onAnalyze={() =>
          runAction(
            () => analyzeFacebookPack({ conceptId }),
            "Sorting the pack...",
          )
        }
        onPublish={() => runAction(() => publish({ conceptId }), "Published.")}
        onCopyDraft={() =>
          copyText(
            buildMessengerDraft({
              businessName: concept.businessName,
              token: concept.token,
            }),
            "Messenger draft copied.",
          )
        }
      />
    </div>
  );
}

function NowPane({
  concept,
  previewUrl,
  draftPassedValidation,
  generationBlocked,
  packItemCount,
  isBusy,
  structureId,
  onStructureId,
  onOpenPack,
  onOpenPreview,
  onGenerate,
  onPublish,
  onUnpublish,
  onCopyLink,
  onCopyDraft,
  onToggleSent,
}: {
  concept: {
    status: string;
    generatedHtml?: string;
    sentAt?: number;
    viewCount: number;
    firstViewedAt?: number;
    lastViewedAt?: number;
    facebookPackState?: string;
  };
  previewUrl: string;
  draftPassedValidation: boolean;
  generationBlocked: string | null;
  packItemCount: number;
  isBusy: boolean;
  structureId: string;
  onStructureId: (value: string) => void;
  onOpenPack: () => void;
  onOpenPreview: () => void;
  onGenerate: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  onUnpublish: () => Promise<boolean>;
  onCopyLink: () => void;
  onCopyDraft: () => void;
  onToggleSent: () => Promise<boolean>;
}) {
  if (concept.status === "published") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="text-sm font-semibold">Send this concept</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {concept.viewCount === 0
              ? concept.sentAt
                ? "Marked sent, not opened yet. One follow-up, then stop."
                : "Published. Copy the Messenger draft and send it by hand."
              : `Opened ${concept.viewCount} time${concept.viewCount === 1 ? "" : "s"}.`}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-[var(--muted-foreground)]">First opened</dt>
              <dd className="font-medium">
                {formatDate(concept.firstViewedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Last opened</dt>
              <dd className="font-medium">{formatDate(concept.lastViewedAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="w-full" onClick={onCopyDraft}>
            <Copy className="h-3.5 w-3.5" />
            Messenger draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onCopyLink}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </Button>
          <Button size="sm" variant="outline" className="w-full" asChild>
            <a href={`${previewUrl}?notrack=1`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            disabled={isBusy}
            onClick={() => void onToggleSent()}
          >
            {concept.sentAt ? "Clear sent" : "Mark sent"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={onOpenPreview}
          >
            Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            disabled={isBusy}
            onClick={() => void onUnpublish()}
          >
            Unpublish
          </Button>
        </div>
      </div>
    );
  }

  if (concept.status === "review" && concept.generatedHtml) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="text-sm font-semibold">Ready to publish</h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {draftPassedValidation
            ? "Safety checks passed. Open Preview, then publish if you would send it."
            : "This draft did not pass. Read the failure above before publishing."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={isBusy || !draftPassedValidation}
            onClick={() => void onPublish()}
          >
            Publish
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenPreview}>
            Open preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <h3 className="text-sm font-semibold">
        {concept.generatedHtml ? "Generate again" : "Generate the page"}
      </h3>
      <ul className="mt-2 space-y-1 text-xs text-[var(--muted-foreground)]">
        <li>Google match confirmed</li>
        <li>
          {packItemCount === 0
            ? "No Facebook Pack yet — optional, but the page will be thinner."
            : concept.facebookPackState === "ready"
              ? `${packItemCount} pack item${packItemCount === 1 ? "" : "s"} sorted`
              : `${packItemCount} pack item${packItemCount === 1 ? "" : "s"} still need analysis`}
        </li>
      </ul>
      {packItemCount === 0 || concept.facebookPackState !== "ready" ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={onOpenPack}
        >
          Open Facebook Pack
        </Button>
      ) : null}
      <div className="mt-3 space-y-2">
        <Label htmlFor="structure-select">Page shape</Label>
        <select
          id="structure-select"
          value={structureId}
          onChange={(event) => onStructureId(event.target.value)}
          className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
        >
          <option value="">Pick automatically from the brief</option>
          {CONCEPT_STRUCTURES.map((structure) => (
            <option key={structure.id} value={structure.id}>
              {structure.name} — {structure.fitsWhen}
            </option>
          ))}
        </select>
        <Button
          className="w-full sm:w-auto"
          disabled={isBusy || generationBlocked !== null}
          onClick={() => void onGenerate()}
        >
          {concept.generatedHtml ? "Regenerate" : "Generate concept"}
        </Button>
        {generationBlocked ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            {generationBlocked}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StickyWorkspaceBar({
  status,
  hasHtml,
  draftPassedValidation,
  generationBlocked,
  packNeedsAnalyze,
  isBusy,
  onGenerate,
  onAnalyze,
  onPublish,
  onCopyDraft,
}: {
  status: string;
  hasHtml: boolean;
  draftPassedValidation: boolean;
  generationBlocked: string | null;
  packNeedsAnalyze: boolean;
  isBusy: boolean;
  onGenerate: () => Promise<boolean>;
  onAnalyze: () => Promise<boolean>;
  onPublish: () => Promise<boolean>;
  onCopyDraft: () => void;
}) {
  let action: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  } | null = null;

  if (status === "published") {
    action = { label: "Copy Messenger draft", onClick: onCopyDraft };
  } else if (status === "review" && hasHtml) {
    action = {
      label: "Publish",
      onClick: () => void onPublish(),
      disabled: !draftPassedValidation,
    };
  } else if (status === "matching" || status === "content_review") {
    action = null;
  } else if (
    status !== "enriching" &&
    status !== "harvesting" &&
    status !== "generating" &&
    generationBlocked === null
  ) {
    action = {
      label: hasHtml ? "Regenerate" : "Generate concept",
      onClick: () => void onGenerate(),
    };
  } else if (packNeedsAnalyze) {
    action = {
      label: "Analyze Facebook Pack",
      onClick: () => void onAnalyze(),
    };
  }

  if (!action) return null;

  return (
    <div className="flex-none border-t border-[var(--border)] bg-[var(--background)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <Button
        className="w-full"
        disabled={isBusy || action.disabled}
        onClick={action.onClick}
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {action.label}
      </Button>
    </div>
  );
}

function AssetThumb({
  url,
  label,
  onRemove,
}: {
  url: string;
  label: string;
  onRemove?: () => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]">
      {/*
        Unoptimized because these are Convex storage URLs on a host that is not
        in `next.config.ts` remotePatterns, and running a sales concept's photos
        through the image optimizer buys nothing — the generated page references
        the storage URL directly anyway.
      */}
      <Image
        src={url}
        alt={label}
        fill
        unoptimized
        sizes="120px"
        className="object-cover"
      />
      <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">
        {label}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Approved quotes are typed by hand or individually approved from the
 * business's own website harvest.
 *
 * Google review text is licensed to Google and written by customers who never
 * agreed to appear in a mock-up, so it cannot be lifted into a testimonial.
 * When this list is empty the validator rejects testimonial-shaped markup.
 */
function QuotesEditor({
  quotes,
  onChange,
}: {
  quotes: Array<{ author: string; text: string; rating?: number }>;
  onChange: (
    next: Array<{ author: string; text: string; rating?: number }>,
  ) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Approved quotes</Label>
      <p className="text-[11px] text-[var(--muted-foreground)]">
        Only use owner-supplied quotes or testimonials you individually approved
        from their own website. Leave this empty and the page will carry no
        testimonials.
      </p>

      {quotes.map((quote, index) => (
        <div
          key={index}
          className="space-y-2 rounded-lg border border-[var(--border)] p-2"
        >
          <Textarea
            rows={2}
            value={quote.text}
            placeholder="Quote text, exactly as supplied"
            onChange={(event) => {
              const next = [...quotes];
              next[index] = { ...quote, text: event.target.value };
              onChange(next);
            }}
          />
          <div className="flex gap-2">
            <Input
              value={quote.author}
              placeholder="Attribution"
              onChange={(event) => {
                const next = [...quotes];
                next[index] = { ...quote, author: event.target.value };
                onChange(next);
              }}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Remove quote"
              onClick={() => onChange(quotes.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange([...quotes, { author: "", text: "" }])}
      >
        Add a quote
      </Button>
    </div>
  );
}
