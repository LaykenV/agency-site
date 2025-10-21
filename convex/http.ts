import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { api } from "./_generated/api";

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

export default http;

