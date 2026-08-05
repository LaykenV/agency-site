import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  clientEventPayloadValidator,
  clientEventTypeValidator,
  referrerClassValidator,
} from "./validators";

/**
 * Stage 3: insert a typed client event and roll daily aggregates.
 * Portal queries never scan this table — they read client_analytics.
 */
export const recordEvent = internalMutation({
  args: {
    projectDocId: v.id("projects"),
    projectSlug: v.string(),
    publishableKeyId: v.string(),
    type: clientEventTypeValidator,
    path: v.string(),
    referrerClass: v.optional(referrerClassValidator),
    payload: v.optional(clientEventPayloadValidator),
    /** Raw referrer host/string for Stage 1A topReferrers rollup (pageviews). */
    referrerForRollup: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const createdAt = Date.now();

    await ctx.db.insert("client_events", {
      projectId: args.projectDocId,
      publishableKeyId: args.publishableKeyId,
      type: args.type,
      path: args.path,
      ...(args.referrerClass ? { referrerClass: args.referrerClass } : {}),
      ...(args.payload ? { payload: args.payload } : {}),
      createdAt,
    });

    // Daily rollup by public slug (same key as v1 pixel)
    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("client_analytics")
      .withIndex("by_projectId_and_date", (q) =>
        q.eq("projectId", args.projectSlug).eq("date", today),
      )
      .first();

    if (args.type === "pageview") {
      await bumpPageView(ctx, {
        existing,
        projectSlug: args.projectSlug,
        path: args.path,
        referrerForRollup: args.referrerForRollup,
        referrerClass: args.referrerClass,
        today,
      });
    } else if (args.type === "click" && args.payload) {
      await bumpClick(ctx, {
        existing,
        projectSlug: args.projectSlug,
        target: args.payload.target,
        today,
      });
    }

    return null;
  },
});

function bumpTopList(
  items: Array<{ key: string; views: number }>,
  key: string,
  limit = 10,
): Array<{ key: string; views: number }> {
  const next = [...items];
  const idx = next.findIndex((item) => item.key === key);
  if (idx >= 0) {
    next[idx] = { key, views: next[idx]!.views + 1 };
  } else {
    next.push({ key, views: 1 });
  }
  next.sort((a, b) => b.views - a.views);
  return next.slice(0, limit);
}

function referrerBucket(referrer: string): string {
  try {
    const url = new URL(referrer);
    return url.host.slice(0, 200) || referrer.slice(0, 200);
  } catch {
    return referrer.slice(0, 200);
  }
}

function emptyReferrerClasses() {
  return { organic: 0, social: 0, direct: 0, other: 0 };
}

function bumpReferrerClass(
  current:
    | {
        organic: number;
        social: number;
        direct: number;
        other: number;
      }
    | undefined,
  cls: "organic" | "social" | "direct" | "other" | undefined,
) {
  if (!cls) return current;
  const next = { ...(current ?? emptyReferrerClasses()) };
  next[cls] = (next[cls] ?? 0) + 1;
  return next;
}

async function bumpPageView(
  ctx: MutationCtx,
  args: {
    existing: Doc<"client_analytics"> | null;
    projectSlug: string;
    path: string;
    referrerForRollup?: string;
    referrerClass?: "organic" | "social" | "direct" | "other";
    today: string;
  },
) {
  const referrerKey = args.referrerForRollup
    ? referrerBucket(args.referrerForRollup)
    : null;

  if (args.existing) {
    const topPages = bumpTopList(
      args.existing.topPages.map((p) => ({ key: p.path, views: p.views })),
      args.path,
    ).map((p) => ({ path: p.key, views: p.views }));

    const existingReferrers = (args.existing.topReferrers ?? []).map((r) => ({
      key: r.referrer,
      views: r.views,
    }));
    const topReferrers = referrerKey
      ? bumpTopList(existingReferrers, referrerKey).map((r) => ({
          referrer: r.key,
          views: r.views,
        }))
      : args.existing.topReferrers;

    const referrerClasses = bumpReferrerClass(
      args.existing.referrerClasses,
      args.referrerClass,
    );

    await ctx.db.patch(args.existing._id, {
      pageViews: args.existing.pageViews + 1,
      topPages,
      ...(topReferrers ? { topReferrers } : {}),
      ...(referrerClasses ? { referrerClasses } : {}),
    });
  } else {
    const referrerClasses = bumpReferrerClass(undefined, args.referrerClass);
    await ctx.db.insert("client_analytics", {
      projectId: args.projectSlug,
      date: args.today,
      pageViews: 1,
      topPages: [{ path: args.path, views: 1 }],
      ...(referrerKey
        ? { topReferrers: [{ referrer: referrerKey, views: 1 }] }
        : {}),
      ...(referrerClasses ? { referrerClasses } : {}),
    });
  }
}

/**
 * Clicks never touch `referrerClasses`. That rollup counts visits, and a tel tap
 * carries the same `document.referrer` as the pageview that preceded it —
 * counting both would inflate every class (usually `direct`) by the click volume
 * and make "traffic sources" unreadable against known traffic.
 */
async function bumpClick(
  ctx: MutationCtx,
  args: {
    existing: Doc<"client_analytics"> | null;
    projectSlug: string;
    target: "tel" | "email" | "directions";
    today: string;
  },
) {
  const clickField =
    args.target === "tel"
      ? ("telClicks" as const)
      : args.target === "email"
        ? ("emailClicks" as const)
        : ("directionsClicks" as const);

  if (args.existing) {
    await ctx.db.patch(args.existing._id, {
      [clickField]: (args.existing[clickField] ?? 0) + 1,
    });
  } else {
    await ctx.db.insert("client_analytics", {
      projectId: args.projectSlug,
      date: args.today,
      pageViews: 0,
      topPages: [],
      [clickField]: 1,
    });
  }
}

