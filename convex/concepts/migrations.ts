import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * One-off cleanup for concept rows written before Google became an identity
 * provider rather than a content library.
 *
 * Three kinds of persisted Places content are removed:
 *
 * - `placeCandidates`, the saved search response for an unresolved match;
 * - `matchedGoogleMapsUrl`, superseded by a link rebuilt from the place ID;
 * - the Google facts inside `researchBrief` — street address, rating, review
 *   count, opening hours, and the condensed review snippets.
 *
 * `matchedGooglePlaceId` is deliberately kept. It is the one Places field
 * Google's policy exempts from retention limits, and it is what lets an already
 * matched concept re-enrich without asking Layken to confirm the business
 * again.
 *
 * Deliberately an `internalMutation` rather than an admin-callable one: it runs
 * from the CLI a small number of times and then the file is deleted. There is
 * no reason to leave a bulk rewriter reachable from a browser.
 *
 * Run it against development first:
 *
 * ```bash
 * npx convex run concepts/migrations:clearPersistedGoogleContent '{"dryRun": true}'
 * npx convex run concepts/migrations:clearPersistedGoogleContent '{"dryRun": false}'
 * ```
 *
 * then repeat both with `--prod`. The dry run reports exactly what the write
 * would touch and changes nothing, so the two counts can be compared.
 *
 * Safe to re-run: a row with nothing left to clear is skipped rather than
 * rewritten, so `cleared` on a second pass is the proof the first one finished.
 */

/** Google facts stripped from any stored `researchBrief`. */
const DEPRECATED_BRIEF_FIELDS = [
  "address",
  "googleRating",
  "googleReviewCount",
  "hours",
  "googleReviewSummary",
  // Before B0 these were populated only from Places. They remain valid brief
  // fields for future approved website content, but old values have no such
  // provenance and must be cleared.
  "category",
  "locality",
] as const;

export const clearPersistedGoogleContent = internalMutation({
  args: {
    /** Report what would change without writing. Defaults to true. */
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    scanned: v.number(),
    cleared: v.number(),
    withPlaceCandidates: v.number(),
    withMapsUrl: v.number(),
    withDeprecatedBriefFields: v.number(),
    withGoogleWebsite: v.number(),
    activityLogsCleared: v.number(),
    retainedPlaceIds: v.number(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const concepts = await ctx.db.query("website_concepts").collect();

    let cleared = 0;
    let withPlaceCandidates = 0;
    let withMapsUrl = 0;
    let withDeprecatedBriefFields = 0;
    let withGoogleWebsite = 0;
    let retainedPlaceIds = 0;

    for (const concept of concepts) {
      if (concept.matchedGooglePlaceId) retainedPlaceIds += 1;

      const hasCandidates = concept.placeCandidates !== undefined;
      const hasMapsUrl = concept.matchedGoogleMapsUrl !== undefined;

      const brief = concept.researchBrief as
        | (Record<string, unknown> & { businessName: string })
        | undefined;
      const staleBriefFields: Array<string> = brief
        ? DEPRECATED_BRIEF_FIELDS.filter((field) => brief[field] !== undefined)
        : [];
      if (brief?.phone !== undefined && !concept.phone) {
        staleBriefFields.push("phone");
      }
      if (brief?.existingWebsiteUrl !== undefined && !concept.submittedWebsiteUrl) {
        staleBriefFields.push("existingWebsiteUrl");
      }
      const hasGoogleWebsite =
        concept.verifiedWebsiteUrl !== undefined &&
        concept.submittedWebsiteUrl === undefined;

      if (hasCandidates) withPlaceCandidates += 1;
      if (hasMapsUrl) withMapsUrl += 1;
      if (staleBriefFields.length > 0) withDeprecatedBriefFields += 1;
      if (hasGoogleWebsite) withGoogleWebsite += 1;

      if (
        !hasCandidates &&
        !hasMapsUrl &&
        staleBriefFields.length === 0 &&
        !hasGoogleWebsite
      ) {
        continue;
      }
      cleared += 1;
      if (dryRun) continue;

      // Rebuilt rather than patched: Convex patches merge, so removing a field
      // from a nested object means writing the object back without it.
      let nextBrief = concept.researchBrief;
      if (brief && staleBriefFields.length > 0) {
        const rest: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(brief)) {
          // `staleBriefFields` also contains phone and existingWebsiteUrl when
          // those values have no manually supplied source. Checking the exact
          // per-row list keeps user-entered values while removing every field
          // counted by the dry run.
          if (staleBriefFields.includes(key)) {
            continue;
          }
          rest[key] = value;
        }
        nextBrief = rest as typeof concept.researchBrief;
      }

      await ctx.db.patch(concept._id, {
        placeCandidates: undefined,
        matchedGoogleMapsUrl: undefined,
        verifiedWebsiteUrl: concept.submittedWebsiteUrl
          ? (concept.verifiedWebsiteUrl ?? concept.submittedWebsiteUrl)
          : undefined,
        researchBrief: nextBrief,
      });
    }

    let activityLogsCleared = 0;
    for (const kind of [
      "concept.place_match_auto_confirmed",
      "concept.place_match_confirmed",
    ]) {
      const logs = await ctx.db
        .query("activity_log")
        .withIndex("by_kind", (query) => query.eq("kind", kind))
        .collect();
      for (const log of logs) {
        if (
          !log.payload ||
          typeof log.payload !== "object" ||
          Array.isArray(log.payload) ||
          !("matchedName" in log.payload)
        ) {
          continue;
        }
        activityLogsCleared += 1;
        if (dryRun) continue;
        const payload = { ...(log.payload as Record<string, unknown>) };
        delete payload.matchedName;
        await ctx.db.patch(log._id, { payload });
      }
    }

    return {
      dryRun,
      scanned: concepts.length,
      cleared,
      withPlaceCandidates,
      withMapsUrl,
      withDeprecatedBriefFields,
      withGoogleWebsite,
      activityLogsCleared,
      retainedPlaceIds,
    };
  },
});
