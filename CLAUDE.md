# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## What this repo is

Acadiana Web Design's Hub: Website-as-a-Service operations stack. Next.js 16 + Convex backend providing:

- Marketing site with inbound prospect intake.
- Automated outbound pipeline (Google Places → Firecrawl → PageSpeed → Groq → tokenized audit reports → outreach emails).
- Client portal driven by `projectStatus` state machine (AWAITING_AGREEMENT → AWAITING_PAYMENT → AWAITING_ASSETS → IN_PROGRESS → IN_REVIEW → LIVE).
- Admin dashboard at `/admin`.
- Agreement clickwrap + Stripe subscription billing + webhook automation.
- Public Hub APIs (`/api/v2/leads` bearer auth, `/api/v2/events` publishable-key
  pageviews/clicks) that bespoke client sites POST to. Both are authenticated;
  there is no unauthenticated Hub ingest route.
- Remotion-based promo video generation.

**`../agency-template/` is fully retired (2026-08-05).** Do not read it, patch it,
or clone from it. Client sites are built bespoke against the contract below.
`../agency-playground/` is the reference Spoke and the first site to run each new
Hub contract in production.

## Where to find things

| Need | Doc |
|---|---|
| Business model, pricing, marketing plan | `BUSINESS.md` |
| Technical blueprint, schema, contracts, security | `ARCHITECTURE.md` |
| End-to-end client lifecycle (lead → live → ops) | `CLIENT_LIFECYCLE.md` |
| Dev commands, env vars, repo layout | `README.md` |

Read those before making non-trivial changes.

## Commands

```bash
# Development (Next.js + Convex in parallel)
bun run dev

# Individual services
bun run dev:frontend     # Next.js only
bun run dev:backend      # Convex only

# Build & lint
bun run build
bun run lint

# Video (Remotion)
bun run video:preview
bun run video:render:all
```

## Architecture summary

### Frontend (Next.js App Router)

- `app/` — pages with server components by default.
- `app/portal/` — magic-link-gated client portal.
- `app/admin/` — admin dashboard (`ADMIN_EMAIL` server-gated).
- Public `/onboarding` is retired; sales intake is Cal.com, then admin-created prospects/projects.
- `app/audit/[token]/` — public tokenized audit pages for outreach.
- `components/` — feature components; UI primitives in `components/ui/`.
- `lib/` — client utilities, auth helpers, hooks.

### Backend (Convex)

- `convex/schema.ts` — all tables: `prospects`, `projects`, `agreements`, `order_forms`, `activity_log`, `scheduled_calls`, `edit_requests`, `client_leads`, `client_analytics`, `marketing_searches`, `scraped_leads`, plus Stripe KV tables.
- `convex/validators.ts` — shared validators.
- `convex/http.ts` — webhooks (Stripe, Cal.com), authenticated v2 lead ingestion, authenticated v2 events.
- `convex/auth.ts` — Better Auth integration (magic link).
- `convex/adminGuard.ts` — `requireAdmin` for admin queries/mutations.
- `convex/projectAccess.ts` — `requireProjectOwner` / `requireProjectBySlug` / `getProjectIfOwner` / `getProjectBySlugIfOwner` for **client portal** functions.
- `convex/files.ts` — file storage helpers (logos, brand images, edit request attachments).
- `convex/marketing/` — outbound pipeline (`workflow.ts`, `pipeline.ts`, `search.ts`, `emails.ts`, `public.ts`).

### Convex components (`convex.config.ts`)

- `@convex-dev/agent` — AI agent framework
- `@convex-dev/better-auth` — auth
- `@convex-dev/resend` — email
- `@convex-dev/workflow` — marketing pipeline orchestration
- `@convex-dev/rate-limiter` — HTTP endpoint rate limiting
- `@convex-dev/twilio` — SMS
- `@convex-dev/polar` — installed, unused (Stripe preferred)

### Video (Remotion)

- `video/src/` — 5 promo video compositions. Output → `out/`.

## Convex conventions (non-negotiable)

Use the validated function syntax for every query, mutation, and action:

```ts
export const myQuery = query({
  args: { id: v.id("projects") },
  returns: v.object({ /* ... */ }),
  handler: async (ctx, args) => { /* ... */ },
});
```

- Always include argument **and** return validators.
- Use `withIndex` over `filter` for indexed queries.
- Use `v.null()` (not `v.optional`) when returning null.
- Index names spell out every field: `by_status_and_projectId`, not `by_status`.
- Use `internalQuery` / `internalMutation` / `internalAction` for private functions.
- Path alias `@/*` maps to project root.

## Authentication

- Magic link only via Better Auth (no password, no OAuth).
- Client: `lib/auth-client.ts` exports `authClient`.
- Server: `lib/auth-server.ts` exports `getToken()`.
- Convex: `authComponent.getAuthUser(ctx)` in queries.
- Magic link tokens stored server-side (hashed), 24-hour validity, cross-device.
- Sessions: 1 year with 24-hour sliding refresh.
- See `ARCHITECTURE.md` § Authentication for the mobile cross-tab fix and rate-limit configuration.

## Admin access control

- `/admin/*` server-gated via `app/admin/layout.tsx` checking `ADMIN_EMAIL` / `ADMIN_EMAILS` env.
- Convex admin functions guarded by `requireAdmin` from `convex/adminGuard.ts`.
- Defense in depth — both layers must pass.
- Every admin mutation appends `activity_log` with `actor: "admin"`.

## Client authorization (non-negotiable)

Every portal query/mutation that touches a project **must** go through
`convex/projectAccess.ts`. Do not hand-roll `getAuthUser` → load project →
compare `authUserId`; that pattern is what let `prospects.findLatestByEmail`
ship as a public query leaking `resumeToken`.

- `require*` throws — use for mutations.
- `get*IfOwner` returns `null` — use for queries that render an empty state.
- Both refuse to disclose whether a project exists, so neither can be used to
  enumerate slugs.
- These deliberately do **not** grant admins access to client projects. Admin
  reads go through `requireAdmin` and separate admin functions.

Never return `resumeToken` from any function a browser can call. Its consumer
(onboarding session writes) was retired with `/onboarding`, but tokens are
still minted onto prospect rows (`admin.ts`, `cal.ts`, `publicAudits.ts`) and
must stay secret until that field is removed with a migration.

## Agreements: MSA + order form (Stage 4A, 2026-08-06)

An agreement is **two** documents, and both are hashed onto the `agreements` row.

- `lib/legal/msa.ts` — versioned universal terms. **No price, term, or scope
  belongs in this file.** Changing any string changes `MSA_HASH_INPUT`, so bump
  `MSA_VERSION` in the same edit.
- `lib/legal/orderForm.ts` — per-project commercial terms: price, minimum term,
  scope, deliverables, assigned deliverables, acceptance criteria. Stored per
  project in `order_forms`.
- `lib/legal/terms.ts` — **archived, do not edit or delete.** No live code
  imports it; it is the only way to recompute `termsHash` on agreements signed
  before Stage 4A.

Rules:

- **Issued order forms are immutable.** Before signature, replace one by
  drafting and issuing a new version (admin → Projects → expand → Order Form).
  After signature, replacement is blocked until a separate re-acceptance flow
  exists; never imply that issuing a row changes signed terms.
- **Hashes are computed server-side**, in `agreement.createFromClickwrap` via
  `credentialCrypto.sha256Hex`. The browser submits the displayed `orderFormId`
  and hash only as a binding; the server reloads that row, requires it to remain
  issued, rebuilds the canonical HTML, and verifies both values before signing.
- **Acceptance requires an issued order form** and throws without one. Only an
  admin creates projects. Creation seeds an editable standard $199/month draft;
  the admin reviews or changes it, issues it, and only then can send the invite.
  The agreement page may claim ownership for the matching verified email, but
  it never creates a project.
- **Canonical HTML must be deterministic.** Both builders are hashed, so no
  `Intl`, no locale date formatting, no clock reads, no randomness. `formatUsd`
  and `formatUtcDate` in `orderForm.ts` exist for this reason.
- Stripe subscription Order Forms store an immutable recurring `stripePriceId`
  and, when applicable, a one-time `setupStripePriceId`. Checkout loads the
  exact accepted Order Form, retrieves both Prices from Stripe, verifies their
  active/USD/type/amount details, and sends both line items in one subscription
  Checkout. The one-time setup Price appears only on the initial invoice. Do
  not select Price IDs from client email for post-4A agreements.
- `termsVersion` / `termsHash` are still written, carrying the MSA identity, so
  existing readers keep working without a backfill. Do not repurpose them.

## Hub ↔ Spoke contract

Bespoke client sites POST to:

- `POST /api/v2/leads` — authenticated lead intake (`Authorization: Bearer sk_live_<keyId>_<secret>`). Keys issued in admin (Projects → expand → API Credentials); raw key shown once; only SHA-256 stored.
- `POST /api/v2/events` — typed browser events (`pageview` | `click`) with body
  `publishableKey` (`pk_live_…`) + Origin. Click targets: `tel` | `email` |
  `directions` (honestly labeled as taps/clicks, not completed calls).

**Every unauthenticated Hub ingest route is retired** — the v1/unversioned lead
routes (Stage 2) and the v1/unversioned analytics pixel (2026-08-05). Do not
reintroduce either. The pixel in particular was not harmless: it required no
credential and shared a rate-limit bucket with authenticated v2 events, so
forged traffic could suppress a project's real analytics. A new spoke gets a
publishable key before it ships (`CLIENT_LIFECYCLE.md` § 9b).

Stage 3 is complete in production on the Hub and all live spokes (playground,
All About Towing, TB Tree, Chelsea Social Co.) as of 2026-08-05. Client repos
are **siblings of this one** under `../clients/`. Each site posts pageviews and
conversion clicks (`tel` / `email` / `directions`) via `/api/v2/events` with a
publishable key + Origin allowlist.

**Stage 1A controls retained:** streaming 16 KB body ceiling, field/email validation with no silent truncation, fixed-window project ceilings (`leadIngestPerProject`, `leadNoTrustedVisitor`, `paidFanoutPerProject`, `smsPerProject`), and SMS only on triage `allow`. When paid fan-out is exhausted the lead is still stored as untriaged (`fanoutPaused`). Project-wide rejecting ceilings queue one deduplicated admin alert, and `hub_operational_counters` supplies bounded daily accepted/429/paused evidence.

**Never key a Hub rate limit on a client-supplied IP header.** `x-forwarded-for` and friends are caller-controlled, so a rotating value mints a fresh bucket per request — worse than no key at all. The trusted-visitor observation code and its `HUB_TRUSTED_IP_HEADER` / `HUB_VISITOR_OBSERVATION_UNTIL` env vars were **deleted** on 2026-08-05, not left dormant; per-visitor limiting lives in each spoke's Vercel Function where the platform overwrites the header. Leads keep a per-visitor tier via `meta.visitorHash` from that Function (`leadPerVisitor`) — trustworthy because the request already authenticated with a secret bearer.

**Unauthenticated paid public surfaces have global ceilings.** The retired
onboarding generator and its limits are gone; `publicAuditGlobalDaily` remains
because public audits spend Firecrawl, PageSpeed, and Groq.

**Origin:** analytics browser requests must match `deployment.liveUrl` /
`stagingUrl`. Store these as a **bare host** (`example.com`) — the Hub builds
`https://<host>` itself, so a stored scheme makes every event `403`. Leads are
server-to-server and authenticate with a secret bearer; the credential resolves
the project, so leads do not use Origin as an auth boundary.

**Stage 3 telemetry rules (verified in production 2026-08-05, do not "fix"):**

- Only pageviews roll into `client_analytics.referrerClasses`. Clicks carry the
  same `document.referrer` as the pageview before them, so counting both
  double-counts every source.
- A referrer matching the request Origin's host is internal navigation and gets
  **no** class — not `direct`, which would overwrite the real origin for a
  visitor who arrived from search and loaded a second page.
- Referrer classes are collected but **deliberately not shown to clients**
  (`components/portal/SiteMetrics.tsx`). `direct` is an unknown bucket (QR scans,
  SMS links, in-app browsers, no-referrer policies) and a bare `google.com`
  referrer cannot separate search from the Business Profile listing. The missing
  UI is a decision, not an omission — see `UPGRADE_PLAN.md` § Stage 3.
- `projectCredentials.touchLastUsed` takes `minIntervalMs`; events pass 5 minutes
  because one credential row serves every browser event for a project. Leads pass
  nothing and still stamp on every submission.

**Failure mode to remember:** for leads, check the spoke's server-only credential,
credential `lastUsedAt`, and `[hub.lead.v2]` logs. For events/analytics, check
the Origin allowlist, publishable credential `lastUsedAt`, and
`[hub.events.v2]` logs. Also check admin **Untriaged / Fan-out paused**.

## Things to be careful about

- **Never** mutate `projectStatus` from Stripe payment failures or Cal.com booking events — those are admin-driven transitions. Webhooks log activity only.
- **Never** store raw payment details — Stripe handles all card data.
- **Always** verify Stripe webhook signatures and use event IDs for idempotency.
- **Always** hash both agreement documents (SHA-256) server-side on acceptance; record `msaVersion` + `msaHash` + `orderFormVersion` + `orderFormHash` + `userAgent`. See § Agreements.
- **Never** reintroduce an unauthenticated ingest alias. Both leads and events
  are v2-and-authenticated-only.
- **Never** return `resumeToken` from a function a browser can call, and route
  every portal function through `convex/projectAccess.ts`.
- **Never** add an unauthenticated public mutation that spends money (Groq,
  Firecrawl, PageSpeed, Resend, Twilio) without a **global** ceiling in
  `convex/rateLimiter.ts`. Per-session and per-host keys do not contain spend —
  the caller rotates the key.
