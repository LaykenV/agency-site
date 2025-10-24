# Stripe Integration Setup Complete

## What Was Implemented

### 1. Database Schema (`convex/schema.ts`)
✅ Added `billingCustomers` table to track Stripe customer mappings
✅ Added `subscriptions` table to cache subscription state
✅ Both tables indexed by `userId` and Stripe IDs for efficient queries

### 2. Stripe Helper Functions (`convex/stripeHelpers.ts`)
✅ `getCustomerMappingByUser` - Lookup Stripe customer by auth user ID
✅ `writeCustomerMapping` - Store/update user→customer mapping
✅ `writeSubscription` - Cache subscription state
✅ `getCustomerByStripeId` - Reverse lookup by Stripe customer ID
✅ `getMySubscription` - Public query for users to check their subscription

### 3. Stripe Actions (`convex/stripeActions.ts`)
✅ `ensureCustomerForUser` - Create Stripe customer if doesn't exist
✅ `syncStripeCustomer` - Sync subscription state from Stripe (single source of truth)
✅ `createCheckoutSession` - Generate Stripe Checkout URL
✅ `syncAfterSuccessForSelf` - Manual sync on payment success page
✅ `createCustomerPortalSession` - Generate customer portal URL

### 4. Webhook Handler (`convex/http.ts`)
✅ Route: `/stripe/webhook`
✅ Signature verification
✅ Event allowlist (18 subscription-related events)
✅ Automatic sync on webhook events

### 5. Frontend Pages
✅ Updated `/portal/subscribe` page with checkout button
✅ Created `/portal/paymentSuccess` page for post-payment sync

## Required Environment Variables

You need to add these environment variables to your Convex dashboard:

```bash
STRIPE_SECRET_KEY=sk_test_...           # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...      # Your Stripe publishable key (optional)
STRIPE_PRICE_ID=price_...               # Your subscription price ID
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret
```

Optional (will fall back to SITE_URL):
```bash
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Stripe Dashboard Setup

### 1. Create Your Product and Price
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create a new product (e.g., "Agency Subscription")
3. Add a recurring price (e.g., $99/month)
4. Copy the Price ID (starts with `price_`) and set it as `STRIPE_PRICE_ID`

### 2. Configure Webhook
1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set URL to: `https://your-convex-deployment.convex.site/stripe/webhook`
   - Get your Convex deployment URL from `convex dashboard`
4. Select events to listen to (or select all):
   - `checkout.session.completed`
   - `customer.subscription.*` (all subscription events)
   - `invoice.*` (all invoice events)
   - `payment_intent.*` (all payment intent events)
5. Copy the "Signing secret" (starts with `whsec_`) and set it as `STRIPE_WEBHOOK_SECRET`

### 3. Recommended Settings
Go to Settings → Billing:
- ✅ **Disable Cash App Pay** (reduces fraud)
- ✅ **Enable "Limit customers to one subscription"** (prevents double subscriptions)

## Testing the Integration

### Test Mode (Recommended First)
1. Use test API keys (start with `sk_test_` and `pk_test_`)
2. Use test webhook secret
3. Test card: `4242 4242 4242 4242`, any future date, any CVC

### Test Flow
1. Navigate to `/portal/subscribe`
2. Click "Subscribe Now"
3. Complete checkout with test card
4. Should redirect to `/portal/paymentSuccess`
5. Should sync subscription and redirect to `/portal`
6. Check your subscription with `getMySubscription` query

### Verify Webhook
1. Trigger a test webhook from Stripe dashboard
2. Check Convex logs for webhook processing
3. Verify subscription data is synced to `subscriptions` table

## Subscription Status Gating

Use the `getMySubscription` query to check user subscription status:

```typescript
const subscription = useQuery(api.stripeHelpers.getMySubscription);

// Full access
if (subscription?.status === "active") {
  // User has active subscription
}

// Restricted access
if (["past_due", "incomplete", "unpaid", "paused"].includes(subscription?.status)) {
  // Show payment required message
}

// Pre-payment
if (!subscription) {
  // User hasn't subscribed yet
}
```

## Customer Portal (Bonus)

Users can manage their subscription via Stripe Customer Portal:

```typescript
const createPortal = useAction(api.stripeActions.createCustomerPortalSession);
const { url } = await createPortal({});
window.location.href = url; // Redirect to Stripe portal
```

## How It Works

1. **User subscribes** → Creates checkout session → Redirects to Stripe
2. **User completes payment** → Returns to `/portal/paymentSuccess`
3. **Success page syncs** → Calls `syncAfterSuccessForSelf` (defeats race conditions)
4. **Webhooks sync** → All subscription events trigger `syncStripeCustomer`
5. **Single source of truth** → All Stripe data flows through one sync function

## Troubleshooting

### Webhook not working
- Verify webhook URL is correct (check Convex logs)
- Verify signing secret matches
- Check that webhook is enabled in Stripe dashboard

### Subscription not showing after payment
- Check `/portal/paymentSuccess` page is syncing
- Verify webhooks are being delivered
- Check Convex logs for errors

### User email not showing in Stripe
- Verify Better Auth user has email field
- Check that `authComponent.getAuthUser(ctx)` returns email

## Next Steps

1. Set up environment variables in Convex dashboard
2. Create product and price in Stripe
3. Configure webhook endpoint
4. Test with test mode
5. Switch to live mode when ready

## Architecture Notes

This implementation follows the "single source of truth" pattern recommended by [Theo's Stripe Guide](https://github.com/t3dotgg/how-i-stay-sane-implementing-stripe):

- ✅ All Stripe data flows through `syncStripeCustomer`
- ✅ No split-brain between Stripe and database
- ✅ Success page sync defeats webhook race conditions
- ✅ Webhook allowlist prevents unnecessary processing
- ✅ Customer always created before checkout
- ✅ Minimal split-brain risk

