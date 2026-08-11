import { v, type Infer } from "convex/values";
import type { ConceptBrief } from "../lib/concepts/brief";

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

/** Stage 4A: commercial terms of one engagement, hashed alongside the MSA. */
export const orderFormPricingValidator = v.object({
  setupFeeCents: v.number(),
  monthlyCents: v.number(),
  minimumTermMonths: v.number(),
  cancellationNoticeDays: v.number(),
  collectionMethod: v.union(
    v.literal("stripe_checkout"),
    v.literal("manual_invoice"),
  ),
});

export const orderFormSpecValidator = v.object({
  title: v.string(),
  engagementType: v.string(),
  summary: v.string(),
  pricing: orderFormPricingValidator,
  scope: v.array(v.string()),
  deliverables: v.array(v.string()),
  assignedDeliverables: v.array(v.string()),
  acceptanceCriteria: v.array(v.string()),
  exclusions: v.array(v.string()),
  clientDependencies: v.array(v.string()),
  notes: v.optional(v.string()),
});

export const orderFormStatusValidator = v.union(
  v.literal("draft"),
  v.literal("issued"),
  v.literal("superseded"),
);

export const orderFormValidator = v.object({
  projectId: v.id("projects"),
  version: v.string(),
  status: orderFormStatusValidator,
  spec: orderFormSpecValidator,
  /** MSA version this order form incorporates; bound into the hashed document. */
  msaVersion: v.string(),
  /** Client company name as rendered into the document. */
  clientName: v.string(),
  /** Public project slug, bound into the hashed document. */
  projectSlug: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  issuedAt: v.optional(v.number()),
  supersededAt: v.optional(v.number()),
  /** SHA-256 of the canonical HTML, computed server-side at issue. */
  issuedHash: v.optional(v.string()),
  /** Immutable billing link used only when collectionMethod is stripe_checkout. */
  stripePriceId: v.optional(v.string()),
  /** Optional one-time setup/deposit Price, charged on the initial subscription invoice. */
  setupStripePriceId: v.optional(v.string()),
  snapshotUrl: v.optional(v.string()),
  /** "system" for the prefilled standard draft, "admin" when authored from scratch. */
  authoredBy: v.union(v.literal("system"), v.literal("admin")),
});

export const agreementValidator = v.object({
  projectId: v.id("projects"),
  prospectId: v.optional(v.id("prospects")),
  authUserId: v.string(),
  method: v.literal("clickwrap"),
  source: v.literal("portal"),
  /**
   * Legacy fields, still written. Since Stage 4A these carry the MSA version and
   * hash so existing readers (checkout metadata, agreement email) keep working.
   */
  termsVersion: v.string(),
  termsHash: v.string(),
  /** Stage 4A: explicit MSA + order form provenance. Optional until backfilled. */
  msaVersion: v.optional(v.string()),
  msaHash: v.optional(v.string()),
  orderFormId: v.optional(v.id("order_forms")),
  orderFormVersion: v.optional(v.string()),
  orderFormHash: v.optional(v.string()),
  orderFormSnapshotUrl: v.optional(v.string()),
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

export const hubOperationalCounterKindValidator = v.union(
  v.literal("lead_accepted"),
  v.literal("lead_fanout_paused"),
  v.literal("lead_rate_limited_ingest"),
  v.literal("lead_rate_limited_visitor"),
  v.literal("lead_rate_limited_no_trusted"),
  /** Stage 2: authenticated credential supplied a mismatched body projectId. */
  v.literal("lead_project_mismatch"),
);

/** Hub API credential kinds (pk_ browser analytics vs sk_ server lead auth). */
export const projectCredentialKindValidator = v.union(
  v.literal("publishable"),
  v.literal("secret"),
);

/** Stage 3 typed client events (pageviews + conversion clicks). */
export const clientEventTypeValidator = v.union(
  v.literal("pageview"),
  v.literal("click"),
);

export const clientEventClickTargetValidator = v.union(
  v.literal("tel"),
  v.literal("email"),
  v.literal("directions"),
);

export const clientEventPayloadValidator = v.object({
  kind: v.literal("link"),
  target: clientEventClickTargetValidator,
});

/**
 * Coarse referrer class — not campaign/GBP attribution.
 * organic / social / direct / other only.
 */
export const referrerClassValidator = v.union(
  v.literal("organic"),
  v.literal("social"),
  v.literal("direct"),
  v.literal("other"),
);

/**
 * Public-safe credential row for admin UI — never includes credentialHash or raw key.
 */
export const projectCredentialPublicValidator = v.object({
  _id: v.id("project_credentials"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  keyId: v.string(),
  kind: projectCredentialKindValidator,
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  label: v.optional(v.string()),
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

/**
 * Prospect shape safe to return from a query a browser can call.
 *
 * `resumeToken` is deliberately absent. It is the sole authorization check for
 * `onboarding/sessions.saveDetailsInternal`, so returning it from any query
 * would hand out write access to the session. The onboarding client already
 * receives its token from `initSession` and holds it in localStorage; nothing
 * reads it back off a prospect document.
 */
export const prospectPublicValidator = v.object({
  _id: v.id("prospects"),
  _creationTime: v.number(),
  sessionId: v.string(),
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

export const googleLocationValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

export const googleAddressComponentValidator = v.object({
  longText: v.optional(v.string()),
  shortText: v.optional(v.string()),
  types: v.array(v.string()),
  languageCode: v.optional(v.string()),
});

export const googleOpeningHoursValidator = v.object({
  openNow: v.optional(v.boolean()),
  weekdayDescriptions: v.optional(v.array(v.string())),
});

export const physicalPresenceStatusValidator = v.union(
  v.literal("walk_in_likely"),
  v.literal("office_or_yard_likely"),
  v.literal("service_area_only"),
  v.literal("uncertain"),
  v.literal("not_operational"),
);

export const physicalPresenceValidator = v.object({
  status: physicalPresenceStatusValidator,
  confidence: v.number(),
  reasons: v.array(v.string()),
  inferredAt: v.number(),
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
  types: v.optional(v.array(v.string())),
  businessStatus: v.optional(v.string()),
  pureServiceAreaBusiness: v.optional(v.boolean()),
  location: v.optional(googleLocationValidator),
  addressComponents: v.optional(v.array(googleAddressComponentValidator)),
  regularOpeningHours: v.optional(googleOpeningHoursValidator),
  currentOpeningHours: v.optional(googleOpeningHoursValidator),
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

export const publicAuditStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("ready"),
  v.literal("failed"),
);

export const publicAuditDocValidator = v.object({
  _id: v.id("public_audits"),
  _creationTime: v.number(),
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
});

// --- Website concepts (Facebook lead -> bespoke homepage concept) ---

export const conceptApprovedQuoteValidator = v.object({
  author: v.string(),
  text: v.string(),
  rating: v.optional(v.number()),
});

/**
 * The verified generation brief. Mirrors `ConceptBrief` in
 * `lib/concepts/brief.ts`; the two are proved equivalent below.
 */
export const conceptBriefValidator = v.object({
  businessName: v.string(),
  category: v.optional(v.string()),
  address: v.optional(v.string()),
  locality: v.optional(v.string()),
  serviceArea: v.optional(v.string()),
  phone: v.optional(v.string()),
  googleRating: v.optional(v.number()),
  googleReviewCount: v.optional(v.number()),
  hours: v.optional(v.array(v.string())),
  googleMapsUrl: v.optional(v.string()),
  existingWebsiteUrl: v.optional(v.string()),
  existingTechnology: v.optional(v.string()),
  existingPerformanceScore: v.optional(v.number()),
  existingPrimaryColor: v.optional(v.string()),
  existingSiteSummary: v.optional(v.string()),
  notes: v.optional(v.string()),
  facebookPageUrl: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  photoUrls: v.array(v.string()),
  approvedQuotes: v.array(conceptApprovedQuoteValidator),
  googleReviewSummary: v.optional(v.string()),
});

/**
 * Compile-time proof that the stored validator and the shared TypeScript type
 * cannot drift apart. Either direction failing is a `tsc --noEmit` error, which
 * matters because the prompt builder and the HTML validator both read the
 * TypeScript type while Convex enforces the validator.
 */
type MutuallyAssignable<A extends B, B> = true;
export type ConceptBriefValidatorMatchesType = MutuallyAssignable<
  Infer<typeof conceptBriefValidator>,
  ConceptBrief
>;
export type ConceptBriefTypeMatchesValidator = MutuallyAssignable<
  ConceptBrief,
  Infer<typeof conceptBriefValidator>
>;

/**
 * A Google Places match candidate used for automatic or human confirmation.
 *
 * Attaching the wrong business silently is the failure that matters here. Only
 * a unique, independently corroborated match is auto-selected; the candidate
 * list is retained so every uncertain identity can be confirmed explicitly.
 */
export const conceptPlaceCandidateValidator = v.object({
  placeId: v.string(),
  businessName: v.string(),
  formattedAddress: v.string(),
  phone: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  googleMapsUrl: v.optional(v.string()),
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  primaryType: v.optional(v.string()),
  businessStatus: v.optional(v.string()),
});

export const conceptStatusValidator = v.union(
  v.literal("draft"),
  v.literal("enriching"),
  /** Places returned candidates but none met the automatic match threshold. */
  v.literal("matching"),
  v.literal("generating"),
  v.literal("review"),
  v.literal("published"),
  v.literal("failed"),
);

export const websiteConceptDocValidator = v.object({
  _id: v.id("website_concepts"),
  _creationTime: v.number(),
  token: v.string(),
  businessName: v.string(),
  facebookPageUrl: v.optional(v.string()),
  submittedWebsiteUrl: v.optional(v.string()),
  phone: v.optional(v.string()),
  serviceArea: v.optional(v.string()),
  notes: v.optional(v.string()),
  matchedGooglePlaceId: v.optional(v.string()),
  matchedGoogleMapsUrl: v.optional(v.string()),
  verifiedWebsiteUrl: v.optional(v.string()),
  placeCandidates: v.optional(v.array(conceptPlaceCandidateValidator)),
  placeMatchResolved: v.boolean(),
  logoStorageId: v.optional(v.id("_storage")),
  assetStorageIds: v.array(v.id("_storage")),
  approvedQuotes: v.array(conceptApprovedQuoteValidator),
  researchBrief: v.optional(conceptBriefValidator),
  generatedHtml: v.optional(v.string()),
  structureId: v.optional(v.string()),
  validationViolations: v.optional(v.array(v.string())),
  generationRequestId: v.optional(v.string()),
  status: conceptStatusValidator,
  model: v.optional(v.string()),
  promptVersion: v.optional(v.string()),
  error: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  firstViewedAt: v.optional(v.number()),
  lastViewedAt: v.optional(v.number()),
  viewCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  publishedAt: v.optional(v.number()),
});

/**
 * List projection for the admin index.
 *
 * `generatedHtml` is deliberately absent: a published concept is tens of
 * kilobytes of HTML, and shipping every row's document to the browser to render
 * a list of business names is wasteful. The review card fetches one full
 * concept by id.
 */
export const websiteConceptSummaryValidator = v.object({
  _id: v.id("website_concepts"),
  _creationTime: v.number(),
  token: v.string(),
  businessName: v.string(),
  facebookPageUrl: v.optional(v.string()),
  status: conceptStatusValidator,
  structureId: v.optional(v.string()),
  hasGeneratedHtml: v.boolean(),
  validationViolations: v.optional(v.array(v.string())),
  placeMatchResolved: v.boolean(),
  matchedGooglePlaceId: v.optional(v.string()),
  candidateCount: v.number(),
  assetCount: v.number(),
  model: v.optional(v.string()),
  promptVersion: v.optional(v.string()),
  error: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  firstViewedAt: v.optional(v.number()),
  lastViewedAt: v.optional(v.number()),
  viewCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
  publishedAt: v.optional(v.number()),
});

export const PLAN_GENERATION_THROTTLE_MS = 15_000;
export const PLAN_TEXT_MAX_LENGTH = 280;
export const SESSION_EXPIRY_DAYS = 30;
