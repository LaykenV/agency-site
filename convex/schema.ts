import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { briefValidator, planValidator } from "./validators";

const projectStatus = v.union(
  v.literal("AWAITING_PAYMENT"),
  v.literal("AWAITING_ASSETS"),
  v.literal("IN_PROGRESS"),
  v.literal("IN_REVIEW"),
  v.literal("LIVE"),
  v.literal("ARCHIVED"),
);

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
    brief: briefValidator,
    plan: v.optional(planValidator),
    contactEmail: v.optional(v.string()),
    lastPlanRequestedAt: v.optional(v.number()),
    planGenerationInProgress: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_resumeToken", ["resumeToken"])
    .index("by_contactEmail", ["contactEmail"])
    .index("by_updatedAt", ["updatedAt"]),

  /*prospects: defineTable({
    sessionId: v.string(),
    resumeToken: v.string(),
    aiGeneratedPlan: v.optional(planValidator), // same as plan in onboarding_sessions, rename to aiGeneratedPlanValidator
    contractSignedTimestamp: v.optional(v.number()),
    calProspectBooking: v.optional(calBookingValidator),
    details: briefValidator, rename to detailsValidator
    lastPlanRequestedAt: v.optional(v.number()),
    planGenerationInProgress: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
   all relevant indexes*/

  projects: defineTable({
    authUserId: v.string(),
    projectId: v.string(),
    onboardingSessionId: v.optional(v.id("onboarding_sessions")),
    projectStatus: v.optional(projectStatus),
    stripeCustomerId: v.optional(v.string()),
    postPay: v.optional(postPay), //rename to build details
    deployment: v.optional(deployment),
    //calKickoffBooking: v.optional(calBookingValidator),
    //calReviewBooking: v.optional(calBookingValidator),
    //prospectDetails: detailsValidator,
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_projectId", ["projectId"]),

  //subscriptions
  //editRequests
  //errorReports
});
