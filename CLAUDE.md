# Repository guidance

This file contains coding-agent rules for the Acadiana Web Design Hub. Do not
use it as a duplicate architecture or business document.

Read the relevant canonical document before non-trivial work:

- `docs/BUSINESS.md` — offer, customers, pricing, traction, priorities
- `docs/GROWTH.md` — acquisition channels and current scorecard
- `docs/OPERATIONS.md` — client lifecycle and operational runbooks
- `docs/ARCHITECTURE.md` — implemented system and security boundaries
- `docs/ROADMAP.md` — trigger-gated future work

Documents under `docs/archive/` are historical evidence. Documents under
`docs/plans/` describe unimplemented or partially implemented target states.
Neither overrides the code or a canonical document.

## Commands

```bash
bun run dev
bun test
npx convex codegen --typecheck enable
npx tsc --noEmit
bun run lint
bun run build
git diff --check
```

## System boundaries

- This repository is the Hub. Client sites are independent Spokes.
- `../agency-playground/` is the reference Spoke for contract changes.
- `../agency-template/` is retired. Do not clone, patch, or restore it.
- Public `/onboarding` is retired. Sales intake goes through Cal.com, and an
  admin creates the prospect and project.
- Only `POST /api/v2/leads` and `POST /api/v2/events` ingest Spoke data.
  Never restore a v1 or unauthenticated alias.

## Convex rules

- Validate arguments and returns for every public or internal function.
- Prefer `withIndex` over table scans or post-filters.
- Use `v.null()` when a function returns null; do not use `v.optional` for that.
- Index names spell out every field (for example `by_status_and_projectId`).
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
- Payment activation may move `AWAITING_PAYMENT` to `AWAITING_ASSETS`.
  Payment failures and Cal.com bookings must not mutate fulfillment status.
- Never store raw card data.

## Hub credentials and telemetry

- Lead credentials are secret `sk_live_...` values held only by the Spoke
  server runtime.
- Event credentials are publishable `pk_live_...` values checked with the
  browser Origin.
- Store deployment hosts as bare hostnames (`example.com`, not
  `https://example.com`); see `docs/ARCHITECTURE.md` § Deployment hosts.
- Label `tel:` events as clicks or taps, never completed calls.
- Referrer classes are collected but deliberately hidden from clients until
  attribution can say something specific and true.

## Change discipline

- Preserve unrelated working-tree changes.
- Treat a build as local evidence, not production verification.
- For migrations, use expand, backfill, verify, then contract.
- Back up production data before an irreversible schema or billing migration.
- Update the canonical document in the same change as its implemented contract.
