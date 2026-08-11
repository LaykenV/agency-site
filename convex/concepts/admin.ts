import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { requireAdmin } from "../adminGuard";
import { validateConceptHtml } from "../../lib/concepts/validateConceptHtml";
import {
  canGenerateConcept,
  statusAfterGenerationInputChange,
} from "../../lib/concepts/lifecycle";
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
    candidateCount: concept.placeCandidates?.length ?? 0,
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

    await ctx.db.patch(args.conceptId, {
      ...next,
      // Any generation input change revokes the old artifact immediately. A
      // removed quote or replaced logo must not remain live until somebody
      // happens to regenerate.
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: identityOrSiteChanged
        ? "draft"
        : statusAfterGenerationInputChange({
            placeMatchResolved: concept.placeMatchResolved,
            currentStatus: concept.status,
          }),
      // Name or website changes invalidate machine research as well as the
      // rendered page. Re-enrichment is required before generation resumes.
      researchBrief: identityOrSiteChanged ? undefined : concept.researchBrief,
      matchedGooglePlaceId:
        next.businessName !== concept.businessName
          ? undefined
          : concept.matchedGooglePlaceId,
      matchedGoogleMapsUrl:
        next.businessName !== concept.businessName
          ? undefined
          : concept.matchedGoogleMapsUrl,
      placeCandidates:
        next.businessName !== concept.businessName
          ? undefined
          : concept.placeCandidates,
      placeMatchResolved:
        next.businessName !== concept.businessName
          ? false
          : concept.placeMatchResolved,
      verifiedWebsiteUrl: identityOrSiteChanged
        ? undefined
        : concept.verifiedWebsiteUrl,
      error: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

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
      // One logo per concept. Replacing it deletes the previous file rather
      // than orphaning it in storage.
      if (concept.logoStorageId && concept.logoStorageId !== args.storageId) {
        await ctx.storage.delete(concept.logoStorageId);
      }
      await ctx.db.patch(args.conceptId, {
        logoStorageId: args.storageId,
        generatedHtml: undefined,
        structureId: undefined,
        validationViolations: undefined,
        model: undefined,
        promptVersion: undefined,
        generationRequestId: undefined,
        publishedAt: undefined,
        status: concept.placeMatchResolved ? "draft" : concept.status,
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
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: concept.placeMatchResolved ? "draft" : concept.status,
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

    await ctx.db.patch(args.conceptId, {
      logoStorageId: isLogo ? undefined : concept.logoStorageId,
      assetStorageIds: concept.assetStorageIds.filter(
        (storageId) => storageId !== args.storageId,
      ),
      generatedHtml: undefined,
      structureId: undefined,
      validationViolations: undefined,
      model: undefined,
      promptVersion: undefined,
      generationRequestId: undefined,
      publishedAt: undefined,
      status: concept.placeMatchResolved ? "draft" : concept.status,
      updatedAt: Date.now(),
    });

    await ctx.storage.delete(args.storageId);
    return null;
  },
});

/**
 * Confirm which Google business this concept is for, or declare there is none.
 *
 * Passing `placeId: null` is the "no Google match" path: plenty of real Facebook
 * leads have no listing at all, and the concept must still be buildable from
 * Layken's notes.
 */
export const confirmPlaceMatch = mutation({
  args: {
    conceptId: v.id("website_concepts"),
    placeId: v.union(v.string(), v.null()),
    /** Generate immediately after research finishes. */
    thenGenerate: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const concept = await loadConcept(ctx, args.conceptId);

    const candidate =
      args.placeId === null
        ? undefined
        : concept.placeCandidates?.find(
            (entry) => entry.placeId === args.placeId,
          );

    if (args.placeId !== null && !candidate) {
      throw new Error("That Places candidate is not attached to this concept.");
    }

    await ctx.db.patch(args.conceptId, {
      placeMatchResolved: true,
      matchedGooglePlaceId: candidate?.placeId,
      matchedGoogleMapsUrl: candidate?.googleMapsUrl,
      verifiedWebsiteUrl: concept.submittedWebsiteUrl ?? candidate?.websiteUrl,
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

    await logConceptActivity(ctx, "concept.place_match_confirmed", {
      conceptId: args.conceptId,
      businessName: concept.businessName,
      placeId: args.placeId,
      matchedName: candidate?.businessName ?? null,
    });

    await ctx.scheduler.runAfter(0, internal.concepts.enrich.runSiteResearch, {
      conceptId: args.conceptId,
      thenGenerate: args.thenGenerate ?? true,
    });

    return null;
  },
});

/** Re-run the Places lookup from scratch, e.g. after correcting the name. */
export const reEnrich = mutation({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await loadConcept(ctx, args.conceptId);

    await ctx.db.patch(args.conceptId, {
      placeMatchResolved: false,
      matchedGooglePlaceId: undefined,
      matchedGoogleMapsUrl: undefined,
      placeCandidates: undefined,
      verifiedWebsiteUrl: undefined,
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

    await ctx.scheduler.runAfter(0, internal.concepts.enrich.runPlacesMatch, {
      conceptId: args.conceptId,
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

    if (
      !canGenerateConcept({
        placeMatchResolved: concept.placeMatchResolved,
        hasResearchBrief: Boolean(concept.researchBrief),
      })
    ) {
      throw new Error(
        "This concept has no research brief yet. Confirm the Google match first.",
      );
    }

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

    for (const storageId of [
      ...concept.assetStorageIds,
      ...(concept.logoStorageId ? [concept.logoStorageId] : []),
    ]) {
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

    return {
      concept,
      logoUrl: concept.logoStorageId
        ? await ctx.storage.getUrl(concept.logoStorageId)
        : null,
      photos,
    };
  },
});
