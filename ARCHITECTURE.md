# Architecture

Technical blueprint for `agency-site`. The Hub side of the Hub ↔ Spoke architecture — runs the marketing pipeline, admin portal, client portal, agreement clickwrap, Stripe billing, Cal.com integration, and the public APIs that bespoke client sites POST to.

For the lifecycle flow (lead → live), see `CLIENT_LIFECYCLE.md`.
Client sites are built bespoke. `../agency-template/` is **fully retired as of 2026-08-05**; `../agency-playground/` is the current reference Spoke.

---

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5.
- **Backend:** Convex (DB + functions + file storage). Schema lives at `convex/schema.ts`, validators at `convex/validators.ts`.
- **Auth:** Better Auth (magic link only, no password / OAuth).
- **Payments:** Stripe (subscriptions + checkout + webhooks). No local subscriptions table; state lives in Stripe and a KV cache (`stripe_subscription_cache`).
- **Email:** Resend.
- **Scheduling:** Cal.com (webhook integration).
- **Marketing pipeline:** Google Places + Firecrawl + PageSpeed Insights + Groq (AI scoring) + `@convex-dev/workflow` for orchestration.
- **Video generation:** Remotion (5 promo formats, rendered to `out/`).
- **Hosting:** Vercel.

### Convex components

Wired in `convex.config.ts`:

- `@convex-dev/agent` — AI agent framework (used by `convex/onboarding/agent.ts`).
- `@convex-dev/better-auth` — Authentication.
- `@convex-dev/resend` — Email sending.
- `@convex-dev/rate-limiter` — Rate limiting for HTTP endpoints.
- `@convex-dev/workflow` — Marketing pipeline orchestration with bounded parallelism.
- `@convex-dev/twilio` — SMS notifications.
- `@convex-dev/polar` — Installed but unused (Stripe preferred).

---

## Route map

| Route | Purpose | Auth |
|---|---|---|
| `/` | Marketing site (landing) | Public |
| `/onboarding` | Prospect intake flow | Public |
| `/audit/[token]` | Tokenized public audit report (redirects from `/demo/[token]`) | Public, token-gated |
| `/portal/agreement` | Clickwrap first step (gated by magic link) | Magic link |
| `/portal/success` | Post-checkout Stripe sync + redirect | Magic link |
| `/portal/[projectId]` | Client portal dashboard (status-driven) | Magic link |
| `/portal/welcome` | Optional linking route | Magic link |
| `/admin` | Admin dashboard (server-gated by `ADMIN_EMAIL` env var) | Admin |
| `/admin/leads` | Cross-client lead inbox with triage and client filters | Admin |
| `/admin/marketing` | Outbound pipeline control center | Admin |
| `/legal/terms` | Versioned, hashable Terms of Service | Public |
| `/api/stripe` | Stripe webhook | Signed |
| `/api/cal-webhook` | Cal.com webhook | Signed |
| `/api/v2/leads` | Hub: authenticated lead intake (Stage 2) | Bearer `sk_live_…` (hashed at rest); only lead route |
| `/api/v2/events` | Hub: typed pageviews + conversion clicks (Stage 3) | Body `pk_live_…` + Origin |
| `/api/v1/analytics/pixel` | Hub: legacy page-view pixel | Origin required; retained until spokes migrate to v2 events |
| `/api/analytics/pixel` | Legacy alias of v1 (config-driven clients) | Same as v1 |

---

## Hub ↔ Spoke contract

Bespoke client sites call the Hub for lead intake and browser telemetry. The contract is versioned so the payload shape can evolve without breaking already-deployed client sites. Each site implements the contract directly — there is no shared template repo to inherit it from.

### Endpoints

```
POST /api/v2/leads             (Stage 2: Bearer sk_live_<keyId>_<secret>)
POST /api/v2/events            (Stage 3: body publishableKey pk_live_… + Origin)
POST /api/v1/analytics/pixel   (legacy pageviews; Origin required)

POST /api/analytics/pixel      (legacy unversioned alias of v1)
```

`/api/v2/leads` is the only lead-ingestion route. TB Tree, Chelsea, and the
playground passed authenticated production verification on 2026-08-05; the
unauthenticated v1 and unversioned lead aliases were then retired.
Credentials live in `project_credentials` (SHA-256 of the full key only; raw key shown once in admin). Verification order: body ceiling → parse Bearer → resolve non-revoked `secret` by `keyId` → constant-time hash compare → resolve project **from the credential** (body `projectId` is optional and must match when present) → status must be `LIVE`/`IN_REVIEW` → field validation → rate limits → insert + triage.

Field validation runs before rate-limit consumption so a malformed payload does not burn a project's daily ceiling. `visitorHash` is read from either the top level or `meta`; when present it keys `leadPerVisitor`, when absent the request falls back to the `leadNoTrustedVisitor` project bucket. Check `hasVisitorHash` in the `[hub.lead.v2] accepted` log line to confirm a spoke is actually supplying it.

**Pre-auth failures write no counters** — only `[hub.lead.v2] auth_failed` (or
`[hub.events.v2] auth_failed`) log lines. A counter bump is a mutation, so
incrementing one before authentication would let unauthenticated callers drive
unbounded contended writes. Count auth failures from logs, not from
`hub_operational_counters`.

TB Tree holds its `sk_live_…` credential in the Next.js Server Action runtime.
Chelsea's static browser posts to same-origin `/api/contact`; that Vercel
Function holds the credential and forwards to the Hub. Neither browser receives
an `sk_live_…` value.

**Stage 3 events:** browser JS may hold a `pk_live_…` publishable key and POST
to `/api/v2/events` with `{publishableKey, type, path, referrer?, meta?}`. Types
are only `pageview` and `click` (with `meta.target` ∈ `tel` | `email` |
`directions`). Auth is publishable key hash + Origin allowlist — a soft
integrity boundary, not secret lead auth. Raw events land in `client_events`;
daily aggregates (including click counts and coarse `referrerClass`) roll into
`client_analytics`. Portal reads aggregates only. Labels are honest:
tap-to-call **clicks**, not completed calls. Coarse referrer classes are not
campaign/GBP attribution.

v1 analytics remains for spokes not yet on a publishable key. The reusable
template prefers v2 when `NEXT_PUBLIC_WAAS_PUBLISHABLE_KEY` (or config) is set.

### Lead payload

```json
{
  "projectId": "PROJECT_ID_FROM_ADMIN",
  "source": "contact-form",
  "data": {
    "name": "Jane Customer",
    "email": "jane@example.com",
    "phone": "(555) 123-4567",
    "message": "I need an estimate."
  }
}
```

### Events payload (Stage 3)

```json
{
  "publishableKey": "pk_live_<keyId>_<secret>",
  "type": "pageview",
  "path": "/services",
  "referrer": "https://www.google.com/"
}
```

```json
{
  "publishableKey": "pk_live_<keyId>_<secret>",
  "type": "click",
  "path": "/",
  "meta": { "target": "tel" }
}
```

### Analytics payload (legacy v1)

```json
{
  "projectId": "PROJECT_ID_FROM_ADMIN",
  "path": "/services",
  "referrer": "direct"
}
```

### Hub validation

Per request (cheapest rejections first):

- Require `Content-Type: application/json` and enforce a **16 KB** body ceiling while reading.
- For leads, verify the hashed bearer credential, resolve its project, and
  require project status `LIVE` or `IN_REVIEW`. Never authorize from a body
  project ID or browser Origin.
- For v2 events, verify the hashed publishable key from the body, resolve its
  project, require browser `Origin` to match `deployment.liveUrl` /
  `stagingUrl`, and enforce typed `type`/`payload` pairings (no free-form
  event names or `v.any()` meta on the wire).
- For legacy v1 analytics, look up the public project ID and require browser
  `Origin` to match `deployment.liveUrl` (with or without `www.`) or
  `stagingUrl`.
- **Never key rate limits on spoofable `x-forwarded-for`.** An unproven edge header is worse than none, since an attacker rotates its value to escape the strict project bucket. `x-forwarded-for` and `x-real-ip` can never be trusted.

  **Both `HUB_VISITOR_OBSERVATION_UNTIL` and `HUB_TRUSTED_IP_HEADER` are deliberately unset and should stay that way.** Lead spokes derive a keyed visitor digest inside their own hosting runtime. Analytics/events use the project-scoped fallback when no trusted visitor key exists.
- Project ceilings (fixed window, hold under IP spoofing). **Storage ceilings are deliberately far looser than cost ceilings** — exhausting a storage ceiling rejects a paying client's real customers, so it exists to stop database abuse, not to control spend:
  - `leadIngestPerProject` — 1000/day storage; exhausted → `429` (do not insert) **and an admin threshold alert**, because rejected leads are lost customers.
  - `leadNoTrustedVisitor` — 30/hour fallback when an authenticated spoke cannot provide `visitorHash`; exhausted → `429` + threshold alert.
  - `paidFanoutPerProject` — 50/day Groq+email+SMS; exhausted → **still store** lead as `untriaged` with `fanoutPaused`, skip fan-out, one admin threshold alert. This is the real spend cap.
  - `smsPerProject` — 20/day; SMS is **allow-verdict only**.
- Field limits before insert: name ≤120, email ≤200 + format check, phone ≤40, message ≤4000; strip C0/C1 controls. Every over-limit field rejects the request.
- Analytics/events use the stricter project fallback (30/min), since no trusted visitor header is configured. Worst case without a per-visitor key is an inaccurate pageview/click count, not a lost lead. Bounded `referrer` is rolled into daily `topReferrers`, capped at 10 entries; Stage 3 also stores coarse `referrerClass` (organic/social/direct/other).
- Threshold alerts are claimed once per project+limit window before scheduling (`thresholdAlertPerProjectLimit`), then persist one `hub.threshold_alert` before the independent global delivery cap (`adminOpsAlertGlobal`). `hub.threshold_alert_delivered` is written only after a successful email. Daily accepted, 429-by-bucket, and paused-fan-out totals are aggregated in `hub_operational_counters` so hostile traffic cannot create unbounded event rows.

Stage 2 closed the unauthenticated paid-fan-out hole by removing every
unauthenticated lead route after the configured production spokes passed v2.

**PageSpeed snapshots (Stage 3):** first transition to `LIVE` schedules a
non-blocking mobile PageSpeed run against `deployment.liveUrl` when no snapshot
exists. Admin can refresh from Projects. Stored on the project as
`pageSpeedSnapshot` + `pageSpeedSnapshotUrl`; portal labels "measured on {date}".

### Failure mode to remember

If leads stop working, check the spoke's `WAAS_SECRET_KEY`, the credential's
active/`lastUsedAt` state, and `[hub.lead.v2]` logs. If analytics/events stop
working, check the Origin allowlist, deployment URLs, and publishable
credential `lastUsedAt` / `[hub.events.v2]` logs. Also check admin **Untriaged /
Fan-out paused** and v2 rate-limit logs.

---

## Authentication (Better Auth + magic link)

- Magic link tokens valid for 24 hours. Users can click the link any time within a day of receiving it.
- Tokens stored server-side (hashed in the DB), **not** in the browser → links work cross-device.
- Session expiry: 1 year with 24-hour sliding refresh. Active users stay logged in indefinitely.
- Rate limiting: 3 sends/min, 10 verifications/min, 100 total requests/min.
- Session cookie caching: 5-minute cache reduces DB validation calls.
- Server-side token pre-fetch via `initialToken` prop on `ConvexBetterAuthProvider` for instant auth hydration.

### Mobile cross-tab fix (V1.5, shipped)

**Problem:** Mobile browsers hung on magic link auth due to cross-tab WebSocket / BroadcastChannel contention with the originating tab.

**Root cause:** Next.js route group layouts nest inside the root layout — can't escape `ConvexClientProvider`.

**Solution:** After sending a magic link, redirect the "Check your inbox" tab to a static HTML file (`/link-sent.html`) instead of a Next.js route. This destroys the JS context entirely, eliminates the WebSocket contention, and lets the link-clicked tab authenticate cleanly.

### File layout

- Client: `lib/auth-client.ts` exports `authClient`.
- Server: `lib/auth-server.ts` exports `getToken()`.
- Convex: `authComponent.getAuthUser(ctx)` in queries.
- Component config: `convex/auth.ts`.

---

## Data model (Convex)

All tables defined in `convex/schema.ts`, validators in `convex/validators.ts`.

### Core lifecycle tables

| Table | Purpose | Key indexes |
|---|---|---|
| `prospects` | Inbound and admin-created sales prospects | `by_sessionId`, `by_resumeToken`, `by_contactEmail`, `by_updatedAt` |
| `projects` | Paid (or pending) client projects | `by_authUserId`, `by_projectId`, `by_updatedAt` |
| `agreements` | Clickwrap evidence (versioned, hashed) | `by_projectId`, `by_acceptedAt` |
| `activity_log` | Audit trail of every state change | `by_projectId`, `by_prospectId`, `by_createdAt` |
| `scheduled_calls` | Cal.com bookings (confirmation / kickoff / review / support) | `by_projectId`, `by_startTime`, `by_calEventId` |
| `edit_requests` | Unlimited-edits ticketing for LIVE clients | `by_projectId`, `by_status_and_projectId` |

### Hub tables (cross-client)

| Table | Purpose |
|---|---|
| `client_leads` | Lead submissions from every bespoke client site, keyed by `projectId` |
| `client_analytics` | Daily page-view aggregates + top 10 pages per client, keyed by `projectId + date` |

### Marketing pipeline tables

| Table | Purpose |
|---|---|
| `marketing_searches` | Batch-level: a "{industry} in {city}, {state}" run, with status transitions and counts |
| `scraped_leads` | Business-level: one row per Google Places result, with Firecrawl + PageSpeed + Groq enrichment + status pipeline + tokenized audit data |

### Stripe KV tables

| Table | Purpose |
|---|---|
| `stripe_customers` | `authUserId → stripeCustomerId` mapping |
| `stripe_subscription_cache` | Cached subscription state (status, period dates, payment method last4) keyed by `stripeCustomerId` |

There is **no local `subscriptions` table** — read subscription state from Stripe via the KV cache.

### `projectStatus` state machine

```
AWAITING_AGREEMENT
  → AWAITING_PAYMENT      (clickwrap signed)
    → AWAITING_ASSETS     (Stripe webhook activates subscription)
      → IN_PROGRESS       (admin transitions after kickoff)
        → IN_REVIEW       (admin transitions when staging is ready)
          → LIVE          (admin transitions after domain go-live)
            (or ARCHIVED if stuck > 30–60 days in AWAITING_*)
```

Status transitions out of `IN_PROGRESS`/`IN_REVIEW`/`LIVE` are **manual via admin panel** — no automatic transitions on Cal.com booking creation or any other side effect. Activity log captures every change.

---

## Webhooks

### `/api/stripe`

Handles `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, and `payment_intent.*`.

- Stripe signature verified on every request.
- Event ID checked for idempotency.
- On `subscription activated` or `first invoice paid`:
  - Update `projectStatus` → `AWAITING_ASSETS` (if still `AWAITING_PAYMENT`).
  - Sync subscription state to `stripe_subscription_cache`.
  - Append `activity_log` entry: `payment.subscription_activated`.
  - Send "Welcome Aboard" email with order summary and terms snapshot link.
- On `payment failures` / `canceled`:
  - Append `activity_log` entry only — **do not mutate `projectStatus`**.
  - Restrict portal features at *read time* based on `stripe_subscription_cache.status`.

### `/api/cal-webhook`

Cal.com booking events. Writes to `scheduled_calls`, updates the relevant booking field on `prospects` or `projects`:

- `prospects.calProspectBooking` — confirmation calls
- `projects.calKickoffBooking` — kickoff calls
- `projects.calReviewBooking` — review calls

Appends `activity_log` entry: `call.booked` / `call.rescheduled` / `call.canceled`.

**Important:** project status transitions are **not** automated on booking events. Admin transitions manually.

---

## Marketing pipeline architecture

Module layout in `convex/marketing/`:

- `workflow.ts` — `@convex-dev/workflow` orchestration (search → scrape → analyze → outreach)
- `pipeline.ts` — Stage-by-stage logic (scrape, score, generate audit report)
- `search.ts` — Google Places search
- `emails.ts` — Outreach email generation + Resend dispatch
- `public.ts` — Public-facing audit page rendering

### External APIs

- **Google Places** — business discovery
- **Firecrawl** — website scrape (markdown, screenshot, color, tech detection, contact email) + audit page screenshot for email embed
- **PageSpeed Insights** — mobile performance score
- **Groq** — AI fit scoring + pain points / selling points / outreach angle generation

### Orchestration

`@convex-dev/workflow` with `maxParallelism: 2` to respect API quotas. Per-step retries, per-lead error isolation (one bad scrape doesn't kill the batch).

### Tokenized audit reports

- Qualified leads (`fitScore ≥ 6`) get a UUID `demoToken`.
- `/audit/{token}` renders a public, non-indexed report page.
- First visit stamps `demoViewedAt` — follow-up prioritization signal.
- "Convert to Prospect" button moves the lead into the sales workflow (`prospects` table).

---

## File storage (Convex)

`convex/files.ts`:

- `generateUploadUrl` (mutation) — Returns pre-signed upload URL for client-side file uploads.
- `getUrls` (query) — Fetches signed URLs for stored files with ownership verification.
- `deleteFile` (mutation) — Deletes with authorization checks.

Used for:

- Logo uploads via the Build Details form.
- Brand image uploads via the Build Details form.
- Edit request attachments (up to 5 images per request; PNG / JPEG / WebP / SVG; 10MB max each).

Attachment storage IDs are automatically unioned into project brand images for authorization scoping.

---

## Admin portal

Routes server-gated by `ADMIN_EMAIL` env var (supports comma-separated `ADMIN_EMAILS` for multiple admins).

### Tabs

- **Prospects** — list, create/edit, send magic links.
- **Projects** — list sorted by recent activity, update status, manage `myNotes`, update deployment URLs (`liveUrl`, `stagingUrl`, `vercelProjectId`). Expanded view shows full Build Details: headline, domain preference, inspiration links, color scheme swatches, logo and brand image thumbnails, deployment URLs.
- **Client Leads** (`/admin/leads`) — paginated cross-client lead stream. Defaults to AI-allowed submissions, with Spam and All views plus a client/project filter. The All view keeps review, untriaged, and pre-triage legacy records visible.
- **Scheduled Calls** — grouped by date, with project/prospect links.
- **Edit Requests** — attachment thumbnails (3 inline + "+N more"), filter by status, update status and priority.
- **Marketing** (`/admin/marketing`) — Searches tab (batch status, cancellation), Leads tab (pipeline actions, notes, outreach, conversion), Follow-ups tab (time-based queue).

### Admin API surface

All mutations guarded by `requireAdmin` (see `convex/adminGuard.ts`).

| Query | Returns |
|---|---|
| `admin.listProspects` | All prospects with full details |
| `admin.listProjects` | Projects + full `buildDetails` (headline, domain, inspiration, myNotes, brand colors + storage IDs) |
| `admin.listScheduledCalls` | Scheduled calls with optional filtering |
| `admin.listEditRequests` | Edit requests with attachments |
| `admin.getProjectFileUrls` | Signed URLs for project logo + brand images |
| `adminLeads.list` | Paginated client leads filtered by triage verdict and optional project |
| `adminLeads.listClients` | Projects with stored leads and display metadata for filtering |

| Mutation | Purpose |
|---|---|
| `admin.updateProjectStatus` | Manual status transition |
| `admin.updateProjectMyNotes` | Admin-only notes field |
| `admin.updateDeployment` | Set liveUrl / stagingUrl / vercelProjectId |
| `admin.updateEditRequestStatus` | Move ticket through workflow |

All admin mutations log to `activity_log` with `actor: "admin"` and a descriptive `kind`.

---

## Security & compliance

### Agreement evidence

- SHA-256 hash of canonical terms content stored as `termsHash`.
- `termsVersion` recorded per agreement.
- `userAgent` captured on submit.
- IP capture deferred (edge-captured later; not required for MVP).

### Webhooks

- Stripe signature verified on every event.
- Cal.com webhook tokens verified.
- Event IDs used for idempotency.
- Replay protection enforced.

### PII

- Never store raw payment details (Stripe handles all card data).
- Log all user-facing state changes to `activity_log`.

### Admin access control

- **Layer 1 (route):** `app/admin/layout.tsx` server-checks `ADMIN_EMAIL` / `ADMIN_EMAILS` env vars on every request.
- **Layer 2 (function):** Convex RBAC guard at `convex/adminGuard.ts` enforces admin status on every admin query/mutation.
- Defense in depth — both checks must pass.
- Audit trail: every admin mutation appends `activity_log` with `actor: "admin"`.

---

## Dunning & archival

### Stripe dunning

- **Day 0 fail:** notify client by email.
- **Day 3 fail:** Stripe retries automatically + second email.
- **Day 7 fail:** restrict portal features at read time based on `stripe_subscription_cache.status`. **No `projectStatus` mutation** — restriction is purely read-side.

### Archival

- Projects stuck in `AWAITING_AGREEMENT` or `AWAITING_PAYMENT` > 30–60 days → transition to `ARCHIVED`.
- `ARCHIVED` projects show a read-only notice with support contact in the portal.

---

## Convex coding conventions

Required patterns (these are non-negotiable):

- **Always include argument and return validators** for every query / mutation / action.
- Use `withIndex` over `filter` for indexed queries.
- Use `v.null()` when a function returns null (not `v.optional`).
- Index names spell out every field: `by_projectId_and_status`, not `by_status`.
- Use `internalQuery` / `internalMutation` / `internalAction` for functions that should not be exposed publicly.
- Path alias: `@/*` maps to project root.

Example shape:

```ts
export const myQuery = query({
  args: { id: v.id("projects") },
  returns: v.object({ /* ... */ }),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## Routing highlights

- `/portal/agreement` is the gated first step — magic link lands here.
- `/portal/success` performs `syncStripeDataToKV(customerId)` then redirects to `/portal`.
- `/legal/terms` is versioned and hashable — the agreement records the version+hash that was accepted.
- The catch-all admin route is gated server-side, never reached by non-admin users.

---

## Emails (Resend)

- Welcome Agreement Link (magic link to `/portal/agreement`).
- Payment Success + Terms snapshot link (sent post-webhook).
- Kickoff reminder.
- Dunning + failed payment notices (per Stripe events).
- Marketing audit + follow-up emails with audit report links and screenshots.

---

## Local commands

```bash
bun run dev               # runs Next.js + Convex in parallel
bun run dev:frontend      # Next.js only
bun run dev:backend       # Convex only
bun run build
bun run lint

# Promo videos (Remotion)
bun run video:preview     # Browser preview
bun run video:render:all  # Render all 5 formats to out/
```
