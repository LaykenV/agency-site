import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const planTierOption = v.union(
  v.literal("starter"),
  v.literal("professional"),
  v.literal("enterprise"),
);

const planTierDetails = v.object({
  headline: v.string(),
  tierSummary: v.string(),
  summary: v.string(),
  pages: v.array(v.string()),
  features: v.array(v.string()),
  deliverableNotes: v.string(),
});

const planProposal = v.object({
  generatedAt: v.number(),
  promptVersion: v.string(),
  recommendedTier: v.union(planTierOption, v.null()),
  tiers: v.object({
    starter: planTierDetails,
    professional: planTierDetails,
    enterprise: planTierDetails,
  }),
});

const timeline = v.object({
  option: v.union(v.literal("asap"), v.literal("date")),
  date: v.union(v.string(), v.null()),
});

const onboardingBrief = v.object({
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
  timeline,
  additionalNotes: v.string(),
  termsAccepted: v.boolean(),
});

const projectStatus = v.union(
  v.literal("AWAITING_PAYMENT"),
  v.literal("AWAITING_ASSETS"),
  v.literal("IN_PROGRESS"),
  v.literal("IN_REVIEW"),
  v.literal("LIVE"),
  v.literal("ARCHIVED"),
);

const paymentStatus = v.object({
  status: v.string(),
  providerIntentId: v.union(v.string(), v.null()),
});

const postPay = v.object({
  headline: v.union(v.string(), v.null()),
  domainPreference: v.union(v.string(), v.null()),
  inspirationLinks: v.array(v.string()),
  functionalRequirements: v.union(v.string(), v.null()),
  brand: v.object({
    logoStatus: v.union(v.literal("ready"), v.literal("not_yet")),
    photoStatus: v.union(v.literal("ready"), v.literal("not_yet")),
    styleVibe: v.union(v.string(), v.null()),
    logoUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
  }),
  brandAssetsUploaded: v.boolean(),
});

const deployment = v.object({
  liveUrl: v.optional(v.string()),
  stagingUrl: v.optional(v.string()),
  vercelProjectId: v.optional(v.string()),
});

export default defineSchema({
  onboarding_sessions: defineTable({
    sessionId: v.string(),
    resumeToken: v.string(),
    brief: onboardingBrief,
    plan: v.optional(planProposal),
    selectedTier: v.union(planTierOption, v.null()),
    recommendedTier: v.union(planTierOption, v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_resumeToken", ["resumeToken"]),

  projects: defineTable({
    authUserId: v.string(),
    projectId: v.string(),
    onboardingSessionId: v.optional(v.id("onboarding_sessions")),
    planTier: v.union(planTierOption, v.null()),
    planProposal: v.optional(planProposal),
    projectStatus: v.optional(projectStatus),
    paymentStatus: v.optional(paymentStatus),
    postPay: v.optional(postPay),
    deployment: v.optional(deployment),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_projectId", ["projectId"]),
});
