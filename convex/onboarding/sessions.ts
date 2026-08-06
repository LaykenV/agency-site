import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../_generated/server";
import { generatePlanWithAgent } from "./agent";
import { rateLimiter } from "../rateLimiter";
import {
  aiGeneratedPlanValidator,
  PLAN_GENERATION_THROTTLE_MS,
  prospectDetailsPublicValidator,
} from "../validators";

type ProspectPlan = NonNullable<Doc<"prospects">["aiGeneratedPlan"]>;
type ProspectDoc = Doc<"prospects">;

export const initSession = mutation({
  args: {},
  returns: v.object({
    sessionId: v.string(),
    resumeToken: v.string(),
  }),
  handler: async (ctx) => {
    // Every call mints a new session and therefore consumes the global ceiling.
    // Existing sessions are resumed entirely from the sessionId + resumeToken
    // pair in localStorage; a sessionId alone must never recover the token.
    const { ok } = await rateLimiter.limit(ctx, "onboardingSessionGlobal", {
      key: "global",
    });
    if (!ok) {
      console.warn("[onboarding] session ceiling reached");
      throw new Error(
        "Onboarding is temporarily unavailable. Please try again shortly.",
      );
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
        prospectNotes: "",
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
    resumeToken: v.string(),
  },
  returns: v.union(
    v.object({
      sessionId: v.string(),
      details: prospectDetailsPublicValidator,
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

    if (session.resumeToken !== args.resumeToken) {
      return null;
    }

    // Omit myNotes from public response
    const { myNotes, ...publicDetails } = session.details;

    return {
      sessionId: session.sessionId,
      details: publicDetails,
      plan: session.aiGeneratedPlan ?? undefined,
    };
  },
});

const internalSessionValidator = v.object({
  sessionId: v.string(),
  details: prospectDetailsPublicValidator,
});

/** Internal read for scheduled plan generation; never exposed to browsers. */
export const getSessionForPlanGeneration = internalQuery({
  args: { sessionId: v.string() },
  returns: v.union(internalSessionValidator, v.null()),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db
      .query("prospects")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!session) return null;

    const { myNotes, ...details } = session.details;
    return { sessionId: session.sessionId, details };
  },
});

export const updateDetails = mutation({
  args: {
    sessionId: v.string(),
    resumeToken: v.string(),
    details: prospectDetailsPublicValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await saveDetailsInternal(
      ctx,
      args.sessionId,
      args.resumeToken,
      args.details,
    );
    return null;
  },
});

export const generatePlan = mutation({
  args: {
    sessionId: v.string(),
    resumeToken: v.string(),
    details: prospectDetailsPublicValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await saveDetailsInternal(
      ctx,
      args.sessionId,
      args.resumeToken,
      args.details,
    );

    const now = Date.now();

    // Prevent duplicate scheduling while a generation is already in-flight.
    if (session.planGenerationInProgress) {
      return null;
    }
    if (
      typeof session.lastPlanRequestedAt === "number" &&
      now - session.lastPlanRequestedAt < PLAN_GENERATION_THROTTLE_MS
    ) {
      throw new Error(
        "Plan generation is throttled. Please wait before trying again.",
      );
    }

    // Checked after the per-session throttle so an honest double-click does not
    // burn a global token. This is the ceiling that survives session rotation.
    const { ok } = await rateLimiter.limit(ctx, "onboardingPlanGlobal", {
      key: "global",
    });
    if (!ok) {
      console.warn("[onboarding] plan generation ceiling reached", {
        sessionId: session.sessionId,
      });
      throw new Error(
        "Plan generation is temporarily unavailable. Please try again later.",
      );
    }

    await ctx.db.patch(session._id, {
      lastPlanRequestedAt: now,
      planGenerationInProgress: true,
      updatedAt: now,
    });

    console.log("[onboarding] scheduling plan generation", {
      sessionId: session.sessionId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.onboarding.sessions.generatePlanAction,
      {
        sessionId: args.sessionId,
      },
    );

    return null;
  },
});

async function saveDetailsInternal(
  ctx: MutationCtx,
  sessionId: string,
  resumeToken: string,
  details: Omit<ProspectDoc["details"], "myNotes">,
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

  const normalizedEmail = details.contactEmail.trim().toLowerCase();

  // Preserve existing myNotes when updating public details
  const updatedDetails: ProspectDoc["details"] = {
    ...details,
    contactEmail: normalizedEmail,
    myNotes: session.details.myNotes, // Preserve admin-only field
  };

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
      const session = await ctx.runQuery(
        internal.onboarding.sessions.getSessionForPlanGeneration,
        {
          sessionId: args.sessionId,
        },
      );

      if (!session) {
        throw new Error("Session not found while generating plan");
      }

      const aiPlan = await generatePlanWithAgent(
        ctx as ActionCtx,
        session.details,
      );

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

      await ctx.runMutation(
        internal.onboarding.sessions.resetPlanGenerationState,
        {
          sessionId: args.sessionId,
        },
      );
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
