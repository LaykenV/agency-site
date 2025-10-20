import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  aiGeneratedPlanValidator,
  buildDetailsValidator,
  calBookingValidator,
  deploymentValidator,
  projectStatusValidator,
  prospectDetailsValidator,
} from "./validators";

export default defineSchema({
  prospects: defineTable({
    sessionId: v.string(),
    resumeToken: v.string(),
    details: prospectDetailsValidator,
    aiGeneratedPlan: v.optional(aiGeneratedPlanValidator),
    contractSignedTimestamp: v.optional(v.number()),
    calProspectBooking: v.optional(calBookingValidator),
    lastPlanRequestedAt: v.optional(v.number()),
    planGenerationInProgress: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_resumeToken", ["resumeToken"])
    .index("by_contactEmail", ["details.contactEmail"])
    .index("by_updatedAt", ["updatedAt"]),

  projects: defineTable({
    authUserId: v.string(),
    projectId: v.string(),
    prospectId: v.optional(v.id("prospects")),
    projectStatus: v.optional(projectStatusValidator),
    stripeCustomerId: v.optional(v.string()),
    buildDetails: v.optional(buildDetailsValidator),
    deployment: v.optional(deploymentValidator),
    calKickoffBooking: v.optional(calBookingValidator),
    calReviewBooking: v.optional(calBookingValidator),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_projectId", ["projectId"]),

  //subscriptions
  //editRequests
  //errorReports
});
