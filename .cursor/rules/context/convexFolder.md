# convex.md — Convex Backend Reference

## Architecture Snapshot
- Convex hosts all backend state and business logic for the WaaS platform. The frontend (Next.js App Router) calls public queries/mutations defined in `convex/*.ts`, while privileged workflows use internal functions via `ctx.scheduler` and server actions.
- Third-party services: Better Auth for magic-link authentication, Stripe for billing, Cal.com for scheduling, Resend for email, Groq (via `@convex-dev/agent`) for AI plan generation, and Convex file storage for assets.
- `convex/convex.config.ts` registers the Better Auth, Resend, Agent, and Polar integrations so Convex can invoke their components from functions.

## Data Model (see `convex/schema.ts`)
- `prospects`: onboarding funnel entries keyed by `sessionId`/`resumeToken`, stores structured contact details, optional AI-generated plan, Cal.com confirmation booking metadata, and timestamps.
- `projects`: one per paying customer, linked to an auth user and optional prospect. Tracks current `projectStatus`, build details (client + admin notes, brand colors/assets), deployment info, Cal.com kickoff/review summaries, and timestamps.
- `agreements`: clickwrap acceptance evidence (terms version/hash, timestamps, optional snapshot URL) tied to projects and prospects.
- `activity_log`: immutable event stream (`actor`, `kind`, arbitrary `payload`) for auditing major lifecycle changes.
- `scheduled_calls`: normalized Cal.com bookings for confirmation/kickoff/review/support calls, indexed by project/prospect/cal identifiers.
- `billingCustomers`: Stripe customer mapping (auth user → Stripe customer ID/email) with indexes for lookup by user/email/customer id.
- `subscriptions`: cached Stripe subscription state (status, price, billing period, payment method fingerprint) for portal display and gating.
- `edit_requests`: client-submitted support tickets with status/priority, linked attachments (`_storage` ids), and timestamps.
- `_storage`: Convex system table holding uploaded files (logos, brand imagery, ticket attachments).

## Authentication & Access Control (`convex/auth.ts`, `convex/adminGuard.ts`)
- Better Auth magic-link flow initializes in `createAuth`, adding the `magicLink` plugin and sending emails through `resend.sendEmail`. Auth routes are registered on the Convex HTTP router.
- `getCurrentUser`/`getCurrentUserWithSubscription` surface the authenticated Better Auth profile, optionally enriched with cached Stripe subscription data from `stripeHelpers.getMySubscription`.
- `getPortalDecision` centralizes portal routing logic: finds the latest non-archived project (via `internal.projects.internalGetLatestProjectByAuthUser`), looks up matching prospect by email, checks subscription status, and returns the next route (`/portal/agreement`, `/portal/subscribe`, or `/portal/{projectId}`).
- `requireAdmin` enforces server-side RBAC for admin queries/mutations by validating the caller’s email against `ADMIN_EMAIL`/`ADMIN_EMAILS` environment variables, logging unauthorized attempts.

## Prospect Funnel & AI Plan Generation (`convex/prospects.ts`, `convex/onboarding/*`)
- Public queries expose prospect data without admin-only `myNotes`. `findLatestByEmail` supports pre-filling returning users, while `isKnownEmail` checks both prospects and billing customers for duplicate detection.
- `onboarding/sessions.ts` powers the self-serve intake experience: `initSession` issues new `sessionId`/`resumeToken`, `updateDetails` persists sanitized form data, and `generatePlan` throttles plan requests (`PLAN_GENERATION_THROTTLE_MS`) before scheduling an internal action.
- `onboarding/agent.ts` orchestrates Groq-powered plan synthesis. The agent receives the normalized prospect summary, constrains output to a JSON schema, sanitizes/limits text (`PLAN_TEXT_MAX_LENGTH`), and falls back to canned copy on parse errors. Plans are stored on the prospect record with timestamps.

## Project Lifecycle & Client Portal (`convex/projects.ts`)
- `findOrCreateProjectForProspect` runs on agreement landing: verifies Better Auth identity matches the prospect email, checks for an existing project, and otherwise seeds a new project (`projectStatus: "AWAITING_AGREEMENT"`) plus an `activity_log` entry.
- `internalGetLatestProjectByAuthUser` and `internalGetProjectById` provide trimmed project documents for internal callers (portal gating, Stripe, agreements, admin emails).
- `getPortalProject` enforces ownership, returns client-safe build details (hiding `myNotes`), deployment URLs, and Cal bookings used to populate `/portal/[projectId]`.
- `upsertBuildDetails` allows the client to progressively supply branding inputs; updates preserve admin notes, default color palette, deduplicate uploaded storage IDs, and log a `build.details_updated` activity after scheduling an internal mutation.
- `createEditRequest` & `listEditRequests` implement the support ticket system, ensuring requests belong to the authenticated user, seeding default priority, linking attachments into project branding for later access, and logging `ticket.created` / `ticket.attachment_added` activities.
- `internalSetStatusIfEligible` safeguards automated status transitions (expects an optional current status to avoid racing with manual overrides).

## Agreements & Terms Snapshots (`convex/agreement.ts`, `convex/agreementActions.ts`)
- `createFromClickwrap` handles the /portal/agreement form: deduplicates existing agreements, enforces project ownership, records acceptance metadata, nudges project status to `AWAITING_PAYMENT`, and logs `agreement_signed` activity.
- A background action (`agreementActions.generateAndStoreTermsSnapshot`) imports the canonical terms HTML (`lib/legal/terms.js`), stores it in Convex storage, and patches the agreement with the signed snapshot URL.
- Once a Stripe subscription activates, `sendWelcomeEmailAfterSnapshot` waits for the snapshot, fetches project/prospect/billing data, and triggers the welcome email action (with retries). Missing references are logged for diagnostics.

## Billing & Stripe Integration (`convex/stripeActions.ts`, `convex/stripeHelpers.ts`, `convex/http.ts`)
- Customer lifecycle:
  - `ensureCustomerForUser` (internal action) looks up or lazily creates a Stripe customer, writing to `billingCustomers`.
  - `createCheckoutSession` validates the caller has a project in `AWAITING_PAYMENT`, ensures a Stripe customer, fetches the latest agreement, and creates a subscription Checkout Session with redundant metadata (project, prospect, agreement, terms version) for webhook reconciliation.
  - `syncAfterSuccessForSelf` is invoked post-checkout redirect to refresh subscription state client-side.
  - `createCustomerPortalSession` issues a Stripe Billing Portal link for manual payment method updates.
- Subscription cache:
  - `syncStripeCustomer` (internal action) responds to webhooks or manual sync: fetches the most recent subscription (expanded payment method), writes to `subscriptions`, and drives state transitions or activity logs depending on status (`payment.subscription_activated`, `payment.subscription_status_changed`).
  - When a subscription activates from `AWAITING_PAYMENT`, it triggers welcome email orchestration only once via the `internal.projects.internalSetStatusIfEligible` guard.
- Webhooks (`convex/http.ts`): `/stripe/webhook` verifies signatures with `STRIPE_WEBHOOK_SECRET`, filters on an allowlist of events, and dispatches `syncStripeCustomer`. Checkout success flows also call `syncStripeCustomer` to minimize webhook latency issues.

## Email Delivery (`convex/emails.ts`)
- `Resend` component drives transactional mail. `sendWelcomeEmail` renders a styled HTML summary referencing `TERMS_SUMMARY_POINTS` and links the stored agreement snapshot when present. Errors are surfaced in logs.
- `auth.ts` reuses `resend.sendEmail` to deliver Better Auth magic links with a branded template.

## Scheduling & Cal.com Integration (`convex/calWebhook.ts`, `convex/cal.ts`)
- `/cal-webhook` HTTP route verifies HMAC signatures (`CAL_WEBHOOK_SECRET`), parses booking payloads, and normalizes attendee details, meeting links, metadata, and durations.
- Event handling pipeline:
  - Identify or create prospects based on attendee email (`internal.cal.upsertProspectFromBooking`), preserving latest contact details and storing confirmation call metadata.
  - Resolve linked project IDs either from webhook metadata or by prospect lookup (`internal.cal.findProjectByProspectId`).
  - Upsert a `scheduled_calls` record keyed by Cal UID or booking ID (`internal.cal.upsertScheduledCall`).
  - Mirror kickoff/review bookings onto the project document (`internal.cal.updateProjectBooking`) for portal rendering.
  - Emit `call.booked` / `call.rescheduled` / `call.canceled` activity log entries with contextual payload.
- Call type inference (`mapEventTypeToCallType`) routes custom event keys (prospect/kickoff/review) into the system’s finite set (`confirmation`, `kickoff`, `review`, `support`).

## File Storage (`convex/files.ts`)
- `generateUploadUrl` is gated by Better Auth and returns a pre-signed URL for Convex storage uploads.
- `getUrls`/`deleteFile` verify project ownership and ensure requested storage IDs belong to the project’s recorded brand assets before issuing signed URLs or deleting blobs, preventing cross-project access.

## Activity Stream (`convex/activityLog.ts`)
- Central helper for logging consistent audit events from internal contexts. Accepts optional project/prospect IDs, records timestamps, and prints concise console diagnostics to aid debugging.
- Used extensively by projects, admin mutations, Stripe sync, Cal webhook, and agreement flows.

## Admin Surface (`convex/admin.ts`)
- Requires admin auth for all handlers. Provides list + detail queries for prospects, projects (including admin-only `myNotes`), scheduled calls, edit requests, and direct access to storage URLs for previews.
- Mutations for CRU operations: create/update prospects, log outbound magic-link emails, update project status and admin notes, tweak deployment URLs, and adjust edit request status/priority. Each mutation writes to `activity_log` to maintain an audit trail.
- Admin-only updates carefully merge existing nested objects (e.g., build details, deployment) to avoid erasing client-supplied data.

## HTTP Entry Points (`convex/http.ts`)
- Better Auth routes are automatically mounted with CORS enabled for the web app.
- `/cal-webhook`: expects the Cal.com signature header; delegates to `api.calWebhook.processCalWebhook` for full validation and handling logic.
- `/stripe/webhook`: verifies Stripe signature, enforces an allowlist of event types, and initiates subscription sync when relevant.

## Background Work & Scheduling
- The project makes heavy use of `ctx.scheduler.runAfter` to offload asynchronous side-effects: logging via internal mutations, welcome-email orchestration, AI plan generation, and post-acceptance snapshot creation.
- Internal actions (`internalAction`) run in Node environments when accessing external APIs (Stripe, Resend, Groq, filesystem for terms import).

## Environment Variables (non-exhaustive)
- `SITE_URL`, `NEXT_PUBLIC_BASE_URL`: canonical origins for auth links and portal URLs.
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`: billing configuration.
- `CAL_WEBHOOK_SECRET`: validates Cal.com webhooks.
- `ADMIN_EMAIL`, `ADMIN_EMAILS`: comma-separated admin allowlist.
- `RESEND_API_KEY` (provided via Resend component), `GROQ_API_KEY` for AI agent, Better Auth secrets via `@convex-dev/better-auth`.

## Operational Notes
- Status progression: `AWAITING_AGREEMENT` → `AWAITING_PAYMENT` (agreement accepted) → `AWAITING_ASSETS` (Stripe activation) → manual `IN_PROGRESS`/`IN_REVIEW`/`LIVE` transitions via admin mutations. `ARCHIVED` retains historical data but is skipped when selecting the “primary” project for routing.
- Terms management: canonical content lives in `lib/legal/terms.js`; the hash/version must match frontend rendering to ensure legal traceability. Snapshots are generated asynchronously and persisted per agreement.
- Duplicate safety: prospect email comparisons and plan generation include normalization (`trim().toLowerCase()`, throttling) to avoid race conditions or rapid retries.
- Logging strategy: console logs include structured context (ids, emails, statuses) enabling deeper tracing in Convex logs without exposing PII beyond necessity.

Use this document as the source of truth for backend behavior when designing new flows, debugging incidents, or extending the Convex layer.
