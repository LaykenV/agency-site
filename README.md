# Acadiana Web Design — agency-site

The Hub side of the Acadiana Web Design Website-as-a-Service business. Runs the marketing site, marketing pipeline, admin portal, client portal, agreement clickwrap, Stripe billing, Cal.com integration, and the public APIs that bespoke client sites POST leads and analytics to.

The Spoke side is built bespoke per client. `../agency-template/` is **fully retired as of 2026-08-05** and is not cloned, patched, or merged from. `../agency-playground/` is the current reference Spoke and the first site to exercise each new Hub contract.

---

## Docs

| Doc | What it covers |
|---|---|
| [`BUSINESS.md`](./BUSINESS.md) | Business model, pricing, target, traction, 90-day marketing plan |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Technical blueprint: stack, schema, auth, Stripe, webhooks, Hub-Spoke contract, admin RBAC |
| [`CLIENT_LIFECYCLE.md`](./CLIENT_LIFECYCLE.md) | End-to-end operational lifecycle: lead discovery → sales → portal → build → deploy → ongoing ops |
| [`CLAUDE.md`](./CLAUDE.md) | Project context for Claude Code |

---

## Stack at a glance

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Convex (DB + functions + file storage)
- Better Auth (magic link only)
- Stripe (subscriptions)
- Resend (email)
- Cal.com (scheduling)
- Remotion (promo video generation)
- Vercel (hosting)

---

## Local development

```bash
bun install

# Dev (Next.js + Convex in parallel)
bun run dev

# Individual services
bun run dev:frontend
bun run dev:backend

# Build & lint
bun run build
bun run lint

# Promo videos
bun run video:preview
bun run video:render:all
```

---

## Environment variables

Required for local dev (set in `.env.local`):

- Convex deployment URL (set by `npx convex dev`)
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `BETTER_AUTH_SECRET`
- `GOOGLE_PLACES_API_KEY` (marketing pipeline + Google reviews)
- `FIRECRAWL_API_KEY` (marketing pipeline)
- `GROQ_API_KEY` (marketing pipeline)
- `CAL_WEBHOOK_SECRET`
- `ADMIN_EMAIL` (or `ADMIN_EMAILS` comma-separated)

See `ARCHITECTURE.md` for what each integration does and where the keys are used in code.

---

## Repository layout

```
app/
├── (marketing site routes)
├── admin/              Admin dashboard (server-gated)
├── portal/             Client portal (magic-link gated)
├── audit/[token]/      Public tokenized audit pages
├── onboarding/         Prospect intake flow
└── api/                Webhooks (Stripe, Cal.com) + Hub APIs

convex/
├── schema.ts           All tables
├── validators.ts       Shared validators
├── http.ts             HTTP routes (webhooks, hub APIs, v1 + legacy)
├── auth.ts             Better Auth integration
├── adminGuard.ts       Convex RBAC
├── files.ts            File storage helpers
├── marketing/          Outbound pipeline (workflow, search, pipeline, emails, public)
└── onboarding/         Prospect intake + Groq agent

components/
├── ui/                 Primitives (button, input, etc.)
└── ...                 Feature components

lib/                    Client utilities, auth helpers, hooks
video/                  Remotion compositions
```

---

## Hub ↔ Spoke

This repo serves the Hub. Bespoke client sites POST to:

- `POST /api/v2/leads` — contact form submissions (`Authorization: Bearer sk_live_…`)
- `POST /api/v2/events` — pageviews + conversion clicks (body `pk_live_…` + Origin)
- `POST /api/v1/analytics/pixel` — legacy pageviews until each spoke migrates to v2 events

Legacy unversioned analytics (`/api/analytics/pixel`) remains during the events migration. Lead aliases are retired. See `ARCHITECTURE.md` § Hub ↔ Spoke contract for the full payload spec and validation rules.
