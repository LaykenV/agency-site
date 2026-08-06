import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import { rateLimiter } from "./rateLimiter";
import { getLeadDemo, getLeadDemoSlugs } from "../lib/lead-demos";

/**
 * Record an open of an unlisted `/preview/<slug>` concept.
 *
 * Unauthenticated on purpose — the recipient is a cold lead with nothing but
 * the link. Two controls keep that safe: the slug must be one we actually
 * ship, so this cannot insert arbitrary rows, and a global fixed-window
 * ceiling caps total writes regardless of which slug the caller rotates to.
 *
 * Repeat opens are counted rather than collapsed to a first-view timestamp:
 * a lead re-opening the concept after a follow-up is the signal worth having.
 */
export const recordView = mutation({
  args: { slug: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!getLeadDemoSlugs().includes(args.slug)) {
      return null;
    }

    const { ok } = await rateLimiter.limit(ctx, "previewViewGlobal");
    if (!ok) {
      return null;
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("preview_views")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastViewedAt: now,
        viewCount: existing.viewCount + 1,
      });
      return null;
    }

    await ctx.db.insert("preview_views", {
      slug: args.slug,
      firstViewedAt: now,
      lastViewedAt: now,
      viewCount: 1,
    });
    return null;
  },
});

/**
 * Every preview we ship, with its open stats.
 *
 * Driven by `lib/lead-demos.ts` rather than by the `preview_views` table, so a
 * concept that has never been opened still shows up — "sent and never opened"
 * is the row you most need to see.
 */
export const listPreviews = query({
  args: {},
  returns: v.array(
    v.object({
      slug: v.string(),
      businessName: v.string(),
      tagline: v.string(),
      firstViewedAt: v.union(v.number(), v.null()),
      lastViewedAt: v.union(v.number(), v.null()),
      viewCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const rows = await ctx.db.query("preview_views").collect();
    const bySlug = new Map(rows.map((row) => [row.slug, row]));

    return getLeadDemoSlugs()
      .map((slug) => {
        const demo = getLeadDemo(slug);
        const stats = bySlug.get(slug);
        return {
          slug,
          businessName: demo?.businessName ?? slug,
          tagline: demo?.tagline ?? "",
          firstViewedAt: stats?.firstViewedAt ?? null,
          lastViewedAt: stats?.lastViewedAt ?? null,
          viewCount: stats?.viewCount ?? 0,
        };
      })
      .sort((a, b) => (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0));
  },
});
