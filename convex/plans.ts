import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const regeneratePlan = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      0,
      internal.onboarding_sessions.generatePlanRecommendation,
      {
        sessionId: args.sessionId,
      },
    );

    console.log("[plans] regenerate scheduled", {
      sessionId: args.sessionId,
    });

    return null;
  },
});
