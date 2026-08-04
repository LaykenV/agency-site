# Billing Migration — Theo pattern → `@convex-dev/stripe`

Status: **planned, revised after source review; not implemented**
Owner: Layken
Written: 2026-08-04
Decision: **adopt conditionally after the dependency baseline and sandbox spike**

Replace the hand-rolled Stripe integration (modelled on
[t3dotgg/stripe-recommendations](https://github.com/t3dotgg/stripe-recommendations))
with the Convex Stripe component. The current path is not broken. This migration
earns its cost by giving every subscription a project identity before one client
can own multiple projects.

Related: `portal_architecture.md` §6.2 and `UPGRADE_PLAN.md`.

---

## 1. Decision and invariant

Today `subscriptions` has a `userId` but no project link, and
`getMySubscription` returns the user's newest row. That becomes ambiguous as soon
as one client has two projects. The component can attach an arbitrary `orgId` to
a subscription, so use a namespaced project identity:

```ts
orgId: `project:${project._id}`
```

Adopt **two Stripe subscriptions per client with two projects**, one subscription
per project. This permits independent prices, invoices, failure handling, and
cancellation. Do not use one subscription with multiple line items unless actual
buyer feedback later outweighs the operational clarity.

Stripe remains the source of truth. Convex component tables are a cache and
query layer, not an authority that may invent billing state.

---

## 2. What source review resolved

Verified on 2026-08-04 against package `@convex-dev/stripe@0.1.6`, its installed
source/type declarations, the npm metadata, and Stripe's official docs:

| Question | Finding | Plan consequence |
|---|---|---|
| Can `orgId` be arbitrary? | Yes. It is a string carried in Checkout subscription metadata and copied into component rows. | Use `project:<Convex project id>`, not a mutable slug. |
| Can one customer have multiple subscriptions? | Yes. Stripe supports it and each Checkout session can carry a different `orgId`. | Adopt one subscription per project. Prove it in test mode. |
| Can the Stripe API version be pinned? | Yes. The component client accepts configuration including `apiVersion`. | Pin deliberately and re-run the SDK compatibility tests. |
| Can webhook routes coexist? | Yes. `registerRoutes` accepts a configurable `webhookPath`. | Add `/stripe/webhook/v2` with its own endpoint secret. |
| Do hooks expose the event? | Yes. Registered event hooks receive the Stripe event and Convex context. | Preserve activity logging and narrowly scoped status transitions. |
| Does the component deduplicate event IDs? | No durable event-ID ledger was found. Stripe retries and does not guarantee event order. | Add an application-owned processed-event ledger and make every side effect idempotent. |
| Is singular project lookup sufficient? | No. `getSubscriptionByOrgId` uses `.first()` and may return stale history after cancel/resubscribe. The published package **does** export `listSubscriptionsByOrgId` using `by_org_id`. | Use the org-list query, then select current state deterministically. Keep the user-list path only as a backfill shadow/fallback. |
| Can existing component rows simply be edited with `orgId`? | That would only patch the cache. | Backfill metadata on the Stripe subscription itself, then let webhook sync rebuild component state. |

The component creates customer, subscription, Checkout session, payment, and
invoice tables; it accepts per-event hooks; and checkout accepts the price per
call. It is still `0.1.x`, so pin the package exactly and treat the sandbox spike
as an adoption gate, not a formality.

---

## 3. Dependency baseline before Stripe work

Use the exact Stage 0 matrix in `UPGRADE_PLAN.md`: Convex `1.31.7`, explicit
workpool `0.3.2`, workflow `0.3.4`, Better Auth component `0.10.13` with
`better-auth 1.4.12`, and held Agent, Rate Limiter, Twilio, Resend, and Polar
versions. This is the smallest coherent peer set: workpool `0.3.2` requires
Convex `^1.31.7`, while Better Auth component 0.10.13 supports the current core
1.4.12 and avoids an authentication downgrade.

Keep app Stripe at `19.3.1` in Stage 0. When the component is installed in Stage
4/Phase C, move the direct dependency to exact `22.4.0` in the same PR and prove
the legacy route against it. Do not carry SDK v19 and v22 side-by-side through
shadowing, and do not turn Stage 0 into a latest-workflow/latest-auth migration.

---

## 4. Sandbox spike — remaining executable proof

Source review answered the architectural questions. Running code still must
prove the exact integration before production state is touched:

- [ ] Pin `@convex-dev/stripe@0.1.6` and the chosen Stripe SDK/API versions.
- [ ] Register `/stripe/webhook/v2` alongside Better Auth, Cal.com, WAAS, and the
      existing Stripe route with all three values explicit:

      ```ts
      registerRoutes(http, components.stripe, {
        webhookPath: "/stripe/webhook/v2",
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET_V2,
        apiVersion: "2026-04-22.dahlia",
        events: { /* gated application side effects */ },
      });
      ```

      Never let v2 fall back to the legacy endpoint secret.
- [ ] Create one test customer with two Checkout subscriptions, two prices, and
      two distinct `project:*` org IDs. Prove both are independently queryable.
- [ ] Put both `orgId` and `userId` in `subscriptionMetadata`; prove the
      subscription is returned by both indexes and that its renewal invoice and
      payment are returned by the corresponding org queries.
- [ ] Prove the list-and-select query chooses active/trialing/past-due state over
      canceled historical rows after cancel-and-resubscribe.
- [ ] Replay the same webhook and prove the processed-event ledger prevents
      duplicate activity, status, email, and notification side effects.
- [ ] Deliver events out of order and prove the current Stripe object wins over
      event arrival order.
- [ ] Use Stripe test clocks/simulations to cover renewal, payment failure,
      recovery, cancellation, and resubscription instead of waiting a live month.
- [ ] Prove the existing successful-checkout transition still moves
      `AWAITING_PAYMENT → AWAITING_ASSETS` exactly once. Payment failure and
      cancellation log/notify but do not silently rewrite fulfillment stage.
- [ ] Deliver the same test event to the legacy and v2 endpoints; prove both
      caches update but only the flagged authoritative side-effect writer fires.
- [ ] Unset or poison the legacy webhook secret in the isolated spike and prove
      v2 still verifies only with `STRIPE_WEBHOOK_SECRET_V2`.

Reverse the adoption decision if any of those fail without a small, legible
adapter. Do not fork or patch the component as part of this project.

---

## 5. Target state

- `convex.config.ts` registers the pinned Stripe component.
- `registerRoutes` owns `/stripe/webhook/v2`; custom hooks call one idempotent
  application-side billing-event dispatcher.
- `processed_stripe_events` records event ID, type, object ID, first-seen time,
  outcome, and processing version. Retain it longer than Stripe's normal retry
  window.
- Checkout resolves `priceId` from the offering registry and sends
  both `orgId: project:<projectId>` and `userId: project.authUserId` in
  `subscriptionMetadata`. It never chooses price by client email.

  ```ts
  subscriptionMetadata: {
    orgId: `project:${project._id}`,
    userId: project.authUserId,
  }
  ```

- `getSubscriptionForProject(projectId)` calls
  `listSubscriptionsByOrgId("project:<projectId>")` and selects the effective
  current row deterministically. The user-list query is temporary shadow/backfill
  coverage for rows that do not yet have `orgId`.
- Project rows may contain a negotiated `priceIdOverride`, but do not duplicate
  `subscriptionId` as a second authority that can drift from Stripe/component
  state.
- Portal and admin display invoice/payment history only from project-scoped
  component queries.

Billing status rules:

- A verified first successful subscription/checkout may advance
  `AWAITING_PAYMENT → AWAITING_ASSETS`; this matches current intended behavior.
- Renewal success does not mutate fulfillment stage.
- Failure, past-due, cancellation, or dispute creates idempotent activity and
  notification records. Any client-access or project-stage consequence remains
  an explicit business rule, not an accidental generic hook.
- No raw payment details are stored.

---

## 6. Migration sequence

### Phase A — freeze and align dependencies

- [ ] Pin the exact Stage 0 matrix from §3 in `package.json` and regenerate the
      lockfile; do not remove or upgrade Polar.
- [ ] Prove `bun install --frozen-lockfile` has the intended root versions and no
      unresolved workflow/workpool or Better Auth peer skew.
- [ ] Run codegen, typecheck, build, auth magic-link regression, current checkout
      regression, webhook signature/replay tests, and notification smoke tests.
- [ ] Deploy this baseline separately and verify production before proceeding.

### Phase B — sandbox spike

- [ ] Complete every proof in §4 and record the outputs/Stripe object IDs.
- [ ] Confirm the component remains the simpler path; otherwise stop and add a
      native `projectId` attribution layer to the existing integration.

### Phase C — parallel shadow reader

- [ ] Install `@convex-dev/stripe@0.1.6`, move app Stripe to exact `22.4.0`, pin
      the API version, and compile/test the legacy integration against v22.
- [ ] Register the component and v2 endpoint with the explicit secret override.
- [ ] Add the processed-event ledger before enabling event hooks.
- [ ] Keep the old webhook authoritative. The v2 path syncs component tables and
      writes shadow comparison data only; it sends no email/SMS and changes no
      project status.
- [ ] Compare customer, subscription, invoice, and payment state after every
      relevant test/live event. Count and alert on mismatches by customer,
      subscription, invoice, status, price, and `orgId`, plus duplicate side-effect
      attempts blocked by the ledger.

### Phase D — backfill and shadow reads

- [ ] Create a reconciliation manifest mapping each live Stripe subscription to
      exactly one Convex project and expected offering/price. For every Stripe
      object record customer/subscription ID, prior metadata, price, status,
      timestamps, and intended metadata; retain an idempotent reversal procedure.
- [ ] Take and verify a dated private `npx convex export --prod` snapshot before
      any accompanying Convex backfill. This protects Convex data only; the Stripe
      manifest is the rollback evidence for Stripe metadata.
- [ ] Write `orgId: project:<projectId>` and the correct `userId` into each Stripe
      subscription's metadata using idempotency keys; record before/after values
      and do not alter price/status.
- [ ] Let Stripe events/sync populate component rows; do not directly edit only
      the cache.
- [ ] Implement the list-and-select `getSubscriptionForProject` query behind a
      feature flag using the org-list query. Compare it with legacy reads and the
      user-list fallback in logs/admin.
- [ ] Resolve every mismatch before changing the visible reader.

### Phase E — controlled cutover

- [ ] Switch portal/admin reads behind a reversible flag.
- [ ] Make the v2 dispatcher authoritative for application side effects while
      the legacy route remains a state reader only. There must be one side-effect
      writer at all times.
- [ ] Move Checkout creation to the component; resolve price from offering data;
      delete `CHELSEA_BILLING_EMAIL` only after both prices pass test mode.
- [ ] Re-run the two-project test, duplicate delivery, test-clock lifecycle, and
      current live-client read reconciliation.
- [ ] Expose and record the active reader, Checkout writer, and side-effect-writer
      flags; complete a rollback drill and require zero unresolved shadow
      mismatches before Stage 6 exits.

### Phase F — decommission after one reconciled billing cycle

- [ ] Export legacy `billingCustomers` and `subscriptions`, plus the mapping and
      reconciliation report, to durable private storage.
- [ ] Verify every live Stripe customer/subscription/invoice/payment against the
      component and portal display.
- [ ] Remove the old Stripe dashboard endpoint and legacy route.
- [ ] Remove `syncStripeCustomer`, legacy queries, and then the old tables in a
      separate schema-contract deploy.

---

## 7. Rollback and stop rules

Feature flags separately control the visible reader, Checkout writer, and event
side-effect writer. Phases C and D roll back by restoring legacy reads and
disabling v2 side effects; no Stripe object is destroyed. Phase E is also
reversible while Stripe metadata and legacy tables remain intact: restore the
old Checkout writer and readers, then reconcile sessions created during the
window.

Phase F is the destructive boundary. Do not start it without the export, a full
reconciled billing cycle, and a tested restore/read procedure.

Stop the migration immediately on any unexplained duplicate side effect,
unattributed subscription, price mismatch, signature failure, or portal state
that differs from Stripe. Restore the previous reader/writer flags before
investigating.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Early component releases change behavior | Exact pin, source review, explicit upgrade tests |
| Stale subscription selected after resubscribe | List all project rows and use deterministic status/time precedence |
| Duplicate/out-of-order webhooks | Durable event ledger plus fetch/sync current Stripe object |
| Two endpoints duplicate email/status changes | Only one side-effect writer; v2 begins in shadow mode |
| Metadata backfill damages live billing | Update metadata only, use idempotency keys, reconcile each project |
| Dependency alignment breaks auth | Separate Stage 0 deploy and mobile magic-link regression |
| Legacy rollback data disappears | Export and delay schema contraction until after a full cycle |

Research references: [published `0.1.6` query source](https://unpkg.com/@convex-dev/stripe@0.1.6/src/component/public.ts),
[Convex Stripe component](https://github.com/get-convex/stripe),
[Stripe subscription quantities and multiple subscriptions](https://docs.stripe.com/billing/subscriptions/quantities),
[webhook best practices](https://docs.stripe.com/webhooks),
[API versioning](https://docs.stripe.com/api/versioning), and
[test clocks](https://docs.stripe.com/billing/testing/test-clocks).
