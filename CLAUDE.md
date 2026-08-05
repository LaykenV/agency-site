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
  pageviews/clicks, and legacy `/api/v1/analytics/pixel`) that bespoke client
  sites POST to.
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
- `app/onboarding/` — prospect intake flow.
- `app/audit/[token]/` — public tokenized audit pages for outreach.
- `components/` — feature components; UI primitives in `components/ui/`.
- `lib/` — client utilities, auth helpers, hooks.

### Backend (Convex)

- `convex/schema.ts` — all tables: `prospects`, `projects`, `agreements`, `activity_log`, `scheduled_calls`, `edit_requests`, `client_leads`, `client_analytics`, `marketing_searches`, `scraped_leads`, plus Stripe KV tables.
- `convex/validators.ts` — shared validators.
- `convex/http.ts` — webhooks (Stripe, Cal.com), authenticated v2 lead ingestion, and v1/unversioned analytics aliases.
- `convex/auth.ts` — Better Auth integration (magic link).
- `convex/adminGuard.ts` — RBAC enforcement for admin queries/mutations.
- `convex/files.ts` — file storage helpers (logos, brand images, edit request attachments).
- `convex/marketing/` — outbound pipeline (`workflow.ts`, `pipeline.ts`, `search.ts`, `emails.ts`, `public.ts`).
- `convex/onboarding/agent.ts` — Groq AI agent for prospect plan generation.

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

## Hub ↔ Spoke contract

Bespoke client sites POST to:

- `POST /api/v2/leads` — authenticated lead intake (`Authorization: Bearer sk_live_<keyId>_<secret>`). Keys issued in admin (Projects → expand → API Credentials); raw key shown once; only SHA-256 stored.
- `POST /api/v2/events` — typed browser events (`pageview` | `click`) with body
  `publishableKey` (`pk_live_…`) + Origin. Click targets: `tel` | `email` |
  `directions` (honestly labeled as taps/clicks, not completed calls).
- `POST /api/v1/analytics/pixel` — legacy page views (Origin + projectId); kept
  until each spoke migrates to v2 events.

Analytics also has the unversioned `/api/analytics/pixel` alias until Stage 3
cutover is complete for live spokes. The unauthenticated v1 and unversioned
**lead** routes are retired.

Stage 3 is complete in the Hub and verified on the playground spoke. Rollout to
the remaining live sites is outstanding: each needs a publishable credential, a
bare-host deployment URL, `NEXT_PUBLIC_WAAS_PUBLISHABLE_KEY`, and a rebuild.
A site still on v1 reports pageviews only — no click data.

**Stage 1A controls retained:** streaming 16 KB body ceiling, field/email validation with no silent truncation, fixed-window project ceilings (`leadIngestPerProject`, `leadNoTrustedVisitor`, `paidFanoutPerProject`, `smsPerProject`), no trust of spoofable XFF, and SMS only on triage `allow`. **Do not set `HUB_VISITOR_OBSERVATION_UNTIL` or `HUB_TRUSTED_IP_HEADER`.** The trusted-visitor-header investigation was declined on 2026-08-05 (`UPGRADE_PLAN.md` § 5): the `leadNoTrustedVisitor` fallback is adequate, and Stage 2 moved per-visitor limiting to each client's Function where the provider header is trustworthy. The gated observation code is dormant, not a pending task. When paid fan-out is exhausted the lead is still stored as untriaged (`fanoutPaused`). Project-wide rejecting ceilings queue one deduplicated admin alert, and `hub_operational_counters` supplies bounded daily accepted/429/paused evidence.

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
- **Always** hash terms content (SHA-256) on agreement acceptance; record `termsVersion` + `termsHash` + `userAgent`.
- Keep legacy analytics pixel until every live spoke uses `/api/v2/events`. Lead
  ingestion is v2-only; never reintroduce an unauthenticated lead alias.
