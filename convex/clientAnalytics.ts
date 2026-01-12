import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Internal: Record a page view (called from HTTP action)
export const recordPageView = internalMutation({
  args: {
    projectId: v.string(),
    path: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, path }) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Find or create today's record
    const existing = await ctx.db
      .query("client_analytics")
      .withIndex("by_projectId_and_date", (q) =>
        q.eq("projectId", projectId).eq("date", today)
      )
      .first();

    if (existing) {
      // Update existing record
      const topPages = [...existing.topPages];
      const pageIndex = topPages.findIndex((p) => p.path === path);

      if (pageIndex >= 0) {
        topPages[pageIndex].views++;
      } else {
        topPages.push({ path, views: 1 });
      }

      // Sort by views and keep top 10
      topPages.sort((a, b) => b.views - a.views);
      const trimmedTopPages = topPages.slice(0, 10);

      await ctx.db.patch(existing._id, {
        pageViews: existing.pageViews + 1,
        topPages: trimmedTopPages,
      });
    } else {
      // Create new record for today
      await ctx.db.insert("client_analytics", {
        projectId,
        date: today,
        pageViews: 1,
        topPages: [{ path, views: 1 }],
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
    }),
    trend: v.number(),
  }),
  handler: async (ctx, { projectId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return { thisMonth: { pageViews: 0, topPages: [] }, trend: 0 };
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();

    if (!project || project.authUserId !== user._id) {
      return { thisMonth: { pageViews: 0, topPages: [] }, trend: 0 };
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
    for (const day of thisMonthData) {
      for (const page of day.topPages) {
        pageViewMap.set(page.path, (pageViewMap.get(page.path) || 0) + page.views);
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
      thisMonth: { pageViews: thisMonthViews, topPages },
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
