import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { rateLimiter } from "./rateLimiter";
import { hubOperationalCounterKindValidator } from "./validators";

/**
 * Increment one bounded UTC-day operational counter.
 *
 * Counters stay aggregated to a single row per project/day/kind, so an attacker
 * causing repeated 429s cannot create an unbounded activity-log table.
 */
export const bumpCounter = internalMutation({
  args: {
    projectId: v.string(),
    kind: hubOperationalCounterKindValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bucketDate = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("hub_operational_counters")
      .withIndex("by_projectId_and_bucketDate_and_kind", (q) =>
        q
          .eq("projectId", args.projectId)
          .eq("bucketDate", bucketDate)
          .eq("kind", args.kind),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("hub_operational_counters", {
        bucketDate,
        projectId: args.projectId,
        kind: args.kind,
        count: 1,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Claim one project+limit alert window before scheduling delivery.
 *
 * This prevents a paused-lead burst from creating one action and one persisted
 * alert row per request. The delivery action persists the single claimed alert
 * before applying its independent global email cap.
 */
export const queueThresholdAlert = internalMutation({
  args: {
    projectId: v.string(),
    limitName: v.string(),
    leadId: v.optional(v.id("client_leads")),
    detail: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const claim = await rateLimiter.limit(
      ctx,
      "thresholdAlertPerProjectLimit",
      { key: `${args.projectId}:${args.limitName}` },
    );
    if (!claim.ok) return false;

    await ctx.scheduler.runAfter(0, internal.emails.sendAdminThresholdAlert, args);
    return true;
  },
});
