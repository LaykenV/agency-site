import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  aiGeneratedPlanValidator,
  buildDetailsValidator,
  calBookingValidator,
  deploymentValidator,
  projectStatusValidator,
  prospectDetailsStoredValidator,
  agreementValidator,
  activityLogValidator,
  scheduledCallValidator,
  triageVerdictValidator,
  triageObjectValidator,
  marketingSearchStatusValidator,
  scrapedLeadStatusValidator,
  googleDataValidator,
  websiteDataValidator,
  pageSpeedDataValidator,
  aiLeadAnalysisValidator,
  publicAuditStatusValidator,
} from "./validators";

export default defineSchema({
  prospects: defineTable({
    sessionId: v.string(),
    resumeToken: v.string(),
    details: prospectDetailsStoredValidator,
    aiGeneratedPlan: v.optional(aiGeneratedPlanValidator),
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
    buildDetails: v.optional(buildDetailsValidator),
    deployment: v.optional(deploymentValidator),
    calKickoffBooking: v.optional(calBookingValidator),
    calReviewBooking: v.optional(calBookingValidator),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_projectId", ["projectId"])
    .index("by_prospectId", ["prospectId"])
    .index("by_updatedAt", ["updatedAt"]),

  agreements: defineTable(agreementValidator)
    .index("by_projectId", ["projectId"])
    .index("by_prospectId", ["prospectId"])
    .index("by_authUserId", ["authUserId"])
    .index("by_acceptedAt", ["acceptedAt"]),

  activity_log: defineTable(activityLogValidator)
    .index("by_projectId", ["projectId"])
    .index("by_prospectId", ["prospectId"])
    .index("by_createdAt", ["createdAt"]),

  scheduled_calls: defineTable(scheduledCallValidator)
    .index("by_projectId", ["projectId"])
    .index("by_prospectId", ["prospectId"])
    .index("by_startTime", ["startTime"])
    .index("by_calEventId", ["calEventId"])
    .index("by_externalBookingId", ["externalBookingId"]),

  billingCustomers: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    email: v.optional(v.string()),
    createdAtMs: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_customer", ["stripeCustomerId"])
    .index("by_email", ["email"]),

  subscriptions: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    subscriptionId: v.string(),
    status: v.string(),
    priceId: v.string(),
    currentPeriodStartMs: v.number(),
    currentPeriodEndMs: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    paymentBrand: v.optional(v.string()),
    paymentLast4: v.optional(v.string()),
    updatedAtMs: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"]),

  edit_requests: defineTable({
    projectId: v.id("projects"),
    authUserId: v.string(),
    title: v.string(),
    details: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_on_client"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    attachments: v.optional(v.array(v.id("_storage"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_status_and_projectId", ["status", "projectId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  client_leads: defineTable({
    projectId: v.string(), // Human-readable slug, matches waas.projectId in template config
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("won"),
      v.literal("lost")
    ),
    source: v.string(), // "contact-form", "footer-form", "phone"
    data: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      message: v.optional(v.string()),
    }),
    createdAt: v.number(),
    // AI triage fields (optional for backward compat with existing leads)
    triageVerdict: v.optional(triageVerdictValidator),
    triage: v.optional(triageObjectValidator),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_status", ["projectId", "status"])
    .index("by_projectId_and_triageVerdict", ["projectId", "triageVerdict"])
    .index("by_createdAt", ["createdAt"]),

  client_analytics: defineTable({
    projectId: v.string(), // Human-readable slug
    date: v.string(), // YYYY-MM-DD
    pageViews: v.number(),
    topPages: v.array(v.object({ path: v.string(), views: v.number() })),
  }).index("by_projectId_and_date", ["projectId", "date"]),

  marketing_searches: defineTable({
    city: v.string(),
    state: v.string(),
    industry: v.string(),
    searchQuery: v.string(),
    status: marketingSearchStatusValidator,
    totalFound: v.number(),
    totalScraped: v.number(),
    totalQualified: v.number(),
    workflowId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_city_and_industry", ["city", "industry"]),

  scraped_leads: defineTable({
    searchId: v.id("marketing_searches"),
    placeId: v.string(),
    googleData: googleDataValidator,
    websiteData: v.optional(websiteDataValidator),
    pageSpeedData: v.optional(pageSpeedDataValidator),
    aiAnalysis: v.optional(aiLeadAnalysisValidator),
    status: scrapedLeadStatusValidator,
    demoToken: v.optional(v.string()),
    demoScreenshotUrl: v.optional(v.string()),
    demoViewedAt: v.optional(v.number()),
    contactEmail: v.optional(v.string()),
    emailSentAt: v.optional(v.number()),
    calledAt: v.optional(v.number()),
    followUpAt: v.optional(v.number()),
    convertedToProspectId: v.optional(v.id("prospects")),
    adminNotes: v.optional(v.string()),
    contactAttempts: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_searchId", ["searchId"])
    .index("by_status", ["status"])
    .index("by_searchId_and_status", ["searchId", "status"])
    .index("by_searchId_and_placeId", ["searchId", "placeId"])
    .index("by_placeId", ["placeId"])
    .index("by_demoToken", ["demoToken"])
    .index("by_followUpAt", ["followUpAt"])
    .index("by_createdAt", ["createdAt"]),

  public_audits: defineTable({
    token: v.string(),
    submittedUrl: v.string(),
    normalizedUrl: v.string(),
    source: v.optional(v.string()),
    prospectId: v.optional(v.id("prospects")),
    status: publicAuditStatusValidator,
    websiteData: v.optional(websiteDataValidator),
    pageSpeedData: v.optional(pageSpeedDataValidator),
    aiAnalysis: v.optional(aiLeadAnalysisValidator),
    viewedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_prospectId", ["prospectId"])
    .index("by_createdAt", ["createdAt"]),

  //errorReports - future
});
