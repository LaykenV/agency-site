import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";

function bumpTopList(
  items: Array<{ key: string; views: number }>,
  key: string,
  limit = 10,
): Array<{ key: string; views: number }> {
  const next = [...items];
  const idx = next.findIndex((item) => item.key === key);
  if (idx >= 0) {
    next[idx] = { key, views: next[idx].views + 1 };
  } else {
    next.push({ key, views: 1 });
  }
  next.sort((a, b) => b.views - a.views);
  return next.slice(0, limit);
}

/** Normalize referrer for rollup storage (host when parseable, else truncated). */
function referrerBucket(referrer: string): string {
  try {
    const url = new URL(referrer);
    return url.host.slice(0, 200) || referrer.slice(0, 200);
  } catch {
    return referrer.slice(0, 200);
  }
}

// Internal: Record a page view (called from HTTP action)
export const recordPageView = internalMutation({
  args: {
    projectId: v.string(),
    path: v.string(),
    referrer: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, path, referrer }) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Find or create today's record
    const existing = await ctx.db
      .query("client_analytics")
      .withIndex("by_projectId_and_date", (q) =>
        q.eq("projectId", projectId).eq("date", today)
      )
      .first();

    const referrerKey = referrer ? referrerBucket(referrer) : null;

    if (existing) {
      const topPages = bumpTopList(
        existing.topPages.map((p) => ({ key: p.path, views: p.views })),
        path,
      ).map((p) => ({ path: p.key, views: p.views }));

      const existingReferrers = (existing.topReferrers ?? []).map((r) => ({
        key: r.referrer,
        views: r.views,
      }));
      const topReferrers = referrerKey
        ? bumpTopList(existingReferrers, referrerKey).map((r) => ({
            referrer: r.key,
            views: r.views,
          }))
        : existing.topReferrers;

      await ctx.db.patch(existing._id, {
        pageViews: existing.pageViews + 1,
        topPages,
        ...(topReferrers ? { topReferrers } : {}),
      });
    } else {
      await ctx.db.insert("client_analytics", {
        projectId,
        date: today,
        pageViews: 1,
        topPages: [{ path, views: 1 }],
        ...(referrerKey
          ? { topReferrers: [{ referrer: referrerKey, views: 1 }] }
          : {}),
      });
    }

    return null;
  },
});

// Query: Get analytics summary for client portal
export const getSummary = query({
  args: { projectId: v.string() },
  returns: v.object({
    thisMonth: v.object({
      pageViews: v.number(),
      topPages: v.array(v.object({ path: v.string(), views: v.number() })),
      // Stage 3 conversion clicks — honest labels: tap-to-call / email / directions clicks
      telClicks: v.number(),
      emailClicks: v.number(),
      directionsClicks: v.number(),
      referrerClasses: v.object({
        organic: v.number(),
        social: v.number(),
        direct: v.number(),
        other: v.number(),
      }),
    }),
    trend: v.number(),
  }),
  handler: async (ctx, { projectId }) => {
    const empty = {
      thisMonth: {
        pageViews: 0,
        topPages: [] as Array<{ path: string; views: number }>,
        telClicks: 0,
        emailClicks: 0,
        directionsClicks: 0,
        referrerClasses: { organic: 0, social: 0, direct: 0, other: 0 },
      },
      trend: 0,
    };

    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return empty;
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();

    if (!project || project.authUserId !== user._id) {
      return empty;
    }

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7); // "2026-01"
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    // Get this month's data
    const thisMonthData = await ctx.db
      .query("client_analytics")
      .withIndex("by_projectId_and_date", (q) =>
        q.eq("projectId", projectId).gte("date", `${thisMonth}-01`)
      )
      .collect();

    // Get last month's data
    const lastMonthData = await ctx.db
      .query("client_analytics")
      .withIndex("by_projectId_and_date", (q) =>
        q
          .eq("projectId", projectId)
          .gte("date", `${lastMonth}-01`)
          .lt("date", `${thisMonth}-01`)
      )
      .collect();

    const thisMonthViews = thisMonthData.reduce((sum, d) => sum + d.pageViews, 0);
    const lastMonthViews = lastMonthData.reduce((sum, d) => sum + d.pageViews, 0);

    // Aggregate top pages across all days this month
    const pageViewMap = new Map<string, number>();
    let telClicks = 0;
    let emailClicks = 0;
    let directionsClicks = 0;
    const referrerClasses = { organic: 0, social: 0, direct: 0, other: 0 };

    for (const day of thisMonthData) {
      for (const page of day.topPages) {
        pageViewMap.set(page.path, (pageViewMap.get(page.path) || 0) + page.views);
      }
      telClicks += day.telClicks ?? 0;
      emailClicks += day.emailClicks ?? 0;
      directionsClicks += day.directionsClicks ?? 0;
      if (day.referrerClasses) {
        referrerClasses.organic += day.referrerClasses.organic;
        referrerClasses.social += day.referrerClasses.social;
        referrerClasses.direct += day.referrerClasses.direct;
        referrerClasses.other += day.referrerClasses.other;
      }
    }
    const topPages = Array.from(pageViewMap.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const trend =
      lastMonthViews > 0
        ? Math.round(((thisMonthViews - lastMonthViews) / lastMonthViews) * 100)
        : 0;

    return {
      thisMonth: {
        pageViews: thisMonthViews,
        topPages,
        telClicks,
        emailClicks,
        directionsClicks,
        referrerClasses,
      },
      trend,
    };
  },
});

// Query: Get daily analytics for chart display
export const getDailyStats = query({
  args: {
    projectId: v.string(),
    days: v.optional(v.number()),
  },
  returns: v.array(v.object({ date: v.string(), pageViews: v.number() })),
  handler: async (ctx, { projectId, days = 30 }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) return [];

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();

    if (!project || project.authUserId !== user._id) {
      return [];
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().slice(0, 10);

    const data = await ctx.db
      .query("client_analytics")
      .withIndex("by_projectId_and_date", (q) =>
        q.eq("projectId", projectId).gte("date", startDateStr)
      )
      .collect();

    return data.map((d) => ({
      date: d.date,
      pageViews: d.pageViews,
    }));
  },
});
