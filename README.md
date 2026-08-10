# Acadiana Web Design Hub

The private operations application for Acadiana Web Design. It includes the
marketing site, outbound research pipeline, admin workspace, client portal,
agreements, Stripe billing, scheduling, and authenticated APIs used by bespoke
client sites.

Client sites are built as independent projects. `../agency-playground/` is the
reference implementation for the Hub contract. The former `agency-template`
workflow is retired.

## Documentation

| Document | Purpose |
|---|---|
| [`docs/BUSINESS.md`](./docs/BUSINESS.md) | Offer, customers, pricing, traction, and current priorities |
| [`docs/GROWTH.md`](./docs/GROWTH.md) | Active acquisition channels, content, ads, scripts, and scorecard |
| [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) | Lead-to-live client lifecycle and recurring operations |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Implemented technical architecture and security boundaries |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Trigger-gated product work and unresolved operational gates |
| [`docs/plans/`](./docs/plans/) | Detailed plans that are not current production behavior |
| [`docs/client-research/`](./docs/client-research/) | Client- or prospect-specific research |
| [`docs/archive/`](./docs/archive/) | Dated historical evidence; never the current source of truth |

`CLAUDE.md` contains repository-specific rules for coding agents. It links back
to the canonical documents instead of duplicating them.

## Stack

- Next.js 15.5.9, React 19, and TypeScript 5
- Convex for data, functions, file storage, workflows, and HTTP routes
- Better Auth magic links
- Stripe subscriptions and Checkout
- Resend, Twilio, Cal.com, Google Places, Firecrawl, PageSpeed, and Groq
- Vercel hosting

The exact package versions in `package.json` and `bun.lock` are authoritative.

## Local development

```bash
bun install
bun run dev

# Individual services
bun run dev:frontend
bun run dev:backend

# Verification
bun test
npx convex codegen --typecheck enable
npx tsc --noEmit
bun run lint
bun run build
```

## Environment

Local variables belong in `.env.local`; Convex deployment variables belong in
the intended Convex deployment. Common integrations use:

- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- `BETTER_AUTH_SECRET`
- `GOOGLE_PLACES_API_KEY`
- `FIRECRAWL_API_KEY`
- `GROQ_API_KEY`
- `CAL_WEBHOOK_SECRET`
- `ADMIN_EMAIL` or `ADMIN_EMAILS`

Never commit secret values. Search the code before adding an environment
variable; retired integrations and variables should not be resurrected from an
archived plan.

## Repository map

```text
app/                 Next.js pages, route handlers, admin, and portal
components/          Feature and UI components
convex/              Schema, functions, workflows, webhooks, and Hub APIs
lib/                 Auth, legal, SEO, and application utilities
public/              Static public assets and preview assets
tests/               Bun tests
docs/                Canonical documentation, plans, research, and archives
```

## Hub contract

Bespoke client sites use two ingest routes:

- `POST /api/v2/leads` with a server-held `sk_live_...` bearer credential.
- `POST /api/v2/events` with a browser-safe `pk_live_...` key and an allowed
  browser Origin.

The unauthenticated v1 and unversioned aliases are retired. See
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#hub-spoke-contract) before
changing either contract.

