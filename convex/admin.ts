import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { prospectValidator, prospectDetailsValidator } from "./validators";

export const getProspects = query({
  args: {},
  returns: v.array(prospectValidator),
  handler: async (ctx) => {
    return await ctx.db.query("prospects").collect();
  },
});

export const createProspect = mutation({
  args: {
    details: prospectDetailsValidator,
  },
  returns: v.id("prospects"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomUUID();

    const prospectId = await ctx.db.insert("prospects", {
      sessionId,
      resumeToken,
      details: args.details,
      aiGeneratedPlan: undefined,
      lastPlanRequestedAt: undefined,
      planGenerationInProgress: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log("[admin] prospect created", { prospectId, sessionId });

    return prospectId;
  },
});

export const updateProspectDetails = mutation({
  args: {
    prospectId: v.id("prospects"),
    details: prospectDetailsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.prospectId);

    if (!prospect) {
      throw new Error("Prospect not found");
    }

    await ctx.db.patch(args.prospectId, {
      details: args.details,
      updatedAt: Date.now(),
    });

    console.log("[admin] prospect updated", { prospectId: args.prospectId });

    return null;
  },
});

export const logMagicLinkSent = mutation({
  args: {
    prospectId: v.id("prospects"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("activity_log", {
      prospectId: args.prospectId,
      actor: "admin",
      kind: "magic_link_sent",
      payload: { email: args.email },
      createdAt: Date.now(),
    });

    console.log("[admin] logged magic link sent", {
      prospectId: args.prospectId,
      email: args.email,
    });

    return null;
  },
});
