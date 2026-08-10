# Architecture

Status: **canonical implemented-system source of truth**  
Owner: Layken  
Last reviewed against code: 2026-08-10

This document describes the current repository. Future states belong in
`ROADMAP.md` or `plans/`; completed implementation evidence belongs in
`archive/migrations/`.

## System

This repository is the Hub for Acadiana Web Design:

- public marketing and SEO pages
- public audit and preview pages
- Better Auth magic-link client access
- admin and client portals
- MSA, Order Form, and clickwrap records
- Stripe Checkout and subscription synchronization
- Cal.com scheduling
- cross-client leads, events, and metrics
- outbound research and audit workflows

Client websites are independent Spokes. They do not share a template repository
or Git history with the Hub.

## Stack

The package manifest is authoritative:

- Next.js 15.5.9 App Router
- React 19
- TypeScript 5
- Convex 1.31.7
- Better Auth 1.4.12 with `@convex-dev/better-auth`
- Stripe SDK 19.3.1
- Convex Agent, Resend, Rate Limiter, Twilio, Workflow, and Workpool components
- Vercel

`@convex-dev/polar` is installed but unused. The planned
`@convex-dev/stripe` migration is not installed.

## Application routes

| Surface | Route |
|---|---|
| Marketing | `/`, city/industry SEO routes, `/blog` |
| Public audits | `/audit`, `/audit/[token]`, `/audit/[token]/print` |
| Qualified previews | `/preview/[slug]` |
| Legal | `/legal/terms`, `/legal/privacy`, `/sms-consent` |
| Client entry | `/portal`, `/portal/verify`, `/portal/autherror` |
| Agreement and billing | `/portal/agreement`, `/portal/subscribe`, `/portal/paymentSuccess` |
| Client project | `/portal/[projectId]` |
| Admin | `/admin`, `/admin/leads`, `/admin/analytics`, `/admin/marketing`, `/admin/content` |
| Better Auth handler | `/api/auth/[...all]` |

`/onboarding` permanently redirects to the Cal.com sales call. The old
`/demo/[token]` path redirects to `/audit/[token]`.

## Convex layout

- `convex/schema.ts` — tables and indexes
- `convex/validators.ts` — reusable validators
- `convex/http.ts` — Better Auth, Stripe, Cal.com, lead, and event routes
- `convex/admin.ts` and `convex/adminGuard.ts` — admin operations and RBAC
- `convex/projectAccess.ts` — client ownership enforcement
- `convex/agreement.ts` and `convex/orderForms.ts` — agreement records
- `convex/stripeActions.ts` and `convex/stripeHelpers.ts` — current Stripe integration
- `convex/projectCredentials.ts` — hashed Spoke credentials
- `convex/clientEvents.ts` and `convex/clientAnalytics.ts` — metrics
- `convex/marketing/` — search, analysis, audit, and outreach workflow

## Data model

### Commercial lifecycle

- `prospects`
- `projects`
- `order_forms`
- `agreements`
- `activity_log`
- `scheduled_calls`
- `edit_requests`

### Billing

- `billingCustomers`
- `subscriptions`

The application currently owns these local Stripe synchronization tables.
There is no `stripe_customers` or `stripe_subscription_cache` table.

### Hub and client reporting

- `project_credentials`
- `client_leads`
- `client_events`
- `client_analytics`
- `hub_operational_counters`

### Marketing

- `marketing_searches`
- `scraped_leads`
- `public_audits`
- `preview_views`

## Authentication and authorization

Better Auth provides magic-link authentication.

- Links are verified server-side.
- Admin routes are server-gated with `ADMIN_EMAIL` or `ADMIN_EMAILS`.
- Convex admin functions also call `requireAdmin`.
- Portal functions use `convex/projectAccess.ts` to verify project ownership.
- Admin rights do not implicitly grant client-project ownership.
- `resumeToken` must never be exposed by a browser-callable function.

After a magic link is sent, the original browser can be redirected to the static
`/link-sent.html` page so its live application context does not interfere with
mobile cross-tab authentication.

## Agreements

Stage 4A is implemented:

- `lib/legal/msa.ts` defines the universal, versioned MSA.
- `lib/legal/orderForm.ts` defines project commercial terms and deterministic
  canonical HTML.
- `lib/legal/terms.ts` is archived executable evidence for pre-Stage-4A
  agreements and must remain unchanged.
- `order_forms` stores drafts, issued forms, and superseded versions.
- `agreements` records the exact Order Form and MSA identities and hashes.

An admin creates the project, reviews the draft, issues the Order Form, and then
sends the invitation. The agreement route can attach the verified user to the
prepared project, but it cannot create a project.

Server-side acceptance reloads the issued form, rebuilds canonical HTML, verifies
the binding, hashes both documents, and records the acceptance evidence.

## Billing

The current direct Stripe writer is `convex/stripeActions.ts`.

Checkout:

- maps the Better Auth user through `billingCustomers`
- requires a project at `AWAITING_PAYMENT`
- requires a signed agreement
- loads the exact accepted Order Form
- validates recurring and optional setup Prices against signed terms
- creates one subscription-mode Checkout session
- records project, prospect, agreement, and document metadata
- returns through `/portal/paymentSuccess`

`/stripe/webhook` is registered in `convex/http.ts`. Subscription state is
synchronized into `subscriptions`. Active or trialing state may advance the
project to `AWAITING_ASSETS`; failures and cancellations log state without
rewriting fulfillment status.

Project-scoped billing and the Stripe component remain future work.

## Hub ↔ Spoke contract

### Lead intake

`POST /api/v2/leads`

- called by the Spoke's server runtime
- `Authorization: Bearer sk_live_<keyId>_<secret>`
- raw credential never stored in Convex
- credential hash resolves the project
- optional body project identifier must match
- project must currently accept leads
- validates content type, body size, fields, email, and controls
- uses project, visitor, paid-fanout, and SMS ceilings
- stores an otherwise valid lead when paid fan-out is paused

The secret must never reach browser code.

### Browser events

`POST /api/v2/events`

- called by browser JavaScript
- body contains `pk_live_<keyId>_<secret>`
- publishable key hash resolves the project
- browser Origin must match the configured live or staging host
- allowed types are `pageview` and `click`
- allowed click targets are `tel`, `email`, and `directions`
- raw events go to `client_events`
- bounded daily aggregates go to `client_analytics`

The event key is public by design. Origin plus the publishable credential is a
soft integrity boundary, not secret authentication.

### Deployment hosts

Store Spoke hosts on the project as bare hostnames, not full URLs:

| Field | Example | Origin match |
|---|---|---|
| `deployment.liveUrl` | `example.com` | `https://example.com` or `https://www.example.com` |
| `deployment.stagingUrl` | `example.vercel.app` | `https://example.vercel.app` (or the exact Origin string) |

Do not store `https://` or a trailing path in either field. Event CORS and
Origin checks use these values directly in `convex/http.ts`. Admin edits them
on the project row; operations steps live in `OPERATIONS.md`.

All v1 and unversioned lead and analytics aliases are retired.

## Rate limits and failure behavior

- Do not key a Hub security limit on `x-forwarded-for` or another
  caller-controlled IP header.
- The Spoke server may derive a keyed visitor hash from provider-controlled
  request data for lead limiting.
- Pre-auth failures log but do not write unbounded counter rows.
- Project storage ceilings reject abusive volume.
- Paid-fanout exhaustion stores the lead as untriaged and skips paid services.
- SMS sends only for an allow verdict.
- Public operations that can call Firecrawl, PageSpeed, Groq, Resend, or Twilio
  require a global spend ceiling.

## Telemetry interpretation

- A `tel:` event is a tap-to-call click, not a completed call.
- Clicks do not increment referrer-class pageview counts.
- Same-origin navigation has no external referrer class.
- Referrer classes are collected but deliberately hidden from clients because
  “direct” and bare Google referrers cannot support precise attribution.
- The portal reads aggregates rather than scanning raw events.

## Marketing workflow

`convex/marketing/` orchestrates:

1. Google Places search
2. website and contact research through Firecrawl
3. PageSpeed analysis
4. Groq fit scoring and audit content
5. tokenized public audit generation
6. Resend outreach
7. view and follow-up signals

Workflow parallelism is bounded so one search does not overrun provider quotas.
One lead failure should not fail the entire batch.

## Content dashboard

`/admin/content` is currently a client component backed by browser
`localStorage`. It is an execution aid, not shared durable state. The canonical
written campaign record is `GROWTH.md` until the dashboard persists to Convex.

## Verification baseline

Use checks proportional to the change:

```bash
bun test
npx convex codegen --typecheck enable
npx tsc --noEmit
bun run lint
bun run build
git diff --check
```

Production completion additionally requires the changed signed-in or client
path to be exercised against the intended deployment.
