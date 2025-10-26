Portal Backend Architecture & Flow
=================================

Purpose
-------
Capture how the Convex backend powers the client portal, from onboarding magic links through billing and scheduling workflows.

Core Systems
------------
- **Authentication**: Better Auth (magic links) surfaced through Convex actions in `auth.ts`.
- **Data layer**: Convex tables defined in `schema.ts` (`prospects`, `projects`, `agreements`, `billingCustomers`, `subscriptions`, `activity_log`, `scheduled_calls`).
- **Billing**: Stripe subscriptions via actions in `stripeActions.ts`, metadata helpers in `stripeHelpers.ts`, and webhook entry in `http.ts`.
- **Scheduling**: Cal.com webhooks processed in `calWebhook.ts` with supporting internal mutations in `cal.ts`.
- **Activity tracking**: `activity_log` rows appended through central helpers (`activityLog.ts`, agreement, Stripe, and Cal flows).

Key Convex Functions
--------------------
- `api.auth.getPortalDecision`: canonical redirect logic for every portal page.
- `api.projects.findOrCreateProjectForProspect`: ensures a project stub exists when an authenticated prospect reaches `/portal/agreement`.
- `api.agreement.createFromClickwrap`: records clickwrap acceptance, bumps project status to `AWAITING_PAYMENT`, and logs activity.
- `api.stripeActions.createCheckoutSession`: constructs subscription checkout with project metadata after agreement acceptance.
- `internal.stripeActions.syncStripeCustomer`: syncs Stripe subscription state into Convex, updates project status, and writes billing activity.
- `api.stripeActions.syncAfterSuccessForSelf`: invoked post-checkout to refresh subscription cache and advance project status.
- `api.prospects.findLatestByEmail` + `api.prospects.isKnownEmail`: allow the entry gate to pair prospects with authenticated emails.
- `internal.cal.upsertScheduledCall` + `internal.cal.updateProjectBooking`: keep scheduling snapshots aligned with Cal.com events.

Data Flow Overview
------------------
1. **Magic Link Auth**
   - `createAuth` wires Better Auth routes; `sendMagicLinkEmail` delivers links via Resend.
   - `getPortalDecision` runs for every request after login, returning `{ authed, primaryProject, prospectSessionId, subscription, redirect }`.

2. **Agreement Step (`/portal/agreement`)**
   - Client fetches `api.prospects.getProspectBySessionId` and `api.auth.getCurrentUser`.
   - Mutation `api.projects.findOrCreateProjectForProspect` ensures a project record matching the magic-link prospect.
   - `api.agreement.createFromClickwrap` persists acceptance and transitions status to `AWAITING_PAYMENT`.

3. **Checkout (`/portal/subscribe`)**
   - `api.stripeActions.createCheckoutSession` guarantees a Stripe customer, loads latest agreement, and encodes metadata (`projectId`, `prospectId`, `agreementId`, `termsVersion`).
   - Stripe billing portal access is handled via `api.stripeActions.createCustomerPortalSession`.

4. **Payment Success**
   - After Stripe redirect, `api.stripeActions.syncAfterSuccessForSelf` ensures KV cache freshness and moves the project to `AWAITING_ASSETS` when payment is active.
   - Stripe webhook (`/stripe/webhook`) routes through `internal.stripeActions.syncStripeCustomer`, which:
     - Writes subscription snapshot (`stripeHelpers.writeSubscription`).
     - Uses metadata to link back to Convex `projects`/`prospects`.
     - Logs activity (`payment.subscription_activated` or `payment.subscription_status_changed`).
     - Advances project status when appropriate (e.g., `AWAITING_PAYMENT` → `AWAITING_ASSETS`).

5. **Project Workspace (`/portal/[projectId]`)**
   - `api.projects.getPortalProject` enforces ownership and returns latest project state for the dashboard.
   - `getPortalDecision` continues to drive stage-based redirects if Stripe status regresses.

6. **Scheduling Integrations**
   - `/cal-webhook` (via `calWebhook.ts`) validates signatures, parses booking payloads, and upserts prospects/projects.
   - `internal.cal.upsertProspectFromBooking`, `internal.cal.upsertScheduledCall`, and `internal.cal.updateProjectBooking` keep Convex tables aligned with Cal.com events.
   - Activity entries (`call.booked`, `call.rescheduled`, `call.canceled`) document the timeline for analysis.

Supporting Utilities
--------------------
- `stripeHelpers.ts`: internal helpers for customer + subscription KV tables.
- `activityLog.ts`: centralized internal mutation for logging timeline events.
- `admin.ts`: admin-only mutations (create/update prospects, log magic-link sends).
- `emails.ts`: Resend client and internal email utilities.

Operational Notes
-----------------
- All Convex functions use new-style definitions with validators for arguments and returns.
- Internal functions (`internal.*`) are reserved for backend-only workflows (Stripe sync, Cal operations, activity logging).
- Background consistency: Stripe webhook now returns non-200 on failure so Stripe retries; subscription metadata keeps project activity deterministic.
- Projects transition strictly along the `projectStatus` enum, and all transitions are logged for auditability.
