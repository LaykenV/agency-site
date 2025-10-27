## Project Page Plan (Client Portal)

This document defines a concise, two-step plan to implement the client portal Project page at `app/portal/[projectId]/page.tsx`. It aligns with the WaaS blueprint in `agency.md` and existing Convex schema/validators. No code is changed by this plan.

Context from `agency.md` relevant to this page:
- Golden path stages: agreement → payment → assets → kickoff → build → review → go-live.
- Statuses (`projectStatusValidator`): "AWAITING_AGREEMENT" → "AWAITING_PAYMENT" → "AWAITING_ASSETS" → "IN_PROGRESS" → "IN_REVIEW" → "LIVE" → "ARCHIVED".
- Evidence snapshots: kickoff/review bookings (Cal.com), deployments (staging/live URLs), and activity log entries.

Current code context:
- `convex/schema.ts` already defines `projects` with optional `buildDetails`, `deployment`, `calKickoffBooking`, `calReviewBooking` plus `projectStatus`.
- `convex/projects.ts` provides `getPortalProject(projectId)` but does not currently return `buildDetails`, `deployment`, or call-snapshot fields in its return shape; we will extend it.
- `convex/calWebhook.ts` parses/validates Cal webhooks and writes to `scheduled_calls`, then updates `projects.calKickoffBooking` / `projects.calReviewBooking` via `internal.cal.updateProjectBooking`. We will add safe status nudges here.
- `app/portal/[projectId]/page.tsx` currently guards auth and derives `status` from `project` or `decision`. We will enrich this UI by status.


## Step 1 — Frontend (placeholders wired to future backend), `app/portal/[projectId]/page.tsx`

High-level goals:
- Provide a structured, status-driven experience from assets intake to live support.
- Implement UI sections with graceful loading and placeholders for uploads and mutations, then wire once backend lands.

Data contracts to rely on (existing/new):
- Queries
  - `projects.getPortalProject(projectId: string)` → must include: `_id`, `projectId`, `projectStatus`, `prospectId?`, `authUserId`, timestamps, plus `buildDetails?`, `deployment?`, `calKickoffBooking?`, `calReviewBooking?`.
  - `projects.listEditRequests({ projectId: Id<"projects"> })` → list of recent edit/support requests (new).
- Mutations
  - `projects.upsertBuildDetails({ projectId: Id<"projects">, headline?: string, domainPreference?: string, inspirationLinks?: string[], brand?: { styleVibe?: string }, logoFile?: File, imageFiles?: File[] })` (new - handles file uploads to Convex storage; myNotes is admin-only field not passed from client).
  - `projects.createEditRequest({ projectId: Id<"projects">, title: string, details: string, priority?: "low"|"normal"|"high", attachmentIds?: Id<"_storage">[] })` (new).
- Config
  - `lib/config.ts`: `CAL_KICKOFF_URL`, `CAL_REVIEW_URL` (do not hardcode in component).

UI sections by `projectStatus` (mutually exclusive primary section, with minimal cross-status context where helpful):
- AWAITING_AGREEMENT / AWAITING_PAYMENT
  - Preserve current redirects to `/portal/agreement` and `/portal/subscribe` (already implemented in page logic).

- AWAITING_ASSETS
  - Build Details Form (maps to updated `buildDetailsValidator` in `validators.ts`)
    - Fields (client-facing only; myNotes is admin-only and not shown here)
      - `headline` (text), `domainPreference` (text)
      - `inspirationLinks` (array of URL strings; tag/chips input that normalizes and validates URLs)
      - `brand.styleVibe` (text)
      - `brand.logoFile` (file upload → Convex storage)
      - `brand.imageFiles` (multiple files upload → Convex storage)
      - Computed: `brandAssetsUploaded` is set server-side true if logo or images uploaded to storage
    - Behavior
      - Client-side validation (URL format, required minimal fields).
      - Submit calls `projects.upsertBuildDetails` with file uploads to Convex storage; show success/error toasts; disable while pending.
      - On success: reveal a prominent "Schedule Kickoff Call" CTA.
  - Schedule Kickoff CTA
    - Primary button opens `CAL_KICKOFF_URL` in a new tab.
    - If `project.calKickoffBooking` exists, replace CTA with a small summary pill (title/date/time/link).

- IN_PROGRESS
  - Prominent status card: “Project build is in progress.”
  - If `calKickoffBooking` exists: show meeting summary (title/time/meetingUrl) for reference.
  - Secondary helpful text: expectations on next steps and timelines.

- IN_REVIEW
  - Staging Access + Review Call CTA
    - If `deployment.stagingUrl` present: “Open Staging” button (external link).
    - "Schedule Review Call" button opens `CAL_REVIEW_URL` (if no `calReviewBooking` yet).
    - If `calReviewBooking` exists, show meeting summary instead of CTA.

- LIVE
  - Live details and support
    - Show `deployment.liveUrl` prominently; optionally display `domainPreference` and a "renewal/billing" read-only blurb (derived elsewhere).
    - Edit/Support Request Form (simple)
      - `title` (short), `details` (textarea), `priority` (select: low/normal/high), optional `attachments` placeholder (future).
      - Submit calls `projects.createEditRequest`, toast, and refresh list.
    - "Your Requests" list (read-only)
      - Use `projects.listEditRequests` to show last N requests with status chips and createdAt; expand/collapse for details.

Componentization inside page (or extracted later):
- `BuildDetailsForm` (props: initialValues, onSubmit, pending)
- `CallCtaOrSummary` (props: kind: "kickoff"|"review", booking?, calUrl)
- `ReviewSection` (props: stagingUrl, reviewBooking)
- `LiveSupportPanel` (props: liveUrl)
- `SupportRequestForm` + `EditRequestsList`

File uploads
- `brand.logoFile` and `brand.imageFiles` use `<input type="file">` controls. Files will be uploaded to Convex storage via upload URLs in the backend mutation.

UX/quality:
- Respect existing app theming; keep current skeleton loaders.
- Use existing `components/ui/*` (button, input, textarea, label) for consistent visuals.
- Disable buttons while pending; optimistic hints after form submission.


## Step 2 — Backend (Convex), `convex/projects.ts`, `convex/calWebhook.ts`, `convex/cal.ts`, `convex/schema.ts`, `convex/validators.ts`

Schema — new table: `edit_requests` (support tickets)
- Add to `convex/schema.ts`:
  - Table `edit_requests` with fields:
    - `projectId: v.id("projects")`
    - `authUserId: v.string()`
    - `title: v.string()`
    - `details: v.string()`
    - `status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("waiting_on_client"), v.literal("resolved"), v.literal("closed"))`
    - `priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"))`
    - `attachments: v.optional(v.array(v.id("_storage")))`
    - `createdAt: v.number()`
    - `updatedAt: v.number()`
  - Indexes: `by_projectId` ["projectId"], `by_status_and_projectId` ["status", "projectId"], `by_createdAt` ["createdAt"].

Validators — `convex/validators.ts`
- Update `buildDetailsValidator` to match new structure:
  - Replace `functionalRequirements` with `myNotes: v.union(v.string(), v.null())`
  - Remove `brand.logoStatus` and `brand.photoStatus`
  - Replace `brand.logoUrl` with `brand.logoStorageId: v.optional(v.id("_storage"))`
  - Replace `brand.imageUrls` with `brand.imageStorageIds: v.optional(v.array(v.id("_storage")))`
  - Keep `brand.styleVibe` and `brandAssetsUploaded` flag
- Add an `editRequestValidator` for the base shape (can be used in returns or internal handling).

Projects functions — `convex/projects.ts`
- Extend `getPortalProject` return shape to include:
  - `buildDetails?: buildDetailsValidator` (but omit `myNotes` in client-facing return)
  - `deployment?: deploymentValidator`
  - `calKickoffBooking?: calBookingValidator`
  - `calReviewBooking?: calBookingValidator`
- New mutation: `upsertBuildDetails`
  - Args: `{ projectId: v.id("projects"), headline?: v.string(), domainPreference?: v.string(), inspirationLinks?: v.array(v.string()), brand?: { styleVibe?: v.string() } }` (note: myNotes is admin-only and not accepted from client; only editable via admin interface)
  - **File upload handling**: Client must first call `generateUploadUrl` for logo and images, upload files to those URLs, then pass the resulting storage IDs as additional args: `logoStorageId?: v.id("_storage")`, `imageStorageIds?: v.array(v.id("_storage"))`
  - Shallow-merge with existing `project.buildDetails`.
  - If `logoStorageId` or `imageStorageIds` provided, set `brandAssetsUploaded: true`.
  - Update `updatedAt`; append `activity_log` with `kind: "build.details_updated"`.
  - Returns: `v.object({ success: v.boolean() })`.
- New mutation: `createEditRequest`
  - Args: `{ projectId, title, details, priority?, attachmentIds? }` with validators (no pageUrls).
  - Auth: `authComponent.getAuthUser` and ensure `project.authUserId` matches.
  - Insert row with `status: "open"`, `priority: priority ?? "normal"`, timestamps, and `authUserId`.
  - Log activity `ticket.created`.
  - Returns: `v.object({ id: v.id("edit_requests") })`.
- New query: `listEditRequests`
  - Args: `{ projectId }` with ownership enforcement.
  - Query by `by_projectId`, order desc by `_creationTime` or `createdAt`, take last N (e.g., 20).
  - Returns: minimal fields for portal list: `_id`, `title`, `status`, `priority`, `createdAt`, `details?`.

Cal.com webhook handling — `convex/calWebhook.ts` and `convex/cal.ts`
- Keep current signature verification and robust parsing in `processCalWebhook`.
- After booking upserts and project snapshot updates, add idempotent status nudges via `internal.projects.internalSetStatusIfEligible`:
  - On `BOOKING_CREATED` with `callType === "kickoff"`: set status to `IN_PROGRESS` with `expectedCurrentStatus: "AWAITING_ASSETS"`.
  - On `BOOKING_CREATED` with `callType === "review"`: set status to `IN_REVIEW` with `expectedCurrentStatus: "IN_PROGRESS"`.
  - On cancellations, do not auto-regress status; just log.
- Log activity entries for these transitions: `call.kickoff_recorded` / `call.review_recorded` with relevant payload (ids, times).

Security and invariants
- Every public mutation/query validates ownership via `authComponent.getAuthUser` and compares to `project.authUserId`.
- Always include `args` and `returns` validators (use `v.null()` when no payload).
- Use indexes (`withIndex`) rather than `filter` for queries; order and take appropriately.

Storage implementation
- Brand assets (logo and images) are uploaded to Convex Storage:
  1. Frontend calls `generateUploadUrl` mutation to get upload URLs
  2. Frontend uploads files directly to those URLs
  3. Frontend passes resulting storage IDs to `upsertBuildDetails`
  4. Backend stores storage IDs in `buildDetails.brand.logoStorageId` and `buildDetails.brand.imageStorageIds`
- Support request attachments prepared for future iteration with same pattern.

Config
- Add `CAL_KICKOFF_URL` and `CAL_REVIEW_URL` to `lib/config.ts` and import them in the Project page component.

Testing and acceptance
- Build details submit with file uploads saves to storage and updates project; shows Kickoff CTA.
- Logo and image files are uploaded to Convex storage and storage IDs are saved in buildDetails.
- Kickoff booking webhook sets `calKickoffBooking`; page shows "In progress".
- When project moves to `IN_REVIEW`, page shows staging link (if present) and Review CTA or summary.
- When `LIVE`, page shows live URL, support form works (without pageUrls) and lists requests.
- Ownership enforced for all reads/writes.

Rollout order
1) Backend: add schema table and indexes; ship `upsertBuildDetails`, `createEditRequest`, `listEditRequests`, extend `getPortalProject`, and webhook status nudges.
2) Frontend: ship UI with placeholders, wire to new functions/config, and verify flows on staging.


