## Cal.com → Prospect Upsert: Full Implementation Plan

### Goals
- On Cal.com booking creation, upsert a `prospects` record by attendee email.
- If the prospect exists, overwrite `details` (name/phone) and set `calProspectBooking`.
- If it doesn’t exist, create it with required fields and attach `calProspectBooking`.
- Keep stored booking data minimal but future‑proof for additional meeting types.

### Current state (as of repo)
- `convex/http.ts` exposes POST `/cal-webhook` and calls `api.calWebhook.processCalWebhook`.
- `convex/calWebhook.ts` has an `action` that verifies HMAC (working) and logs payload.
- Schema:
  - `prospects` table has `details` and optional `calProspectBooking`.
  - Index `prospects.by_contactEmail` already exists (via `details.contactEmail`).

### Payload → Schema mapping (BOOKING_CREATED)
Source fields (Cal payload → our schema):
- Identity for upsert
  - email: `payload.responses.email.answer` or `payload.attendees[0].email` → normalize to lowercase/trim → lookup in `prospects.details.contactEmail` (via `by_contactEmail`).
  - name: `payload.responses.name.answer` or `payload.attendees[0].name` → `prospects.details.contactName` (overwrite).
  - phone: prefer `payload.responses.attendeePhoneNumber.answer`; else if `payload.location` looks like a phone, use it → `prospects.details.phone` (overwrite).

- Booking details → `prospects.calProspectBooking`
  - scheduledAt: `Date.parse(payload.startTime)` (ms)
  - meetingUrl: if `payload.location` appears to be a URL (e.g., starts with `http`), store it; for phone calls, leave `undefined`.
  - notes: `payload.additionalNotes` or `payload.responses.notes.answer`
  - calEventId: prefer `payload.uid` (stable unique id)
  - attendeeMetadata: `{ name, email, phone }` as above
  - status: `payload.status` (e.g., "ACCEPTED")
  - eventTypeKey: `payload.type` (e.g., "agency-prospect")
  - durationMinutes: `payload.length`
  - externalBookingId: `String(payload.bookingId)`

### Minimal schema/validator updates (do now)
- Update `convex/validators.ts` `calBookingValidator` to add the following optional fields:
  - `status?: string`
  - `eventTypeKey?: string`
  - `durationMinutes?: number`
  - `externalBookingId?: string`
- No `schema.ts` change needed beyond the validator expansion; `prospects.calProspectBooking` already references `calBookingValidator`.

### Overwrite policy (confirmed)
- When a matching prospect is found by email, overwrite `details.contactName` and `details.phone` with webhook values if provided (not just backfill).
- Always ensure `details.contactEmail` remains the normalized email.

### Function design and flow
1) HTTP endpoint (unchanged)
   - `convex/http.ts` remains the single handler for `/cal-webhook` and calls `api.calWebhook.processCalWebhook`.

2) Action for verification + routing (existing file; extend logic)
   - File: `convex/calWebhook.ts` (Node runtime; has `"use node"`).
   - Steps:
     - Verify `x-cal-signature-256` using current HMAC flow (keep as-is since it’s working). Optionally, make the comparison tolerant to a `sha256=` prefix if encountered later.
     - Parse the raw JSON body.
     - Route on `triggerEvent` and `payload.type`:
       - For now, handle only:
         - `triggerEvent === "BOOKING_CREATED"` AND `payload.type === "agency-prospect"` → upsert a prospect.
       - Build a normalized arg object (see “Internal mutation args”).
       - Call an internal mutation to perform the DB write transactionally.

3) Internal mutation for upsert (new; separate file from the action)
   - New file: `convex/cal.ts` (or `convex/cal/bookings.ts`), Convex (non-Node) runtime.
   - Name: `upsertProspectFromBooking` (internalMutation).
   - Args shape:
     - `email: string`
     - `name?: string`
     - `phone?: string`
     - `booking: { scheduledAt: number; meetingUrl?: string; notes?: string; calEventId: string; attendeeMetadata: { name?: string; email?: string; phone?: string }; status?: string; eventTypeKey?: string; durationMinutes?: number; externalBookingId?: string; }`
   - Logic:
     1. Normalize `email` to lowercase/trim (match the normalization in `onboarding/sessions.ts`).
     2. Query `prospects` via index `by_contactEmail`.
     3. Build `calProspectBooking` from args.
     4. If a prospect exists:
        - Overwrite `details.contactName` and `details.phone` when provided.
        - Patch `calProspectBooking` with the new booking (overwrite even if `calEventId` matches).
        - Always update `updatedAt`.
     5. If none exists:
        - Generate `sessionId` and `resumeToken` with `crypto.randomUUID()`.
        - Insert a new `prospects` row with required `details` fields; fill unknown required fields with empty strings per current schema.
        - Set `planGenerationInProgress: false`, timestamps `createdAt`/`updatedAt`.

### Idempotency
- Primary dedupe key: `calEventId = payload.uid`.
- Even if matching, we overwrite `calProspectBooking` per overwrite policy — this is safe and simple.
- We also store `externalBookingId` for debugging/tracing.

### Field normalization and parsing rules
- Email: lowercase + trim. Use consistent normalization as in `onboarding/sessions.saveDetailsInternal`.
- Scheduled time: `Date.parse(payload.startTime)` → number (ms).
- Meeting URL vs phone detection (simple heuristics):
  - If `payload.location` starts with `http` or contains `://` → treat as URL and store in `meetingUrl`.
  - If `payload.location` looks like a phone (e.g., starts with `+` and digits) → treat as phone (store in `attendeeMetadata.phone`; leave `meetingUrl` undefined).
- Notes: prefer `payload.additionalNotes`; fallback to `payload.responses.notes.answer` if present.

### Reuse and consistency with existing code
- Email normalization should mirror `onboarding/sessions.ts` behavior for consistency.
- Timestamps and audit fields: continue using `Date.now()` for `createdAt`/`updatedAt`.
- Keep logging minimal (event type, uid, normalized email) to avoid leaking PII.

### Future enhancements (commented in code only; do not implement yet)
- Support more meeting types by `payload.type`:
  - `"agency-kickoff"` → upsert `projects.calKickoffBooking`.
  - `"agency-review"` → upsert `projects.calReviewBooking`.
  - Likely add `projects` index by `prospectId` (e.g., `by_prospectId`) when implementing those flows, then find the project by `prospectId`.
- Handle `BOOKING_RESCHEDULED` and `BOOKING_CANCELLED`:
  - Lookup by `calEventId` and update `status` and `scheduledAt` (reschedule) or mark `status: "CANCELLED"` (cancel).

### Acceptance criteria
- A booking POST from Cal with `type: "agency-prospect"` and `BOOKING_CREATED`:
  - Creates a new `prospects` record when email is new, with `details` populated and `calProspectBooking` set.
  - Updates an existing `prospects` record when email exists, overwriting name/phone and `calProspectBooking`.
  - Returns HTTP 200 on success; returns 401 on bad signature; returns 500 on processing error so Cal retries.

### Step-by-step implementation checklist
1) Update `convex/validators.ts` `calBookingValidator` with optional fields: `status`, `eventTypeKey`, `durationMinutes`, `externalBookingId`.
2) Create `convex/cal.ts` with `internalMutation upsertProspectFromBooking` implementing the upsert logic above.
3) Extend `convex/calWebhook.ts` action to:
   - Continue verifying HMAC, parse JSON.
   - Extract normalized fields per mapping rules.
   - Route only `BOOKING_CREATED` + `payload.type === "agency-prospect"` to call `internal.cal.upsertProspectFromBooking`.
   - Return 200/500 appropriately.
4) Leave `convex/http.ts` as-is.
5) Add minimal, non-PII logs.

### Test plan (manual)
- Happy path (new email): Send a sample payload; verify new `prospects` row with `calProspectBooking` and details set.
- Existing prospect: Pre-create a prospect with the same email; send payload; verify overwrite of `details.contactName`/`phone` and updated `calProspectBooking`.
- Bad signature: Modify body to fail HMAC; expect 401.
- Missing optional fields: Try payload without `responses`; ensure defaults and no crashes.

### Observability
- Log: `triggerEvent`, `payload.type`, `payload.uid`, normalized email.
- Avoid logging full payload or PII beyond what’s necessary for debugging.

### Rollout
- Ship validator update + new internal mutation + action routing changes together.
- Verify on a staging webhook first; then enable in production.


