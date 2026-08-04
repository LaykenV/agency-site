# Upgrade Plan — Cross-Doc Sequencing

Status: **planned, revised after review; not started**
Owner: Layken
Written: 2026-08-04
Last reviewed: 2026-08-04

Master sequencing for three interlocking workstreams. **Read this before any of
the detail docs.**

| Doc | Workstream | Risk profile |
|---|---|---|
| `waas_upgrade.md` | Hub ↔ Spoke security + telemetry | Medium — live client migration and public endpoints |
| `billing_migration.md` | Theo pattern → `@convex-dev/stripe` | **Highest** — real money and live subscriptions |
| `portal_architecture.md` | Multi-offering portal + multi-project | Medium — large refactor and data migration |

---

## 1. Why not one big branch

These workstreams have different blast radii. If billing, portal, dependencies,
and the Hub API all change together and something breaks in production, the
failure is hard to attribute. Each stage below must be independently deployable,
observable, and revertible.

The exception is a deliberately paired migration: a client may move to the
authenticated v2 lead endpoint in the same release window that its legacy access
is disabled, but the Hub must support both paths during the overlap.

---

## 2. The revised order

```text
Stage 0  Dependency baseline .......... reconcile Bun lock + peers       [gate]
Stage 1  WAAS containment ............. cap cost without breaking v1     [ship first]
Stage 2  WAAS authenticated v2 ........ migrate both clients, retire v1  [closes hole]
Stage 3  Portal foundation ............ offerings + stage capabilities   [data-safe]
Stage 4  Stripe component ............. spike + parallel shadow reads    [spike-gated]
Stage 5  Portal refactor .............. modules + explicit creation      [no multi-project]
Stage 6  Stripe cutover ............... reads, then checkout writes       [observed]
Stage 7  Multi-project ................ picker + independent billing      [needs Stage 6]
Stage 8  Telemetry + external data .... measured, privacy-reviewed        [later]
```

### Stage 0 — dependency baseline

The manifest says `convex@^1.28.0`, but `bun.lock` resolves 1.31.4. The current
root workpool is a transitive `0.2.19`, which does not satisfy
`@convex-dev/workflow@0.3.4`'s `workpool ^0.3.0` peer. The minimal coherent
matrix is now decided:

```text
convex                    1.31.7   # small patch; required by workpool 0.3.2
@convex-dev/workpool      0.3.2    # add as explicit dependency
@convex-dev/workflow      0.3.4    # hold
@convex-dev/better-auth   0.10.13  # latest 0.10.x; supports Better Auth 1.4.x
better-auth               1.4.12   # hold; do not discard later auth hardening
@convex-dev/agent         0.2.12   # hold
@convex-dev/rate-limiter  0.3.2    # hold
@convex-dev/twilio        0.2.1    # hold
@convex-dev/resend        0.1.13   # hold; its nested workpool may remain
@convex-dev/polar         0.6.4    # hold; unrelated
stripe                    19.3.1   # hold until Stage 4
```

Pin these exact versions in `package.json`, regenerate `bun.lock`, and prove a
clean `bun install --frozen-lockfile`. Moving the Better Auth component from
0.10.10 to 0.10.13 avoids downgrading core Better Auth from the current 1.4.12;
0.10.13 supports `>=1.4.9 <1.5.0`. Do not jump to the latest workflow/auth/
resend/Polar lines in Stage 0; that would introduce a separate Convex 1.36+ and
Better Auth 1.6 migration. Ship this matrix as its own deploy and verify
production magic-link auth (especially mobile), Resend, workflow execution,
current Stripe checkout/webhook behavior, codegen, types, and build before
continuing.

A latest-versions modernization remains a separate future program. Agent
parallelism may accelerate its research and regression work, but it does not
combine that program with this dependency baseline or its production deploy.

### Stage 1 — WAAS containment

`waas_upgrade.md` § Phase 1A. Add bounded body and field validation, a hard
fixed-window per-project cost ceiling, an SMS ceiling, `allow`-only SMS, and
trusted-IP-header observation.

When the paid-fanout ceiling is exhausted, accept and store an otherwise valid
lead, skip Groq/email/SMS fan-out, expose it as untriaged in admin, and send one
threshold alert. Never silently drop the lead. Project ceilings must still hold
when requests spoof or rotate XFF; the IP bucket is best-effort only. The one
threshold alert uses a separately deduplicated, globally capped admin-operations
path, not the exhausted project's Groq/Resend/Twilio fan-out path.

Do **not** remove the no-`Origin` path yet. TB Tree's live Next.js Server Action
posts server-to-server and therefore sends no browser `Origin`; rejecting that
traffic would break a real form. Stage 1A reduces blast radius but does not claim
to close the authentication hole.

### Stage 2 — WAAS authenticated v2

`waas_upgrade.md` § Phase 1B. Add hashed bearer credentials and per-submission
idempotency receipts, migrate TB Tree's server path first, then migrate Chelsea's
browser POST through a Vercel Function, and smoke-test both live sites through
stored lead, triage, email, and SMS behavior.

Only after both production paths pass may the Hub reject legacy no-`Origin`
traffic and retire the v1/unversioned lead endpoints. This is the stage that
actually closes the unauthenticated paid-fan-out hole.

### Stage 3 — portal foundation

`portal_architecture.md` § Phases 1-2. Introduce offerings using an
expand → backfill → verify → contract migration, then add stage metadata and
explicit capabilities such as `acceptsLeads`.

`phase` is for broad portal presentation. Operational behavior must use named
capabilities; replacing today's `IN_REVIEW`/`LIVE` lead rule with
`phase === "DELIVERED"` would reject review-site leads.

### Stage 4 — Stripe component spike and shadowing

`billing_migration.md` § Phases B-C. The source-level questions are resolved,
but the integration still gets a sandbox spike, Stripe simulations/test clocks,
and a second webhook reader. Keep the legacy path authoritative while a shadow
comparison reports discrepancies.

Install `@convex-dev/stripe@0.1.6` and move the app's direct Stripe SDK to an
exact `22.4.0` in this stage, before cutover. Compile and regression-test the
legacy integration against v22 so two Stripe majors do not coexist through the
observation window.

Each Stripe webhook endpoint has its own signing secret. The component endpoint
uses a separate `STRIPE_WEBHOOK_SECRET_V2`, and custom event side effects are
guarded by an application event-ID ledger.

### Stage 5 — portal refactor and onboarding retirement

`portal_architecture.md` § Phases 3-4. Decompose the portal, build the module
registry, create projects explicitly, and retire public `/onboarding` plus its
website-only AI plan generator.

This may run during Stripe's observation window because it does not create a
second real project or change the authoritative billing reader. The offering
registry's price resolver must remain compatible with the legacy checkout writer
until Stage 6. A second-project UI may exist only behind an admin feature flag;
creating a second real client project is forbidden until Stage 6 exits.

### Stage 6 — Stripe cutover

`billing_migration.md` § Phases D-E. Backfill the **Stripe subscription
metadata** with a namespaced project reference and let webhooks populate the
component cache. Flip reads behind a reversible switch, then move checkout
writes after parity is proven.

Stage 6 exits when project-scoped reads and the single Checkout writer pass the
test-clock lifecycle, live reconciliation, and rollback drills. It does not wait
a calendar month. `billing_migration.md` Phase F remains a later cleanup: observe
at least one complete live billing cycle, export the legacy Convex billing
tables, and reconcile every live Stripe subscription, invoice, and project
reference before decommissioning. That cleanup does not block Stage 7 while the
legacy data and rollback path remain intact.

### Stage 7 — multi-project

`portal_architecture.md` § Phase 5. Hard-gated on Stage 6 checkout and
per-project reads. Add the project list/switcher and the admin second-project
flow. Do not create a second real project before this lands.

### Stage 8 — telemetry and external data

`waas_upgrade.md` § Phases 2-3. Add typed events and client modules only after
the module registry exists. Ship click events, PageSpeed snapshots, and
availability checks before paid Places data, GBP OAuth, or Search Console.
Those external integrations wait for a paying reporting need. Label measured
signals honestly:

- `tel:` events are tap-to-call clicks, not completed calls.
- Five-minute probes are successful monitoring checks, not an SLA.
- GBP attribution requires explicit UTMs; referrer alone is insufficient.
- IP-derived hashes and `sessionStorage` need a documented privacy basis and
  must not be described categorically as requiring no consent.

---

## 3. Hard constraints

1. **Stage 0 before adding another component.** The dependency baseline must be
   reproducible before billing work changes it.
2. **Stage 1B before rejecting no-`Origin` legacy leads.** Otherwise TB Tree's
   live form breaks.
3. **Stage 3 before the portal decomposition.** Capabilities and data shape are
   the seams the refactor depends on.
4. **Stage 6 before Stage 7.** Per-project subscription attribution must exist
   before a client can own two live projects.
5. **No schema contraction before verified backfill.** New fields begin optional,
   dual reads/writes cover the migration window, and required validation lands
   only after production counts prove completeness.
6. **Snapshot the system that owns the data before mutation.** Convex backfills
   require a dated production export. Stripe metadata backfills require a
   reversible Stripe manifest; a Convex export cannot restore Stripe objects.

---

## 4. Ordering and behavior rules

- Do not add `mobile_app`, `idx_website`, or another engagement type before the
  portal module refactor is complete. `waas_local_family` is safe earlier because
  it changes price/terms data, not workflow shape.
- Do not run a Stripe spike against production keys. Prefer a Stripe sandbox and
  simulations/test clocks.
- Do not start legacy billing-table removal inside an observation cycle.
- Successful, verified subscription activation may idempotently advance
  `AWAITING_PAYMENT → AWAITING_ASSETS`. Payment failure, pause, cancellation,
  or booking events must only log and notify; they do not mutate fulfillment
  status automatically.
- Use one Stripe subscription per project. This permits independent cancellation
  and attribution, with the explicit tradeoff of separate invoices/charges.
- Use `listSubscriptionsByOrgId("project:<projectId>")` and apply deterministic
  active/trialing/past-due-before-canceled, newest-period selection. Use the user
  list only as a shadow/backfill fallback for legacy rows missing `orgId`; the
  singular org helper can return stale history after resubscription.

---

## 5. Current known state

- `package.json` declares `convex@^1.28.0`; `bun.lock` resolves 1.31.4.
- `@convex-dev/workpool` is not a direct dependency; the lock's root resolution
  is 0.2.19 while workflow 0.3.4 requires workpool `^0.3.0`.
- `@convex-dev/better-auth` resolves 0.10.10 and declares an exact Better Auth
  1.4.9 peer, while the app resolves Better Auth 1.4.12. Stage 0 upgrades the
  component to 0.10.13 so core Better Auth remains at 1.4.12 without peer skew.
- `stripe@^19.1.0` is declared; `@convex-dev/stripe` is not installed.
- Chelsea and TB Tree are the two live client sites using unauthenticated legacy
  lead endpoints. Chelsea posts from the browser; TB Tree posts from a Server
  Action without `Origin`.
- Every project is implicitly `waas_local`; `serviceType` does not exist.
- Chelsea's price selection is a hardcoded email branch.
- One project per user is enforced by the fallback guard in `projects.ts`.
- Public `/onboarding` is live in code but retired by product decision.

---

## 6. Required evidence at every production stage

- Clean frozen install, Convex codegen, TypeScript, diff check, and production
  build.
- An explicit production smoke test for the surface changed; a deploy or push is
  not completion.
- Before/after counts for every data migration, with zero unclassified live rows.
- Before any Convex expand/backfill migration, create a dated production export
  with `npx convex export --prod --path <private-backup-dir>/<stage>.zip`, verify
  the archive is readable, and store it outside the repository with restricted
  access. Include file storage when the migration touches stored files.
- Before Stripe metadata mutation, export a reconciliation manifest containing
  subscription/customer IDs, prior metadata, price, status, timestamps, and the
  intended project mapping; retain an idempotent reversal procedure. A Convex
  export is additional evidence, not a Stripe rollback mechanism.
- A rollback switch or previous route retained until the observation gate passes.
- Signed-in mobile and desktop portal/auth QA where applicable.
- Documentation updates in `CLAUDE.md` and `ARCHITECTURE.md` in the same stage
  that changes the corresponding contract.

Required operational signals and exit evidence:

| Stage | Counters/evidence required before exit |
|---|---|
| 0 | Exact resolved full component matrix, clean frozen install, codegen/type/build, production mobile magic link, Resend, workflow, current Checkout/webhook smoke tests |
| 1 | Leads accepted, `429`s, paid fan-out paused, SMS sent, SMS blocked by verdict; project ceilings proven under spoofed XFF |
| 2 | v1/v2 lead volume, credential `lastUsedAt`, auth failures, idempotent replays, duplicate triage count (must be zero) |
| 4-6 | Shadow mismatches by customer/subscription/invoice/status/price/`orgId`; duplicate side-effect attempts blocked by the ledger |
| 6 | Visible reader/writer/side-effect feature-flag state, zero unresolved mismatches, completed rollback drill |

Specific documentation checkpoints:

- After Stage 2: Hub ↔ Spoke auth, endpoint versions, trusted visitor metadata,
  and troubleshooting.
- After Stage 3: offering registry, capabilities, and archival model.
- After Stage 5: `/onboarding` retirement and explicit project creation.
- After Stage 6: component billing source, webhook secrets/idempotency, and the
  exact successful-payment status transition.
