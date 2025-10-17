import { MutationCtx, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import type { PlanTierOption } from "../types/profile";

const planTierOption = v.union(
  v.literal("starter"),
  v.literal("professional"),
  v.literal("enterprise"),
);

export const linkAnonymousSession = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const authUserId = identity.subject || identity.tokenIdentifier;

    const session = await ctx.db
      .query("onboarding_sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Onboarding session not found");
    }

    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .unique();

    if (existingProject) {
      return null;
    }

    const projectId = await generateUniqueProjectId(ctx, session.brief.companyName);

    await ctx.db.insert("projects", {
      authUserId,
      projectId,
      onboardingSessionId: session._id,
      planTier: session.selectedTier,
      planProposal: session.plan,
      projectStatus: "AWAITING_PAYMENT",
      paymentStatus: undefined,
      postPay: undefined,
      deployment: undefined,
    });

    console.log("[projects] anonymous session linked", {
      sessionId: session.sessionId,
      authUserId,
      projectId,
    });

    return null;
  },
});

export const confirmCheckout = mutation({
  args: {
    sessionId: v.string(),
    tier: planTierOption,
  },
  returns: v.object({
    projectId: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required. Please sign in to complete checkout.");
    }

    const authUserId = identity.subject || identity.tokenIdentifier;

    const session = await ctx.db
      .query("onboarding_sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found. Please restart onboarding.");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .unique();

    if (!project) {
      const projectId = await generateUniqueProjectId(ctx, session.brief.companyName);

      const projectDocId = await ctx.db.insert("projects", {
        authUserId,
        projectId,
        onboardingSessionId: session._id,
        planTier: args.tier,
        planProposal: session.plan,
        projectStatus: "AWAITING_ASSETS",
        paymentStatus: {
          status: "succeeded",
          providerIntentId: null,
        },
        postPay: undefined,
        deployment: undefined,
      });

      await ctx.db.patch(session._id, {
        selectedTier: args.tier,
        updatedAt: Date.now(),
      });

      console.log("[projects] checkout confirmed", {
        projectId,
        authUserId,
        sessionId: session.sessionId,
        projectDocId,
      });

      return { projectId };
    }

    await ctx.db.patch(project._id, {
      planTier: args.tier,
      planProposal: session.plan,
      projectStatus: "AWAITING_ASSETS",
      paymentStatus: {
        status: "succeeded",
        providerIntentId: null,
      },
    });

    await ctx.db.patch(session._id, {
      selectedTier: args.tier,
      updatedAt: Date.now(),
    });

    console.log("[projects] checkout confirmed existing", {
      projectId: project.projectId,
      authUserId,
      sessionId: session.sessionId,
    });

    return { projectId: project.projectId };
  },
});

export const getProjectById = query({
  args: {
    projectId: v.string(),
  },
  returns: v.union(
    v.object({
      projectId: v.string(),
      planTier: v.union(planTierOption, v.null()),
      planProposal: v.optional(
        v.object({
          generatedAt: v.number(),
          promptVersion: v.string(),
          recommendedTier: v.union(planTierOption, v.null()),
          tiers: v.object({
            starter: v.object({
              headline: v.string(),
              tierSummary: v.string(),
              summary: v.string(),
              pages: v.array(v.string()),
              features: v.array(v.string()),
              deliverableNotes: v.string(),
            }),
            professional: v.object({
              headline: v.string(),
              tierSummary: v.string(),
              summary: v.string(),
              pages: v.array(v.string()),
              features: v.array(v.string()),
              deliverableNotes: v.string(),
            }),
            enterprise: v.object({
              headline: v.string(),
              tierSummary: v.string(),
              summary: v.string(),
              pages: v.array(v.string()),
              features: v.array(v.string()),
              deliverableNotes: v.string(),
            }),
          }),
        }),
      ),
      projectStatus: v.optional(
        v.union(
          v.literal("AWAITING_PAYMENT"),
          v.literal("AWAITING_ASSETS"),
          v.literal("IN_PROGRESS"),
          v.literal("IN_REVIEW"),
          v.literal("LIVE"),
          v.literal("ARCHIVED"),
        ),
      ),
      paymentStatus: v.optional(
        v.object({
          status: v.string(),
          providerIntentId: v.union(v.string(), v.null()),
        }),
      ),
      onboardingSessionId: v.optional(v.id("onboarding_sessions")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const authUserId = identity.subject || identity.tokenIdentifier;

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .unique();

    if (!project || project.authUserId !== authUserId) {
      throw new Error("Unauthorized or project not found");
    }

    return {
      projectId: project.projectId,
      planTier: project.planTier,
      planProposal: project.planProposal ?? undefined,
      projectStatus: project.projectStatus,
      paymentStatus: project.paymentStatus,
      onboardingSessionId: project.onboardingSessionId ?? undefined,
    };
  },
});

export const getCurrentProject = query({
  args: {},
  returns: v.union(
    v.object({
      projectId: v.string(),
      planTier: v.union(planTierOption, v.null()),
      planProposal: v.optional(
        v.object({
          generatedAt: v.number(),
          promptVersion: v.string(),
          recommendedTier: v.union(planTierOption, v.null()),
          tiers: v.object({
            starter: v.object({
              headline: v.string(),
              tierSummary: v.string(),
              summary: v.string(),
              pages: v.array(v.string()),
              features: v.array(v.string()),
              deliverableNotes: v.string(),
            }),
            professional: v.object({
              headline: v.string(),
              tierSummary: v.string(),
              summary: v.string(),
              pages: v.array(v.string()),
              features: v.array(v.string()),
              deliverableNotes: v.string(),
            }),
            enterprise: v.object({
              headline: v.string(),
              tierSummary: v.string(),
              summary: v.string(),
              pages: v.array(v.string()),
              features: v.array(v.string()),
              deliverableNotes: v.string(),
            }),
          }),
        }),
      ),
      projectStatus: v.optional(
        v.union(
          v.literal("AWAITING_PAYMENT"),
          v.literal("AWAITING_ASSETS"),
          v.literal("IN_PROGRESS"),
          v.literal("IN_REVIEW"),
          v.literal("LIVE"),
          v.literal("ARCHIVED"),
        ),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const authUserId = identity.subject || identity.tokenIdentifier;

    const project = await ctx.db
      .query("projects")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .unique();

    if (!project) {
      return null;
    }

    return {
      projectId: project.projectId,
      planTier: project.planTier,
      planProposal: project.planProposal ?? undefined,
      projectStatus: project.projectStatus,
    };
  },
});

async function generateUniqueProjectId(
  ctx: MutationCtx,
  companyName: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const baseSlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  let candidate = `${baseSlug || "project"}-${year}`;
  let attempt = 0;

  while (attempt < 100) {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", candidate))
      .unique();

    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug || "project"}-${year}-${attempt}`;
  }

  throw new Error("Unable to generate unique project ID");
}
