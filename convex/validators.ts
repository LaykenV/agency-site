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
  notificationPhone: v.optional(v.string()),
  smsConsent: v.optional(v.object({
    acceptedAt: v.number(),
    disclosureVersion: v.string(),
    source: v.string(),
  })),
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

// ---------------------------------------------------------------------------
// Lead triage validators
// ---------------------------------------------------------------------------

export const triageVerdictValidator = v.union(
  v.literal("untriaged"),
  v.literal("allow"),
  v.literal("spam"),
  v.literal("review"),
);

export const triageObjectValidator = v.object({
  verdict: v.union(v.literal("allow"), v.literal("spam"), v.literal("review")),
  confidence: v.number(), // 0..1
  reasons: v.array(v.string()), // stable reason codes
  summary: v.optional(v.string()), // 1 sentence
  model: v.string(), // e.g. groq model id
  promptVersion: v.string(),
  triagedAt: v.number(),
  overriddenBy: v.optional(
    v.union(v.literal("client"), v.literal("admin"), v.literal("system"))
  ),
  overriddenAt: v.optional(v.number()),
  overrideReason: v.optional(v.string()),
  rawResponse: v.optional(v.string()),
});

// ---------------------------------------------------------------------------
// Marketing pipeline validators
// ---------------------------------------------------------------------------

export const marketingSearchStatusValidator = v.union(
  v.literal("searching"),
  v.literal("scraping"),
  v.literal("analyzing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("canceled"),
);

export const scrapedLeadStatusValidator = v.union(
  v.literal("new"),
  v.literal("scraping"),
  v.literal("scraped"),
  v.literal("analyzing"),
  v.literal("qualified"),
  v.literal("disqualified"),
  v.literal("contacted"),
  v.literal("follow_up"),
  v.literal("responded"),
  v.literal("converted"),
  v.literal("not_interested"),
  v.literal("error"),
);

export const googleReviewValidator = v.object({
  author: v.string(),
  text: v.string(),
  rating: v.number(),
});

export const googleDataValidator = v.object({
  businessName: v.string(),
  formattedAddress: v.string(),
  phone: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  googleMapsUrl: v.optional(v.string()),
  primaryType: v.optional(v.string()),
  photoUrl: v.optional(v.string()),
  topReview: v.optional(googleReviewValidator),
});

export const websiteDataValidator = v.object({
  primaryColor: v.optional(v.string()),
  heroImageUrl: v.optional(v.string()),
  technology: v.optional(v.string()),
  metaTitle: v.optional(v.string()),
  metaDescription: v.optional(v.string()),
  screenshotUrl: v.optional(v.string()),
  hasHttps: v.optional(v.boolean()),
  scrapedAt: v.number(),
});

export const pageSpeedDataValidator = v.object({
  performanceScore: v.number(),
  fcp: v.optional(v.number()),
  lcp: v.optional(v.number()),
  cls: v.optional(v.number()),
  fetchedAt: v.number(),
});

export const aiLeadAnalysisValidator = v.object({
  fitScore: v.number(),
  businessDescription: v.string(),
  painPoints: v.array(v.string()),
  sellingPoints: v.array(v.string()),
  outreachAngle: v.string(),
  analyzedAt: v.number(),
});

export const marketingSearchDocValidator = v.object({
  _id: v.id("marketing_searches"),
  _creationTime: v.number(),
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
});

export const scrapedLeadDocValidator = v.object({
  _id: v.id("scraped_leads"),
  _creationTime: v.number(),
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
});

export const PLAN_GENERATION_THROTTLE_MS = 15_000;
export const PLAN_TEXT_MAX_LENGTH = 280;
export const SESSION_EXPIRY_DAYS = 30;
