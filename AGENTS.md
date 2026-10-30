# Acadiana Web Design Hub

Read the matching doc before non-trivial work:

- `docs/BUSINESS.md` for the offer, customers, pricing, traction, and priorities
- `docs/GROWTH.md` for acquisition channels and the current scorecard
- `docs/OPERATIONS.md` for client lifecycle and operating runbooks
- `docs/ARCHITECTURE.md` for implemented system and security boundaries
- `docs/ROADMAP.md` for trigger-gated future work

`docs/archive/` is history. `docs/plans/` describes work that isn't built yet.
Neither overrides the code or the docs above.

## Commands

```bash
bun run dev
bun run verify
npx convex codegen --typecheck enable
git diff --check
```

## System boundaries

- This repository is the Hub. Client sites are independent Spokes.
- `../agency-playground/` is the reference Spoke for contract changes.
- `../agency-template/` is retired. Do not clone, patch, or restore it.
- Website packages are no longer sold (2026-10-28). The homepage keeps the website
  portfolio, with a Varholdt Labs notice and links for new inquiries.
  `/onboarding`, `/quote`, city, industry, blog, audit, and
  `/fb-cover` routes redirect to it; `RETIRED_SALES_ROUTES` in `next.config.ts`
  is the list. Don't restore them or add sales pages. An admin creates any
  project by hand.
- Only `POST /api/v2/leads` and `POST /api/v2/events` ingest Spoke data. Never
  restore a v1 or unauthenticated alias.
- Outbound cold email, batch city-and-industry prospect search, and hard-coded
  `/preview/<slug>` demos are deleted. Do not restore them.
  `/admin/marketing` is the website-concept generator.

## Website concepts

- Model-generated HTML is untrusted. Never render it with
  `dangerouslySetInnerHTML`; use an iframe with `srcDoc` and the shared sandbox
  in `lib/concepts/sandbox.ts`. Never add `allow-scripts`, `allow-forms`,
  `allow-same-origin`, or `allow-top-navigation-by-user-activation`.
- Generated pages must stay scriptless and self-contained: no JavaScript, no
  external fonts, stylesheets, embeds, or trackers, and images only from the
  approved allowlist. Concept CTAs are dummy controls with no `href` and no
  `<a>`; a tap must do nothing.
- Every generation runs `validateConceptHtml`, and `publish` re-validates
  server-side. Do not add a path that publishes without validating.
- The concept notice, page metadata, and view tracking belong to the trusted
  parent page, never to the generated document.
- Never present Google photos or Google review text as concept assets. Only
  owner-supplied uploads and hand-approved quotes reach a page.
- The generator must not state a fact absent from the verified brief.

## Convex rules

- Validate arguments and returns for every public or internal function.
- Prefer `withIndex` over table scans or post-filters.
- Use `v.null()` when a function returns null; do not use `v.optional` for that.
- Index names spell out every field, for example `by_status_and_projectId`.
- Use `internalQuery`, `internalMutation`, and `internalAction` for private
  operations.
- Admin functions must use `requireAdmin` and append `activity_log` with
  `actor: "admin"` on mutations that change user-visible state.
- Portal functions touching a project must use `convex/projectAccess.ts`.
- Never return `resumeToken` from a browser-callable function.
- Do not trust caller-controlled IP headers for Hub rate limits.
- Any unauthenticated mutation that can spend money needs a global ceiling.

## Agreements and billing

- An agreement consists of the versioned MSA in `lib/legal/msa.ts` and an
  immutable issued Order Form from `lib/legal/orderForm.ts`.
- Never edit an issued Order Form. Draft and issue a new version.
- Never edit or delete `lib/legal/terms.ts`; it reproduces pre-Stage-4A hashes.
- Hash both documents server-side during acceptance.
- Canonical MSA and Order Form HTML must be deterministic: no `Intl`, locale
  date formatting, clock reads, or randomness in hashed builders.
- Checkout must load the exact accepted Order Form and validate Stripe Price
  type, currency, cadence, and amount.
- Payment activation may move `AWAITING_PAYMENT` to `AWAITING_ASSETS`. Payment
  failures and Cal.com bookings must not mutate fulfillment status.
- Never store raw card data.

## Hub credentials and telemetry

- Lead credentials are secret `sk_live_...` values held only by the Spoke
  server runtime.
- Event credentials are publishable `pk_live_...` values checked with the
  browser Origin.
- Store deployment hosts as bare hostnames, for example `example.com`; see
  `docs/ARCHITECTURE.md` under Deployment hosts.
- Label `tel:` events as clicks or taps, never completed calls.
- Referrer classes are collected but deliberately hidden from clients until
  attribution can say something specific and true.

## Changes

- A local build is not production verification.
- Migrations go expand, backfill, verify, contract. Back up production data
  before an irreversible schema or billing migration.
- Update the matching doc in the same change as the code it describes.

## Pull requests

- Use a branch and PR for code and real doc changes. Push straight to `main`
  only when I ask for it.
- One concern per PR. If the description needs "also", split it. Real PRs,
  never drafts. Conventional prefix plus the user-facing why. Problem first in
  the body.
- Run `bun run verify` and read the full diff before filing.
- Two PR-Agent reviewers run on every push through the shared
  `LaykenV/pr-review` workflow. `/describe` runs only when someone comments
  it. See `pr-agent.md`.
- Check every bot finding against the code. Fix real ones, explain and resolve
  false positives, and don't let review grow the PR.
- A clean review isn't permission to merge. When asking, say that merging
  deploys the Convex backend and the Next.js site to production.
- Preview Vercel builds compile against disabled placeholder endpoints; they
  never deploy or connect to Convex.
- After an authorized merge, watch the Vercel status for the exact merge commit
  and run `bun run smoke:production` before calling the release ready.

## Review guidelines

Every reviewer reads this section: PR-Agent, Codex, sol-loop, and council.

- Flag generated concept HTML rendered outside the shared iframe sandbox, any
  added sandbox permission, and any publish path that skips
  `validateConceptHtml`.
- Flag edits to an issued Order Form or `lib/legal/terms.ts`, and clocks,
  locale formatting, or randomness in hashed agreement builders.
- Flag Convex functions without argument and return validators, admin
  functions without `requireAdmin`, and unauthenticated mutations that can
  spend money without a global ceiling.
- Flag `resumeToken` or `sk_live_` values reaching the browser.
- Flag payment failures or Cal.com bookings that change fulfillment status.
- Style, extra tests, rare edge cases, and small perf costs are nits. Don't
  suggest growing the PR past its goal.
