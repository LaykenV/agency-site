"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
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
import { CONCEPT_STRUCTURES } from "@/lib/concepts/prompt";
import {
  buildMessengerDraft,
  conceptPreviewUrl,
} from "@/lib/concepts/messengerDraft";
import { cn } from "@/lib/utils";

/**
 * The human review gate.
 *
 * The deterministic validator catches unsafe markup, hotlinked assets, invented
 * phone numbers and fabricated testimonials. It cannot check whether a claim is
 * true. Credentials, years in business, insurance, licences, service areas and
 * superlatives are checked here, by reading the page against the brief, before
 * anything is published. That is why the publish control sits beneath the
 * rendered concept rather than next to the generate button.
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
}: {
  conceptId: Id<"website_concepts">;
  onDeleted: () => void;
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

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[var(--border)] p-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (data === null || !concept) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-6 text-sm text-[var(--muted-foreground)]">
        This concept no longer exists.
      </div>
    );
  }

  const previewUrl = conceptPreviewUrl(concept.token);
  const isWorking =
    concept.status === "enriching" ||
    concept.status === "harvesting" ||
    concept.status === "generating";
  const needsMatch = isMatching;
  const harvestSourceUrl = concept.harvestSourceUrl;
  const harvestPending = concept.harvestReviewState === "pending";
  const harvestApproved = concept.harvestReviewState === "approved";
  const harvestInFlight = Boolean(concept.harvestRequestId);
  const sensitiveCount = (concept.harvestCandidates ?? []).filter(
    (candidate) => candidate.risk === "sensitive",
  ).length;

  const runAction = async (
    action: () => Promise<unknown>,
    success?: string,
  ) => {
    setIsBusy(true);
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something failed.");
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

  return (
    <div className="space-y-5">
      {/* --- Header --- */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {concept.businessName}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
              {concept.token}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              statusClass(concept.status),
            )}
          >
            {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {STATUS_LABELS[concept.status] ?? concept.status}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-[var(--muted-foreground)]">Opens</dt>
            <dd className="font-medium">{concept.viewCount}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted-foreground)]">First opened</dt>
            <dd className="font-medium">{formatDate(concept.firstViewedAt)}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted-foreground)]">Last opened</dt>
            <dd className="font-medium">{formatDate(concept.lastViewedAt)}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted-foreground)]">Marked sent</dt>
            <dd className="font-medium">{formatDate(concept.sentAt)}</dd>
          </div>
        </dl>

        {concept.generatedHtml && (concept.structureId || concept.model) ? (
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted-foreground)]">
            {concept.structureId ? (
              <>
                Shape:{" "}
                <span className="font-medium">
                  {CONCEPT_STRUCTURES.find((s) => s.id === concept.structureId)
                    ?.name ?? concept.structureId}
                </span>
                {" · "}
              </>
            ) : null}
            {concept.model ? <>Model: {concept.model} · </> : null}
            {concept.promptVersion ? (
              <>Prompt: {concept.promptVersion}</>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* --- Failures --- */}
      {concept.error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
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
      {needsMatch ? (
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

      {/* --- Harvested website content and factual approval --- */}
      {harvestSourceUrl || concept.harvestReviewState ? (
        <div
          className={cn(
            "rounded-xl border p-4",
            harvestPending
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-[var(--border)] bg-[var(--card)]",
          )}
        >
          <h3 className="text-sm font-semibold">Harvested website content</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {harvestApproved
              ? `${concept.approvedHarvestCandidateIds?.length ?? 0} source-backed item(s) are approved for the next generation.`
              : concept.harvestReviewState === "skipped"
                ? "This harvest is being ignored. Regeneration will use only your notes, verified phone, and uploaded assets."
                : "Found on their website. Review the actual content below, then regenerate with the approved subset."}
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[var(--muted-foreground)]">Pages read</dt>
              <dd className="font-medium">
                {concept.harvestedPages?.length ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Facts</dt>
              <dd className="font-medium">
                {concept.harvestCandidates?.length ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Needs care</dt>
              <dd className="font-medium">{sensitiveCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted-foreground)]">Images</dt>
              <dd className="font-medium">
                {concept.harvestImageCandidates?.length ?? 0}
              </dd>
            </div>
          </dl>

          <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
            “Needs care” is included in the facts total; it marks credentials,
            guarantees, prices, years, statistics, emergency claims, and
            testimonials that require individual approval.
          </p>
          {(concept.harvestImageCandidates?.length ?? 0) > 0 ? (
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              Harvested images are not imported yet. Use Upload or Paste below
              for any logo or photo you approve.
            </p>
          ) : null}

          {concept.harvestedPages?.length ? (
            <ul className="mt-3 space-y-1 text-xs">
              {concept.harvestedPages.map((page) => (
                <li key={page.url}>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--muted-foreground)] underline underline-offset-2"
                  >
                    {page.title ?? page.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          {concept.harvestWarnings?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-[var(--muted-foreground)]">
              {concept.harvestWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {harvestPending || harvestApproved ? (
            <ConceptHarvestReview
              candidates={concept.harvestCandidates ?? []}
              approvedCandidateIds={concept.approvedHarvestCandidateIds ?? []}
              reviewState={harvestApproved ? "approved" : "pending"}
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
                disabled={isBusy || isWorking}
                onClick={() =>
                  runAction(
                    () =>
                      generate({
                        conceptId,
                        structureId: structureId || undefined,
                      }),
                    "Generating from your notes and uploads...",
                  )
                }
              >
                {concept.generatedHtml
                  ? "Regenerate without harvest"
                  : "Generate without harvest"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy || isWorking}
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
      ) : concept.verifiedWebsiteUrl || concept.submittedWebsiteUrl ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="text-sm font-semibold">Harvested website content</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {harvestInFlight
              ? "Reading and normalizing their website now..."
              : "Read their current site for services, about copy, and images instead of retyping it. Costs one Firecrawl map plus up to six page reads."}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={isBusy || isWorking}
            onClick={() =>
              runAction(
                () => harvestWebsiteContent({ conceptId }),
                "Reading their website...",
              )
            }
          >
            {harvestInFlight ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {harvestInFlight ? "Harvesting..." : "Harvest website content"}
          </Button>
        </div>
      ) : null}

      {/* --- Assets --- */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="text-sm font-semibold">Approved images</h3>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Only these reach the page. Google photos are research signals and are
          never used. If the Facebook Page has the only good photos, upload them
          here or ask the owner to send a few favourites.
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
      <details className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Edit the brief
        </summary>
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
      </details>

      {/* --- Generation --- */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="text-sm font-semibold">Generate</h3>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="structure-select">Page shape</Label>
            <select
              id="structure-select"
              value={structureId}
              onChange={(event) => setStructureId(event.target.value)}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
            >
              <option value="">Pick automatically from the brief</option>
              {CONCEPT_STRUCTURES.map((structure) => (
                <option key={structure.id} value={structure.id}>
                  {structure.name} — {structure.fitsWhen}
                </option>
              ))}
            </select>
          </div>
          <Button
            disabled={
              isBusy ||
              isWorking ||
              harvestPending ||
              harvestInFlight ||
              !concept.researchBrief
            }
            onClick={() =>
              runAction(
                () =>
                  generate({
                    conceptId,
                    structureId: structureId || undefined,
                  }),
                "Generating...",
              )
            }
          >
            {concept.generatedHtml ? "Regenerate" : "Generate concept"}
          </Button>
          {!concept.researchBrief ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Waiting on enrichment. Confirm the Google match first.
            </p>
          ) : null}
        </div>
      </div>

      {/* --- Review and publish --- */}
      {concept.generatedHtml ? (
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div>
            <h3 className="text-sm font-semibold">Review</h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Read every factual claim against the brief before publishing:
              credentials, licences, insurance, years in business, service areas
              and any superlative. The automatic checks cannot tell whether a
              claim is true.
            </p>
          </div>

          <ConceptPreviewFrame
            html={concept.generatedHtml}
            businessName={concept.businessName}
          />

          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            {concept.status === "published" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() =>
                  runAction(
                    () => unpublish({ conceptId }),
                    "Unpublished. The link now returns not found.",
                  )
                }
              >
                Unpublish
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isBusy}
                onClick={() =>
                  runAction(() => publish({ conceptId }), "Published.")
                }
              >
                Publish
              </Button>
            )}

            {concept.status === "published" ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(previewUrl, "Link copied.")}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyText(
                      buildMessengerDraft({
                        businessName: concept.businessName,
                        token: concept.token,
                      }),
                      "Messenger draft copied.",
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Messenger draft
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  {/* notrack keeps Layken's own checks out of the open count. */}
                  <a
                    href={`${previewUrl}?notrack=1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() =>
                    runAction(
                      () => markSent({ conceptId, sent: !concept.sentAt }),
                      concept.sentAt ? "Cleared." : "Marked as sent.",
                    )
                  }
                >
                  {concept.sentAt ? "Clear sent" : "Mark sent"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* --- Delete --- */}
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
