import { internalAction, internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { generatePlanWithAgent } from "./agent";
import {
  aiGeneratedPlanValidator,
  PLAN_GENERATION_THROTTLE_MS,
  prospectDetailsValidator,
} from "../validators";

type ProspectPlan = NonNullable<Doc<"prospects">["aiGeneratedPlan"]>;
type ProspectDoc = Doc<"prospects">;

export const initSession = mutation({
  args: {
    existingSessionId: v.optional(v.string()),
  },
  returns: v.object({
    sessionId: v.string(),
    resumeToken: v.string(),
  }),
  handler: async (ctx, args) => {
    if (args.existingSessionId) {
      const existing = await ctx.db
        .query("prospects")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.existingSessionId!))
        .unique();

      if (existing) {
        return {
          sessionId: existing.sessionId,
          resumeToken: existing.resumeToken,
        };
      }
    }

    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomUUID();
    const now = Date.now();

    await ctx.db.insert("prospects", {
      sessionId,
      resumeToken,
      details: {
        contactName: "",
        contactEmail: "",
        companyName: "",
        phone: "",
        currentWebsite: "",
        businessDescription: "",
        goals: "",
        notes: "",
      },
      aiGeneratedPlan: undefined,
      lastPlanRequestedAt: undefined,
      planGenerationInProgress: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log("[onboarding] session initialized", { sessionId });

    return { sessionId, resumeToken };
  },
});

export const getSession = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.union(
    v.object({
      sessionId: v.string(),
      resumeToken: v.string(),
      details: prospectDetailsValidator,
      plan: v.optional(aiGeneratedPlanValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("prospects")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      resumeToken: session.resumeToken,
      details: session.details,
      plan: session.aiGeneratedPlan ?? undefined,
    };
  },
});

export const updateDetails = mutation({
  args: {
    sessionId: v.string(),
    resumeToken: v.string(),
    details: prospectDetailsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await saveDetailsInternal(ctx, args.sessionId, args.resumeToken, args.details);
    return null;
  },
});

export const generatePlan = mutation({
  args: {
    sessionId: v.string(),
    resumeToken: v.string(),
    details: prospectDetailsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await saveDetailsInternal(ctx, args.sessionId, args.resumeToken, args.details);

    const now = Date.now();

    // Prevent duplicate scheduling while a generation is already in-flight.
    if (session.planGenerationInProgress) {
      return null;
    }
    if (
      typeof session.lastPlanRequestedAt === "number" &&
      now - session.lastPlanRequestedAt < PLAN_GENERATION_THROTTLE_MS
    ) {
      throw new Error("Plan generation is throttled. Please wait before trying again.");
    }

    await ctx.db.patch(session._id, {
      lastPlanRequestedAt: now,
      planGenerationInProgress: true,
      updatedAt: now,
    });

    console.log("[onboarding] scheduling plan generation", {
      sessionId: session.sessionId,
    });

    await ctx.scheduler.runAfter(0, internal.onboarding.sessions.generatePlanAction, {
      sessionId: args.sessionId,
    });

    return null;
  },
});

async function saveDetailsInternal(
  ctx: MutationCtx,
  sessionId: string,
  resumeToken: string,
  details: ProspectDoc["details"],
): Promise<ProspectDoc> {
  const session = await ctx.db
    .query("prospects")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .unique();

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.resumeToken !== resumeToken) {
    throw new Error("Unauthorized session update");
  }

  const updatedDetails = { ...details };
  const normalizedEmail = updatedDetails.contactEmail.trim().toLowerCase();

  updatedDetails.contactEmail = normalizedEmail;

  await ctx.db.patch(session._id, {
    details: updatedDetails,
    updatedAt: Date.now(),
  });

  console.log("[onboarding] details updated", {
    sessionId: session.sessionId,
    fields: Object.keys(details),
  });

  return session;
}

export const generatePlanAction = internalAction({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("[onboarding] generating plan", {
      sessionId: args.sessionId,
    });

    const now = Date.now();

    try {
      const session = await ctx.runQuery(api.onboarding.sessions.getSession, {
        sessionId: args.sessionId,
      });

      if (!session) {
        throw new Error("Session not found while generating plan");
      }

      const aiPlan = await generatePlanWithAgent(ctx as ActionCtx, session.details);

      const generatedPlan: ProspectPlan = {
        generatedAt: now,
        promptVersion: aiPlan.promptVersion,
        headline: aiPlan.headline,
        summary: aiPlan.summary,
        highlights: aiPlan.highlights,
        nextSteps: aiPlan.nextSteps,
      } satisfies ProspectPlan;

      await ctx.runMutation(internal.onboarding.sessions.savePlan, {
        sessionId: args.sessionId,
        plan: generatedPlan,
      });

      console.log("[onboarding] plan generation complete", {
        sessionId: args.sessionId,
      });
    } catch (error) {
      console.error("[onboarding] AI plan generation failed", {
        sessionId: args.sessionId,
        error,
      });

      await ctx.runMutation(internal.onboarding.sessions.resetPlanGenerationState, {
        sessionId: args.sessionId,
      });
      throw error;
    }

    return null;
  },
});

export const savePlan = internalMutation({
  args: {
    sessionId: v.string(),
    plan: aiGeneratedPlanValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("prospects")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found when saving plan");
    }

    await ctx.db.patch(session._id, {
      aiGeneratedPlan: args.plan,
      planGenerationInProgress: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const resetPlanGenerationState = internalMutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("prospects")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      return null;
    }

    await ctx.db.patch(session._id, {
      planGenerationInProgress: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});
