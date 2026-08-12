import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  conceptBriefValidator,
  conceptFacebookPackItemValidator,
  conceptHarvestCandidateValidator,
  conceptHarvestImageCandidateValidator,
  conceptStatusValidator,
  websiteConceptDocValidator,
} from "../validators";
import { packAnalysisBlockedReason } from "../../lib/concepts/facebookPack";
import { requireAdmin } from "../adminGuard";
import { rateLimiter } from "../rateLimiter";
import {
  generationBlockedReason,
  isCurrentGeneration,
} from "../../lib/concepts/lifecycle";

/**
 * Private reads and writes for the concept pipeline.
 *
 * The enrichment and generation actions live in separate files because they
 * make network calls; everything that touches the database is here so the
 * transactional surface is easy to audit.
 */

export const getById = internalQuery({
  args: { conceptId: v.id("website_concepts") },
  returns: v.union(websiteConceptDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conceptId);
  },
});

export const setStatus = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    status: conceptStatusValidator,
    error: v.optional(v.string()),
    expectedGenerationRequestId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    if (
      args.expectedGenerationRequestId !== undefined &&
      !isCurrentGeneration(concept, args.expectedGenerationRequestId)
    ) {
      return null;
    }

    await ctx.db.patch(args.conceptId, {
      status: args.status,
      error: args.error?.slice(0, 1000),
      generationRequestId:
        args.status === "generating" ? concept.generationRequestId : undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * The only gateway to a paid OpenRouter generation.
 *
 * Automatic generation after research and manual regeneration both come
 * through this mutation, so neither can bypass the daily spend ceiling. The
 * request id also makes the eventual action result conditional: if an admin
 * edits the brief, changes an asset, or starts a newer generation while the
 * model is running, the stale completion is discarded rather than restoring an
 * obsolete page.
 */
export const queueGeneration = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    structureId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    const blocked = generationBlockedReason({
      placeMatchResolved: concept.placeMatchResolved,
      hasResearchBrief: Boolean(concept.researchBrief),
      harvestReviewState: concept.harvestReviewState,
      harvestInFlight: Boolean(concept.harvestRequestId),
    });
    if (blocked) {
      await ctx.db.patch(args.conceptId, {
        // A pending review is a waiting state, not a failure: the concept is
        // fine, it just has unreviewed content sitting in front of it.
        status: concept.harvestRequestId
          ? "harvesting"
          : concept.harvestReviewState === "pending"
            ? "content_review"
            : "failed",
        generationRequestId: undefined,
        error: blocked,
        updatedAt: Date.now(),
      });
      return null;
    }

    const { ok } = await rateLimiter.limit(ctx, "conceptGenerateGlobalDaily", {
      key: "global",
    });
    if (!ok) {
      await ctx.db.patch(args.conceptId, {
        status: "failed",
        generationRequestId: undefined,
        error:
          "Daily concept generation ceiling reached. Something is probably retrying in a loop.",
        updatedAt: Date.now(),
      });
      return null;
    }

    const generationRequestId = crypto.randomUUID();
    await ctx.db.patch(args.conceptId, {
      status: "generating",
      generationRequestId,
      error: undefined,
      validationViolations: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.concepts.generate.runGeneration, {
      conceptId: args.conceptId,
      structureId: args.structureId,
      generationRequestId,
    });
    return null;
  },
});

/**
 * Admin guard usable from an action.
 *
 * Actions cannot read `ctx.db`, and `requireAdmin` needs a query context to
 * resolve the Better Auth user. Auth identity carries across `ctx.runQuery`, so
 * an action calls this first and gets the same check the mutations use.
 */
export const assertAdmin = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return null;
  },
});

/**
 * Record the outcome of the automatic Places pass.
 *
 * A unique result may proceed automatically when the matching action found
 * independent corroboration. Provider ranking or a name alone is never enough.
 * All ambiguous results park in `matching` until a human picks — and the
 * candidate list itself is not stored, only how many there were, because an
 * unresolved concept is entitled to keep no Places content at all.
 */
export const savePlaceMatchResult = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    /** For the activity log only: how many candidates the pass considered. */
    candidateCount: v.number(),
    autoMatch: v.optional(
      v.object({
        placeId: v.string(),
        reasons: v.array(v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    const now = Date.now();

    if (!args.autoMatch) {
      await ctx.db.patch(args.conceptId, {
        placeMatchResolved: false,
        status: "matching",
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.patch(args.conceptId, {
      placeMatchResolved: true,
      matchedGooglePlaceId: args.autoMatch.placeId,
      verifiedWebsiteUrl: concept.submittedWebsiteUrl,
      status: "enriching",
      error: undefined,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "system",
      kind: "concept.place_match_auto_confirmed",
      payload: {
        conceptId: args.conceptId,
        businessName: concept.businessName,
        placeId: args.autoMatch.placeId,
        candidateCount: args.candidateCount,
        reasons: args.autoMatch.reasons,
      },
    });

    await ctx.scheduler.runAfter(0, internal.concepts.enrich.runSiteResearch, {
      conceptId: args.conceptId,
      thenGenerate: false,
    });
    return null;
  },
});

/**
 * Attach the identity a human confirmed in the match panel.
 *
 * The caller is `concepts/enrich.confirmPlaceMatch`, which has already proved
 * the place ID still belongs to a fresh search for this concept. This mutation
 * only writes and schedules; it deliberately keeps no candidate detail.
 */
export const savePlaceMatchConfirmed = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    placeId: v.optional(v.string()),
    // Deprecated compatibility input. Matching now always stops at Draft so
    // the admin can review content before spending a generation.
    thenGenerate: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) throw new Error("Concept not found");

    await ctx.db.patch(args.conceptId, {
      placeMatchResolved: true,
      matchedGooglePlaceId: args.placeId,
      matchedGoogleMapsUrl: undefined,
      placeCandidates: undefined,
      verifiedWebsiteUrl: concept.submittedWebsiteUrl,
      researchBrief: undefined,
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: "enriching",
      error: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      kind: "concept.place_match_confirmed",
      payload: {
        conceptId: args.conceptId,
        businessName: concept.businessName,
        placeId: args.placeId ?? null,
      },
    });

    await ctx.scheduler.runAfter(0, internal.concepts.enrich.runSiteResearch, {
      conceptId: args.conceptId,
      thenGenerate: false,
    });
    return null;
  },
});

/**
 * Store the enrichment output.
 *
 * `researchBrief` here is the machine-derived half of the brief. Generation
 * refreshes the human-owned fields on top of it rather than trusting this
 * snapshot, so assets uploaded after enrichment still reach the page.
 */
export const saveResearch = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    researchBrief: conceptBriefValidator,
    verifiedWebsiteUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    await ctx.db.patch(args.conceptId, {
      researchBrief: args.researchBrief,
      verifiedWebsiteUrl: args.verifiedWebsiteUrl ?? concept.verifiedWebsiteUrl,
      error: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Store one generation attempt.
 *
 * Invalid HTML is kept rather than discarded, with `status: "failed"` and the
 * violation list, because seeing what the model actually produced is how the
 * prompt gets fixed. `publish` re-validates independently, so a failed draft
 * cannot reach a prospect even though it is stored.
 */
export const saveGeneration = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    brief: conceptBriefValidator,
    generatedHtml: v.string(),
    structureId: v.string(),
    model: v.string(),
    promptVersion: v.string(),
    violations: v.array(v.string()),
    generationRequestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;
    if (!isCurrentGeneration(concept, args.generationRequestId)) {
      return null;
    }

    const ok = args.violations.length === 0;

    await ctx.db.patch(args.conceptId, {
      researchBrief: args.brief,
      generatedHtml: args.generatedHtml,
      structureId: args.structureId,
      model: args.model,
      promptVersion: args.promptVersion,
      validationViolations: ok ? undefined : args.violations,
      generationRequestId: undefined,
      status: ok ? "review" : "failed",
      error: ok
        ? undefined
        : `Generated HTML failed ${args.violations.length} validation check(s).`,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// --- Facebook Pack ---------------------------------------------------------

/**
 * Start one classification pass and take the daily ceiling.
 *
 * Reserved in a mutation rather than the action for the same reason the harvest
 * ceiling is: a mutation is transactional, so two taps on Analyze cannot both
 * pass the limiter and then both send a dozen images to a vision model.
 *
 * The request ID is the stale guard. Any change to pack material clears it, so
 * an analysis still running against the previous batch finds nothing to save.
 */
export const queueFacebookPackAnalysis = internalMutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    const items = concept.facebookPackItems ?? [];
    const blocked = packAnalysisBlockedReason(items);
    if (blocked) throw new Error(blocked);

    if (concept.facebookPackRequestId) {
      throw new Error("This pack is already being analyzed.");
    }

    const { ok } = await rateLimiter.limit(
      ctx,
      "conceptPackAnalyzeGlobalDaily",
      {
        key: "global",
      },
    );
    if (!ok) {
      throw new Error(
        "Daily Facebook Pack analysis ceiling reached. Something is probably retrying in a loop.",
      );
    }

    const facebookPackRequestId = crypto.randomUUID();
    await ctx.db.patch(args.conceptId, {
      facebookPackRequestId,
      facebookPackState: "analyzing",
      facebookPackError: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.concepts.facebookPack.runPackAnalysis,
      { conceptId: args.conceptId, facebookPackRequestId },
    );

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      kind: "concept.facebook_pack_analysis_started",
      payload: {
        conceptId: args.conceptId,
        businessName: concept.businessName,
        itemCount: items.length,
        imageCount: items.filter((item) => item.kind === "image").length,
      },
    });
    return null;
  },
});

/** True when this result belongs to the analysis currently in flight. */
function isCurrentPackAnalysis(
  concept: { facebookPackRequestId?: string },
  facebookPackRequestId: string,
): boolean {
  return concept.facebookPackRequestId === facebookPackRequestId;
}

/**
 * Store one classification pass.
 *
 * Verdicts are matched back onto the items still present by ID, so an item
 * removed while the model was running is simply not there to label, and an item
 * the model skipped keeps no verdict at all rather than inheriting a
 * neighbour's. An item left unclassified carries a visible error instead, which
 * is the honest state: nobody has decided what it is.
 */
export const saveFacebookPackClassification = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    facebookPackRequestId: v.string(),
    items: v.array(conceptFacebookPackItemValidator),
    model: v.string(),
    promptVersion: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;
    if (!isCurrentPackAnalysis(concept, args.facebookPackRequestId))
      return null;

    const now = Date.now();
    const classified = new Map(args.items.map((item) => [item.id, item]));
    const items = (concept.facebookPackItems ?? []).map((item) => {
      const updated = classified.get(item.id);
      if (!updated) return item;
      return {
        ...item,
        classification: updated.classification,
        classificationError: updated.classificationError,
      };
    });

    const unclassifiedCount = items.filter(
      (item) => !item.classification,
    ).length;

    await ctx.db.patch(args.conceptId, {
      facebookPackItems: items,
      facebookPackRequestId: undefined,
      // Partial model output is useful to display, but is not a ready evidence
      // pack. C2 may only compile a pack after every item has a verdict.
      facebookPackState: unclassifiedCount === 0 ? "ready" : "failed",
      facebookPackAnalyzedAt: now,
      facebookPackModel: args.model,
      facebookPackPromptVersion: args.promptVersion,
      facebookPackError:
        unclassifiedCount === 0
          ? undefined
          : `${unclassifiedCount} pack item${unclassifiedCount === 1 ? " did" : "s did"} not receive a classification. Remove unreadable items or analyze again.`,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "system",
      kind: "concept.facebook_pack_analyzed",
      payload: {
        conceptId: args.conceptId,
        model: args.model,
        itemCount: items.length,
        logoCount: items.filter((item) => item.classification?.kind === "logo")
          .length,
        photoCount: items.filter(
          (item) => item.classification?.kind === "business_photo",
        ).length,
        screenshotCount: items.filter(
          (item) => item.classification?.kind === "context_screenshot",
        ).length,
        unclassifiedCount,
      },
    });
    return null;
  },
});

/**
 * Record an analysis that could not run.
 *
 * Not a concept failure, and deliberately not a status change: the pack is
 * still collected, the material is still there, and the concept is exactly as
 * buildable as it was. Only the pack's own state moves, so the retry is one tap
 * rather than a re-paste.
 */
export const failFacebookPackAnalysis = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    facebookPackRequestId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;
    if (!isCurrentPackAnalysis(concept, args.facebookPackRequestId))
      return null;

    await ctx.db.patch(args.conceptId, {
      facebookPackRequestId: undefined,
      facebookPackState: "failed",
      facebookPackError: args.error.slice(0, 500),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// --- Structured website harvest -------------------------------------------

/**
 * Start one harvest and take the daily ceiling.
 *
 * The ceiling is reserved here rather than in the action because a mutation is
 * transactional: two clicks on Refresh cannot both pass the limiter and then
 * both spend a map plus six scrapes.
 *
 * Clearing the previous snapshot immediately is deliberate. A stale candidate
 * list shown beside a running refresh is worse than an empty one — it invites
 * approving a fact that the new scrape is about to contradict.
 */
export const queueHarvest = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    bypassCache: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    if (!concept.placeMatchResolved || !concept.researchBrief) {
      throw new Error(
        "Finish business matching and enrichment before harvesting the website.",
      );
    }

    const siteUrl = concept.verifiedWebsiteUrl ?? concept.submittedWebsiteUrl;
    if (!siteUrl) {
      throw new Error(
        "This concept has no website to harvest. Add one, or build from your notes.",
      );
    }

    const { ok } = await rateLimiter.limit(ctx, "conceptHarvestGlobalDaily", {
      key: "global",
    });
    if (!ok) {
      throw new Error(
        "Daily website-harvest ceiling reached. Something is probably retrying in a loop.",
      );
    }

    const attached = new Set([
      ...concept.assetStorageIds,
      ...(concept.logoStorageId ? [concept.logoStorageId] : []),
    ]);
    for (const candidate of concept.harvestImageCandidates ?? []) {
      if (
        candidate.previewStorageId &&
        !attached.has(candidate.previewStorageId)
      ) {
        try {
          await ctx.storage.delete(candidate.previewStorageId);
        } catch (error) {
          console.warn("[concepts] staged image cleanup failed", {
            storageId: candidate.previewStorageId,
            error,
          });
        }
      }
    }

    const harvestRequestId = crypto.randomUUID();
    await ctx.db.patch(args.conceptId, {
      harvestRequestId,
      harvestedAt: undefined,
      harvestSourceUrl: undefined,
      harvestedPages: undefined,
      harvestCandidates: undefined,
      harvestImageCandidates: undefined,
      harvestWarnings: undefined,
      harvestReviewState: undefined,
      harvestReviewedAt: undefined,
      approvedHarvestCandidateIds: undefined,
      approvedWebsiteContent: undefined,
      approvedQuotes: concept.approvedQuotes.filter(
        (quote) => quote.sourceKind !== "website",
      ),
      // Refreshing invalidates both the approved subset and any page generated
      // from it. A failed refresh returns to Draft instead of reviving stale
      // claims that are no longer approved.
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: "harvesting",
      error: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.concepts.harvest.runHarvest, {
      conceptId: args.conceptId,
      harvestRequestId,
      bypassCache: args.bypassCache,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      kind: "concept.harvest_started",
      payload: {
        conceptId: args.conceptId,
        businessName: concept.businessName,
        sourceHost: hostOf(siteUrl),
        refresh: args.bypassCache,
      },
    });
    return null;
  },
});

/** Source hosts are loggable; page copy and image bytes are not. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** True when this result belongs to the harvest currently in flight. */
function isCurrentHarvest(
  concept: { harvestRequestId?: string },
  harvestRequestId: string,
): boolean {
  return concept.harvestRequestId === harvestRequestId;
}

/** Restore the useful pre-harvest state without trusting a stale saved status. */
function statusAfterHarvestWithoutReview(concept: {
  placeMatchResolved: boolean;
  generatedHtml?: string;
  publishedAt?: number;
  validationViolations?: Array<string>;
}) {
  if (concept.generatedHtml && concept.publishedAt) return "published" as const;
  if (concept.generatedHtml && concept.validationViolations?.length) {
    return "failed" as const;
  }
  if (concept.generatedHtml) return "review" as const;
  return concept.placeMatchResolved
    ? ("draft" as const)
    : ("matching" as const);
}

/**
 * Store one bounded snapshot and park the concept for review.
 *
 * A snapshot with no candidates at all resolves itself as `skipped` rather than
 * asking Layken to review an empty list — there is nothing to approve, and a
 * gate with no content behind it is just an extra click.
 */
export const saveHarvest = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    harvestRequestId: v.string(),
    sourceUrl: v.string(),
    pages: v.array(
      v.object({ url: v.string(), title: v.optional(v.string()) }),
    ),
    candidates: v.array(conceptHarvestCandidateValidator),
    imageCandidates: v.array(conceptHarvestImageCandidateValidator),
    warnings: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;
    if (!isCurrentHarvest(concept, args.harvestRequestId)) return null;

    const reviewable =
      args.candidates.length > 0 || args.imageCandidates.length > 0;
    const now = Date.now();
    const retainedImages = new Map(
      (concept.importedWebsiteAssets ?? []).map((asset) => [
        asset.candidateId,
        asset,
      ]),
    );

    await ctx.db.patch(args.conceptId, {
      harvestRequestId: undefined,
      harvestedAt: now,
      harvestSourceUrl: args.sourceUrl,
      harvestedPages: args.pages,
      harvestCandidates: args.candidates,
      harvestImageCandidates: args.imageCandidates.map((candidate) => ({
        ...candidate,
        ...(retainedImages.has(candidate.id)
          ? {
              previewStorageId: retainedImages.get(candidate.id)!.storageId,
              stageStatus: "ready" as const,
              approvedKind: retainedImages.get(candidate.id)!.kind,
            }
          : { stageStatus: "staging" as const }),
      })),
      harvestWarnings: args.warnings.length > 0 ? args.warnings : undefined,
      harvestReviewState: reviewable ? "pending" : "skipped",
      harvestReviewedAt: reviewable ? undefined : now,
      approvedHarvestCandidateIds: undefined,
      approvedWebsiteContent: undefined,
      // A pending review revokes any generated artifact: the page in front of
      // Layken was built without content he is about to approve.
      generatedHtml: reviewable ? undefined : concept.generatedHtml,
      structureId: reviewable ? undefined : concept.structureId,
      validationViolations: reviewable
        ? undefined
        : concept.validationViolations,
      model: reviewable ? undefined : concept.model,
      promptVersion: reviewable ? undefined : concept.promptVersion,
      generationRequestId: reviewable ? undefined : concept.generationRequestId,
      publishedAt: reviewable ? undefined : concept.publishedAt,
      status: reviewable
        ? "content_review"
        : statusAfterHarvestWithoutReview(concept),
      error: undefined,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "system",
      kind: "concept.harvest_completed",
      payload: {
        conceptId: args.conceptId,
        sourceHost: hostOf(args.sourceUrl),
        pageCount: args.pages.length,
        candidateCount: args.candidates.length,
        imageCandidateCount: args.imageCandidates.length,
        warningCount: args.warnings.length,
      },
    });
    if (args.imageCandidates.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.concepts.imageImport.stageHarvestImages,
        {
          conceptId: args.conceptId,
          expectedHarvestedAt: now,
        },
      );
    }
    return null;
  },
});

/** Save one staged preview only if it still belongs to the active snapshot. */
export const saveHarvestImageStage = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    expectedHarvestedAt: v.number(),
    candidateId: v.string(),
    storageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept || concept.harvestedAt !== args.expectedHarvestedAt) {
      return false;
    }

    const candidates = [...(concept.harvestImageCandidates ?? [])];
    const index = candidates.findIndex(
      (candidate) => candidate.id === args.candidateId,
    );
    if (index < 0 || candidates[index].stageStatus === "rejected") return false;
    if (args.storageId && candidates[index].previewStorageId) return false;

    candidates[index] = {
      ...candidates[index],
      previewStorageId: args.storageId,
      stageStatus: args.storageId ? "ready" : "failed",
      importError: args.storageId
        ? undefined
        : (args.error ?? "Image staging failed.").slice(0, 240),
    };

    await ctx.db.patch(args.conceptId, {
      harvestImageCandidates: candidates,
      updatedAt: Date.now(),
    });
    return true;
  },
});

/**
 * Record a harvest that produced nothing usable.
 *
 * Not a concept failure. A business with a broken, blocked, or JavaScript-only
 * site is still a lead worth building for, so this clears the in-flight request
 * and leaves the concept exactly as buildable as it was from notes and uploads.
 */
export const failHarvest = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    harvestRequestId: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;
    if (!isCurrentHarvest(concept, args.harvestRequestId)) return null;

    await ctx.db.patch(args.conceptId, {
      harvestRequestId: undefined,
      harvestReviewState: "skipped",
      harvestReviewedAt: Date.now(),
      harvestWarnings: [args.error.slice(0, 300)],
      status: statusAfterHarvestWithoutReview(concept),
      error: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});
