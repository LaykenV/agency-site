import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { requireAdmin } from "../adminGuard";
import { validateConceptHtml } from "../../lib/concepts/validateConceptHtml";
import {
  generationBlockedReason,
  statusAfterGenerationInputChange,
} from "../../lib/concepts/lifecycle";
import {
  buildApprovedHarvestSelection,
  isHarvestCandidateApprovable,
} from "../../lib/concepts/harvest";
import {
  PACK_IMAGE_MAX_BYTES,
  isSupportedPackImageType,
  normalizePackNote,
  normalizePackText,
  packAddBlockedReason,
  packItemId,
  packTextHash,
  type PackItem,
} from "../../lib/concepts/facebookPack";
import {
  conceptApprovedQuoteValidator,
  conceptStatusValidator,
  websiteConceptDocValidator,
  websiteConceptSummaryValidator,
} from "../validators";

/**
 * Admin surface for the website-concept generator.
 *
 * Every function here requires admin authentication; mutations that change what
 * a prospect can see append to `activity_log`.
 */

/**
 * 16 random bytes rendered in Crockford-style base32.
 *
 * 128 bits, so the token is not enumerable — it is the only thing protecting
 * `/preview/<token>` from being guessed. Base32 over hex or a UUID because the
 * result has no hyphens and survives being pasted into Messenger, read aloud,
 * or line-wrapped by a chat client.
 */
const BASE32_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

function generateConceptToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let token = "";
  for (const byte of bytes) {
    token += BASE32_ALPHABET[byte >> 4];
    token += BASE32_ALPHABET[byte & 0x0f];
  }
  return token;
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

function toSummary(concept: Doc<"website_concepts">) {
  return {
    _id: concept._id,
    _creationTime: concept._creationTime,
    token: concept.token,
    businessName: concept.businessName,
    facebookPageUrl: concept.facebookPageUrl,
    status: concept.status,
    structureId: concept.structureId,
    hasGeneratedHtml: Boolean(concept.generatedHtml),
    validationViolations: concept.validationViolations,
    placeMatchResolved: concept.placeMatchResolved,
    matchedGooglePlaceId: concept.matchedGooglePlaceId,
    harvestReviewState: concept.harvestReviewState,
    harvestCandidateCount:
      (concept.harvestCandidates?.length ?? 0) +
      (concept.harvestImageCandidates?.length ?? 0),
    facebookPackState: concept.facebookPackState,
    facebookPackItemCount: concept.facebookPackItems?.length ?? 0,
    facebookApprovedFactCount: (
      concept.facebookEvidence?.decisions ?? []
    ).filter((decision) => decision.decision === "approved").length,
    assetCount:
      concept.assetStorageIds.length + (concept.logoStorageId ? 1 : 0),
    model: concept.model,
    promptVersion: concept.promptVersion,
    error: concept.error,
    sentAt: concept.sentAt,
    firstViewedAt: concept.firstViewedAt,
    lastViewedAt: concept.lastViewedAt,
    viewCount: concept.viewCount,
    createdAt: concept.createdAt,
    updatedAt: concept.updatedAt,
    publishedAt: concept.publishedAt,
  };
}

async function loadConcept(
  ctx: MutationCtx,
  conceptId: Id<"website_concepts">,
) {
  const concept = await ctx.db.get(conceptId);
  if (!concept) throw new Error("Concept not found");
  return concept;
}

async function logConceptActivity(
  ctx: MutationCtx,
  kind: string,
  payload: Record<string, unknown>,
) {
  await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
    actor: "admin",
    kind,
    payload,
  });
}

/** Remove staged and approved website files when their source stops applying. */
async function deleteWebsiteHarvestAssets(
  ctx: MutationCtx,
  concept: Doc<"website_concepts">,
) {
  const importedIds = new Set(
    (concept.importedWebsiteAssets ?? []).map((asset) => asset.storageId),
  );
  const storageIds = new Set([
    ...importedIds,
    ...(concept.harvestImageCandidates ?? [])
      .map((candidate) => candidate.previewStorageId)
      .filter((id): id is Id<"_storage"> => id !== undefined),
  ]);
  for (const storageId of storageIds) {
    try {
      await ctx.storage.delete(storageId);
    } catch (error) {
      console.warn("[concepts] website image cleanup failed", {
        storageId,
        error,
      });
    }
  }
  return {
    logoStorageId:
      concept.logoStorageId && importedIds.has(concept.logoStorageId)
        ? undefined
        : concept.logoStorageId,
    assetStorageIds: concept.assetStorageIds.filter(
      (storageId) => !importedIds.has(storageId),
    ),
    importedWebsiteAssets: undefined,
  } as const;
}

/**
 * Create a concept from manual intake and start enrichment.
 *
 * Only `businessName` is structurally required. The Facebook Page URL is where
 * these leads come from and the form asks for it, but a referral that arrives by
 * text message is still a lead worth building for, so it is not enforced here.
 */
export const create = mutation({
  args: {
    businessName: v.string(),
    facebookPageUrl: v.optional(v.string()),
    submittedWebsiteUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    serviceArea: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("website_concepts"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const businessName = args.businessName.trim();
    if (!businessName) {
      throw new Error("Business name is required.");
    }

    const now = Date.now();
    const conceptId = await ctx.db.insert("website_concepts", {
      token: generateConceptToken(),
      businessName,
      facebookPageUrl: trimmed(args.facebookPageUrl),
      submittedWebsiteUrl: trimmed(args.submittedWebsiteUrl),
      phone: trimmed(args.phone),
      serviceArea: trimmed(args.serviceArea),
      notes: trimmed(args.notes),
      placeMatchResolved: false,
      assetStorageIds: [],
      approvedQuotes: [],
      status: "enriching",
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await logConceptActivity(ctx, "concept.created", {
      conceptId,
      businessName,
      facebookPageUrl: trimmed(args.facebookPageUrl),
    });

    await ctx.scheduler.runAfter(0, internal.concepts.enrich.runPlacesMatch, {
      conceptId,
    });

    return conceptId;
  },
});

/** Edit intake fields. Does not re-run enrichment; use `reEnrich` for that. */
export const update = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    businessName: v.optional(v.string()),
    facebookPageUrl: v.optional(v.string()),
    submittedWebsiteUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    serviceArea: v.optional(v.string()),
    notes: v.optional(v.string()),
    approvedQuotes: v.optional(v.array(conceptApprovedQuoteValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    const businessName = args.businessName?.trim();
    if (args.businessName !== undefined && !businessName) {
      throw new Error("Business name cannot be empty.");
    }

    const next = {
      businessName: businessName ?? concept.businessName,
      facebookPageUrl:
        args.facebookPageUrl === undefined
          ? concept.facebookPageUrl
          : trimmed(args.facebookPageUrl),
      submittedWebsiteUrl:
        args.submittedWebsiteUrl === undefined
          ? concept.submittedWebsiteUrl
          : trimmed(args.submittedWebsiteUrl),
      phone: args.phone === undefined ? concept.phone : trimmed(args.phone),
      serviceArea:
        args.serviceArea === undefined
          ? concept.serviceArea
          : trimmed(args.serviceArea),
      notes: args.notes === undefined ? concept.notes : trimmed(args.notes),
      approvedQuotes: args.approvedQuotes ?? concept.approvedQuotes,
    };

    const changed =
      next.businessName !== concept.businessName ||
      next.facebookPageUrl !== concept.facebookPageUrl ||
      next.submittedWebsiteUrl !== concept.submittedWebsiteUrl ||
      next.phone !== concept.phone ||
      next.serviceArea !== concept.serviceArea ||
      next.notes !== concept.notes ||
      JSON.stringify(next.approvedQuotes) !==
        JSON.stringify(concept.approvedQuotes);

    if (!changed) return null;

    const identityOrSiteChanged =
      next.businessName !== concept.businessName ||
      next.submittedWebsiteUrl !== concept.submittedWebsiteUrl;
    const clearedWebsiteAssets = identityOrSiteChanged
      ? await deleteWebsiteHarvestAssets(ctx, concept)
      : undefined;

    await ctx.db.patch(args.conceptId, {
      ...next,
      approvedQuotes: identityOrSiteChanged
        ? next.approvedQuotes.filter((quote) => quote.sourceKind !== "website")
        : next.approvedQuotes,
      // Any generation input change revokes the old artifact immediately. A
      // removed quote or replaced logo must not remain live until somebody
      // happens to regenerate.
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      generationFailure: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: identityOrSiteChanged
        ? "draft"
        : statusAfterGenerationInputChange({
            placeMatchResolved: concept.placeMatchResolved,
            currentStatus: concept.status,
            harvestReviewState: concept.harvestReviewState,
            harvestInFlight: Boolean(concept.harvestRequestId),
          }),
      // Name or website changes invalidate machine research as well as the
      // rendered page. Re-enrichment is required before generation resumes.
      researchBrief: identityOrSiteChanged ? undefined : concept.researchBrief,
      matchedGooglePlaceId:
        next.businessName !== concept.businessName
          ? undefined
          : concept.matchedGooglePlaceId,
      // Deprecated Places content: cleared on any edit, never rewritten.
      matchedGoogleMapsUrl: undefined,
      placeCandidates: undefined,
      placeMatchResolved:
        next.businessName !== concept.businessName
          ? false
          : concept.placeMatchResolved,
      verifiedWebsiteUrl: identityOrSiteChanged
        ? undefined
        : concept.verifiedWebsiteUrl,
      // A different business or a different website means the harvested
      // candidates describe something else. Keeping them would offer Layken
      // another company's services to approve.
      ...(identityOrSiteChanged ? clearedHarvest() : {}),
      ...(clearedWebsiteAssets ?? {}),
      error: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/** Every harvest field, blanked. Used wherever the source stops applying. */
function clearedHarvest() {
  return {
    harvestRequestId: undefined,
    harvestedAt: undefined,
    harvestSourceUrl: undefined,
    harvestedPages: undefined,
    harvestCandidates: undefined,
    harvestImageCandidates: undefined,
    harvestImageAnalysisState: undefined,
    harvestImageAnalysisError: undefined,
    harvestWarnings: undefined,
    harvestReviewState: undefined,
    harvestReviewedAt: undefined,
    approvedHarvestCandidateIds: undefined,
    approvedWebsiteContent: undefined,
    importedWebsiteAssets: undefined,
  } as const;
}

/**
 * Upload URL for concept assets.
 *
 * Separate from `files.generateUploadUrl`, which admits any authenticated user
 * because it serves the client portal. Concept assets are an admin-only surface.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachAsset = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("logo"), v.literal("photo")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    const now = Date.now();

    if (args.kind === "logo") {
      let harvestImageCandidates = concept.harvestImageCandidates;
      let importedWebsiteAssets = concept.importedWebsiteAssets;
      if (concept.logoStorageId && concept.logoStorageId !== args.storageId) {
        const stagedIndex = (harvestImageCandidates ?? []).findIndex(
          (candidate) => candidate.previewStorageId === concept.logoStorageId,
        );
        if (stagedIndex >= 0 && harvestImageCandidates) {
          harvestImageCandidates = [...harvestImageCandidates];
          harvestImageCandidates[stagedIndex] = {
            ...harvestImageCandidates[stagedIndex],
            approvedKind: undefined,
          };
        } else {
          await ctx.storage.delete(concept.logoStorageId);
        }
        importedWebsiteAssets = (importedWebsiteAssets ?? []).filter(
          (asset) => asset.storageId !== concept.logoStorageId,
        );
      }
      await ctx.db.patch(args.conceptId, {
        logoStorageId: args.storageId,
        harvestImageCandidates,
        importedWebsiteAssets,
        generatedHtml: undefined,
        structureId: undefined,
        validationViolations: undefined,
        generationFailure: undefined,
        model: undefined,
        promptVersion: undefined,
        generationRequestId: undefined,
        publishedAt: undefined,
        status: concept.harvestRequestId
          ? "harvesting"
          : concept.harvestReviewState === "pending"
            ? "content_review"
            : concept.placeMatchResolved
              ? "draft"
              : concept.status,
        updatedAt: now,
      });
      return null;
    }

    if (concept.assetStorageIds.includes(args.storageId)) return null;

    await ctx.db.patch(args.conceptId, {
      assetStorageIds: [...concept.assetStorageIds, args.storageId],
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      generationFailure: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: concept.harvestRequestId
        ? "harvesting"
        : concept.harvestReviewState === "pending"
          ? "content_review"
          : concept.placeMatchResolved
            ? "draft"
            : concept.status,
      updatedAt: now,
    });
    return null;
  },
});

export const removeAsset = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    const isLogo = concept.logoStorageId === args.storageId;
    const isPhoto = concept.assetStorageIds.includes(args.storageId);
    if (!isLogo && !isPhoto) {
      throw new Error("Asset does not belong to this concept.");
    }

    const harvestImageCandidates = concept.harvestImageCandidates?.map(
      (candidate) =>
        candidate.previewStorageId === args.storageId
          ? {
              ...candidate,
              previewStorageId: undefined,
              stageStatus: "rejected" as const,
              approvedKind: undefined,
            }
          : candidate,
    );

    await ctx.db.patch(args.conceptId, {
      logoStorageId: isLogo ? undefined : concept.logoStorageId,
      assetStorageIds: concept.assetStorageIds.filter(
        (storageId) => storageId !== args.storageId,
      ),
      harvestImageCandidates,
      importedWebsiteAssets: (concept.importedWebsiteAssets ?? []).filter(
        (asset) => asset.storageId !== args.storageId,
      ),
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      generationFailure: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: concept.harvestRequestId
        ? "harvesting"
        : concept.harvestReviewState === "pending"
          ? "content_review"
          : concept.placeMatchResolved
            ? "draft"
            : concept.status,
      updatedAt: Date.now(),
    });

    await ctx.storage.delete(args.storageId);
    return null;
  },
});

/**
 * Confirming a Google match lives in `concepts/enrich.confirmPlaceMatch`.
 *
 * It has to be an action: candidates are no longer stored, so the place ID
 * arriving from the browser is verified against a live Places lookup before
 * anything is written.
 */

/** Re-run the Places lookup from scratch, e.g. after correcting the name. */
export const reEnrich = mutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    const clearedWebsiteAssets = await deleteWebsiteHarvestAssets(ctx, concept);

    await ctx.db.patch(args.conceptId, {
      placeMatchResolved: false,
      matchedGooglePlaceId: undefined,
      matchedGoogleMapsUrl: undefined,
      placeCandidates: undefined,
      verifiedWebsiteUrl: undefined,
      ...clearedHarvest(),
      ...clearedWebsiteAssets,
      approvedQuotes: concept.approvedQuotes.filter(
        (quote) => quote.sourceKind !== "website",
      ),
      researchBrief: undefined,
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      generationFailure: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: "enriching",
      error: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.concepts.enrich.runPlacesMatch, {
      conceptId: args.conceptId,
    });

    return null;
  },
});

// --- Facebook Pack ---------------------------------------------------------

/**
 * Adding or removing pack material resets the analysis and the page built from
 * it.
 *
 * Clearing `facebookPackRequestId` is what makes it safe: an analysis already
 * running against the previous batch can no longer save, so a classification
 * can never describe a set of items the model was not shown.
 *
 * The compiled evidence goes with it. Pack material is now the primary source
 * behind the generation prompt, so a draft built from the previous pack is
 * stale as soon as the pack changes — and a published page would still be
 * showing a prospect claims that are no longer supported. Re-analysis and
 * regeneration are both one tap, which is the right price for not leaving an
 * unsupported page live.
 */
function packChanged(
  concept: Doc<"website_concepts">,
  items: Array<PackItem<Id<"_storage">>>,
) {
  return {
    facebookPackItems: items.length > 0 ? items : undefined,
    facebookPackRequestId: undefined,
    facebookPackState: items.length > 0 ? ("collecting" as const) : undefined,
    facebookPackAnalyzedAt: undefined,
    facebookPackModel: undefined,
    facebookPackPromptVersion: undefined,
    facebookPackError: undefined,
    facebookEvidence: undefined,
    approvedFacebookContent: undefined,
    facebookReviewModel: undefined,
    facebookReviewPromptVersion: undefined,
    facebookReviewError: undefined,
    approvedQuotes: concept.approvedQuotes.filter(
      (quote) => quote.sourceKind !== "facebook",
    ),
    generatedHtml: undefined,
    structureId: undefined,
    validationViolations: undefined,
    generationFailure: undefined,
    model: undefined,
    promptVersion: undefined,
    generationRequestId: undefined,
    publishedAt: undefined,
    status: statusAfterGenerationInputChange({
      placeMatchResolved: concept.placeMatchResolved,
      currentStatus: concept.status,
      harvestReviewState: concept.harvestReviewState,
      harvestInFlight: Boolean(concept.harvestRequestId),
    }),
    error: undefined,
    updatedAt: Date.now(),
  };
}

/**
 * Attach one pasted or uploaded image to the pack.
 *
 * The browser uploads straight to Convex storage and hands back a storage ID,
 * so the declared type and size are checked here against the file Convex
 * actually stored rather than against whatever the client claimed. Convex's own
 * SHA-256 comes from the same record, which is what makes duplicate detection
 * server-side truth instead of a client courtesy.
 *
 * A rejected upload is deleted before the error is thrown. Leaving the file
 * behind would accumulate orphans that nothing owns and nothing cleans up.
 */
export const addPackImage = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    storageId: v.id("_storage"),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    const items = concept.facebookPackItems ?? [];

    const reject = async (message: string): Promise<never> => {
      try {
        await ctx.storage.delete(args.storageId);
      } catch (error) {
        console.warn("[concepts] rejected pack upload cleanup failed", {
          storageId: args.storageId,
          error,
        });
      }
      throw new Error(message);
    };

    const blocked = packAddBlockedReason({ items, adding: "image" });
    if (blocked) await reject(blocked);

    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) throw new Error("That upload is no longer available.");

    if (!isSupportedPackImageType(metadata.contentType ?? undefined)) {
      await reject("Facebook Pack images must be JPEG, PNG, or WebP.");
    }
    if (metadata.size > PACK_IMAGE_MAX_BYTES) {
      await reject(
        `That image is ${Math.round(metadata.size / (1024 * 1024))} MB, over the ${Math.round(
          PACK_IMAGE_MAX_BYTES / (1024 * 1024),
        )} MB limit.`,
      );
    }
    if (items.some((item) => item.contentHash === metadata.sha256)) {
      await reject("That exact image is already in this pack.");
    }

    const item: PackItem<Id<"_storage">> = {
      id: packItemId({ kind: "image", contentHash: metadata.sha256 }),
      kind: "image",
      storageId: args.storageId,
      contentHash: metadata.sha256,
      contentType: metadata.contentType ?? undefined,
      sizeBytes: metadata.size,
      note: normalizePackNote(args.note),
      capturedAt: Date.now(),
    };

    await ctx.db.patch(args.conceptId, packChanged(concept, [...items, item]));
    return null;
  },
});

/** Attach one block of text copied from the Page. */
export const addPackText = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    text: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    const items = concept.facebookPackItems ?? [];

    const blocked = packAddBlockedReason({ items, adding: "text" });
    if (blocked) throw new Error(blocked);

    const text = normalizePackText(args.text);
    if (!text) throw new Error("Paste some text before adding it to the pack.");

    const contentHash = packTextHash(text);
    if (items.some((item) => item.contentHash === contentHash)) {
      throw new Error("That exact text is already in this pack.");
    }

    const item: PackItem<Id<"_storage">> = {
      id: packItemId({ kind: "text", contentHash }),
      kind: "text",
      contentHash,
      text,
      sizeBytes: text.length,
      note: normalizePackNote(args.note),
      capturedAt: Date.now(),
    };

    await ctx.db.patch(args.conceptId, packChanged(concept, [...items, item]));
    return null;
  },
});

/** Remove one item and its file. The correction path for a bad paste. */
export const removePackItem = mutation({
  args: { conceptId: v.id("website_concepts"), itemId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    const items = concept.facebookPackItems ?? [];

    const item = items.find((candidate) => candidate.id === args.itemId);
    if (!item) throw new Error("That pack item no longer exists.");

    await ctx.db.patch(
      args.conceptId,
      packChanged(
        concept,
        items.filter((candidate) => candidate.id !== args.itemId),
      ),
    );

    if (item.storageId) {
      try {
        await ctx.storage.delete(item.storageId);
      } catch (error) {
        console.warn("[concepts] pack item cleanup failed", {
          storageId: item.storageId,
          error,
        });
      }
    }
    return null;
  },
});

/** Send the collected pack to the classification model. */
export const analyzeFacebookPack = mutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await loadConcept(ctx, args.conceptId);

    await ctx.runMutation(
      internal.concepts.internal.queueFacebookPackAnalysis,
      { conceptId: args.conceptId },
    );
    return null;
  },
});

/**
 * Fill gaps from the business's own website.
 *
 * Explicit rather than automatic. Matching and baseline research stop at Draft;
 * the admin decides whether this site is worth scanning after the Facebook Pack
 * has been analyzed. Harvested candidates go through the same Luna reviewer the
 * pack uses — there is no checkbox queue for new work.
 *
 * `refresh` bypasses Firecrawl's cache — the case where the owner has just
 * updated their site during the conversation.
 */
export const harvestWebsiteContent = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    refresh: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await loadConcept(ctx, args.conceptId);

    await ctx.runMutation(internal.concepts.internal.queueHarvest, {
      conceptId: args.conceptId,
      bypassCache: args.refresh ?? false,
    });
    return null;
  },
});

/** Stage source-observed image candidates without exposing remote URLs to the browser. */
export const stageHarvestImages = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    candidateId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    if (!concept.harvestedAt || !concept.harvestSourceUrl) {
      throw new Error("This concept has no active website image harvest.");
    }

    let queued = false;
    const candidates = (concept.harvestImageCandidates ?? []).map(
      (candidate) => {
        const targeted =
          args.candidateId === undefined || candidate.id === args.candidateId;
        if (
          !targeted ||
          candidate.previewStorageId ||
          candidate.stageStatus === "rejected"
        ) {
          return candidate;
        }
        queued = true;
        return {
          ...candidate,
          stageStatus: "staging" as const,
          importError: undefined,
        };
      },
    );

    if (!queued) return null;
    await ctx.db.patch(args.conceptId, {
      harvestImageCandidates: candidates,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.concepts.imageImport.stageHarvestImages,
      {
        conceptId: args.conceptId,
        expectedHarvestedAt: concept.harvestedAt,
      },
    );
    return null;
  },
});

/** Attach one staged website image to the generation allowlist. */
export const approveHarvestImage = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    candidateId: v.string(),
    kind: v.union(v.literal("logo"), v.literal("photo")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    const candidates = [...(concept.harvestImageCandidates ?? [])];
    const index = candidates.findIndex(
      (candidate) => candidate.id === args.candidateId,
    );
    const candidate = index >= 0 ? candidates[index] : undefined;
    if (!candidate?.previewStorageId || candidate.stageStatus !== "ready") {
      throw new Error("That website image is not ready to use.");
    }

    const storageId = candidate.previewStorageId;
    let logoStorageId = concept.logoStorageId;
    let assetStorageIds = concept.assetStorageIds.filter(
      (id) => id !== storageId,
    );
    if (logoStorageId === storageId) logoStorageId = undefined;

    let importedWebsiteAssets = (concept.importedWebsiteAssets ?? []).filter(
      (asset) => asset.candidateId !== candidate.id,
    );

    if (args.kind === "logo") {
      const replacedLogo = logoStorageId;
      logoStorageId = storageId;
      if (replacedLogo && replacedLogo !== storageId) {
        importedWebsiteAssets = importedWebsiteAssets.filter(
          (asset) => asset.storageId !== replacedLogo,
        );
        const replacedCandidateIndex = candidates.findIndex(
          (item) => item.previewStorageId === replacedLogo,
        );
        if (replacedCandidateIndex >= 0) {
          candidates[replacedCandidateIndex] = {
            ...candidates[replacedCandidateIndex],
            approvedKind: undefined,
          };
        } else if (!assetStorageIds.includes(replacedLogo)) {
          await ctx.storage.delete(replacedLogo);
        }
      }
    } else {
      assetStorageIds = [...assetStorageIds, storageId];
    }

    candidates[index] = { ...candidate, approvedKind: args.kind };
    importedWebsiteAssets.push({
      candidateId: candidate.id,
      storageId,
      kind: args.kind,
      sourceUrl: candidate.sourceUrl,
      importedAt: Date.now(),
    });

    await ctx.db.patch(args.conceptId, {
      logoStorageId,
      assetStorageIds,
      importedWebsiteAssets,
      harvestImageCandidates: candidates,
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      generationFailure: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: statusAfterGenerationInputChange({
        placeMatchResolved: concept.placeMatchResolved,
        currentStatus: concept.status,
        harvestReviewState: concept.harvestReviewState,
        harvestInFlight: Boolean(concept.harvestRequestId),
      }),
      error: undefined,
      updatedAt: Date.now(),
    });

    await logConceptActivity(ctx, "concept.website_asset_imported", {
      conceptId: args.conceptId,
      businessName: concept.businessName,
      candidateId: candidate.id,
      kind: args.kind,
      sourceHost: new URL(candidate.sourceUrl).hostname,
    });
    return null;
  },
});

/** Reject a staged candidate, removing its file and any prior attachment. */
export const rejectHarvestImage = mutation({
  args: { conceptId: v.id("website_concepts"), candidateId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);
    const candidates = [...(concept.harvestImageCandidates ?? [])];
    const index = candidates.findIndex(
      (candidate) => candidate.id === args.candidateId,
    );
    if (index < 0) throw new Error("Website image candidate not found.");

    const candidate = candidates[index];
    const storageId = candidate.previewStorageId;
    const wasApproved = Boolean(candidate.approvedKind);
    candidates[index] = {
      ...candidate,
      previewStorageId: undefined,
      stageStatus: "rejected",
      importError: undefined,
      approvedKind: undefined,
    };

    const patch = {
      harvestImageCandidates: candidates,
      logoStorageId:
        storageId && concept.logoStorageId === storageId
          ? undefined
          : concept.logoStorageId,
      assetStorageIds: storageId
        ? concept.assetStorageIds.filter((id) => id !== storageId)
        : concept.assetStorageIds,
      importedWebsiteAssets: (concept.importedWebsiteAssets ?? []).filter(
        (asset) => asset.candidateId !== candidate.id,
      ),
      ...(wasApproved
        ? {
            generatedHtml: undefined,
            structureId: undefined,
            validationViolations: undefined,
            generationFailure: undefined,
            model: undefined,
            promptVersion: undefined,
            generationRequestId: undefined,
            publishedAt: undefined,
            status: statusAfterGenerationInputChange({
              placeMatchResolved: concept.placeMatchResolved,
              currentStatus: concept.status,
              harvestReviewState: concept.harvestReviewState,
              harvestInFlight: Boolean(concept.harvestRequestId),
            }),
          }
        : {}),
      error: undefined,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(args.conceptId, patch);
    if (storageId) await ctx.storage.delete(storageId);
    return null;
  },
});

/**
 * Resolve the content-review gate without approving anything.
 *
 * The harvest is often simply irrelevant — a placeholder site, a page about a
 * different business, an extraction that found nothing worth using. Skipping is
 * a recorded decision rather than a silent one, so a concept generated without
 * website content shows that it was a choice.
 *
 * The sibling approval mutation is the other way out: it materializes the
 * selected source-backed subset before generation.
 */
export const skipHarvestReview = mutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    if (
      concept.harvestReviewState !== "pending" &&
      concept.harvestReviewState !== "approved"
    ) {
      throw new Error("This concept has no harvest waiting for review.");
    }

    await ctx.db.patch(args.conceptId, {
      harvestReviewState: "skipped",
      harvestReviewedAt: Date.now(),
      approvedHarvestCandidateIds: undefined,
      approvedWebsiteContent: undefined,
      approvedQuotes: concept.approvedQuotes.filter(
        (quote) => quote.sourceKind !== "website",
      ),
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      generationFailure: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: concept.placeMatchResolved ? "draft" : concept.status,
      error: undefined,
      updatedAt: Date.now(),
    });

    await logConceptActivity(ctx, "concept.harvest_skipped", {
      conceptId: args.conceptId,
      businessName: concept.businessName,
      candidateCount: concept.harvestCandidates?.length ?? 0,
      imageCandidateCount: concept.harvestImageCandidates?.length ?? 0,
    });

    return null;
  },
});

/**
 * Resolve the review gate with an explicit source-backed subset.
 *
 * Standard facts may be selected in bulk by the UI; sensitive claims and
 * testimonials still arrive as individual IDs. The server rebuilds the
 * approved object from the current snapshot so a crafted client cannot inject
 * text that Firecrawl never returned.
 */
export const approveHarvestReview = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    approvedCandidateIds: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    if (
      concept.harvestReviewState !== "pending" &&
      concept.harvestReviewState !== "approved"
    ) {
      throw new Error("This concept has no harvested content to approve.");
    }

    const candidates = concept.harvestCandidates ?? [];
    const byId = new Map(
      candidates.map((candidate) => [candidate.id, candidate]),
    );
    const uniqueIds = [...new Set(args.approvedCandidateIds)];
    if (uniqueIds.length > candidates.length) {
      throw new Error("Too many harvested content selections.");
    }
    for (const id of uniqueIds) {
      const candidate = byId.get(id);
      if (!candidate) {
        throw new Error(
          "A selected fact is no longer part of this harvest. Refresh the review.",
        );
      }
      if (!isHarvestCandidateApprovable(candidate)) {
        throw new Error(
          candidate.kind === "phone"
            ? "Change the concept phone in the brief instead of approving a harvested phone."
            : "A testimonial needs visible attribution before it can be approved.",
        );
      }
    }

    const selection = buildApprovedHarvestSelection({
      candidates,
      selectedIds: uniqueIds,
    });
    const manualQuotes = concept.approvedQuotes.filter(
      (quote) => quote.sourceKind !== "website",
    );
    const now = Date.now();

    await ctx.db.patch(args.conceptId, {
      approvedHarvestCandidateIds: selection.candidateIds,
      approvedWebsiteContent: selection.content,
      approvedQuotes: [...manualQuotes, ...selection.websiteQuotes],
      harvestReviewState: "approved",
      harvestReviewedAt: now,
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      generationFailure: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: concept.placeMatchResolved ? "draft" : concept.status,
      error: undefined,
      updatedAt: now,
    });

    await logConceptActivity(ctx, "concept.harvest_reviewed", {
      conceptId: args.conceptId,
      businessName: concept.businessName,
      approvedCount: selection.candidateIds.length,
      sensitiveCount: candidates.filter(
        (candidate) =>
          selection.candidateIds.includes(candidate.id) &&
          candidate.risk === "sensitive",
      ).length,
      quoteCount: selection.websiteQuotes.length,
    });

    return null;
  },
});

/**
 * Generate or regenerate the concept page.
 *
 * The daily ceiling is a runaway guard, not an abuse control — this is an
 * authenticated admin action. It exists so a retry loop cannot quietly spend a
 * month of OpenRouter budget in an afternoon.
 */
export const generate = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    structureId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    const blocked = generationBlockedReason({
      placeMatchResolved: concept.placeMatchResolved,
      hasResearchBrief: Boolean(concept.researchBrief),
      harvestReviewState: concept.harvestReviewState,
      harvestInFlight: Boolean(concept.harvestRequestId),
      harvestImagesInFlight: concept.harvestImageAnalysisState === "processing",
      facebookPackState: concept.facebookPackState,
      packItemCount: concept.facebookPackItems?.length ?? 0,
    });
    if (blocked) throw new Error(blocked);

    await ctx.scheduler.runAfter(
      0,
      internal.concepts.internal.queueGeneration,
      {
        conceptId: args.conceptId,
        structureId: args.structureId,
      },
    );

    return null;
  },
});

/**
 * Publish a reviewed concept.
 *
 * Validation runs again here rather than trusting the stored status. Publishing
 * is the moment the page becomes reachable by a real business owner, so the
 * safety and factual checks are re-applied against the exact brief and HTML
 * about to go out, independent of whatever a previous generation recorded.
 */
export const publish = mutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    if (!concept.generatedHtml) {
      throw new Error(
        "Nothing to publish — this concept has no generated page.",
      );
    }
    if (!concept.researchBrief) {
      throw new Error("Cannot publish a concept with no verified brief.");
    }
    if (!concept.placeMatchResolved) {
      throw new Error("Cannot publish until the Google match is confirmed.");
    }
    if (concept.harvestReviewState === "pending") {
      throw new Error(
        "Cannot publish while harvested website content is still unreviewed.",
      );
    }
    if (concept.harvestRequestId) {
      throw new Error("Cannot publish while the website harvest is running.");
    }
    if (concept.harvestImageAnalysisState === "processing") {
      throw new Error(
        "Cannot publish while website images are still being sorted.",
      );
    }
    if (concept.facebookPackState === "analyzing") {
      throw new Error("Cannot publish while the Facebook Pack is analyzing.");
    }
    if (
      (concept.facebookPackItems?.length ?? 0) > 0 &&
      concept.facebookPackState !== "ready"
    ) {
      throw new Error(
        concept.facebookPackState === "failed"
          ? "Facebook Pack analysis failed. Re-analyze it before publishing."
          : "Analyze the Facebook Pack before publishing, or remove what you pasted.",
      );
    }
    if (concept.status !== "review") {
      throw new Error(
        "Cannot publish a stale or in-progress draft. Regenerate and review it first.",
      );
    }

    const { ok, violations } = validateConceptHtml(
      concept.generatedHtml,
      concept.researchBrief,
    );
    if (!ok) {
      await ctx.db.patch(args.conceptId, {
        validationViolations: violations,
        updatedAt: Date.now(),
      });
      throw new Error(
        `Cannot publish: ${violations.length} validation check(s) still fail. Regenerate first.`,
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.conceptId, {
      status: "published",
      publishedAt: concept.publishedAt ?? now,
      validationViolations: undefined,
      generationFailure: undefined,
      error: undefined,
      updatedAt: now,
    });

    await logConceptActivity(ctx, "concept.published", {
      conceptId: args.conceptId,
      businessName: concept.businessName,
      token: concept.token,
      model: concept.model,
      promptVersion: concept.promptVersion,
      structureId: concept.structureId,
    });

    return null;
  },
});

/** Revoke public access without deleting the concept. */
export const unpublish = mutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    await ctx.db.patch(args.conceptId, {
      status: "review",
      updatedAt: Date.now(),
    });

    await logConceptActivity(ctx, "concept.unpublished", {
      conceptId: args.conceptId,
      businessName: concept.businessName,
      token: concept.token,
    });

    return null;
  },
});

/** Informational only. Nothing in this repository sends a Messenger message. */
export const markSent = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    sent: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    await ctx.db.patch(args.conceptId, {
      sentAt: args.sent ? (concept.sentAt ?? Date.now()) : undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Delete a concept and every file uploaded for it. */
export const remove = mutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    const storageIds = new Set([
      ...concept.assetStorageIds,
      ...(concept.logoStorageId ? [concept.logoStorageId] : []),
      ...(concept.harvestImageCandidates ?? [])
        .map((candidate) => candidate.previewStorageId)
        .filter((id): id is Id<"_storage"> => id !== undefined),
      ...(concept.facebookPackItems ?? [])
        .map((item) => item.storageId)
        .filter((id): id is Id<"_storage"> => id !== undefined),
    ]);
    for (const storageId of storageIds) {
      try {
        await ctx.storage.delete(storageId);
      } catch (error) {
        // A file already gone is not a reason to leave the row behind.
        console.warn("[concepts] storage delete failed", { storageId, error });
      }
    }

    await ctx.db.delete(args.conceptId);

    await logConceptActivity(ctx, "concept.deleted", {
      conceptId: args.conceptId,
      businessName: concept.businessName,
      token: concept.token,
      wasPublished: concept.status === "published",
    });

    return null;
  },
});

export const list = query({
  args: {
    status: v.optional(conceptStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(websiteConceptSummaryValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 50, 200);

    const concepts = args.status
      ? await ctx.db
          .query("website_concepts")
          .withIndex("by_status_and_updatedAt", (q) =>
            q.eq("status", args.status!),
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("website_concepts")
          .withIndex("by_updatedAt")
          .order("desc")
          .take(limit);

    return concepts.map(toSummary);
  },
});

/**
 * One concept in full, with resolved asset URLs for the review card.
 *
 * The URLs are the same values handed to the model, so what Layken sees in the
 * thumbnails is exactly what the page is allowed to reference.
 */
export const get = query({
  args: { conceptId: v.id("website_concepts") },
  returns: v.union(
    v.object({
      concept: websiteConceptDocValidator,
      logoUrl: v.union(v.string(), v.null()),
      photos: v.array(
        v.object({ storageId: v.id("_storage"), url: v.string() }),
      ),
      harvestImagePreviews: v.array(
        v.object({
          candidateId: v.string(),
          url: v.union(v.string(), v.null()),
        }),
      ),
      packItemPreviews: v.array(
        v.object({
          itemId: v.string(),
          url: v.union(v.string(), v.null()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    const photos: Array<{ storageId: Id<"_storage">; url: string }> = [];
    for (const storageId of concept.assetStorageIds) {
      const url = await ctx.storage.getUrl(storageId);
      if (url) photos.push({ storageId, url });
    }

    const harvestImagePreviews: Array<{
      candidateId: string;
      url: string | null;
    }> = [];
    for (const candidate of concept.harvestImageCandidates ?? []) {
      harvestImagePreviews.push({
        candidateId: candidate.id,
        url: candidate.previewStorageId
          ? await ctx.storage.getUrl(candidate.previewStorageId)
          : null,
      });
    }

    const packItemPreviews: Array<{ itemId: string; url: string | null }> = [];
    for (const item of concept.facebookPackItems ?? []) {
      packItemPreviews.push({
        itemId: item.id,
        url: item.storageId ? await ctx.storage.getUrl(item.storageId) : null,
      });
    }

    return {
      concept,
      logoUrl: concept.logoStorageId
        ? await ctx.storage.getUrl(concept.logoStorageId)
        : null,
      photos,
      harvestImagePreviews,
      packItemPreviews,
    };
  },
});
