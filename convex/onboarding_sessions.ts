import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  PLAN_TIERS,
  PLAN_TIER_BASELINES,
  PlanTierOption,
} from "../types/profile";
import type { PlanProposal } from "../types/profile";
import { fallbackPlanFromBaselines } from "./agent";

const planTierOption = v.union(
  v.literal("starter"),
  v.literal("professional"),
  v.literal("enterprise"),
);

const timelineValidator = v.object({
  option: v.union(v.literal("asap"), v.literal("date")),
  date: v.union(v.string(), v.null()),
});

const briefValidator = v.object({
  contactName: v.string(),
  contactEmail: v.string(),
  companyName: v.string(),
  businessDescription: v.string(),
  industry: v.string(),
  primaryNeed: v.union(
    v.literal("simple_site"),
    v.literal("lead_generation"),
    v.literal("blog_cms"),
    v.literal("ecommerce"),
    v.literal("custom"),
  ),
  primaryAction: v.union(
    v.literal("contact"),
    v.literal("book_call"),
    v.literal("not_sure"),
  ),
  timeline: timelineValidator,
  additionalNotes: v.string(),
  termsAccepted: v.boolean(),
});

const briefUpdateValidator = v.object({
  contactName: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  companyName: v.optional(v.string()),
  businessDescription: v.optional(v.string()),
  industry: v.optional(v.string()),
  primaryNeed: v.optional(
    v.union(
      v.literal("simple_site"),
      v.literal("lead_generation"),
      v.literal("blog_cms"),
      v.literal("ecommerce"),
      v.literal("custom"),
    ),
  ),
  primaryAction: v.optional(
    v.union(v.literal("contact"), v.literal("book_call"), v.literal("not_sure")),
  ),
  timeline: v.optional(timelineValidator),
  additionalNotes: v.optional(v.string()),
  termsAccepted: v.optional(v.boolean()),
});

const planTierDetailsValidator = v.object({
  headline: v.string(),
  tierSummary: v.string(),
  summary: v.string(),
  pages: v.array(v.string()),
  features: v.array(v.string()),
  deliverableNotes: v.string(),
});

const planValidator = v.object({
  generatedAt: v.number(),
  promptVersion: v.string(),
  recommendedTier: v.union(planTierOption, v.null()),
  tiers: v.object({
    starter: planTierDetailsValidator,
    professional: planTierDetailsValidator,
    enterprise: planTierDetailsValidator,
  }),
});

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
        .query("onboarding_sessions")
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

    await ctx.db.insert("onboarding_sessions", {
      sessionId,
      resumeToken,
      brief: {
        contactName: "",
        contactEmail: "",
        companyName: "",
        businessDescription: "",
        industry: "",
        primaryNeed: "simple_site",
        primaryAction: "contact",
        timeline: {
          option: "asap",
          date: null,
        },
        additionalNotes: "",
        termsAccepted: false,
      },
      plan: undefined,
      selectedTier: null,
      recommendedTier: null,
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
      brief: briefValidator,
      plan: v.optional(planValidator),
      selectedTier: v.union(planTierOption, v.null()),
      recommendedTier: v.union(planTierOption, v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("onboarding_sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      resumeToken: session.resumeToken,
      brief: session.brief,
      plan: session.plan ?? undefined,
      selectedTier: session.selectedTier,
      recommendedTier: session.recommendedTier,
    };
  },
});

export const updateBrief = mutation({
  args: {
    sessionId: v.string(),
    brief: briefUpdateValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("onboarding_sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    const updatedBrief = { ...session.brief };
    for (const [key, value] of Object.entries(args.brief)) {
      if (value === undefined) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updatedBrief as any)[key] = value;
    }

    await ctx.db.patch(session._id, {
      brief: updatedBrief,
      updatedAt: Date.now(),
    });

    console.log("[onboarding] brief updated", {
      sessionId: session.sessionId,
      fields: Object.keys(args.brief),
    });

    return null;
  },
});

export const setSelectedTier = mutation({
  args: {
    sessionId: v.string(),
    tier: v.union(planTierOption, v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("onboarding_sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      selectedTier: args.tier,
      updatedAt: Date.now(),
    });

    console.log("[onboarding] tier selected", {
      sessionId: session.sessionId,
      tier: args.tier,
    });

    return null;
  },
});

export const savePlan = internalMutation({
  args: {
    sessionId: v.string(),
    plan: planValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("onboarding_sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      plan: args.plan,
      recommendedTier: args.plan.recommendedTier,
      updatedAt: Date.now(),
    });

    console.log("[onboarding] plan saved", {
      sessionId: session.sessionId,
      recommendedTier: args.plan.recommendedTier,
    });

    return null;
  },
});

export const getSessionInternal = internalQuery({
  args: {
    sessionId: v.string(),
  },
  returns: v.union(
    v.object({
      sessionId: v.string(),
      resumeToken: v.string(),
      brief: briefValidator,
      plan: v.optional(planValidator),
      sessionDocId: v.id("onboarding_sessions"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("onboarding_sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      resumeToken: session.resumeToken,
      brief: session.brief,
      plan: session.plan ?? undefined,
      sessionDocId: session._id,
    };
  },
});

export const generatePlanRecommendation = internalAction({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.onboarding_sessions.getSessionInternal, {
      sessionId: args.sessionId,
    });

    if (!session) {
      throw new Error("Session not found for plan generation");
    }

    console.log("[onboarding] generating plan", {
      sessionId: session.sessionId,
    });

    const now = Date.now();

    let generatedPlan: PlanProposal | null = null;

    try {
      const aiPlan = await ctx.runAction(internal.agent.generateProjectPlans, {
        brief: session.brief,
        priorTierId: session.plan?.recommendedTier ?? session.plan?.recommendedTier ?? null,
      });

      generatedPlan = {
        generatedAt: now,
        promptVersion: aiPlan.promptVersion,
        recommendedTier: aiPlan.recommendedTier,
        tiers: normalizeTiers(aiPlan.tiers),
      } satisfies PlanProposal;
    } catch (error) {
      console.error("[onboarding] AI plan generation failed, using fallback", {
        sessionId: session.sessionId,
        error,
      });
      const fallback = fallbackPlanFromBaselines();
      generatedPlan = {
        generatedAt: now,
        promptVersion: fallback.promptVersion,
        recommendedTier: fallback.recommendedTier,
        tiers: normalizeTiers(fallback.tiers),
      } satisfies PlanProposal;
    }

    await ctx.runMutation(internal.onboarding_sessions.savePlan, {
      sessionId: session.sessionId,
      plan: generatedPlan,
    });

    console.log("[onboarding] plan generation complete", {
      sessionId: session.sessionId,
      recommendedTier: generatedPlan?.recommendedTier,
    });

    return null;
  },
});

function normalizeTiers(
  tiers: Record<string, { headline: string; tierSummary?: string; summary: string; pages: Array<string>; features: Array<string>; deliverableNotes?: string }>,
): PlanProposal["tiers"] {
  const normalized = {} as PlanProposal["tiers"];

  for (const tier of PLAN_TIERS) {
    const payload = tiers[tier] ?? {};

    normalized[tier] = {
      headline: payload.headline || PLAN_TIER_BASELINES[tier].headline,
      tierSummary: payload.tierSummary || PLAN_TIER_BASELINES[tier].tierSummary,
      summary: payload.summary || PLAN_TIER_BASELINES[tier].summary,
      pages: Array.isArray(payload.pages) && payload.pages.length
        ? sanitizeList(payload.pages)
        : PLAN_TIER_BASELINES[tier].pages,
      features: Array.isArray(payload.features) && payload.features.length
        ? sanitizeList(payload.features)
        : PLAN_TIER_BASELINES[tier].features,
      deliverableNotes:
        payload.deliverableNotes?.trim() || PLAN_TIER_BASELINES[tier].deliverableNotes,
    } satisfies PlanProposal["tiers"][typeof tier];
  }

  return normalized;
}

function sanitizeList(values: Array<string>): Array<string> {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}
