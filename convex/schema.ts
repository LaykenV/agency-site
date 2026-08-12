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
  orderFormValidator,
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
  physicalPresenceValidator,
  publicAuditStatusValidator,
  hubOperationalCounterKindValidator,
  projectCredentialKindValidator,
  clientEventTypeValidator,
  clientEventPayloadValidator,
  referrerClassValidator,
  conceptBriefValidator,
  conceptPlaceCandidateValidator,
  conceptApprovedQuoteValidator,
  conceptHarvestCandidateValidator,
  conceptHarvestImageCandidateValidator,
  conceptHarvestReviewStateValidator,
  conceptApprovedWebsiteContentValidator,
  conceptImportedWebsiteAssetValidator,
  conceptFacebookPackItemValidator,
  conceptFacebookPackStateValidator,
  conceptStatusValidator,
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
    /** Stage 3: one-time (or admin-refreshed) PageSpeed snapshot for portal metrics. */
    pageSpeedSnapshot: v.optional(pageSpeedDataValidator),
    pageSpeedSnapshotUrl: v.optional(v.string()),
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

  /**
   * Stage 4A: per-project commercial terms. Exactly one row per project may be
   * "issued" at a time; issuing a new one supersedes the previous.
   */
  order_forms: defineTable(orderFormValidator)
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_status", ["projectId", "status"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),

  activity_log: defineTable(activityLogValidator)
    .index("by_projectId", ["projectId"])
    .index("by_prospectId", ["prospectId"])
    .index("by_kind", ["kind"])
    .index("by_createdAt", ["createdAt"]),

  hub_operational_counters: defineTable({
    bucketDate: v.string(), // UTC YYYY-MM-DD; bounded operational evidence
    projectId: v.string(),
    kind: hubOperationalCounterKindValidator,
    count: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bucketDate", ["bucketDate"])
    .index("by_projectId_and_bucketDate_and_kind", [
      "projectId",
      "bucketDate",
      "kind",
    ]),

  /**
   * Stage 2 (WAAS authenticated v2): hashed bearer credentials.
   * Raw keys are never stored — only SHA-256(full key) as credentialHash.
   * Format: sk_live_<keyId>_<secret> | pk_live_<keyId>_<secret>
   */
  project_credentials: defineTable({
    projectId: v.id("projects"),
    keyId: v.string(), // public lookup prefix, not the secret
    kind: projectCredentialKindValidator,
    credentialHash: v.string(), // SHA-256 hex of full high-entropy key
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    label: v.optional(v.string()), // e.g. "chelsea prod", "tb-tree preview"
  })
    .index("by_keyId", ["keyId"])
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_kind", ["projectId", "kind"]),

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
    // Stage 1A: paid fan-out paused (Groq/Resend/Twilio) — lead still stored
    fanoutPaused: v.optional(v.boolean()),
    fanoutPausedReason: v.optional(v.string()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_projectId_and_status", ["projectId", "status"])
    .index("by_projectId_and_triageVerdict", ["projectId", "triageVerdict"])
    .index("by_triageVerdict", ["triageVerdict"])
    .index("by_createdAt", ["createdAt"])
    .index("by_fanoutPaused_and_createdAt", ["fanoutPaused", "createdAt"]),

  client_analytics: defineTable({
    projectId: v.string(), // Human-readable slug
    date: v.string(), // YYYY-MM-DD
    pageViews: v.number(),
    topPages: v.array(v.object({ path: v.string(), views: v.number() })),
    // Stage 1A: bounded referrer rollup (host or truncated URL)
    topReferrers: v.optional(
      v.array(v.object({ referrer: v.string(), views: v.number() })),
    ),
    // Stage 3: conversion click rollups (portal must not scan raw events)
    telClicks: v.optional(v.number()),
    emailClicks: v.optional(v.number()),
    directionsClicks: v.optional(v.number()),
    // Stage 3: coarse referrer class counts for the day
    referrerClasses: v.optional(
      v.object({
        organic: v.number(),
        social: v.number(),
        direct: v.number(),
        other: v.number(),
      }),
    ),
  }).index("by_projectId_and_date", ["projectId", "date"]),

  /**
   * Stage 3: typed raw events for pageviews and conversion clicks.
   * Portal reads aggregates from client_analytics, not this table.
   */
  client_events: defineTable({
    projectId: v.id("projects"),
    publishableKeyId: v.string(),
    type: clientEventTypeValidator,
    path: v.string(),
    referrerClass: v.optional(referrerClassValidator),
    payload: v.optional(clientEventPayloadValidator),
    createdAt: v.number(),
  })
    .index("by_projectId_and_createdAt", ["projectId", "createdAt"])
    .index("by_projectId_and_type_and_createdAt", [
      "projectId",
      "type",
      "createdAt",
    ]),

  /**
   * RETIRED — awaiting the destructive production cutover.
   *
   * `marketing_searches`, `scraped_leads`, and `preview_views` below belong to
   * the deleted outbound search, cold-email, and hard-coded-demo system. No
   * application code reads or writes them any more and there is no UI or
   * callable endpoint that reaches them.
   *
   * They stay defined only so the additive `website_concepts` deployment can
   * validate against production while their rows still exist. Delete the rows
   * first, verify the tables are empty, then remove these three definitions and
   * the validators only they still require. See
   * `docs/plans/outreach-preview-engine.md` § Production data reset.
   */
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
    physicalPresence: v.optional(physicalPresenceValidator),
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

  /**
   * RETIRED — awaiting the destructive production cutover.
   *
   * Opens of the hard-coded `/preview/<slug>` demos. Superseded by the view
   * counters on `website_concepts`.
   */
  preview_views: defineTable({
    slug: v.string(),
    firstViewedAt: v.number(),
    lastViewedAt: v.number(),
    viewCount: v.number(),
  }).index("by_slug", ["slug"]),

  /**
   * One bespoke homepage concept generated for one manually-captured Facebook
   * lead, and the record of whether the recipient opened it.
   *
   * `token` is high-entropy and unlisted; it is the only credential on
   * `/preview/<token>`, which is acceptable because the page contains nothing
   * but public facts about the business it was built for and carries a visible
   * notice that it is not their live site.
   *
   * Regeneration overwrites `generatedHtml` rather than versioning it. There is
   * deliberately no revision-history table: this is a tool for producing one
   * page a prospect either likes or does not, not a document product.
   *
   * Opens are counted rather than collapsed to a first-view timestamp, because a
   * lead re-opening the concept after a follow-up is the signal worth acting on.
   */
  website_concepts: defineTable({
    token: v.string(),
    businessName: v.string(),
    facebookPageUrl: v.optional(v.string()),
    submittedWebsiteUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    serviceArea: v.optional(v.string()),
    notes: v.optional(v.string()),

    // Google Places identity, and only identity. `placeMatchResolved` is true
    // once a uniquely corroborated candidate was auto-confirmed, Layken picked
    // a candidate, or Layken declared there is no match. It gates generation.
    //
    // The place ID is the one Places field Google's policy exempts from its
    // retention limits, so it is the only one kept. Candidates are fetched live
    // when the match panel opens and the directions link is rebuilt from the
    // place ID on demand.
    matchedGooglePlaceId: v.optional(v.string()),
    verifiedWebsiteUrl: v.optional(v.string()),
    placeMatchResolved: v.boolean(),

    /**
     * DEPRECATED — persisted Places content awaiting contraction.
     *
     * Nothing writes these. `concepts/migrations.ts` clears them from existing
     * rows; once it has run against production and development, delete both
     * fields here and in `websiteConceptDocValidator`, along with
     * `conceptPlaceCandidateValidator`'s use in this file.
     */
    matchedGoogleMapsUrl: v.optional(v.string()),
    placeCandidates: v.optional(v.array(conceptPlaceCandidateValidator)),

    // Approved assets. Only owner/business uploads reach the page; Google
    // photos are research signals and never become preview imagery.
    logoStorageId: v.optional(v.id("_storage")),
    assetStorageIds: v.array(v.id("_storage")),
    approvedQuotes: v.array(conceptApprovedQuoteValidator),

    /**
     * One bounded snapshot of what the business's own website says.
     *
     * Deliberately stored on the concept rather than in a content or crawler
     * table: it is small, it belongs to exactly one concept, and it has no life
     * after that concept is deleted. The caps in `lib/concepts/harvest.ts` —
     * six pages, 60 candidates, 12 images, 500 characters a value — are what
     * keep this document far below Convex's 1 MiB limit. Raw markdown, raw
     * HTML, whole Firecrawl responses, and image bytes are never stored here.
     *
     * These are candidates, not facts. Nothing in this block may reach a
     * generation prompt; B2 adds the approved subset that can.
     *
     * `harvestRequestId` works like `generationRequestId`: a slow scrape that
     * lands after a refresh, or after the website URL changed, is discarded
     * rather than overwriting the newer snapshot.
     */
    harvestRequestId: v.optional(v.string()),
    harvestedAt: v.optional(v.number()),
    harvestSourceUrl: v.optional(v.string()),
    harvestedPages: v.optional(
      v.array(v.object({ url: v.string(), title: v.optional(v.string()) })),
    ),
    harvestCandidates: v.optional(v.array(conceptHarvestCandidateValidator)),
    harvestImageCandidates: v.optional(
      v.array(conceptHarvestImageCandidateValidator),
    ),
    harvestWarnings: v.optional(v.array(v.string())),
    harvestReviewState: v.optional(conceptHarvestReviewStateValidator),
    harvestReviewedAt: v.optional(v.number()),
    approvedHarvestCandidateIds: v.optional(v.array(v.string())),
    approvedWebsiteContent: v.optional(conceptApprovedWebsiteContentValidator),
    importedWebsiteAssets: v.optional(
      v.array(conceptImportedWebsiteAssetValidator),
    ),

    /**
     * The supervised Facebook Pack: what Layken pasted or uploaded out of the
     * prospect's Page, and the model's verdict on each item.
     *
     * Stored on the concept for the same reason the website harvest is — it is
     * small, it belongs to exactly one concept, and it has no life after that
     * concept is deleted. `lib/concepts/facebookPack.ts` holds the caps that
     * keep it there: 20 items, 12 of them images, 4,000 characters of pasted
     * text apiece. Image bytes live in Convex storage; only the storage ID,
     * Convex's SHA-256, the declared type, and the byte count are kept here.
     *
     * Nothing in this block reaches a generation prompt yet. C1 collects and
     * classifies; C2 adds the reviewed evidence that a brief may read, and with
     * it the rule that changing pack material revokes the generated page.
     *
     * `facebookPackRequestId` works like `generationRequestId`: a slow analysis
     * that lands after the pack changed is discarded rather than labelling
     * material the model never saw.
     */
    facebookPackItems: v.optional(v.array(conceptFacebookPackItemValidator)),
    facebookPackRequestId: v.optional(v.string()),
    facebookPackState: v.optional(conceptFacebookPackStateValidator),
    facebookPackAnalyzedAt: v.optional(v.number()),
    facebookPackModel: v.optional(v.string()),
    facebookPackPromptVersion: v.optional(v.string()),
    facebookPackError: v.optional(v.string()),

    researchBrief: v.optional(conceptBriefValidator),
    generatedHtml: v.optional(v.string()),
    /** Which named page shape produced this draft, for admin visibility. */
    structureId: v.optional(v.string()),
    /** Deterministic validator output from the last generation attempt. */
    validationViolations: v.optional(v.array(v.string())),
    /** Identifies the only in-flight generation allowed to save its result. */
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
  })
    .index("by_token", ["token"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"])
    .index("by_updatedAt", ["updatedAt"]),

  //errorReports - future
});
