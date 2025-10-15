import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const projectStatus = v.union(
  v.literal("AWAITING_PAYMENT"),
  v.literal("AWAITING_ASSETS"),
  v.literal("IN_PROGRESS"),
  v.literal("IN_REVIEW"),
  v.literal("LIVE"),
  v.literal("ARCHIVED"),
);

const planRecommendation = v.object({
  headline: v.string(),
  summary: v.string(),
  price: v.string(),
  pages: v.array(v.string()),
  features: v.array(v.string()),
  aiEditorAccess: v.boolean(),
  deliverableNotes: v.optional(v.string()),
});

export default defineSchema({
  profiles: defineTable({
    projectId: v.optional(v.string()),
    sessionId: v.string(),
    resumeToken: v.string(),
    authUserId: v.optional(v.string()),
    projectStatus: v.optional(projectStatus),
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
        tierId: v.union(v.string(), v.null()),
        recommendedOn: v.union(v.number(), v.null()),
        aiProposal: v.optional(
          v.object({
            generatedAt: v.number(),
            promptVersion: v.string(),
            tiers: v.object({
              starter: planRecommendation,
              professional: planRecommendation,
              enterprise: planRecommendation,
            }),
          }),
        ),
      }),
    ),
    paymentStatus: v.optional(
      v.object({
        status: v.string(),
        providerIntentId: v.union(v.string(), v.null()),
      }),
    ),
    subscription: v.optional(
      v.object({
        stripeSubscriptionId: v.string(),
        status: v.string(),
        currentPeriodEnd: v.number(),
      }),
    ),
    postPay: v.optional(
      v.object({
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
      }),
    ),
    deployment: v.optional(
      v.object({
        liveUrl: v.optional(v.string()),
        stagingUrl: v.optional(v.string()),
        vercelProjectId: v.optional(v.string()),
      }),
    ),
  })
    .index("by_projectId", ["projectId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_resumeToken", ["resumeToken"])
    .index("by_authUserId", ["authUserId"]),

  events: defineTable({
    sessionId: v.string(),
    projectId: v.optional(v.string()),
    kind: v.string(),
    payload: v.optional(v.any()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_kind", ["kind"]),
});
