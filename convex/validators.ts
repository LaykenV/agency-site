import { v } from "convex/values";

export const prospectDetailsValidator = v.object({
  contactName: v.string(),
  contactEmail: v.string(),
  companyName: v.string(),
  phone: v.string(),
  currentWebsite: v.string(),
  businessDescription: v.string(),
  goals: v.string(),
  notes: v.string(),
});

export const aiGeneratedPlanValidator = v.object({
  generatedAt: v.number(),
  promptVersion: v.string(),
  headline: v.string(),
  summary: v.string(),
  highlights: v.array(v.string()),
  nextSteps: v.array(v.string()),
});

export const projectStatusValidator = v.union(
  v.literal("AWAITING_PAYMENT"),
  v.literal("AWAITING_ASSETS"),
  v.literal("IN_PROGRESS"),
  v.literal("IN_REVIEW"),
  v.literal("LIVE"),
  v.literal("ARCHIVED"),
);

export const buildDetailsValidator = v.object({
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

export const deploymentValidator = v.object({
  liveUrl: v.optional(v.string()),
  stagingUrl: v.optional(v.string()),
  vercelProjectId: v.optional(v.string()),
});

export const calBookingValidator = v.object({
  scheduledAt: v.number(),
  meetingUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const prospectValidator = v.object({
  _id: v.id("prospects"),
  _creationTime: v.number(),
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
});

export const PLAN_GENERATION_THROTTLE_MS = 15_000;
export const PLAN_TEXT_MAX_LENGTH = 280;
export const SESSION_EXPIRY_DAYS = 30;

