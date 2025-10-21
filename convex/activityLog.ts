import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Log an activity entry to the activity_log table.
 * This is a generic function that can be used across the entire app
 * for tracking any significant events (payments, bookings, agreements, etc.)
 */
export const logActivity = internalMutation({
  args: {
    projectId: v.optional(v.id("projects")),
    prospectId: v.optional(v.id("prospects")),
    actor: v.union(v.literal("system"), v.literal("user"), v.literal("admin")),
    kind: v.string(),
    payload: v.optional(v.any()),
  },
  returns: v.id("activity_log"),
  handler: async (ctx, args) => {
    const activityId = await ctx.db.insert("activity_log", {
      projectId: args.projectId,
      prospectId: args.prospectId,
      actor: args.actor,
      kind: args.kind,
      payload: args.payload,
      createdAt: Date.now(),
    });

    console.log("[activity] logged", {
      id: activityId,
      kind: args.kind,
      projectId: args.projectId,
      prospectId: args.prospectId,
    });

    return activityId;
  },
});

