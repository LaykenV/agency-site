# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## What this repo is

Acadiana Web Design's Hub: Website-as-a-Service operations stack. Next.js 16 + Convex backend providing:

- Marketing site with inbound prospect intake.
- Automated outbound pipeline (Google Places → Firecrawl → PageSpeed → Groq → tokenized audit reports → outreach emails).
- Client portal driven by `projectStatus` state machine (AWAITING_AGREEMENT → AWAITING_PAYMENT → AWAITING_ASSETS → IN_PROGRESS → IN_REVIEW → LIVE).
- Admin dashboard at `/admin`.
- Agreement clickwrap + Stripe subscription billing + webhook automation.
- Public Hub APIs (`/api/v1/ingest-lead`, `/api/v1/analytics/pixel`) that bespoke client sites POST to.
- Remotion-based promo video generation.

The bespoke client-site starter (the Spoke side) lives in `../agency-template/`.

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
- `convex/http.ts` — webhooks (Stripe, Cal.com) and Hub APIs (lead ingestion + analytics pixel, both v1 and legacy unversioned aliases).
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

Bespoke client sites built from `../agency-template/` POST to:

- `POST /api/v1/ingest-lead` — contact form submissions
- `POST /api/v1/analytics/pixel` — page views

Both have unversioned aliases (`/api/ingest-lead`, `/api/analytics/pixel`) kept alive for old config-driven clients. Hub validates `projectId` exists, project status is `LIVE` or `IN_REVIEW`, browser `Origin` matches the configured `deployment.liveUrl` / `stagingUrl`, and rate limits per project (+ per IP for leads).

**Failure mode to remember:** if a client's leads or analytics stop working, **check the Origin allowlist first** in `/admin/projects/{id}` — stale URLs there silently reject every request.

## Things to be careful about

- **Never** mutate `projectStatus` from Stripe payment failures or Cal.com booking events — those are admin-driven transitions. Webhooks log activity only.
- **Never** store raw payment details — Stripe handles all card data.
- **Always** verify Stripe webhook signatures and use event IDs for idempotency.
- **Always** hash terms content (SHA-256) on agreement acceptance; record `termsVersion` + `termsHash` + `userAgent`.
- The Hub APIs must remain backward compatible — old config-driven clients still call the unversioned endpoints. Add breaking changes as `/api/v2/*`.
