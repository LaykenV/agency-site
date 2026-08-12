# Architecture

Status: **canonical implemented-system source of truth**  
Owner: Layken  
Last reviewed against code: 2026-08-12

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
- the website-concept generator and its unlisted preview pages

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

| Surface               | Route                                                                              |
| --------------------- | ---------------------------------------------------------------------------------- |
| Marketing             | `/`, city/industry SEO routes, `/blog`                                             |
| Public audits         | `/audit`, `/audit/request/[token]`                                                 |
| Concept previews      | `/preview/[token]`                                                                 |
| Legal                 | `/legal/terms`, `/legal/privacy`, `/sms-consent`                                   |
| Client entry          | `/portal`, `/portal/verify`, `/portal/autherror`                                   |
| Agreement and billing | `/portal/agreement`, `/portal/subscribe`, `/portal/paymentSuccess`                 |
| Client project        | `/portal/[projectId]`                                                              |
| Admin                 | `/admin`, `/admin/leads`, `/admin/analytics`, `/admin/marketing`, `/admin/content` |
| Better Auth handler   | `/api/auth/[...all]`                                                               |

`/onboarding` permanently redirects to the Cal.com sales call.

`/audit` and `/audit/request/[token]` are the self-service audit reached by
direct or QR traffic. They are unrelated to the retired outbound system: the
outbound `/audit/[token]` report, its print view, and the `/demo/[token]`
redirect were removed with it.

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
- `convex/concepts/` — website-concept intake, enrichment, generation, and the
  unauthenticated preview surface
- `convex/publicAudits.ts` — the self-service audit
- `lib/concepts/` — runtime-agnostic concept core: the brief shape, the
  generation prompt and page shapes, the HTML validator, and the Messenger draft

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

### Acquisition

- `website_concepts`
- `public_audits`

`marketing_searches`, `scraped_leads`, and `preview_views` still exist as schema
definitions but are retired: no code reads or writes them, and they are removed
once the destructive production cutover in
`plans/outreach-preview-engine.md` deletes their rows.

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

| Field                   | Example              | Origin match                                              |
| ----------------------- | -------------------- | --------------------------------------------------------- |
| `deployment.liveUrl`    | `example.com`        | `https://example.com` or `https://www.example.com`        |
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
- Public operations that can call Firecrawl, PageSpeed, Groq, OpenRouter,
  Resend, or Twilio require a global spend ceiling.
- Concept generation is admin-authenticated, so `conceptGenerateGlobalDaily` is
  a runaway guard against a retry loop rather than an abuse control.
- `conceptViewGlobal` is keyed globally, not per token: the token is the value
  the caller controls, so a per-token key would not hold.

## Telemetry interpretation

- A `tel:` event is a tap-to-call click, not a completed call.
- Clicks do not increment referrer-class pageview counts.
- Same-origin navigation has no external referrer class.
- Referrer classes are collected but deliberately hidden from clients because
  “direct” and bare Google referrers cannot support precise attribution.
- The portal reads aggregates rather than scanning raw events.

## Website concept generator

`convex/concepts/` turns one manually-captured Facebook lead into one bespoke
homepage concept:

1. manual intake — no discovery, no Facebook scraping, no automated messaging
2. a single Google Places lookup, whose match is automatically confirmed only
   when uniquely corroborated; otherwise a human confirms it
3. supervised Facebook Pack intake — logos, work photos, screenshots, and text
   pasted from the Page the owner maintains
4. one Luna (`openai/gpt-5.6-luna`) pass at medium reasoning — classification,
   visual selection, fact extraction, and conflict flagging
5. optionally, a bounded website harvest used only to fill gaps the pack left
6. bespoke HTML and inline CSS from Muse Spark 1.2 (`meta/muse-spark-1.2`) at
   medium reasoning
7. deterministic safety and HTML validation
8. human review of the finished page, then publication at `/preview/<token>`

There is no post-generation Luna claim audit. A concept is a sales sketch, and
the review card is the remaining judgment of whether the page is worth sending.

### Models and provider routing

| Role                              | Default               | Override                  |
| --------------------------------- | --------------------- | ------------------------- |
| Generation                        | `meta/muse-spark-1.2` | `OPENROUTER_MODEL`        |
| Evidence and vision               | `openai/gpt-5.6-luna` | `OPENROUTER_VISION_MODEL` |

Both are pinned to a version rather than a `latest` alias: a concept is a sales
artifact, and a silent model swap changing how every page looks is not something
to discover from a prospect's reaction.

Every OpenRouter request that carries prospect material — pack analysis and
generation — sends
`provider: { data_collection: "deny", require_parameters: true }`. The first
restricts routing to providers OpenRouter says do not collect inputs for
training; the second refuses an endpoint that would silently ignore a parameter
rather than honour it. This is not a zero-retention claim: OpenRouter exposes
`zdr: true` as a separate policy, and this workflow does not currently require
it. Muse Spark's Meta endpoint satisfies the `deny` gate, so no training-policy
tradeoff was taken to adopt it.

`require_parameters: true` makes the parameter set part of routing, so an
unsupported parameter is a failed request rather than a degraded one. Luna's
endpoints do not advertise `temperature`, which is why pack analysis sends
none; they do advertise `reasoning`. Reasoning tokens are billed against
`max_tokens`, so effort and output budget are one decision, not two.

### Google Places is identity, not content

Places answers one persisted question: which business is this. Candidate
address, phone, category, and website details are displayed live only to help
recognize the listing; none becomes a stored fact or generation input.

- The confirmed `placeId` is the only Places value retained. Google's policy
  exempts it from the retention limits that cover the rest of a response.
- Candidates for an unresolved match are fetched live when the admin match panel
  opens, shown with exact Google Maps attribution, and never written to the
  database. Confirmation re-runs the current search so an arbitrary valid place
  ID cannot be attached.
- The directions link on a concept is rebuilt from the place ID rather than
  stored from a search response.
- Rating, review count, review text, opening hours, and street address do not
  reach `ConceptBrief`. A separate approved source may reintroduce any of those
  facts; Places may not.
- Star glyphs on a generated page require an approved quote carrying a rating.

`convex/concepts/migrations.ts` clears the Places content that older rows still
hold. The fields it clears remain declared as deprecated optionals in
`convex/schema.ts` and `convex/validators.ts` until that migration has run
against both deployments; contracting them is the follow-up step.

Google photos and review text never become preview imagery. Preview imagery is
limited to Luna-selected Facebook Pack photos, owner-supplied manual uploads,
and website harvest images Luna attaches only when the pack and manual assets
left a gap.

### Facebook Pack — primary evidence path

`convex/concepts/facebookPack.ts` is a supervised intake, not a scraper. Layken
opens the prospect's Page and pastes or uploads selected material. The pack is
bounded (20 items, 12 images, 8 text; JPEG/PNG/WebP; 6 MiB a file) and lives on
`website_concepts` with storage IDs and content hashes — never as a separate
asset-manifest table.

Analysis is one Luna vision turn at medium reasoning. Each item is labelled
logo, business photo, context screenshot, text, duplicate, or unusable;
screenshots and text can supply facts, and only logos and business photos may
become page imagery (`canUsePackItemAsPageImagery` is the single gate). The same
turn extracts each fact with an exact source excerpt and names any facts that
contradict each other.

A second Luna turn used to rule on those facts. It was removed: it asked the
same model to reconsider material it had just read, which is not the independent
check it resembled, and it cost a request, a failure mode, and rate-limit
headroom on every pack. Its exclusion rules — dated promotions, hiring posts,
platform artifacts, private information, other businesses, and any value the
excerpt only supports in weaker form — now live in the extraction prompt.

Admission is a server rule (`resolveEvidenceLocally`) with no model opinion in
it. A candidate is approved when it has an exact source excerpt, its kind is
admissible, and the extractor did not flag it as contradicted. Phones never
become page content — the concept's own phone is the CTA — and a testimonial
needs both the words and an attribution. There is no manual fact-approval queue.

The retired review prompts, fields, and admin surfaces are kept as deprecated
until the production canaries pass and legacy rows are migrated.

The server rebuilds `approvedFacebookContent` from stored candidates, never from
the model's free text. Changing pack material invalidates compiled evidence,
generated HTML, and publication. Analysis never starts generation; **Generate**
remains an explicit admin action. Any pack with material must be fully `ready`;
collecting, analyzing, failed, partial, or legacy-unknown states block generation
and publication until the pack is re-analyzed or the unreadable material is
removed.

### Website harvest — secondary gap-fill

`convex/concepts/harvest.ts` still reads the business's own website: one
Firecrawl Map call capped at 40 URLs, then at most six targeted Scrape calls.
`lib/concepts/harvest.ts` holds every pure rule — URL ranking, same-host
enforcement, normalization, caps, deduplication, sensitive-claim classification,
and conflict detection.

Candidates feed the same server admission rule the pack uses
(`resolveEvidenceLocally` in `lib/concepts/evidence.ts`), with no second model
turn. Firecrawl's structured JSON is model-produced and is never trusted by
itself: every extracted value and evidence excerpt must occur in the normalized
Markdown returned for that same page. Unsupported service descriptions and
testimonial attributions are stripped; the common evidence gate then rejects
an unattributed quote. New harvests land as `approved` or `skipped` rather than
parking in `content_review`; legacy `pending` rows keep the old manual review
surface until they are resolved or migrated. Nothing flags cross-page factual
conflicts on this path; the remaining check is the human reading the finished
page. Source priority for the generation prompt is:

1. manual business information
2. Facebook Pack evidence admitted from an exact excerpt
3. website evidence admitted from an exact excerpt
4. Google Places identity only

Image candidates are staged by a Node action that validates HTTPS, exact or
reviewed host, public DNS, manual redirects, an 8 MiB cap, MIME, and magic bytes,
then stores JPEG/PNG/WebP in Convex. Luna classifies the staged copies and
attaches a logo or photos only where the concept still has none from the pack
or a manual upload. Remote source URLs never reach the admin browser or the
generated page.

Fact review finishing does not unlock generation while website images are still
being staged or classified. `harvestImageAnalysisState: processing` is a
separate additive gate because image work continues after the Firecrawl request
finishes. The pass resolves to `ready` or visibly `failed`; failure allows a
typographic concept, while an in-flight pass cannot spend a draft that would be
immediately invalidated by a late logo or photo.

Matching and baseline research never generate automatically. They stop at
`draft`. Every paid generation starts from an explicit admin button.

### Rendering and security boundary

Model-generated HTML is never injected into the React tree with
`dangerouslySetInnerHTML`. Both `/preview/[token]` and the admin review card
render it in an iframe using `srcDoc` and the shared sandbox in
`lib/concepts/sandbox.ts`, which withholds `allow-scripts`, `allow-forms`,
`allow-same-origin`, and `allow-popups`. The generated document therefore cannot
reach the application DOM, authentication cookies, storage, or any network API.

`allow-top-navigation-by-user-activation` is the one token granted, because
without it a `tel:` link inside the frame silently fails and tapping to call is
the only conversion path these pages have. It requires a real gesture, and every
`href` has already been restricted by the validator to `tel:`, a `#` fragment,
or one allowlisted maps URL.

The trusted parent owns the concept notice, the page title, robots metadata,
Open Graph tags, and view counting. Views are recorded from the browser rather
than the server so Facebook's link-preview crawler does not register as the
prospect's first open.

`docs/plans/outreach-preview-engine.md` records the named fallback if nested
iframe scrolling proves unacceptable on iOS: serve the document as the top-level
response under a strict Content-Security-Policy, and move the concept notice
into the generated HTML.

### Validation

`lib/concepts/validateConceptHtml.ts` rejects scripts, inline event handlers,
embedded and form elements, external requests, `target` attributes, unverified
`mailto:` links, assets outside the approved allowlist, placeholder text, any
phone number other than the verified one, and testimonial markup when no quotes
were approved. It also enforces two usage rules on approved imagery: a supplied
logo must appear at least once, and no single approved photo may appear more
than twice.

There is no second-model claim audit after those checks pass. A concept preview
is a sales sketch: the prompt still tells Muse not to invent facts, but an
unsupported marketing flourish does not fail the draft. Deterministic
violations share **one** repair budget: a run makes at most two generations
total, and the repair is charged against the same daily ceiling as the first.
Whichever failure ends the run is recorded in `generationFailure` so the admin
card can distinguish HTML validation, a provider error, and rate limiting. Older
rows may still carry `claims_unsupported` or `audit_unreadable` from the retired
Luna audit. A failed draft is stored and shown, never published automatically.
`publish` re-runs the deterministic validator server-side regardless of the
stored status. The only required human review after analysis is the finished
page before **Publish**.

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
