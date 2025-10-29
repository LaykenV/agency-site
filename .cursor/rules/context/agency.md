The Agency Blueprint: Website-as-a-Service (WaaS) Edition

Document Version: 2.4
Last Updated: January 28, 2025

I. Business Positioning & Vision
Our Vision: Be the default web partner for small, service-based businesses via a seamless “Website-as-a-Service” (WaaS) that eliminates friction and upfront cost.
Positioning: We sell peace of mind: a high-performance website plus unlimited support. The website is the proof of an ongoing relationship.

II. The Plan Catalog (One-Offer Model)
- Plan: The All-Inclusive Plan
- Pricing: $0 Down, $199 per Month (12-month minimum term)
- Headline: Your Professional Website & Personal Web Team for One Simple Price.
- Promise: We handle design, development, hosting, maintenance, and unlimited edits so clients can focus on their business.
- Core Features:
  - Custom Next.js website up to 7 pages (Home, About, Services, Reviews, Contact, etc.)
  - Elite performance (aim 95+ PageSpeed)
  - Google Reviews widget
  - Standard contact form with email notifications
  - Managed hosting and SSL on Vercel
  - Unlimited edits & support via email
  - Domain included and managed while subscribed
  - Monthly analytics summary

III. Marketing & Sales Strategy
Target: Local, service-based businesses with good reviews and weak/old sites (painters, plumbers, landscapers, consultants, etc.).

Lead Generation: Pre-qualified cold calling
- Identify a niche in one city (e.g., “Landscapers in Austin”).
- Build lead list via Google Maps/Yelp.
- Qualify:
  - Call: No site, basic builder site, or slow site; must have recent positive reviews.
  - Don’t call: Currently with an agency, mature/professional site, bad/hostile reviews.

Sales Call: Authentic consultant
- Opener: “Hi, I’m [Name], local web dev. I saw your great reviews and a few website issues I can fix.”
- Cost: Lead with “$0 down, $199/mo, 12-month minimum.”
- Educate:
  - “I hand-code in Next.js for instant load speeds; Google prioritizes fast, mobile-first sites.”
  - “It’s a service. You get me as your on-call web team. Email changes anytime.”
- Close: “I’ll email a link to accept the terms and start your subscription. It takes 2 minutes.”

IV. The Golden Path (End-to-End Client Journey)
1) First Contact
- Inbound: Prospect submits a short form → creates a prospect session (prospects row).
- Outbound: You create a prospect in Admin while on a call.

2) 15-Min Confirmation Call
- Build rapport, confirm fit, get verbal yes.
- End with: “I’m sending a link now—accept terms and start the subscription.”

3) Welcome Email & Auth
- From Admin: “Send Welcome Email” triggers a better-auth magic link to /portal/agreement?sid=SESSION_ID.
- On landing, auto-create a Project stub if one doesn’t exist:
  - projectStatus = AWAITING_AGREEMENT
  - Link to prospect (prospectId)

4) Agreement (Clickwrap)
- /portal/agreement shows:
  - Short order summary: $199/mo, 12-month minimum, early termination policy, recurring billing consent.
  - Link to /terms (versioned), checkbox "I agree…".
- On submit:
  - Create agreements row (clickwrap evidence: termsVersion/hash, acceptedAt, ip, ua, userId, projectId, prospectId).
  - Log activity (contract.accepted).
  - Update projectStatus = AWAITING_PAYMENT.

5) Payment (Stripe)
- Ensure a Stripe customer exists for the user; create if missing and store mapping in a `stripe_customers` table (authUserId → stripeCustomerId).
- Create a Stripe Checkout Session with metadata { projectId, prospectId, agreementId, termsVersion } and `success_url` to `/portal/success`.
- Redirect to Stripe’s hosted checkout.

6) Webhook (Master Conductor)
- /api/stripe handles:
  - `checkout.session.completed` and relevant `customer.subscription.*`, `invoice.*`, and `payment_intent.*` events.
  - On subscription activated or first invoice paid:
    - Update projectStatus → AWAITING_ASSETS (if still awaiting payment).
    - Send “Welcome Aboard” and route user to the portal (they’re already logged in via magic link).
  - On payment failures or canceled subscriptions:
    - Append `activity_log` entry; do not mutate `projectStatus`; restrict portal features at read-time based on the Stripe subscription cache.

7) Inside the Client Portal
- Status-driven experience with clear CTAs per stage:
  - AWAITING_ASSETS: Submit build details form (headline, domain preference, inspiration links, brand color scheme with live preview, logo/images via Convex storage with instant previews), then schedule 45-min kickoff call
  - IN_PROGRESS: View kickoff call details and build progress message
  - IN_REVIEW: Access staging site link and schedule 30-min review call
  - LIVE: View live site URL, submit edit/support requests, and view request history with status tracking

8) Kickoff Call
- Deep dive into brand, target audience, content, and assets.
- Cal.com webhook automatically transitions project from AWAITING_ASSETS → IN_PROGRESS on kickoff booking.

9) Build & Review
- Build on staging (Vercel); schedule 30-min review; collect edits.
- Cal.com webhook automatically transitions project from IN_PROGRESS → IN_REVIEW on review booking.

10) Go Live
- Connect domain, launch, and send launch email.
- Admin manually transitions project to LIVE status.
- Clients can submit unlimited edit requests via portal with title, details, priority (low/normal/high), and optional attachments.

V. Legal & Policy (MVP)
- Use in-app clickwrap (checkbox + link to Terms). This is widely enforceable in B2B if logged.
- Make minimum term and early termination conspicuous in both the agreement step and the Terms header.
- Email a copy/snapshot of the Terms and order summary after acceptance.
- When you form the LLC and have traction, have counsel review:
  - Minimum term and early termination language
  - Recurring billing authorization
  - IP/ownership, domain transfer conditions
  - Liability cap, warranty disclaimer
  - Governing law/venue
  - Auto-renewal notice rules applicable to B2B in your state
- Optional later: add an e-sign vendor (Dropbox Sign/SignWell) if customers ask or to further reduce disputes; your schema accommodates this via agreements table.

VI. Application Architecture
- Stack: Next.js (App Router), Vercel, better-auth (magic links), Resend (email), Stripe (subscriptions), Convex (DB + functions + file storage), Cal.com (scheduling).
- Routing highlights:
  - /portal/agreement (gated first step)
  - /portal (dashboard)
  - /portal/welcome (optional linking route)
  - /legal/terms (versioned, hashable)
  - /portal/success (post-checkout sync + redirect)
- Webhooks:
  - /api/stripe (Stripe billing events)
  - /api/cal-webhook (scheduling events)
- File Storage (convex/files.ts):
  - `generateUploadUrl` (mutation): Returns pre-signed upload URL for client-side file uploads
  - `getUrls` (query): Fetches signed URLs for stored files with ownership verification
  - `deleteFile` (mutation): Deletes files from storage with authorization checks
- Emails:
  - Welcome Agreement Link
  - Payment Success + Terms copy
  - Kickoff reminder
  - Dunning and failed payment notices

VII. Data Model (Convex) — Updated Schema
Note: Renamed onboarding_sessions → prospects; project created when user lands on /portal/agreement; new agreements, activity_log, scheduled_calls, and edit_requests tables; add Stripe KV tables (`stripe_customers`, `stripe_subscription_cache`); no local subscriptions table.

Schema (schema.ts)
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  aiGeneratedPlanValidator,
  buildDetailsValidator,
  calBookingValidator,
  deploymentValidator,
  projectStatusValidator,
  prospectDetailsValidator,
  agreementValidator,
  activityLogValidator,
  scheduledCallValidator,
} from "./validators";

export default defineSchema({
  prospects: defineTable({
    sessionId: v.string(),
    resumeToken: v.string(),
    details: prospectDetailsValidator,
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
    projectId: v.string(), // human-readable slug
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
    .index("by_projectId", ["projectId"]),

  agreements: defineTable({
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
    snapshotUrl: v.optional(v.string()), // optional: store rendered HTML/PDF
  })
    .index("by_projectId", ["projectId"])
    .index("by_prospectId", ["prospectId"])
    .index("by_authUserId", ["authUserId"])
    .index("by_acceptedAt", ["acceptedAt"]),

  // No local subscriptions table; Stripe subscription state is derived from a KV cache (see `stripe_customers` and `stripe_subscription_cache` tables below).

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
    .index("by_createdAt", ["createdAt"]),
});

KV Tables (Stripe)
- stripe_customers
  - Fields: authUserId (string), stripeCustomerId (string), createdAt (number), updatedAt (number)
  - Indexes: by_authUserId, by_stripeCustomerId
- stripe_subscription_cache
  - Fields: stripeCustomerId (string), status (Stripe status or "none"), subscriptionId (string | null), priceId (string | null), currentPeriodStart (number | null), currentPeriodEnd (number | null), cancelAtPeriodEnd (boolean), paymentMethod { brand: string | null, last4: string | null } | null, updatedAt (number)
  - Indexes: by_stripeCustomerId

Validators (validators.ts)
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
  myNotes: v.union(v.string(), v.null()), // Admin-only field, not exposed to clients
  brand: v.object({
    colorScheme: v.object({
      primary: v.string(), // Hex color for primary brand color
      accent: v.string(),  // Hex color for accent brand color
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
  kind: v.string(), // e.g., 'contract.accepted', 'payment.succeeded', 'call.booked'
  payload: v.optional(v.object({})),
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
  details: prospectDetailsValidator,
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

VIII. Flow Details and Implementation Notes
Create project on agreement landing
- Yes. On magic-link landing at /portal/agreement:
  - Find or create a project stub linked to the prospect (projectStatus = AWAITING_AGREEMENT).
  - Pro: simplifies linking agreement, payment, and user. Con: may create abandoned projects; mitigate by auto-archiving if no payment in 30–60 days.

Agreement capture (clickwrap)
- UI: Checkbox + link to /legal/terms; show a short conspicuous summary (price, 12-month term, early termination, recurring billing).
- On submit:
  - Compute SHA-256 hash from the canonical terms content module (same source used to render /legal/terms) and record `termsVersion` + `termsHash` + `userAgent`.
  - Insert agreements row and activity_log (contract.accepted).
  - Update projectStatus → AWAITING_PAYMENT.
  - Do not send an email at acceptance; email is sent post-payment.

Stripe Checkout
- Always ensure a Stripe customer exists (create if missing) and store authUserId → stripeCustomerId in `stripe_customers`.
- Create a Stripe Checkout Session with metadata: { projectId, prospectId, agreementId, termsVersion } and set `success_url` to `/portal/success`.
- No local subscriptions table; rely on Stripe and a KV subscription cache; optionally log an activity entry.

Webhook (Stripe)
- Verify signature.
- For allowed events, resolve `customerId` and call a sync to persist subscription state.
- On activation or first invoice paid:
  - Update projectStatus → AWAITING_ASSETS (if still awaiting payment).
  - Append `activity_log` entry (payment.subscription_activated).
  - Send the “Welcome Aboard” email with order summary and a link to the stored terms snapshot (includes `termsVersion`/`termsHash`).
- On payment failures/canceled:
  - Append `activity_log` entry; do not mutate projectStatus; restrict portal features at read-time using the cache.
- Idempotency: use Stripe event IDs; guard updates by `projectId` from metadata or by mapping.

Portal guardrails
- Don’t allow self-serve cancellation in months 1–12; route to support. Apply your early termination policy operationally.
- Show billing status and renewal date read-only (derived from the Stripe subscription cache at read-time).
- Surface a timeline based on activity_log.

Scheduling
- Cal.com webhooks write into `scheduled_calls`, update `prospects.calProspectBooking` for confirmation calls, and update `projects.calKickoffBooking` / `projects.calReviewBooking` for project calls. Each event also appends `activity_log` with `call.booked` / `call.rescheduled` / `call.canceled`.
- Automatic status transitions on booking creation:
  - Kickoff booking → AWAITING_ASSETS to IN_PROGRESS (if currently awaiting assets)
  - Review booking → IN_PROGRESS to IN_REVIEW (if currently in progress)
- Uses idempotent `internalSetStatusIfEligible` with expected current status guards.

Client Portal (/portal/[projectId])
- Status-driven UI with mutual exclusivity per project stage:
  - AWAITING_AGREEMENT / AWAITING_PAYMENT: Redirects to /portal/agreement or /portal/subscribe
  - AWAITING_ASSETS: Build details form + kickoff scheduling CTA
  - IN_PROGRESS: Progress message + kickoff call summary
  - IN_REVIEW: Staging site access + review call scheduling CTA
  - LIVE: Live site link + edit request form + request history list
  - ARCHIVED: Read-only notice with support contact
- Build Details Form (`projects.upsertBuildDetails`):
  - Client fields: headline, domainPreference, inspirationLinks, brand.colorScheme (primary/accent hex colors with native color pickers and live gradient preview)
  - File uploads: brand.logoStorageId, brand.imageStorageIds (Convex storage via `files.generateUploadUrl`)
    - Instant local previews using `URL.createObjectURL()` before upload
    - Stored image previews via signed URLs from `files.getUrls` query
    - Logo: single preview card with contained image
    - Brand images: responsive grid (2-3 columns) with thumbnails
  - Admin-only field: myNotes (not exposed to client, only editable via admin)
  - Auto-sets brandAssetsUploaded flag when files uploaded
- Edit Requests System (`edit_requests` table):
  - Mutations: `projects.createEditRequest`, Query: `projects.listEditRequests`
  - Fields: title, details, priority (low/normal/high), status (open/in_progress/waiting_on_client/resolved/closed)
  - Optional attachments via Convex storage (UI placeholder ready)
  - Activity log integration for ticket.created events
  - Real-time list with expand/collapse details
- Call Scheduling Integration:
  - Displays Cal.com booking summaries (title, date/time, meeting URL) for kickoff and review calls
  - CTAs open external Cal.com links configured in lib/config.ts (CAL_KICKOFF_URL, CAL_REVIEW_URL)
  - Booking metadata passed via Cal.com includes projectId for webhook routing

Terms of Service essentials (MVP outline)
- Term: 12-month minimum commitment at $199/mo; renews monthly thereafter until canceled.
- Early termination: either all remaining months due or a defined early termination fee (choose one and be clear).
- Scope of “unlimited edits”: non-material, reasonable use; examples included.
- IP/ownership: You own original content; we license the implementation during the term; domain transfer conditions on account good standing.
- Recurring billing authorization: charge the saved payment method monthly until canceled per terms.
- Disclaimers and liability cap (e.g., fees paid in the prior 3 months).
- Governing law/venue; notices via email.
- Versioning and “last updated” date.

IX. Admin and Ops
- Admin actions:
  - Create prospect, send welcome email, resend agreement link, create Stripe Checkout Session (server-triggered after agreement), manual status overrides.
- Dunning (via Stripe + email):
  - Day 0 fail: notify client
  - Day 3 fail: second attempt and email
  - Day 7 fail: restrict portal features based on Stripe subscription cache status (no projectStatus mutation); log activity entries
- Archival:
  - Projects stuck in AWAITING_AGREEMENT or AWAITING_PAYMENT > 30–60 days → ARCHIVED
- Analytics:
  - Build dashboards from activity_log (conversion rates, time-in-stage, payment health)

X. Security and Compliance
- Store user agent for agreement acceptance and hash terms content; keep version numbers.
- IP capture is deferred to a future iteration (edge-captured) and is not required for MVP.
- Sign webhook payloads and enforce replay protection.
- Minimize PII; never store raw payment details (Stripe handles it).
- Log all user-facing state changes in activity_log.

XI. Roadmap
- V1: In-app clickwrap + Stripe subscription + webhook-driven automation. ✅
- V1.1: Add portal ticketing for edits (`edit_requests` table) ✅; file uploads for brand assets via Convex storage with live previews ✅; domain purchase/management workflow (pending).
- V1.2: Optional e-sign integration (Dropbox Sign) using current agreements table if enterprise clients request signatures.
- V1.3: Self-serve asset library and change history; auto-generated monthly reports.
- V1.4: Admin dashboard for managing projects, viewing edit requests, and bulk operations.

Example high-level flow (pseudo)
- GET /portal/agreement
  - Auth via better-auth magic link
  - Find or create project { projectStatus: AWAITING_AGREEMENT }
- POST /portal/agreement
  - Validate checkbox; compute termsHash; insert agreements row; activity_log
  - Update project -> AWAITING_PAYMENT
  - Create Stripe Checkout (metadata: projectId, prospectId, agreementId, termsVersion); redirect to checkout.url
- GET /portal/success
  - Read stripeCustomerId via auth user mapping
  - Call `syncStripeDataToKV(customerId)`; redirect to /portal
- POST /api/stripe
  - On subscription activated or first invoice paid:
    - Update project -> AWAITING_ASSETS
    - Email welcome; redirect signed-in user to /portal with success UI

