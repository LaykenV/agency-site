import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, {
  cors: true,
});

http.route({
  path: "/cal-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const signature = req.headers.get("x-cal-signature-256");
      if (!signature) {
        return new Response("Unauthorized", { status: 401 });
      }
      const secret = process.env.CAL_WEBHOOK_SECRET;
      if (!secret) {
        return new Response("Missing CAL_WEBHOOK_SECRET", { status: 500 });
      }
      const body = await req.text();

      const result = await ctx.runAction(api.calWebhook.processCalWebhook, {
        signature,
        secret,
        body,
      });

      if (result.success) {
        return new Response("OK", { status: result.status ?? 200 });
      }

      const status = result.status ?? 500;
      const message = status === 401 ? "Unauthorized" : "Error processing webhook";
      return new Response(message, { status });
    } catch (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }
  }),
});

http.route({
  method: "POST",
  path: "/stripe/webhook",
  handler: httpAction(async (ctx, request) => {
      const signature = request.headers.get("stripe-signature");
      if (!signature) return new Response("Missing signature", { status: 400 });
      const rawBody = await request.text();
      try {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2025-09-30.clover" });
          const event = stripe.webhooks.constructEvent(
              rawBody,
              signature,
              process.env.STRIPE_WEBHOOK_SECRET as string,
          );
          // Allowed events from Theo's list
          const allowed: Set<string> = new Set([
              "checkout.session.completed",
              "customer.subscription.created",
              "customer.subscription.updated",
              "customer.subscription.deleted",
              "customer.subscription.paused",
              "customer.subscription.resumed",
              "customer.subscription.pending_update_applied",
              "customer.subscription.pending_update_expired",
              "customer.subscription.trial_will_end",
              "invoice.paid",
              "invoice.payment_failed",
              "invoice.payment_action_required",
              "invoice.upcoming",
              "invoice.marked_uncollectible",
              "invoice.payment_succeeded",
              "payment_intent.succeeded",
              "payment_intent.payment_failed",
              "payment_intent.canceled",
          ]);
          if (!allowed.has(event.type)) {
              return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "content-type": "application/json" } });
          }
          const obj = event.data.object as { customer?: string };
          const customerId = obj?.customer;
          if (typeof customerId === "string" && customerId.length > 0) {
              await ctx.runAction(internal.stripeActions.syncStripeCustomer, { stripeCustomerId: customerId });
          }
      } catch (err) {
          console.error("Stripe webhook error", err);
          const status = err instanceof Stripe.errors.StripeSignatureVerificationError ? 400 : 500;
          return new Response("Webhook error", { status });
      }
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "content-type": "application/json" } });
  }),
});

export default http;

