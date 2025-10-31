import { v } from "convex/values";

export const prospectDetailsStoredValidator = v.object({
  contactName: v.string(),
  contactEmail: v.string(),
  companyName: v.string(),
  phone: v.string(),
  currentWebsite: v.string(),
  businessDescription: v.string(),
  prospectNotes: v.string(),
  myNotes: v.optional(v.string()),
});

export const prospectDetailsPublicValidator = v.object({
  contactName: v.string(),
  contactEmail: v.string(),
  companyName: v.string(),
  phone: v.string(),
  currentWebsite: v.string(),
  businessDescription: v.string(),
  prospectNotes: v.string(),
});

// Legacy export for backwards compatibility during migration
export const prospectDetailsValidator = prospectDetailsStoredValidator;

export const aiGeneratedPlanValidator = v.object({
  generatedAt: v.number(),
  promptVersion: v.string(),
  headline: v.string(),
  summary: v.string(),
  highlights: v.array(v.string()),
  nextSteps: v.array(v.string()),
});

export const projectStatusValidator = v.union(
  v.literal("AWAITING_AGREEMENT"),
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
  myNotes: v.union(v.string(), v.null()),
  brand: v.object({
    colorScheme: v.object({
      primary: v.string(),
      accent: v.string(),
    }),
    logoStorageId: v.optional(v.id("_storage")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
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
  endTime: v.optional(v.number()),
  title: v.optional(v.string()),
  meetingUrl: v.optional(v.string()),
  notes: v.optional(v.string()),
  calEventId: v.optional(v.string()),
  iCalUID: v.optional(v.string()),
  attendeeMetadata: v.optional(v.object({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  })),
  status: v.optional(v.string()),
  eventTypeKey: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  externalBookingId: v.optional(v.string()),
});

export const agreementValidator = v.object({
  projectId: v.id("projects"),
  prospectId: v.optional(v.id("prospects")),
  authUserId: v.string(),
  method: v.literal("clickwrap"),
  source: v.literal("portal"),
  termsVersion: v.string(),
  termsHash: v.string(),
  acceptedAt: v.number(),
  ip: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  snapshotUrl: v.optional(v.string()),
});

export const activityLogValidator = v.object({
  projectId: v.optional(v.id("projects")),
  prospectId: v.optional(v.id("prospects")),
  actor: v.union(v.literal("system"), v.literal("user"), v.literal("admin")),
  kind: v.string(),
  payload: v.optional(v.any()),
  createdAt: v.number(),
});

export const scheduledCallValidator = v.object({
  projectId: v.optional(v.id("projects")),
  prospectId: v.optional(v.id("prospects")),
  type: v.union(
    v.literal("confirmation"),
    v.literal("kickoff"),
    v.literal("review"),
    v.literal("support"),
  ),
  title: v.optional(v.string()),
  startTime: v.number(),
  endTime: v.number(),
  status: v.string(),
  meetingUrl: v.optional(v.string()),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
  calEventId: v.optional(v.string()),
  iCalUID: v.optional(v.string()),
  eventTypeKey: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  externalBookingId: v.optional(v.string()),
  attendeeMetadata: v.optional(v.object({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  })),
});

export const prospectValidator = v.object({
  _id: v.id("prospects"),
  _creationTime: v.number(),
  sessionId: v.string(),
  resumeToken: v.string(),
  details: prospectDetailsStoredValidator,
  aiGeneratedPlan: v.optional(aiGeneratedPlanValidator),
  calProspectBooking: v.optional(calBookingValidator),
  lastPlanRequestedAt: v.optional(v.number()),
  planGenerationInProgress: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const prospectPublicValidator = v.object({
  _id: v.id("prospects"),
  _creationTime: v.number(),
  sessionId: v.string(),
  resumeToken: v.string(),
  details: prospectDetailsPublicValidator,
  aiGeneratedPlan: v.optional(aiGeneratedPlanValidator),
  calProspectBooking: v.optional(calBookingValidator),
  lastPlanRequestedAt: v.optional(v.number()),
  planGenerationInProgress: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const editRequestValidator = v.object({
  _id: v.id("edit_requests"),
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
  _creationTime: v.number(),
});

export const PLAN_GENERATION_THROTTLE_MS = 15_000;
export const PLAN_TEXT_MAX_LENGTH = 280;
export const SESSION_EXPIRY_DAYS = 30;

