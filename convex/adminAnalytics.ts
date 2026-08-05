import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import { getAdminAnalyticsDateWindow } from "./lib/adminAnalyticsDates";
import { pageSpeedDataValidator, projectStatusValidator } from "./validators";

const topPageValidator = v.object({
  path: v.string(),
  views: v.number(),
});

const topReferrerValidator = v.object({
  referrer: v.string(),
  views: v.number(),
});

const referrerClassesValidator = v.object({
  organic: v.number(),
  social: v.number(),
  direct: v.number(),
  other: v.number(),
});

const dailyStatValidator = v.object({
  date: v.string(),
  pageViews: v.number(),
  telClicks: v.number(),
  emailClicks: v.number(),
  directionsClicks: v.number(),
  referrerClasses: referrerClassesValidator,
  topPages: v.array(topPageValidator),
  topReferrers: v.array(topReferrerValidator),
});

const monthAggregateValidator = v.object({
  pageViews: v.number(),
  topPages: v.array(topPageValidator),
  topReferrers: v.array(topReferrerValidator),
  telClicks: v.number(),
  emailClicks: v.number(),
  directionsClicks: v.number(),
  referrerClasses: referrerClassesValidator,
  daysWithData: v.number(),
});

const projectAnalyticsValidator = v.object({
  projectId: v.string(),
  companyName: v.union(v.string(), v.null()),
  liveUrl: v.union(v.string(), v.null()),
  stagingUrl: v.union(v.string(), v.null()),
  projectStatus: v.union(projectStatusValidator, v.null()),
  pageSpeedSnapshot: v.optional(pageSpeedDataValidator),
  pageSpeedSnapshotUrl: v.union(v.string(), v.null()),
  thisMonth: monthAggregateValidator,
  lastMonth: monthAggregateValidator,
  trend: v.number(),
  last30Days: v.array(dailyStatValidator),
  lastActiveDate: v.union(v.string(), v.null()),
});

function emptyReferrerClasses() {
  return { organic: 0, social: 0, direct: 0, other: 0 };
}

function emptyMonth() {
  return {
    pageViews: 0,
    topPages: [] as Array<{ path: string; views: number }>,
    topReferrers: [] as Array<{ referrer: string; views: number }>,
    telClicks: 0,
    emailClicks: 0,
    directionsClicks: 0,
    referrerClasses: emptyReferrerClasses(),
    daysWithData: 0,
  };
}

function mergeTopList(
  map: Map<string, number>,
  items: Array<{ key: string; views: number }>,
) {
  for (const item of items) {
    map.set(item.key, (map.get(item.key) ?? 0) + item.views);
  }
}

function topListFromMap(
  map: Map<string, number>,
  limit = 10,
): Array<{ key: string; views: number }> {
  return Array.from(map.entries())
    .map(([key, views]) => ({ key, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

function aggregateDays(
  days: Array<{
    pageViews: number;
    topPages: Array<{ path: string; views: number }>;
    topReferrers?: Array<{ referrer: string; views: number }>;
    telClicks?: number;
    emailClicks?: number;
    directionsClicks?: number;
    referrerClasses?: {
      organic: number;
      social: number;
      direct: number;
      other: number;
    };
  }>,
) {
  if (days.length === 0) return emptyMonth();

  const pageMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  let pageViews = 0;
  let telClicks = 0;
  let emailClicks = 0;
  let directionsClicks = 0;
  const referrerClasses = emptyReferrerClasses();

  for (const day of days) {
    pageViews += day.pageViews;
    telClicks += day.telClicks ?? 0;
    emailClicks += day.emailClicks ?? 0;
    directionsClicks += day.directionsClicks ?? 0;
    mergeTopList(
      pageMap,
      day.topPages.map((p) => ({ key: p.path, views: p.views })),
    );
    mergeTopList(
      referrerMap,
      (day.topReferrers ?? []).map((r) => ({
        key: r.referrer,
        views: r.views,
      })),
    );
    if (day.referrerClasses) {
      referrerClasses.organic += day.referrerClasses.organic;
      referrerClasses.social += day.referrerClasses.social;
      referrerClasses.direct += day.referrerClasses.direct;
      referrerClasses.other += day.referrerClasses.other;
    }
  }

  return {
    pageViews,
    topPages: topListFromMap(pageMap).map((p) => ({
      path: p.key,
      views: p.views,
    })),
    topReferrers: topListFromMap(referrerMap).map((r) => ({
      referrer: r.key,
      views: r.views,
    })),
    telClicks,
    emailClicks,
    directionsClicks,
    referrerClasses,
    daysWithData: days.length,
  };
}

/**
 * Cross-client analytics for the admin dashboard, grouped by project.
 * Surfaces every field stored on client_analytics (including referrer data
 * deliberately hidden from the client portal) plus PageSpeed snapshots.
 */
export const listByProject = query({
  args: {
    projectId: v.optional(v.string()),
  },
  returns: v.array(projectAnalyticsValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const {
      today,
      thisMonth,
      lastMonth,
      lastMonthComparableEnd,
      start30Str,
      queryStart,
    } = getAdminAnalyticsDateWindow(new Date());

    const projects = await ctx.db.query("projects").collect();
    const scoped = args.projectId
      ? projects.filter((p) => p.projectId === args.projectId)
      : projects;

    const rows = await Promise.all(
      scoped.map(async (project) => {
        const latestDay = await ctx.db
          .query("client_analytics")
          .withIndex("by_projectId_and_date", (q) =>
            q.eq("projectId", project.projectId),
          )
          .order("desc")
          .first();

        if (!latestDay) return null;

        // Bound the rollup read to the only dates used by this view. The latest
        // indexed row above keeps inactive projects visible without scanning
        // their complete history.
        const recentDays = await ctx.db
          .query("client_analytics")
          .withIndex("by_projectId_and_date", (q) =>
            q
              .eq("projectId", project.projectId)
              .gte("date", queryStart)
              .lte("date", today),
          )
          .collect();

        const thisMonthDays = recentDays.filter((d) =>
          d.date.startsWith(thisMonth),
        );
        const lastMonthDays = recentDays.filter((d) =>
          d.date.startsWith(lastMonth),
        );
        const lastMonthComparableDays = lastMonthDays.filter(
          (d) => d.date <= lastMonthComparableEnd,
        );
        const last30DaysRaw = recentDays
          .filter((d) => d.date >= start30Str)
          .sort((a, b) => a.date.localeCompare(b.date));

        const thisMonthAgg = aggregateDays(thisMonthDays);
        const lastMonthAgg = aggregateDays(lastMonthDays);
        const lastMonthComparableAgg = aggregateDays(lastMonthComparableDays);
        const trend =
          lastMonthComparableAgg.pageViews > 0
            ? Math.round(
                ((thisMonthAgg.pageViews - lastMonthComparableAgg.pageViews) /
                  lastMonthComparableAgg.pageViews) *
                  100,
              )
            : 0;

        const prospect = project.prospectId
          ? await ctx.db.get(project.prospectId)
          : null;

        return {
          projectId: project.projectId,
          companyName: prospect?.details.companyName?.trim() || null,
          liveUrl: project.deployment?.liveUrl?.trim() || null,
          stagingUrl: project.deployment?.stagingUrl?.trim() || null,
          projectStatus: project.projectStatus ?? null,
          ...(project.pageSpeedSnapshot
            ? { pageSpeedSnapshot: project.pageSpeedSnapshot }
            : {}),
          pageSpeedSnapshotUrl: project.pageSpeedSnapshotUrl?.trim() || null,
          thisMonth: thisMonthAgg,
          lastMonth: lastMonthAgg,
          trend,
          last30Days: last30DaysRaw.map((d) => ({
            date: d.date,
            pageViews: d.pageViews,
            telClicks: d.telClicks ?? 0,
            emailClicks: d.emailClicks ?? 0,
            directionsClicks: d.directionsClicks ?? 0,
            referrerClasses: d.referrerClasses ?? emptyReferrerClasses(),
            topPages: d.topPages,
            topReferrers: d.topReferrers ?? [],
          })),
          lastActiveDate: latestDay.date,
        };
      }),
    );

    return rows
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        // Most active this month first; tie-break by last active date.
        if (b.thisMonth.pageViews !== a.thisMonth.pageViews) {
          return b.thisMonth.pageViews - a.thisMonth.pageViews;
        }
        return (b.lastActiveDate ?? "").localeCompare(a.lastActiveDate ?? "");
      });
  },
});

/** Projects that currently have at least one analytics day (filter dropdown). */
export const listClients = query({
  args: {},
  returns: v.array(
    v.object({
      projectId: v.string(),
      companyName: v.union(v.string(), v.null()),
      liveUrl: v.union(v.string(), v.null()),
      projectStatus: v.union(projectStatusValidator, v.null()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const projects = await ctx.db.query("projects").collect();
    const clients = await Promise.all(
      projects.map(async (project) => {
        const firstDay = await ctx.db
          .query("client_analytics")
          .withIndex("by_projectId_and_date", (q) =>
            q.eq("projectId", project.projectId),
          )
          .first();

        if (!firstDay) return null;

        const prospect = project.prospectId
          ? await ctx.db.get(project.prospectId)
          : null;

        return {
          projectId: project.projectId,
          companyName: prospect?.details.companyName?.trim() || null,
          liveUrl: project.deployment?.liveUrl?.trim() || null,
          projectStatus: project.projectStatus ?? null,
        };
      }),
    );

    return clients.filter((client) => client !== null);
  },
});
