## Agency Subscription & Agreement Upgrade Plan (Polar Component First)

### Objective
- Use `@convex-dev/polar` as the single source of truth for billing and subscription state.
- Simplify our Convex schema to only track what we must own: agreement evidence, project workflow/status, activity timeline, and scheduling.
- Do not add provider-agnostic or provider-specific billing fields to our schema; no subscription rows.

### Constraints & Principles
- **No billing provider flexibility**: we standardize on Polar.
- **No local subscription table**: read subscription status live via Polar APIs/webhooks.
- **Evidence matters**: agreements (clickwrap) are stored by us for legal/audit purposes.
- **Workflow in app, billing in Polar**: `projects.projectStatus` models delivery workflow only, not billing states.
- **Idempotency & minimal writes**: webhook callbacks write `activity_log` and only the minimal `projects` fields necessary.

---

## Current State (from repo)
- Auth via `@convex-dev/better-auth` with `getCurrentUser` available in `convex/auth.ts`.
- `convex/schema.ts`: tables `prospects`, `projects` (includes `stripeCustomerId`), placeholders for `subscriptions`.
- `convex/validators.ts`: has `projectStatusValidator` without `AWAITING_AGREEMENT`.
- `convex/http.ts`: registers Better Auth routes and a Cal.com webhook; no Polar routes yet.

---

## Proposed Data Model (Convex)

### What we will NOT store
- No `subscriptions` table.
- No `stripeCustomerId`, `billingProvider`, or similar fields on `projects`.

### Tables and fields
- **projects** (keep; simplify)
  - Keep: `authUserId: string`, `projectId: string` (human slug), `prospectId?: Id<'prospects'>`, `projectStatus?: ProjectStatus`, `buildDetails?`, `deployment?`, `calKickoffBooking?`, `calReviewBooking?`.
  - Remove: `stripeCustomerId`.
  - Add: `createdAt?: number`, `updatedAt?: number` (for operational analytics; `_creationTime` still exists as system field).
  - Indexes: keep `by_authUserId`, `by_projectId`.

- **agreements** (new)
  - Purpose: store clickwrap evidence of terms acceptance.
  - Fields: `projectId: Id<'projects'>`, `prospectId?: Id<'prospects'>`, `authUserId: string`, `method: "clickwrap"`, `source: "portal"`, `termsVersion: string`, `termsHash: string`, `acceptedAt: number`, `ip?: string`, `userAgent?: string`, `snapshotUrl?: string`.
  - Indexes: `by_projectId`, `by_prospectId`, `by_authUserId`, `by_acceptedAt`.

- **activity_log** (new)
  - Purpose: audit trail of key lifecycle events (agreement accepted, subscription activated, cancellations, bookings, status changes).
  - Fields: `projectId?: Id<'projects'>`, `prospectId?: Id<'prospects'>`, `actor: "system" | "user" | "admin"`, `kind: string`, `payload?: object`, `createdAt: number`.
  - Indexes: `by_projectId`, `by_prospectId`, `by_createdAt`.

- **scheduled_calls** (new)
  - Purpose: store bookings (from Cal.com) and render schedule in the portal.
  - Fields: `projectId?: Id<'projects'>`, `prospectId?: Id<'prospects'>`, `type: "confirmation" | "kickoff" | "review" | "support"`, `title?: string`, `startTime: number`, `endTime: number`, `status: string`, `meetingUrl?: string`, `location?: string`, `notes?: string`, `calEventId?: string`, `iCalUID?: string`, `eventTypeKey?: string`, `durationMinutes?: number`, `externalBookingId?: string`, `attendeeMetadata?: { name?: string; email?: string; phone?: string }`.
  - Indexes: `by_projectId`, `by_prospectId`, `by_startTime`, `by_calEventId`, `by_externalBookingId`.

### Validators
- **projectStatusValidator**: add `"AWAITING_AGREEMENT"` and keep existing: `"AWAITING_PAYMENT"`, `"AWAITING_ASSETS"`, `"IN_PROGRESS"`, `"IN_REVIEW"`, `"LIVE"`, `"ARCHIVED"`.
- Add: `agreementValidator`, `activityLogValidator`.
- `scheduledCallValidator` fields: `projectId?`, `prospectId?`, `type`, `title?`, `startTime`, `endTime`, `status`, `meetingUrl?`, `location?`, `notes?`, `calEventId?`, `iCalUID?`, `eventTypeKey?`, `durationMinutes?`, `externalBookingId?`, `attendeeMetadata?`.
- `calBookingValidator` snapshot fields: `scheduledAt`, `endTime?`, `title?`, `meetingUrl?`, `notes?`, `calEventId?`, `iCalUID?`, `status?`, `eventTypeKey?`, `durationMinutes?`, `externalBookingId?`, `attendeeMetadata?`.

---

## Backend Architecture (Polar-first)

### Polar client
- Create `convex/polar.ts` that instantiates `new Polar(components.polar, { getUserInfo })`.
- `getUserInfo`: call `api.auth.getCurrentUser` (our existing query from `convex/auth.ts`) and return `{ userId: user._id, email: user.email }`.
- Export APIs: `changeCurrentSubscription`, `cancelCurrentSubscription`, `getConfiguredProducts`, `listAllProducts`, `generateCheckoutLink`, `generateCustomerPortalUrl` via `polar.api()`.

### Webhooks
- Register webhook routes in `convex/http.ts` via `polar.registerRoutes(http, { ...callbacks })` at default path `/polar/events`.
- Callback mapping:
  - `onSubscriptionCreated` and `onSubscriptionUpdated`: resolve `projectId` from `event.data.metadata.projectId` (we will pass this in at checkout creation time).
  - On first "active"/"trialing":
    - Update `projects.projectStatus = "AWAITING_ASSETS"`.
    - Append `activity_log` entry: `kind: "payment.subscription_activated"`, include Polar event payload subset.
  - On cancellation/past_due:
    - Append `activity_log` entry (e.g., `payment.subscription_canceled` or `payment.subscription_past_due`).
    - Do not mutate `projectStatus`; portal gating derives from live subscription at read time.

### Reading subscription state (no DB writes)
- Anywhere we need billing state (e.g., portal dashboard), fetch with:
  - `const sub = await polar.getCurrentSubscription(ctx, { userId })`.
  - Derive flags: `isSubscribed = !!sub && ["active", "trialing"].includes(sub.status)`; gate features accordingly.

---

## Golden Path Alignment (from `agency.md`)
- 1) Landing at `/portal/agreement` (magic link): find/create `projects` stub with `projectStatus = "AWAITING_AGREEMENT"` linked to `prospectId`.
- 2) Agreement (clickwrap): insert `agreements` row (evidence), log `activity_log: contract.accepted`, update `projectStatus = "AWAITING_PAYMENT"`.
- 3) Payment: generate Polar checkout link (or use `<CheckoutLink>`), include metadata `{ projectId, prospectId, agreementId }`.
- 4) Webhook: on activation or first invoice paid, update `projectStatus = "AWAITING_ASSETS"`, write `activity_log` entry.
- 5) Portal: gate features by live Polar status; surface `activity_log` timeline; show CTA to schedule kickoff and upload assets.

---

## Implementation Steps (no code changes yet; this is the plan)

### Schema & Validators
- Update `convex/validators.ts`:
  - Add `AWAITING_AGREEMENT` to `projectStatusValidator`.
  - Add `agreementValidator`, `activityLogValidator`, `scheduledCallValidator`.
- Update `convex/schema.ts`:
  - In `projects`: remove `stripeCustomerId`; add `createdAt?`, `updatedAt?` (optional numeric timestamps); retain existing indexes.
  - Add tables: `agreements`, `activity_log`, `scheduled_calls` with indexes as listed.
  - Ensure `prospects` remains unchanged.

### Polar integration
- Add dependency `@convex-dev/polar` and register in `convex/convex.config.ts` with `app.use(polarConfig)`.
- Create `convex/polar.ts` Polar client (see "Polar client" above).
- Set env vars: `POLAR_ORGANIZATION_TOKEN`, `POLAR_WEBHOOK_SECRET`, optionally `POLAR_SERVER`.
- Register webhook routes in `convex/http.ts` and implement callbacks that:
  - Resolve `projectId` from metadata.
  - Update `projects.projectStatus` to `AWAITING_ASSETS` on activation.
  - Append `activity_log` entries for all subscription lifecycle changes.

### Agreement flow
- On `/portal/agreement` GET:
  - Ensure a `projects` stub exists with `AWAITING_AGREEMENT` and link to `prospectId`.
- On POST agree:
  - Compute `termsHash` from current `/legal/terms` HTML.
  - Insert into `agreements`.
  - Append `activity_log: contract.accepted`.
  - Update `projects.projectStatus = "AWAITING_PAYMENT"`.
  - Create a Polar checkout link with metadata `{ projectId, prospectId, agreementId }` and redirect.

### Gating and reads
- In portal queries, call `polar.getCurrentSubscription` and derive gating flags; do not persist billing state.
- Use `activity_log` to render a unified timeline for admins and clients.

### Scheduling (Cal.com)
- Keep current `convex/http.ts` Cal route.
- Webhook behavior for `BOOKING_CREATED` (and later `BOOKING_RESCHEDULED`/`BOOKING_CANCELED`):
  1) Parse payload; extract:
     - `primaryEmail` (from `responses.email` or `attendees[0].email`)
     - `primaryName` (from `responses.name` or `attendees[0].name`)
     - `startTime` / `endTime` (ms since epoch)
     - `notes` (from `additionalNotes` or `responses.notes`)
     - `location` and derived `meetingUrl` or `phone`
     - `uid` as `calEventId`, `iCalUID`
     - `bookingId` as `externalBookingId`
     - `status`, `type` as `eventTypeKey`, `length` as `durationMinutes`, `title`
  2) Determine association:
     - If `payload.metadata.projectId` present, attach to that `projectId`.
     - Else attempt to locate a `prospects` row by `details.contactEmail` (index), attach `prospectId`.
  3) Map `eventTypeKey` to `scheduled_calls.type`:
     - `agency-prospect` → `confirmation`
     - `agency-kickoff` → `kickoff`
     - `agency-review` → `review`
     - otherwise → `support`
  4) Idempotency: upsert `scheduled_calls` by `calEventId` if present; otherwise by `externalBookingId`.
  5) Insert or update `scheduled_calls` with:
     - `projectId?`, `prospectId?`, `type`, `title?`, `startTime`, `endTime`, `status`, `meetingUrl?`, `location?`, `notes?`, `calEventId?`, `iCalUID?`, `eventTypeKey?`, `durationMinutes?`, `externalBookingId?`, `attendeeMetadata?`.
  6) Update snapshots:
     - If `type = confirmation` → upsert `prospects.calProspectBooking` (shape = `calBookingValidator`).
     - If `type = kickoff` → upsert `projects.calKickoffBooking`.
     - If `type = review` → upsert `projects.calReviewBooking`.
  7) Append `activity_log`:
     - `kind: "call.booked" | "call.rescheduled" | "call.canceled"`, include `projectId?`, `prospectId?`, and a compact payload with identifiers and times.

- `scheduled_calls` table fields and indexes:
  - Fields: `projectId?`, `prospectId?`, `type`, `title?`, `startTime`, `endTime`, `status`, `meetingUrl?`, `location?`, `notes?`, `calEventId?`, `iCalUID?`, `eventTypeKey?`, `durationMinutes?`, `externalBookingId?`, `attendeeMetadata?`.
  - Indexes: `by_projectId`, `by_prospectId`, `by_startTime`, plus `by_calEventId`, `by_externalBookingId` (to support idempotent upserts).

- `calBookingValidator` snapshot fields (used in `prospects` and `projects`):
  - `scheduledAt: number`, `endTime?: number`, `title?: string`, `meetingUrl?: string`, `notes?: string`, `calEventId?: string`, `iCalUID?: string`, `status?: string`, `eventTypeKey?: string`, `durationMinutes?: number`, `externalBookingId?: string`, `attendeeMetadata?: { name?: string; email?: string; phone?: string }`.

---

## Migration Plan
- Remove `stripeCustomerId` from `projects` schema:
  - Deploy schema change; if needed, run a one-time mutation to clean legacy docs referencing it.
- Add new tables and validators first; then extend `projectStatusValidator`.
- Deploy Polar component and webhook routes before exposing checkout to users.

---

## Security & Compliance
- Store agreement evidence: `termsVersion`, `termsHash`, `acceptedAt`, `ip`, `userAgent`, `snapshotUrl`.
- Sign and verify Polar webhooks using `POLAR_WEBHOOK_SECRET`.
- Enforce idempotency in callbacks by using Polar event IDs or `providerSubscriptionId` when writing `activity_log`.
- Minimize PII and never store payment details (handled by Polar).

---

## Acceptance Criteria
- No `subscriptions` table or billing fields in our schema.
- `projects.projectStatus` reflects workflow stages only; billing gates derive from Polar.
- Agreements can be listed and audited per `projectId`/`authUserId`.
- Webhooks produce `activity_log` entries and set `AWAITING_ASSETS` on activation.
- Portal renders correct gating based on `polar.getCurrentSubscription`.

---

## Out of Scope (for now)
- Provider flexibility / multi-provider billing.
- Self-serve cancellation policy logic in months 1–12 (enforced operationally, not in schema).
- One-time payments (Polar component is subscription-focused).

---

## Next Actions (when ready to implement)
- Update `validators.ts` and `schema.ts` per this plan.
- Add Polar component and `convex/polar.ts` client, register webhook routes.
- Wire agreement POST to create `agreements` row and redirect to generated checkout link with metadata.
- Update portal queries to gate on `polar.getCurrentSubscription` and to render `activity_log`.

