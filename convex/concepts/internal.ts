import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  conceptApprovedContentValidator,
  conceptApprovedQuoteValidator,
  conceptBriefValidator,
  conceptEvidenceDecisionValidator,
  conceptFacebookEvidenceValidator,
  conceptFacebookPackItemValidator,
  conceptHarvestCandidateValidator,
  conceptHarvestImageCandidateValidator,
  conceptGenerationFailureValidator,
  conceptStatusValidator,
  websiteConceptDocValidator,
} from "../validators";
import {
  buildApprovedEvidence,
  harvestCandidatesToEvidence,
} from "../../lib/concepts/evidence";
import { packAnalysisBlockedReason } from "../../lib/concepts/facebookPack";
import { requireAdmin } from "../adminGuard";
import { rateLimiter } from "../rateLimiter";
import {
  generationBlockedReason,
  generationFailureHeadline,
  isCurrentGeneration,
  statusAfterGenerationInputChange,
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
    /** Set when `status` is `failed` and the cause is known. */
    failure: v.optional(conceptGenerationFailureValidator),
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
      generationFailure: args.failure,
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
      harvestImagesInFlight: concept.harvestImageAnalysisState === "processing",
      facebookPackState: concept.facebookPackState,
      packItemCount: concept.facebookPackItems?.length ?? 0,
    });
    if (blocked) {
      const packWaiting =
        (concept.facebookPackItems?.length ?? 0) > 0 &&
        (concept.facebookPackState === "analyzing" ||
          concept.facebookPackState === "collecting");

      await ctx.db.patch(args.conceptId, {
        // A pending review or an unanalyzed pack is a waiting state, not a
        // failure: the concept is fine, it just has unreviewed content sitting
        // in front of it.
        status: concept.harvestRequestId
          ? "harvesting"
          : concept.harvestReviewState === "pending"
            ? "content_review"
            : packWaiting
              ? "draft"
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
      generationFailure: undefined,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.concepts.generate.runGeneration, {
      conceptId: args.conceptId,
      generationRequestId,
    });
    return null;
  },
});

/**
 * Take one more token from the daily ceiling for an HTML-repair retry.
 *
 * The retry happens inside a generation that already paid for itself, so it
 * would otherwise be invisible to the limiter. It returns false rather than
 * throwing: a refused retry is not an error, it just means the failed draft
 * is what Layken sees.
 */
export const reserveGenerationRetry = internalMutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.boolean(),
  handler: async (ctx) => {
    const { ok } = await rateLimiter.limit(ctx, "conceptGenerateGlobalDaily", {
      key: "global",
    });
    return ok;
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
      generationFailure: undefined,
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
    model: v.string(),
    promptVersion: v.string(),
    violations: v.array(v.string()),
    /** Which check rejected the draft, absent when it passed everything. */
    failure: v.optional(conceptGenerationFailureValidator),
    generationRequestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;
    if (!isCurrentGeneration(concept, args.generationRequestId)) {
      return null;
    }

    const ok = args.violations.length === 0 && !args.failure;

    await ctx.db.patch(args.conceptId, {
      researchBrief: args.brief,
      generatedHtml: args.generatedHtml,
      // Clears the legacy page shape off any row regenerated after the picker
      // was removed. The column stays in the schema for rows not yet redone.
      structureId: undefined,
      model: args.model,
      promptVersion: args.promptVersion,
      validationViolations: ok ? undefined : args.violations,
      generationFailure: ok ? undefined : args.failure,
      generationRequestId: undefined,
      status: ok ? "review" : "failed",
      // The headline names which gate rejected the draft so a broken stylesheet
      // and a dead provider do not read as the same failure.
      error: ok
        ? undefined
        : args.failure
          ? generationFailureHeadline(args.failure, args.violations.length)
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
    // Re-analysis invalidates the previous compiled result immediately. Leaving
    // the old evidence up while the new pass runs would let generation read a
    // brief the current analysis is about to replace — and a failure would leave
    // state=failed with a still-usable evidence pack, which is a lie either way.
    await ctx.db.patch(args.conceptId, {
      facebookPackRequestId,
      facebookPackState: "analyzing",
      facebookPackError: undefined,
      facebookReviewError: undefined,
      facebookEvidence: undefined,
      approvedFacebookContent: undefined,
      facebookReviewModel: undefined,
      facebookReviewPromptVersion: undefined,
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
 * Store one complete analysis: classifications, evidence, and the review.
 *
 * Verdicts are matched back onto the items still present by ID, so an item
 * removed while the model was running is simply not there to label, and an item
 * the model skipped keeps no verdict at all rather than inheriting a
 * neighbour's. An item left unclassified carries a visible error instead, which
 * is the honest state: nobody has decided what it is.
 *
 * This is also where reviewed Facebook content first reaches something
 * generation reads, which is why it revokes the current draft and its
 * publication. A page built from the previous pack is stale the moment the
 * evidence behind it changes, and leaving it published would mean a prospect
 * could be looking at claims this analysis just withdrew.
 */
export const saveFacebookPackAnalysis = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    facebookPackRequestId: v.string(),
    items: v.array(conceptFacebookPackItemValidator),
    model: v.string(),
    promptVersion: v.string(),
    /**
     * @deprecated Absent since the analysis collapsed to one pass.
     *
     * Optional rather than removed so rows written by the two-pass path keep
     * their recorded review prompt until they are migrated.
     */
    reviewPromptVersion: v.optional(v.string()),
    evidence: conceptFacebookEvidenceValidator,
    approvedContent: conceptApprovedContentValidator,
    approvedQuotes: v.array(conceptApprovedQuoteValidator),
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
    const approvedCount = args.evidence.decisions.filter(
      (decision) => decision.decision === "approved",
    ).length;

    await ctx.db.patch(args.conceptId, {
      facebookPackItems: items,
      facebookPackRequestId: undefined,
      // Partial model output is useful to display, but it is not a ready
      // evidence pack: an item nobody classified may be a screenshot, and the
      // summary would be describing a pack that was never fully read.
      facebookPackState: unclassifiedCount === 0 ? "ready" : "failed",
      facebookPackAnalyzedAt: now,
      facebookPackModel: args.model,
      facebookPackPromptVersion: args.promptVersion,
      facebookPackError:
        unclassifiedCount === 0
          ? undefined
          : `${unclassifiedCount} pack item${unclassifiedCount === 1 ? " did" : "s did"} not receive a classification. Remove unreadable items or analyze again.`,
      facebookEvidence: args.evidence,
      approvedFacebookContent: args.approvedContent,
      facebookReviewModel: args.model,
      facebookReviewPromptVersion: args.reviewPromptVersion,
      facebookReviewError: undefined,
      // Hand-entered quotes and website-approved quotes are untouched; only the
      // Facebook set this analysis supersedes is replaced.
      approvedQuotes: [
        ...concept.approvedQuotes.filter(
          (quote) => quote.sourceKind !== "facebook",
        ),
        ...args.approvedQuotes,
      ],
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
        candidateCount: args.evidence.candidates.length,
        approvedCount,
        conflictCount: args.evidence.conflicts.length,
        quoteCount: args.approvedQuotes.length,
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
    /**
     * Which pass broke. A review failure is worth naming separately: the pack
     * was read successfully and the retry is likely to behave differently,
     * whereas a classification failure usually means an item needs removing.
     */
    stage: v.optional(
      v.union(v.literal("classification"), v.literal("review")),
    ),
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
      facebookReviewError:
        args.stage === "review" ? args.error.slice(0, 500) : undefined,
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
      harvestImageAnalysisState: undefined,
      harvestImageAnalysisError: undefined,
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
      generationFailure: undefined,
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
 * Store one bounded snapshot together with the reviewer's rulings on it.
 *
 * Phase C removed the human approval queue between these two steps: the harvest
 * action reviews the candidates before calling this, so the snapshot and the
 * decisions arrive in one write and the concept never parks in
 * `content_review`. What is approved is rebuilt here from the stored
 * candidates, never from the model's reply, so the reviewer can only admit text
 * Firecrawl actually returned.
 *
 * A harvest that produced nothing resolves as `skipped`, which is the honest
 * description: there was nothing to rule on.
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
    decisions: v.array(conceptEvidenceDecisionValidator),
    conflicts: v.array(v.string()),
    reviewModel: v.optional(v.string()),
    reviewPromptVersion: v.optional(v.string()),
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

    const approved = buildApprovedEvidence({
      candidates: harvestCandidatesToEvidence(args.candidates),
      decisions: args.decisions,
    });
    const hasApprovedContent = approved.approvedCandidateIds.length > 0;

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
      harvestImageAnalysisState:
        args.imageCandidates.length > 0 ? "processing" : undefined,
      harvestImageAnalysisError: undefined,
      harvestWarnings: args.warnings.length > 0 ? args.warnings : undefined,
      harvestReviewState: reviewable ? "approved" : "skipped",
      harvestReviewedAt: now,
      harvestReview: reviewable
        ? {
            reviewedAt: now,
            decisions: args.decisions,
            conflicts: args.conflicts,
            model: args.reviewModel,
            promptVersion: args.reviewPromptVersion,
          }
        : undefined,
      approvedHarvestCandidateIds: hasApprovedContent
        ? approved.approvedCandidateIds
        : undefined,
      approvedWebsiteContent: hasApprovedContent ? approved.content : undefined,
      approvedQuotes: [
        ...concept.approvedQuotes.filter(
          (quote) => quote.sourceKind !== "website",
        ),
        ...approved.quotes,
      ],
      // New website content revokes any page generated without it. A harvest
      // that approved nothing still changes nothing, so the existing draft is
      // left alone rather than thrown away for a scrape that found nothing.
      generatedHtml: hasApprovedContent ? undefined : concept.generatedHtml,
      // Legacy page shape, kept in the schema for rows generated before the
      // picker was removed and never conditional again.
      structureId: undefined,
      validationViolations: hasApprovedContent
        ? undefined
        : concept.validationViolations,
      model: hasApprovedContent ? undefined : concept.model,
      promptVersion: hasApprovedContent ? undefined : concept.promptVersion,
      generationRequestId: hasApprovedContent
        ? undefined
        : concept.generationRequestId,
      publishedAt: hasApprovedContent ? undefined : concept.publishedAt,
      status: hasApprovedContent
        ? concept.placeMatchResolved
          ? "draft"
          : concept.status
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
    // Staging is scheduled rather than awaited: fetching a dozen remote files
    // is not transactional work, and a broken image must never cost the facts.
    // The staging action classifies what it managed to copy when it finishes.
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

/**
 * Attach the images the classifier selected, and clean up the rest.
 *
 * Website imagery is gap-fill, so it is attached only where the concept has
 * nothing already: a manual upload or a Facebook Pack selection wins outright.
 * That is not just precedence — a page mixing a business's Facebook photos with
 * its old website's stock imagery looks like two businesses.
 *
 * Everything not selected is deleted here rather than left staged. A staged
 * file nothing points at is an orphan, and the candidate keeps its `rejected`
 * status so a later pass does not fetch it again.
 */
export const saveWebsiteImageSelection = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    expectedHarvestedAt: v.number(),
    logoCandidateId: v.optional(v.string()),
    photoCandidateIds: v.array(v.string()),
    alts: v.array(v.object({ candidateId: v.string(), alt: v.string() })),
    model: v.string(),
    promptVersion: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept || concept.harvestedAt !== args.expectedHarvestedAt) {
      return null;
    }

    const packAssets = concept.facebookEvidence?.assets;
    const packHasLogo = Boolean(packAssets?.logoItemId);
    const packHasPhotos = Boolean(
      packAssets?.heroItemId || (packAssets?.galleryItemIds.length ?? 0) > 0,
    );

    const wantLogo = Boolean(
      args.logoCandidateId && !concept.logoStorageId && !packHasLogo,
    );
    const wantPhotos =
      concept.assetStorageIds.length === 0 && !packHasPhotos
        ? args.photoCandidateIds
        : [];

    const altByCandidate = new Map(
      args.alts.map((entry) => [entry.candidateId, entry.alt]),
    );
    const selected = new Set([
      ...(wantLogo && args.logoCandidateId ? [args.logoCandidateId] : []),
      ...wantPhotos,
    ]);

    const now = Date.now();
    const imported = [...(concept.importedWebsiteAssets ?? [])];
    const photoStorageIds: Array<Id<"_storage">> = [];
    let logoStorageId = concept.logoStorageId;
    const discarded: Array<Id<"_storage">> = [];

    const candidates = (concept.harvestImageCandidates ?? []).map(
      (candidate) => {
        const storageId = candidate.previewStorageId;
        if (!storageId || candidate.stageStatus !== "ready") return candidate;

        if (!selected.has(candidate.id)) {
          // Keep anything already attached by a previous pass; discard the rest.
          const attached =
            storageId === concept.logoStorageId ||
            concept.assetStorageIds.includes(storageId);
          if (attached) return candidate;
          discarded.push(storageId);
          return {
            ...candidate,
            previewStorageId: undefined,
            stageStatus: "rejected" as const,
            approvedKind: undefined,
          };
        }

        const kind =
          candidate.id === args.logoCandidateId && wantLogo
            ? ("logo" as const)
            : ("photo" as const);
        if (kind === "logo") logoStorageId = storageId;
        else photoStorageIds.push(storageId);

        if (!imported.some((asset) => asset.storageId === storageId)) {
          imported.push({
            candidateId: candidate.id,
            storageId,
            kind,
            sourceUrl: candidate.sourceUrl,
            importedAt: now,
          });
        }

        return {
          ...candidate,
          approvedKind: kind,
          alt: altByCandidate.get(candidate.id) ?? candidate.alt,
        };
      },
    );

    for (const storageId of discarded) {
      try {
        await ctx.storage.delete(storageId);
      } catch (error) {
        console.warn("[concepts] unselected website image cleanup failed", {
          storageId,
          error,
        });
      }
    }

    const attachedAnything =
      photoStorageIds.length > 0 || logoStorageId !== concept.logoStorageId;

    await ctx.db.patch(args.conceptId, {
      harvestImageCandidates: candidates,
      harvestImageAnalysisState: "ready",
      harvestImageAnalysisError: undefined,
      importedWebsiteAssets: imported.length > 0 ? imported : undefined,
      logoStorageId,
      assetStorageIds: [...concept.assetStorageIds, ...photoStorageIds],
      // New imagery changes the page, so an existing draft is revoked exactly
      // as an approved fact would revoke it.
      ...(attachedAnything
        ? {
            generatedHtml: undefined,
            structureId: undefined,
            validationViolations: undefined,
            generationFailure: undefined,
            model: undefined,
            promptVersion: undefined,
            generationRequestId: undefined,
            publishedAt: undefined,
            status: concept.placeMatchResolved
              ? ("draft" as const)
              : concept.status,
          }
        : {}),
      updatedAt: now,
    });

    if (attachedAnything) {
      await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
        actor: "system",
        kind: "concept.website_assets_selected",
        payload: {
          conceptId: args.conceptId,
          model: args.model,
          promptVersion: args.promptVersion,
          logoAttached: logoStorageId !== concept.logoStorageId,
          photosAttached: photoStorageIds.length,
          discarded: discarded.length,
        },
      });
    }
    return null;
  },
});

/** Append one warning to the active snapshot, e.g. from an image pass. */
export const addHarvestWarning = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    expectedHarvestedAt: v.number(),
    warning: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept || concept.harvestedAt !== args.expectedHarvestedAt) {
      return null;
    }

    await ctx.db.patch(args.conceptId, {
      harvestWarnings: [
        ...(concept.harvestWarnings ?? []),
        args.warning.slice(0, 300),
      ].slice(0, 20),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Resolve the website-image gate when staging or Luna classification fails. */
export const failWebsiteImageAnalysis = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    expectedHarvestedAt: v.number(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (
      !concept ||
      concept.harvestedAt !== args.expectedHarvestedAt ||
      concept.harvestImageAnalysisState !== "processing"
    ) {
      return null;
    }

    const error = args.error.slice(0, 300);
    await ctx.db.patch(args.conceptId, {
      harvestImageAnalysisState: "failed",
      harvestImageAnalysisError: error,
      harvestWarnings: [...(concept.harvestWarnings ?? []), error].slice(0, 20),
      updatedAt: Date.now(),
    });
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
