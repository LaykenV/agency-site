# Stripe Implementation Plan (WaaS)

Document Version: 2.0
Last Updated: October 24, 2025

Goal: Replace Polar with Stripe using a single-source-of-truth cache and minimal split-brain, aligned with the provided Stripe guide. This plan is executable for this codebase.

## 1) Update `convex/schema.ts`
- Keep existing tables untouched (`prospects`, `projects`, `agreements`, `activity_log`, `scheduled_calls`).
- Add two KV-style tables to model Stripe state and mapping:
  - `billingCustomers` (auth user → stripe customer mapping)
    - validator: `{ userId: v.id("users") | string, stripeCustomerId: v.string(), email?: v.string(), createdAtMs: v.number() }`
    - indexes: `by_user` ["userId"], `by_customer` ["stripeCustomerId"]
  - `subscriptions` (subscription cache snapshot — serializable)
    - validator: `{ userId: v.id("users") | string, stripeCustomerId: v.string(), subscriptionId: v.string(), status: v.string(), priceId: v.string(), currentPeriodStartMs: v.number(), currentPeriodEndMs: v.number(), cancelAtPeriodEnd: v.boolean(), paymentBrand?: v.string(), paymentLast4?: v.string(), updatedAtMs: v.number() }`
    - indexes: `by_user` ["userId"], `by_subscription` ["subscriptionId"]

Notes
- Our app primarily keys business logic by `authUserId` (string). If we don’t have a Convex `users` table, use `v.string()` for `userId` fields in both tables to represent `authUserId`. Prefer consistency with existing `projects.authUserId: v.string()`.
- Do not add a local canonical “Stripe subscription” table beyond this cache.

## 2) Ensure backend files are production-ready
We already have commented code in:
- `convex/http.ts`
- `convex/stripeActions.ts`
- `convex/stripeHelpers.ts`

Bring them in line with the Stripe principles and Convex rules:

2.1 `convex/http.ts`
- Register Stripe webhook route using `httpAction` (Convex guideline). Path: `/stripe/webhook`.
- Verify signature using `Stripe.webhooks.constructEvent`.
- Maintain an allowlist of events (from the guide).
- Resolve `customerId` from event object and call the sync action.
- Keep body as raw text and respond quickly.

2.2 `convex/stripeHelpers.ts` (internal queries/mutations)
- Implement internal functions with new Convex function syntax:
  - `getCustomerMappingByUser(userId)` → returns mapping from `billingCustomers` via `by_user`.
  - `getCustomerByStripeId(stripeCustomerId)` → mapping via `by_customer`.
  - `writeCustomerMapping(userId, stripeCustomerId, email?)` → upsert in `billingCustomers`.
  - `writeSubscription(...)` → upsert cache in `subscriptions` using `by_subscription`.
  - `getMySubscription()` (optional public query) → get latest by `by_user` for current auth user.

2.3 `convex/stripeActions.ts`
- Node action file with Stripe SDK:
  - `ensureCustomerForUser({ userId, email? })` → create Stripe customer if missing, persist mapping.
  - `syncStripeCustomer({ stripeCustomerId })` → fetch latest subscription, normalize, write to `subscriptions` via helper.
  - `createCheckoutSession({ tier })` or single-plan version → ensure `stripeCustomerId`, create Checkout Session with metadata `{ projectId?, prospectId?, agreementId?, termsVersion? }`, success URL `/portal/paymentSuccess` (new page), return `url`.
  - `syncAfterSuccessForSelf()` → on success page, resolve `stripeCustomerId` and call `syncStripeCustomer`.
  - `createCustomerPortalSession()` (optional) → Stripe Billing Portal.

Implementation details
- Use the Convex guidelines: new function syntax, `action` for Stripe SDK usage, `internalAction` for non-exposed actions, and `internalQuery/internalMutation` for helpers.
- All functions must include `args` and `returns` validators. Avoid returning `undefined`.
- Map user identity consistently: use Better Auth’s `getAuthUserId(ctx)` where needed.

## 3) Ensure `app/portal/subscribe/page.tsx` is set up correctly
- Client page that shows a subscribe CTA when authenticated.
- Call Convex action `api.stripeActions.createCheckoutSession` onClick.
- On success, redirect browser to the returned `url`.
- Handle loading and error states.
- Do not read any Stripe state directly; rely on the success page and webhooks to sync.

Current file already has the scaffold; enable the action call and wire the redirect.

## 4) Create `/portal/paymentSuccess` page (manual sync on return)
- Add route: `app/portal/paymentSuccess/page.tsx` (RSC with a small client boundary or a route handler variant).
- On load:
  - Call Convex action `api.stripeActions.syncAfterSuccessForSelf`.
  - Redirect to `/portal` after sync completes (or shows a short success spinner/transition UI for a second).
- Purpose: defeat race conditions where webhooks arrive after the user return.

## Event Allowlist
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `customer.subscription.pending_update_applied`
- `customer.subscription.pending_update_expired`
- `customer.subscription.trial_will_end`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.upcoming`
- `invoice.marked_uncollectible`
- `invoice.payment_succeeded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

## Normalized Subscription Cache Shape
- For `subscriptions` table documents:
```
{
  userId: string, // auth user id string (consistent with projects.authUserId)
  stripeCustomerId: string,
  subscriptionId: string,
  status: string, // Stripe status (active, trialing, past_due, ...)
  priceId: string,
  currentPeriodStartMs: number,
  currentPeriodEndMs: number,
  cancelAtPeriodEnd: boolean,
  paymentBrand?: string,
  paymentLast4?: string,
  updatedAtMs: number,
}
```
- “No subscription” state: return `null` from `getMySubscription` or don’t write a row until a subscription exists. The UI will treat `null` as pre-payment.

## Portal Gating
- Full access: `active`
- Restricted: `past_due`, `incomplete`, `incomplete_expired`, `unpaid`, `paused`.
- Pre-payment: no row in `subscriptions` → “awaiting payment” UX.

## Environment
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_LITE_TIER_PRICE_ID` and/or `STRIPE_PRO_TIER_PRICE_ID` (or a single `STRIPE_PRICE_ID` if one plan)
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_BASE_URL` or `SITE_URL` for success/cancel URLs

## Stripe Dashboard Settings
- Disable Cash App Pay.
- Enable “Limit customers to one subscription”.

## Testing Checklist
- Customer creation and mapping
- Checkout Session creation with metadata
- Success route triggers sync then redirects to `/portal`
- Webhook signature verification and allowlisted processing
- Status transition to `AWAITING_ASSETS` on activation (if still `AWAITING_PAYMENT`)
- UI gating across all statuses using `subscriptions` cache
- Idempotency under duplicate webhook deliveries
- Error paths: missing env vars, missing mapping, no subscription case

## Implementation Notes (Specific to this repo)
- `convex/schema.ts` currently comments “subscriptions - managed by Polar component”. Replace with the two Stripe tables above and indexes.
- `convex/http.ts` already has a commented Stripe webhook example; un-comment and adapt:
  - Path `/stripe/webhook`
  - Use the allowlist above
  - On allowed event with `customer`, call `internal.stripeActions.syncStripeCustomer`
- `convex/stripeActions.ts` and `convex/stripeHelpers.ts` contain commented implementations; align field types to use `string` for `userId` if no `users` table exists, and ensure new Convex function syntax with validators.
- `app/portal/subscribe/page.tsx` has commented action calls; wire `createCheckoutSession` and `window.location.href = url`.
- New `app/portal/paymentSuccess/page.tsx` should call `syncAfterSuccessForSelf` on mount (or in a simple server action flow) and redirect.
