import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { rateLimiter } from "../rateLimiter";

/**
 * The unauthenticated `/preview/<token>` surface.
 *
 * Both functions are reachable by anyone holding a token, so both return
 * nothing at all unless the concept is currently published. Unpublishing is
 * therefore a real revocation, not a UI state.
 */

/**
 * Load a published concept for rendering.
 *
 * Returns only the fields the preview page needs. Notes, the research brief,
 * phone, Google match details, and view counters stay server-side: the
 * recipient is a business owner being pitched, and none of Layken's research
 * notes about them belong in a response they can read.
 */
export const getPublishedByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      token: v.string(),
      businessName: v.string(),
      html: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const concept = await ctx.db
      .query("website_concepts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!concept || concept.status !== "published" || !concept.generatedHtml) {
      return null;
    }

    return {
      token: concept.token,
      businessName: concept.businessName,
      html: concept.generatedHtml,
    };
  },
});

/**
 * Record an open of a published concept.
 *
 * Unauthenticated on purpose — the recipient is a lead with nothing but the
 * link. Two controls keep that safe: only a published token matches anything, so
 * this cannot insert or create rows, and a global fixed-window ceiling caps
 * total writes regardless of which token a caller rotates to. A per-token key
 * would not hold, because the token is the value the caller controls.
 *
 * Repeat opens are counted rather than collapsed into a first-view timestamp: a
 * lead re-opening the concept days later is the signal worth acting on, and a
 * one-shot flag throws it away.
 */
export const recordView = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { ok } = await rateLimiter.limit(ctx, "conceptViewGlobal", {
      key: "global",
    });
    if (!ok) return null;

    const concept = await ctx.db
      .query("website_concepts")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!concept || concept.status !== "published") return null;

    const now = Date.now();
    await ctx.db.patch(concept._id, {
      firstViewedAt: concept.firstViewedAt ?? now,
      lastViewedAt: now,
      viewCount: concept.viewCount + 1,
      // Deliberately not touching `updatedAt`: that field orders the admin list
      // by Layken's own work, and a prospect opening a link is not an edit.
    });

    return null;
  },
});
