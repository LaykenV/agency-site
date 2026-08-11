import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  conceptBriefValidator,
  conceptPlaceCandidateValidator,
  conceptStatusValidator,
  websiteConceptDocValidator,
} from "../validators";
import { rateLimiter } from "../rateLimiter";
import {
  canGenerateConcept,
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

    if (
      !canGenerateConcept({
        placeMatchResolved: concept.placeMatchResolved,
        hasResearchBrief: Boolean(concept.researchBrief),
      })
    ) {
      await ctx.db.patch(args.conceptId, {
        status: "failed",
        generationRequestId: undefined,
        error:
          "Cannot generate until the Google match is confirmed and research is complete.",
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
 * Record the Places candidates found for a concept.
 *
 * A unique result may proceed automatically when the matching action found
 * independent corroboration. Provider ranking or a name alone is never enough.
 * All ambiguous results park in `matching` until a human picks.
 */
export const savePlaceCandidates = internalMutation({
  args: {
    conceptId: v.id("website_concepts"),
    candidates: v.array(conceptPlaceCandidateValidator),
    autoMatchedPlaceId: v.optional(v.string()),
    autoMatchReasons: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) return null;

    const now = Date.now();
    const autoMatchedCandidate = args.autoMatchedPlaceId
      ? args.candidates.find(
          (candidate) => candidate.placeId === args.autoMatchedPlaceId,
        )
      : undefined;

    if (args.autoMatchedPlaceId && !autoMatchedCandidate) {
      throw new Error("Automatic Places match is not in the candidate list.");
    }

    if (autoMatchedCandidate) {
      await ctx.db.patch(args.conceptId, {
        placeCandidates: args.candidates,
        placeMatchResolved: true,
        matchedGooglePlaceId: autoMatchedCandidate.placeId,
        matchedGoogleMapsUrl: autoMatchedCandidate.googleMapsUrl,
        verifiedWebsiteUrl:
          concept.submittedWebsiteUrl ?? autoMatchedCandidate.websiteUrl,
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
          placeId: autoMatchedCandidate.placeId,
          matchedName: autoMatchedCandidate.businessName,
          reasons: args.autoMatchReasons ?? [],
        },
      });

      await ctx.scheduler.runAfter(
        0,
        internal.concepts.enrich.runSiteResearch,
        { conceptId: args.conceptId, thenGenerate: true },
      );
      return null;
    }

    await ctx.db.patch(args.conceptId, {
      placeCandidates: args.candidates,
      placeMatchResolved: false,
      status: "matching",
      updatedAt: now,
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
