import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import {
  defaultProfile,
  OnboardingBrief,
  OnboardingField,
  PlanState,
  ProjectStatus,
} from "../types/profile";
import { internal } from "./_generated/api";

const needOptionValidator = v.union(
  v.literal("simple_site"),
  v.literal("lead_generation"),
  v.literal("blog_cms"),
  v.literal("ecommerce"),
  v.literal("custom"),
);

const primaryActionValidator = v.union(
  v.literal("contact"),
  v.literal("book_call"),
  v.literal("not_sure"),
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
  primaryNeed: needOptionValidator,
  primaryAction: primaryActionValidator,
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
  primaryNeed: v.optional(needOptionValidator),
  primaryAction: v.optional(primaryActionValidator),
  timeline: v.optional(timelineValidator),
  additionalNotes: v.optional(v.string()),
  termsAccepted: v.optional(v.boolean()),
});

const planRecommendationValidator = v.object({
  headline: v.string(),
  summary: v.string(),
  price: v.string(),
  pages: v.array(v.string()),
  features: v.array(v.string()),
  aiEditorAccess: v.boolean(),
  deliverableNotes: v.optional(v.string()),
});

const planStateValidator = v.object({
  tierId: v.union(v.string(), v.null()),
  recommendedOn: v.union(v.number(), v.null()),
  aiProposal: v.optional(
    v.object({
      generatedAt: v.number(),
      promptVersion: v.string(),
      tiers: v.object({
        starter: planRecommendationValidator,
        professional: planRecommendationValidator,
        enterprise: planRecommendationValidator,
      }),
    }),
  ),
});

const projectStatusValidator = v.union(
  v.literal("AWAITING_PAYMENT"),
  v.literal("AWAITING_ASSETS"),
  v.literal("IN_PROGRESS"),
  v.literal("IN_REVIEW"),
  v.literal("LIVE"),
  v.literal("ARCHIVED"),
);

export const initSession = mutation({
  args: {},
  returns: v.object({
    sessionId: v.string(),
    resumeToken: v.string(),
  }),
  handler: async (ctx) => {
    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomUUID();

    await ctx.db.insert("profiles", {
      sessionId,
      resumeToken,
      brief: defaultProfile,
      plan: {
        tierId: null,
        recommendedOn: null,
      },
    });

    await ctx.db.insert("events", {
      sessionId,
      kind: "profile.created",
      payload: null,
    });

    return { sessionId, resumeToken };
  },
});

export const getProfileBySession = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.union(
    v.object({
      sessionId: v.string(),
      resumeToken: v.string(),
      brief: briefValidator,
      plan: v.optional(planStateValidator),
      projectStatus: v.optional(projectStatusValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!profile) {
      return null;
    }

    return {
      sessionId: profile.sessionId,
      resumeToken: profile.resumeToken,
      brief: profile.brief as OnboardingBrief,
      plan: profile.plan as PlanState | undefined,
      projectStatus: profile.projectStatus as ProjectStatus | undefined,
    } satisfies {
      sessionId: string;
      resumeToken: string;
      brief: OnboardingBrief;
      plan?: PlanState;
      projectStatus?: ProjectStatus;
    };
  },
});

export const updateProfileBySession = mutation({
  args: {
    sessionId: v.string(),
    brief: briefUpdateValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const updates = { ...profile.brief } as OnboardingBrief;
    for (const [key, value] of Object.entries(args.brief)) {
      if (value === undefined) continue;
      (updates as Record<OnboardingField, OnboardingBrief[OnboardingField]>)[
        key as OnboardingField
      ] = value as OnboardingBrief[OnboardingField];
    }

    await ctx.db.patch(profile._id, {
      brief: updates,
    });

    await ctx.db.insert("events", {
      sessionId: profile.sessionId,
      projectId: profile.projectId,
      kind: "profile.updated",
      payload: args.brief,
    });

    return null;
  },
});

export const setPlanSelection = mutation({
  args: {
    sessionId: v.string(),
    tierId: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      plan: {
        ...(profile.plan ?? { tierId: null, recommendedOn: null }),
        tierId: args.tierId,
      },
    });

    await ctx.db.insert("events", {
      sessionId: profile.sessionId,
      projectId: profile.projectId,
      kind: "plan.tier_selected",
      payload: { tierId: args.tierId },
    });

    return null;
  },
});

export const recordPlanRecommendation = internalMutation({
  args: {
    sessionId: v.string(),
    plan: planStateValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      plan: args.plan,
    });

    await ctx.db.insert("events", {
      sessionId: profile.sessionId,
      projectId: profile.projectId,
      kind: "plan.ai_generated",
      payload: args.plan,
    });

    return null;
  },
});

export const getProfileInternal = internalQuery({
  args: {
    sessionId: v.string(),
  },
  returns: v.union(
    v.object({
      sessionId: v.string(),
      resumeToken: v.string(),
      brief: briefValidator,
      plan: v.optional(planStateValidator),
      profileId: v.id("profiles"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!profile) {
      return null;
    }

    return {
      sessionId: profile.sessionId,
      resumeToken: profile.resumeToken,
      brief: profile.brief as OnboardingBrief,
      plan: profile.plan as PlanState | undefined,
      profileId: profile._id,
    };
  },
});

export const generatePlanRecommendation = internalAction({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.profiles.getProfileInternal, {
      sessionId: args.sessionId,
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Placeholder AI call – replace with real provider integration.
    const now = Date.now();
    const plan: PlanState = {
      tierId: profile.plan?.tierId ?? null,
      recommendedOn: now,
      aiProposal: {
        generatedAt: now,
        promptVersion: "v1",
        tiers: {
          starter: {
            headline: "Launch fast with a polished presence",
            summary: "Perfect for new businesses getting online quickly.",
            price: "$3,500",
            pages: ["Home", "About", "Services", "Contact", "Legal"],
            features: [
              "Responsive design",
              "Contact form",
              "Basic SEO setup",
            ],
            aiEditorAccess: true,
          },
          professional: {
            headline: "Convert leads with a marketing engine",
            summary: "Adds blog, scheduling, and automation hooks.",
            price: "$7,500",
            pages: [
              "Home",
              "About",
              "Services",
              "Case Studies",
              "Blog",
              "Contact",
            ],
            features: [
              "Lead capture automations",
              "Booking calendar",
              "CMS-powered blog",
            ],
            aiEditorAccess: true,
            deliverableNotes: "Includes Calendly integration if credentials provided.",
          },
          enterprise: {
            headline: "Custom workflows for scale",
            summary: "Tailored experiences with authentication and dashboards.",
            price: "$12,000+",
            pages: [
              "Home",
              "Solutions",
              "Pricing",
              "Resources",
              "Customer portal",
            ],
            features: [
              "User auth & role management",
              "Custom dashboards",
              "API integrations",
            ],
            aiEditorAccess: true,
          },
        },
      },
    };

    await ctx.runMutation(internal.profiles.recordPlanRecommendation, {
      sessionId: args.sessionId,
      plan,
    });

    return null;
  },
});

