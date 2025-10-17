import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        enabled: true,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scope: ["email", "profile"],
        prompt: "select_account",
      },
    },
    plugins: [convex()],
  });
};

export const getCurrentUser = query({
  args: {},
  returns: v.union(v.any(), v.null()),
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});

export const getCurrentUserProfile = query({
  args: {},
  returns: v.union(
    v.object({
      onboardingSessionId: v.id("onboarding_sessions"),
      sessionId: v.string(),
      resumeToken: v.string(),
      projectId: v.optional(v.string()),
      brief: v.object({
        contactName: v.string(),
        contactEmail: v.string(),
        companyName: v.string(),
        businessDescription: v.string(),
        industry: v.string(),
        primaryNeed: v.string(),
        primaryAction: v.string(),
        timeline: v.object({
          option: v.string(),
          date: v.union(v.string(), v.null()),
        }),
        additionalNotes: v.string(),
        termsAccepted: v.boolean(),
      }),
      plan: v.optional(
        v.object({
          generatedAt: v.number(),
          promptVersion: v.string(),
          recommendedTier: v.union(
            v.literal("starter"),
            v.literal("professional"),
            v.literal("enterprise"),
            v.null(),
          ),
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

    if (!project.onboardingSessionId) {
      return {
        onboardingSessionId: project.onboardingSessionId ?? (undefined as never),
        sessionId: "",
        resumeToken: "",
        projectId: project.projectId,
        brief: {
          contactName: "",
          contactEmail: "",
          companyName: "",
          businessDescription: "",
          industry: "",
          primaryNeed: "simple_site",
          primaryAction: "contact",
          timeline: { option: "asap", date: null },
          additionalNotes: "",
          termsAccepted: false,
        },
        plan: undefined,
      };
    }

    const session = await ctx.db.get(project.onboardingSessionId);
    if (!session) {
      throw new Error("Linked onboarding session missing");
    }

    return {
      onboardingSessionId: session._id,
      sessionId: session.sessionId,
      resumeToken: session.resumeToken,
      projectId: project.projectId,
      brief: session.brief,
      plan: session.plan ?? undefined,
    };
  },
});

