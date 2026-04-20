# Stripe Gaps And Convex Migration Plan

Last reviewed: April 20, 2026

## Purpose

This document captures:

- the current Stripe/payment enforcement gaps in this codebase,
- the safest short-term fixes,
- and the migration path to the Convex Stripe component.

Use this as the working reference when patching billing enforcement and later replacing the custom Stripe integration.

## Current Billing Architecture

The app currently uses a custom Stripe integration built around:

- `convex/stripeActions.ts`
- `convex/stripeHelpers.ts`
- `convex/http.ts`
- `convex/schema.ts`
- `convex/auth.ts`
- `app/portal/agreement/page.tsx`
- `app/portal/subscribe/page.tsx`
- `app/portal/paymentSuccess/page.tsx`
- `app/portal/[projectId]/page.tsx`

The current system stores:

- Stripe customer mappings in `billingCustomers`
- Stripe subscription snapshots in `subscriptions`
- product workflow state in `projects.projectStatus`

Important: access is currently controlled primarily by `projects.projectStatus`, not by Stripe subscription state.

## Confirmed Current Gaps

### 1. Payment success page is a real bypass

Current behavior:

- `app/portal/paymentSuccess/page.tsx` calls `api.stripeActions.syncAfterSuccessForSelf` on load.
- `convex/stripeActions.ts` then calls `syncStripeCustomer`.
- Even if `syncStripeCustomer` finds no Stripe subscription, `syncAfterSuccessForSelf` still advances the project from `AWAITING_PAYMENT` to `AWAITING_ASSETS`.

Relevant code as reviewed on April 20, 2026:

- `app/portal/paymentSuccess/page.tsx:56`
- `convex/stripeActions.ts:232`
- `convex/stripeActions.ts:256`

Impact:

- An authenticated user who has already signed the agreement can reach `/portal/paymentSuccess` and be moved forward without a confirmed paid subscription.

### 2. Subscription state does not automatically restrict access after activation

Current behavior:

- `syncStripeCustomer` moves a project forward only when Stripe says the subscription is `active` or `trialing`.
- If Stripe says `past_due`, `unpaid`, `canceled`, or `paused`, the code only logs activity.
- It does not move the project backward, archive it, suspend it, or restrict portal/site access.

Relevant code:

- `convex/stripeActions.ts:93`
- `convex/stripeActions.ts:131`

Impact:

- A user can pay once, become active, then cancel later and still remain in `AWAITING_ASSETS`, `IN_PROGRESS`, `IN_REVIEW`, or `LIVE` unless an admin changes status manually.

### 3. Portal routing is based on `projectStatus`, not billing state

Current behavior:

- Portal redirects are driven by `primaryProject.projectStatus`.
- The subscription row is fetched, but it is not the source of truth for access.

Relevant code:

- `convex/auth.ts:288`
- `app/portal/[projectId]/page.tsx:187`

Impact:

- If project status is advanced manually or incorrectly, the user gets access even with no valid Stripe subscription.

### 4. Live site functionality does not currently depend on billing state

Current behavior:

- Lead ingestion checks only whether the project is `LIVE` or `IN_REVIEW`.
- It does not check whether the linked subscription is active, paid, canceled, or delinquent.

Relevant code:

- `convex/http.ts:167`

Impact:

- A canceled customer with a still-`LIVE` project continues receiving normal site behavior.

### 5. The `subscriptions` table is not the actual access gate

Current behavior:

- The `subscriptions` table is mainly used for subscription metadata and some UI behavior.
- On the portal page, the subscription query is used to pass `_creationTime` into the live support panel.
- That timestamp is used to decide whether to show the `Billing` button after 12 months.

Relevant code:

- `convex/stripeHelpers.ts:117`
- `app/portal/[projectId]/page.tsx:166`
- `app/portal/[projectId]/page.tsx:272`
- `app/portal/[projectId]/page.tsx:1457`

Impact:

- Faking a subscription row can make the UI look partly valid, but it does not solve enforcement correctly.
- Conversely, having no subscription row does not block core project access today.

## What Should Be Fixed Immediately

These changes should happen even if the full migration is delayed.

### 1. Remove the success-page bypass

Recommended fix:

- Change `syncAfterSuccessForSelf` so it only advances the project if a real Stripe subscription exists and is in an allowed state (`active` or `trialing`).
- Better: stop advancing project status from the client-side success flow entirely and rely on webhook-driven state changes.

Practical rule:

- `paymentSuccess` may trigger a sync, but it must not independently grant access.

### 2. Define explicit billing enforcement rules

Right now, billing status and product status are loosely connected. That needs a clear policy.

Recommended policy:

| Stripe state | Recommended product behavior |
| --- | --- |
| `active` | Allow normal access |
| `trialing` | Allow normal access |
| `cancel_at_period_end = true` | Keep access until current period end |
| `past_due` | Optional grace state; notify admin/client |
| `unpaid` | Restrict access after grace period |
| `canceled` | Restrict access at effective end date |
| `paused` | Restrict access or move to admin-review state |

### 3. Add a billing-aware access model

Recommended approach:

- Keep `projects.projectStatus` for workflow state.
- Add a separate billing/access state such as:
  - `billingStatus`
  - or `accessStatus`
  - or `serviceState`

Example:

- `projectStatus = LIVE`
- `accessStatus = ACTIVE`

or

- `projectStatus = LIVE`
- `accessStatus = SUSPENDED_FOR_NONPAYMENT`

This avoids overloading workflow state with billing enforcement.

### 4. Decide how comped/free accounts should work

Do not rely on fake Stripe rows for this.

Recommended approach:

- add an explicit free/comped path in application data,
- for example:
  - `billingMode = "stripe" | "comped" | "manual"`
  - `accessGrant = "paid" | "comped" | "restricted"`

That makes free access intentional and auditable.

## Recommended Short-Term Patch Plan

Before migrating to the Convex Stripe component:

1. Patch `syncAfterSuccessForSelf` so it cannot advance users without a real synced subscription.
2. Stop using the payment success page as a trust boundary.
3. Decide what should happen on `past_due`, `unpaid`, `canceled`, and `paused`.
4. Add explicit logic that updates access state when those webhook events arrive.
5. Add an explicit `comped` path if free/manual access is needed.

## Convex Stripe Component

Official links:

- Component page: https://www.convex.dev/components/stripe
- GitHub README: https://github.com/get-convex/stripe#readme
- npm package: https://www.npmjs.com/package/@convex-dev/stripe

As checked on April 20, 2026:

- package: `@convex-dev/stripe`
- latest version observed: `0.1.4`
- latest publish date observed: March 13, 2026

### What the component gives us

According to the package README, it provides:

- checkout session creation,
- customer creation/linking,
- customer portal helpers,
- webhook handling,
- synced customer/subscription/payment/invoice tables,
- real-time queries for Stripe objects,
- custom webhook hooks so app code can respond to Stripe events.

### What the component does not give us automatically

It does not know our product model.

It will not automatically:

- move `projects.projectStatus`,
- decide when a project should become `AWAITING_ASSETS`,
- decide when a project/site should be suspended,
- define what cancellation means for a live site,
- define what a comped/free account is.

Conclusion:

- migrating to the component helps Stripe correctness,
- but it does not automatically fix our app-level access rules.

## Will Migrating Fix All Current Issues?

No, not by itself.

It will help with:

- normalized Stripe state,
- cleaner customer/subscription syncing,
- less custom webhook bookkeeping,
- easier access to reliable Stripe records.

It will not fix:

- the current `/portal/paymentSuccess` bypass unless that code is removed or rewritten,
- missing cancellation enforcement,
- missing delinquency enforcement,
- the lack of an intentional comped-account model.

## Can We Wait Until Migration?

Not recommended.

Reason:

- the current payment success bypass is an active gap in live code.

Recommended stance:

- patch the bypass now,
- then migrate on a separate pass.

## Migration Difficulty

This is not a one-line swap.

It is also not a full rewrite.

Best description:

- moderate migration

Why:

- the Stripe integration is reasonably localized,
- but it is woven into project routing, admin flows, and portal UI,
- and we need a careful cutover for existing live customers.

The main effort is not checkout creation. The main effort is mapping Stripe component state onto our project lifecycle and access rules.

## Current Files Likely Affected By Migration

Backend:

- `convex/stripeActions.ts`
- `convex/stripeHelpers.ts`
- `convex/http.ts`
- `convex/schema.ts`
- `convex/auth.ts`
- `convex/admin.ts`
- `convex/agreementActions.ts`
- `convex/prospects.ts`

Frontend:

- `app/portal/agreement/page.tsx`
- `app/portal/subscribe/page.tsx`
- `app/portal/paymentSuccess/page.tsx`
- `app/portal/[projectId]/page.tsx`

Config:

- `convex/convex.config.ts`

Note:

- this repo already uses Convex components in `convex/convex.config.ts`, so adding another component follows an established pattern.

## Recommended Migration Strategy

### Phase 0: Patch today’s exploit first

Before introducing the component:

- close the `paymentSuccess` bypass,
- keep activation dependent on a real Stripe subscription,
- define temporary manual handling for cancellations and delinquency.

### Phase 1: Install and register the component

High-level steps:

1. Add `@convex-dev/stripe`.
2. Register it in `convex/convex.config.ts`.
3. Replace or merge webhook registration in `convex/http.ts`.
4. Configure required env vars:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### Phase 2: Introduce a thin app wrapper around the component

Do not call the component directly from every UI surface.

Create app-owned wrapper functions for:

- create checkout,
- create customer portal session,
- query current customer/subscription state,
- handle post-webhook app transitions.

This keeps business rules in our codebase.

### Phase 3: Move subscription reads to the component

Replace custom reads from:

- `billingCustomers`
- `subscriptions`

with component-backed queries where appropriate.

Important:

- keep the app logic querying a stable wrapper API, not component APIs directly from many pages.

### Phase 4: Move activation logic to webhook-driven transitions

Recommended rule:

- project activation should happen only from confirmed Stripe webhook state, not from client navigation.

Suggested behavior:

- on `customer.subscription.created` or `updated` with `active` or `trialing`,
- transition the relevant project from `AWAITING_PAYMENT` to `AWAITING_ASSETS`.

### Phase 5: Add downgrade/restriction logic

Use custom webhook handlers to decide what happens when subscription state changes.

Examples:

- `past_due`: enter grace state, notify, no immediate restriction
- `unpaid`: restrict access after grace
- `canceled`: keep access until period end, then restrict
- `paused`: restrict immediately or send to manual review

This is the key application logic the component will not provide for us.

### Phase 6: Handle comped/manual access cleanly

Introduce an explicit internal model for non-Stripe access.

Recommended fields:

- `billingMode`
- `accessStatus`
- optional `compedReason`
- optional `compedByAdminId`

This avoids faking Stripe data and makes later support/admin work safer.

### Phase 7: Backfill or migrate existing live data

Existing live customers may already have:

- `billingCustomers` rows,
- `subscriptions` rows,
- projects at various statuses.

Migration tasks may include:

1. matching existing users to component customers,
2. backfilling component state from Stripe or from current app data,
3. validating that each live project has the expected Stripe linkage,
4. confirming no users lose access unexpectedly during cutover.

### Phase 8: Remove old custom Stripe code

After cutover:

- delete obsolete helper tables if appropriate,
- remove custom sync actions,
- remove duplicate webhook handling,
- remove client-side activation logic,
- update admin tools to inspect the new source of truth.

## Suggested End-State Architecture

Recommended separation of concerns:

- Stripe component = Stripe source of truth
- app tables = workflow, entitlement, and operations source of truth

A good end-state model would be:

- component-managed Stripe records for customers, subscriptions, invoices, payments
- app-managed workflow state in `projects.projectStatus`
- app-managed access state in a dedicated billing/access field
- app-managed free/manual entitlement model for comped accounts

## Open Product Decisions To Make Before Migration

These must be decided explicitly:

1. What exactly happens when a user cancels?
2. Does cancellation at period end keep access until the paid-through date?
3. What is the grace period for `past_due`?
4. What happens on `unpaid`?
5. Should a restricted user still log into the portal?
6. Should a restricted but live project still receive leads?
7. How should comped accounts be represented?
8. Should admins be able to override restrictions manually?

## Recommended Order Of Work

1. Patch the `paymentSuccess` bypass.
2. Define billing/access policy.
3. Add explicit app-level access state.
4. Add comped/manual entitlement support.
5. Migrate Stripe syncing to the Convex component.
6. Move lifecycle transitions to webhook-driven app logic.
7. Backfill and cut over existing live accounts.
8. Delete old Stripe-specific code.

## Summary

The Convex Stripe component is likely the right long-term direction for Stripe correctness and maintainability.

However:

- it is not a drop-in fix for the current enforcement gaps,
- it will not automatically solve access control,
- and the current bypass should be patched before migration.

The right plan is:

- fix the exploit now,
- migrate Stripe plumbing next,
- and formalize billing-to-access rules as part of the migration.
