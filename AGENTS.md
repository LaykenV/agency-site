# Repository guidance

These are the standing rules for the Acadiana Web Design Hub. Read the relevant
canonical document before non-trivial work:

- `docs/BUSINESS.md` for the offer, customers, pricing, traction, and priorities
- `docs/GROWTH.md` for acquisition channels and the current scorecard
- `docs/OPERATIONS.md` for client lifecycle and operating runbooks
- `docs/ARCHITECTURE.md` for implemented system and security boundaries
- `docs/ROADMAP.md` for trigger-gated future work

Documents under `docs/archive/` are historical evidence. Documents under
`docs/plans/` describe unimplemented or partially implemented target states.
Neither overrides the code or a canonical document.

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
- Public `/onboarding` is retired. Sales intake goes through Cal.com, and an
  admin creates the prospect and project.
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

## Change discipline

- Preserve unrelated working-tree changes.
- Treat a build as local evidence, not production verification.
- For migrations, use expand, backfill, verify, then contract.
- Back up production data before an irreversible schema or billing migration.
- Update the canonical document in the same change as its implemented contract.

## Pull requests

- Default to a branch and pull request for code and meaningful documentation.
  Direct pushes to `main` remain available for small owner-directed changes.
  Never choose a direct push unless the user explicitly asks for one.
- One concern per PR. If the description needs "also", split the work.
- Open real PRs, never drafts. Use a conventional prefix and describe the
  user-facing reason in the title. Put the problem first in the body.
- Run `bun run verify`, inspect the complete diff, and remove unrelated changes
  before filing.
- PR-Agent runs `/describe` and `/review` when a PR opens and `/review` after
  each push. See `pr-agent.md`. The `file-pr` and `babysit-pr` skills contain
  the operating procedure.
- Verify every bot finding against the source. Fix real problems, explain and
  resolve false positives, and do not let review feedback expand the PR.
- A clean review is not merge authority. Ask before merging. State that the
  Vercel production build deploys the Convex backend and the Next.js site.
- After an authorized merge, watch the Vercel status for the exact merge commit
  and run `bun run smoke:production` before calling the release ready.
