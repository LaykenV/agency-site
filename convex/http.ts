import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { api } from "./_generated/api";
import { polar } from "./polarSettings";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, {
  cors: true,
});

polar.registerRoutes(http, {
  path: "/polar/events",
  onSubscriptionCreated: async (ctx, event) => {
    console.log("[Polar] onSubscriptionCreated called, event:", JSON.stringify(event));
    // activity log
    // update project status to awaiting assets
  },
  onSubscriptionUpdated: async (ctx, event) => {
    console.log("[Polar] onSubscriptionUpdated called, event:", JSON.stringify(event));
  },
  onProductCreated: async (ctx, event) => {
    console.log("[Polar] onProductCreated called, event:", JSON.stringify(event));
  },
  onProductUpdated: async (ctx, event) => {
    console.log("[Polar] onProductUpdated called, event:", JSON.stringify(event));
  },
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

export default http;

