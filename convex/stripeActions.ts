"use node";

import Stripe from "stripe";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import {
  validateStripePriceForMonthlyOrderForm,
  validateStripePriceForSetupFee,
} from "../lib/legal/stripePrice";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-10-29.clover",
});

const CHELSEA_BILLING_EMAIL = "chelsea_bordelon@yahoo.com";

function getLegacyCheckoutPriceId(email: string | null | undefined): string {
  const isChelsea = email?.trim().toLowerCase() === CHELSEA_BILLING_EMAIL;
  const priceId = isChelsea
    ? process.env.STRIPE_CHELSEA_PRICE_ID
    : process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    throw new Error(
      isChelsea
        ? "STRIPE_CHELSEA_PRICE_ID is not set"
        : "STRIPE_PRICE_ID is not set",
    );
  }

  return priceId;
}

export const ensureCustomerForUser = internalAction({
  args: { userId: v.string(), email: v.optional(v.string()) },
  returns: v.object({ stripeCustomerId: v.string() }),
  handler: async (ctx, args): Promise<{ stripeCustomerId: string }> => {
    type BillingCustomer = {
      _id: Id<"billingCustomers">;
      _creationTime: number;
      userId: string;
      stripeCustomerId: string;
      email?: string;
      createdAtMs: number;
    };
    const mapping: BillingCustomer | null = await ctx.runQuery(
      internal.stripeHelpers.getCustomerMappingByUser,
      {
        userId: args.userId,
      },
    );
    if (mapping) return { stripeCustomerId: mapping.stripeCustomerId };

    const customer = await stripe.customers.create({
      email: args.email,
      metadata: { userId: args.userId },
    });
    const writeResult: { stripeCustomerId: string } = await ctx.runMutation(
      internal.stripeHelpers.writeCustomerMapping,
      {
        userId: args.userId,
        stripeCustomerId: customer.id,
        email: args.email,
      },
    );
    return { stripeCustomerId: writeResult.stripeCustomerId };
  },
});

export const syncStripeCustomer = internalAction({
  args: { stripeCustomerId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find user mapping
    const billingRows = await ctx.runQuery(internal.stripeHelpers.getCustomerByStripeId, {
      stripeCustomerId: args.stripeCustomerId,
    });
    const mapping = billingRows;
    if (!mapping) return null;
    const userId = mapping.userId;

    const subs = await stripe.subscriptions.list({
      customer: args.stripeCustomerId,
      limit: 1,
      status: "all",
      expand: ["data.default_payment_method"],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subs.data[0] as any; // Stripe.Subscription;
    if (!sub) return null;

    const pm = sub.default_payment_method;
    const card = pm && typeof pm !== "string" ? (pm.card ?? null) : null;
    const { previousStatus } = await ctx.runMutation(internal.stripeHelpers.writeSubscription, {
      userId,
      stripeCustomerId: args.stripeCustomerId,
      subscriptionId: sub.id,
      status: sub.status,
      priceId: sub.items.data[0]?.price.id ?? "",
      currentPeriodStartMs: sub.current_period_start * 1000,
      currentPeriodEndMs: sub.current_period_end * 1000,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      paymentBrand: card?.brand ?? undefined,
      paymentLast4: card?.last4 ?? undefined,
    });
    const statusChanged = previousStatus !== sub.status;

    const metadata = sub.metadata ?? {};
    const projectIdRaw = metadata.projectId;
    const prospectIdRaw = metadata.prospectId;
    const projectId = typeof projectIdRaw === "string" && projectIdRaw.length > 0 ? (projectIdRaw as Id<"projects">) : undefined;
    const prospectId = typeof prospectIdRaw === "string" && prospectIdRaw.length > 0 ? (prospectIdRaw as Id<"prospects">) : undefined;

    if (projectId) {
      if (sub.status === "active" || sub.status === "trialing") {
        // Attempt to transition from AWAITING_PAYMENT to AWAITING_ASSETS
        // This returns true only if the status was actually updated (preventing duplicate emails)
        const statusUpdated: boolean = await ctx.runMutation(internal.projects.internalSetStatusIfEligible, {
          projectId,
          status: "AWAITING_ASSETS",
          expectedCurrentStatus: "AWAITING_PAYMENT",
        });

        if (statusChanged) {
          await ctx.runMutation(internal.activityLog.logActivity, {
            projectId,
            prospectId,
            actor: "system",
            kind: "payment.subscription_activated",
            payload: {
              stripeCustomerId: args.stripeCustomerId,
              subscriptionId: sub.id,
              status: sub.status,
            },
          });
        }

        // Trigger welcome email ONLY if we were the call that successfully transitioned the status
        // This prevents duplicate emails when both webhook and client-side sync run simultaneously
        if (statusUpdated) {
          const agreement = await ctx.runQuery(internal.agreement.internalGetLatestAgreementForProject, {
            projectId,
          });

          if (agreement) {
            // Schedule the welcome email to be sent after the snapshot is ready
            // We pass all necessary data to avoid additional queries
            await ctx.scheduler.runAfter(2000, internal.agreementActions.sendWelcomeEmailAfterSnapshot, {
              agreementId: agreement._id,
              projectId,
            });
          }
        }
      } else if (
        sub.status === "past_due" ||
        sub.status === "unpaid" ||
        sub.status === "canceled" ||
        sub.status === "paused"
      ) {
        if (statusChanged) {
          await ctx.runMutation(internal.activityLog.logActivity, {
            projectId,
            prospectId,
            actor: "system",
            kind: "payment.subscription_status_changed",
            payload: {
              stripeCustomerId: args.stripeCustomerId,
              subscriptionId: sub.id,
              status: sub.status,
            },
          });
        }
      }
    }
    return null;
  },
});

export const createCheckoutSession = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx) => {
    // Fetch user from Better Auth
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) throw new Error("Not authenticated");

    const userId = user._id;
    const userEmail = user.email;

    const primaryProject = await ctx.runQuery(internal.projects.internalGetLatestProjectByAuthUser, {
      authUserId: userId,
    });
    if (!primaryProject || primaryProject.projectStatus !== "AWAITING_PAYMENT") {
      throw new Error("Project must be awaiting payment before starting checkout");
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_URL;
    if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL or SITE_URL must be set");

    const agreement = await ctx.runQuery(internal.agreement.internalGetLatestAgreementForProject, {
      projectId: primaryProject._id,
    });
    if (!agreement) throw new Error("A signed agreement is required before checkout");

    let priceId: string;
    let setupPriceId: string | undefined;
    if (agreement.orderFormId) {
      const acceptedOrderForm = await ctx.runQuery(internal.orderForms.internalGetById, {
        orderFormId: agreement.orderFormId,
      });
      if (
        !acceptedOrderForm ||
        acceptedOrderForm.projectId !== primaryProject._id ||
        acceptedOrderForm.version !== agreement.orderFormVersion ||
        acceptedOrderForm.issuedHash !== agreement.orderFormHash
      ) {
        throw new Error("The Order Form attached to this agreement could not be verified");
      }
      if (acceptedOrderForm.spec.pricing.collectionMethod !== "stripe_checkout") {
        throw new Error(
          "This agreement uses manual invoicing and does not have a self-serve checkout",
        );
      }
      priceId = acceptedOrderForm.stripePriceId?.trim() ?? "";
      if (!priceId) throw new Error("The accepted Order Form has no Stripe Price ID");

      setupPriceId = acceptedOrderForm.setupStripePriceId?.trim() || undefined;
      if (acceptedOrderForm.spec.pricing.setupFeeCents > 0 && !setupPriceId) {
        throw new Error("The accepted Order Form has no one-time setup Stripe Price ID");
      }

      const [stripePrice, setupStripePrice] = await Promise.all([
        stripe.prices.retrieve(priceId),
        setupPriceId ? stripe.prices.retrieve(setupPriceId) : Promise.resolve(null),
      ]);
      const priceErrors = validateStripePriceForMonthlyOrderForm(
        stripePrice,
        priceId,
        acceptedOrderForm.spec.pricing.monthlyCents,
      );
      if (setupPriceId && setupStripePrice) {
        priceErrors.push(
          ...validateStripePriceForSetupFee(
            setupStripePrice,
            setupPriceId,
            acceptedOrderForm.spec.pricing.setupFeeCents,
          ),
        );
      }
      if (priceErrors.length > 0) {
        console.error("[stripe] accepted Order Form does not match Stripe Price", {
          projectId: primaryProject._id,
          orderFormId: acceptedOrderForm._id,
          priceId,
          errors: priceErrors,
        });
        throw new Error(`Checkout configuration mismatch: ${priceErrors.join("; ")}`);
      }
    } else {
      // Pre-4A agreements keep their original behavior. This retains Chelsea's
      // signed record and $49 Price mapping without fabricating an Order Form.
      priceId = getLegacyCheckoutPriceId(userEmail);
    }

    type BillingCustomer = {
      _id: Id<"billingCustomers">;
      _creationTime: number;
      userId: string;
      stripeCustomerId: string;
      email?: string;
      createdAtMs: number;
    };
    const mapping: BillingCustomer | null = await ctx.runQuery(
      internal.stripeHelpers.getCustomerMappingByUser,
      { userId },
    );
    let stripeCustomerId: string | undefined = mapping?.stripeCustomerId;
    if (!stripeCustomerId) {
      const ensured: { stripeCustomerId: string } = await ctx.runAction(
        internal.stripeActions.ensureCustomerForUser,
        { userId, email: userEmail },
      );
      stripeCustomerId = ensured.stripeCustomerId;
    }
    if (!stripeCustomerId) throw new Error("Failed to ensure Stripe customer");

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];
    if (setupPriceId) {
      lineItems.unshift({ price: setupPriceId, quantity: 1 });
    }

    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: lineItems,
      metadata: {
        projectId: primaryProject._id,
        projectSlug: primaryProject.projectId,
        prospectId: primaryProject.prospectId ?? "",
        agreementId: agreement?._id ?? "",
        termsVersion: agreement?.termsVersion ?? "",
        orderFormId: agreement?.orderFormId ?? "",
        orderFormVersion: agreement?.orderFormVersion ?? "",
        orderFormHash: agreement?.orderFormHash ?? "",
        setupPriceId: setupPriceId ?? "",
      },
      subscription_data: {
        metadata: {
          projectId: primaryProject._id,
          projectSlug: primaryProject.projectId,
          prospectId: primaryProject.prospectId ?? "",
          agreementId: agreement?._id ?? "",
          termsVersion: agreement?.termsVersion ?? "",
          orderFormId: agreement?.orderFormId ?? "",
          orderFormVersion: agreement?.orderFormVersion ?? "",
          orderFormHash: agreement?.orderFormHash ?? "",
          setupPriceId: setupPriceId ?? "",
        },
      },
      success_url: `${baseUrl}/portal/paymentSuccess`,
      cancel_url: `${baseUrl}/portal/subscribe`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  },
});

export const syncAfterSuccessForSelf = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) return null;

    const mapping = await ctx.runQuery(
      internal.stripeHelpers.getCustomerMappingByUser,
      { userId: user._id },
    );
    if (!mapping?.stripeCustomerId) {
      // Visiting the success URL is not evidence of payment and must not create
      // billing state. A legitimate Checkout attempt creates this mapping
      // before redirecting to Stripe.
      throw new Error("No Stripe checkout exists for this account");
    }

    // `syncStripeCustomer` retrieves Stripe state and advances only the project
    // named in an active/trialing subscription's server-controlled metadata.
    // Never add a status fallback here: this action is callable by any signed-in
    // client simply by visiting /portal/paymentSuccess.
    await ctx.runAction(internal.stripeActions.syncStripeCustomer, {
      stripeCustomerId: mapping.stripeCustomerId,
    });
    return null;
  },
});

export const createCustomerPortalSession = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) throw new Error("Not authenticated");
    
    const userId = user._id;

    type BillingCustomer = {
      _id: Id<"billingCustomers">;
      _creationTime: number;
      userId: string;
      stripeCustomerId: string;
      email?: string;
      createdAtMs: number;
    };
    const mapping: BillingCustomer | null = await ctx.runQuery(
      internal.stripeHelpers.getCustomerMappingByUser,
      { userId },
    );
    let stripeCustomerId: string | undefined = mapping?.stripeCustomerId;
    if (!stripeCustomerId) {
      const ensured: { stripeCustomerId: string } = await ctx.runAction(
        internal.stripeActions.ensureCustomerForUser,
        { userId, email: user.email },
      );
      stripeCustomerId = ensured.stripeCustomerId;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_URL;
    if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL or SITE_URL must be set");
    
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/portal`,
    });
    if (!session.url) throw new Error("Stripe did not return a customer portal URL");
    return { url: session.url };
  },
});
