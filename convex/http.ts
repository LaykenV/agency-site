import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";
import { rateLimiter } from "./rateLimiter";

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

// ============================================================================
// CORS HELPER FOR CLIENT SITES
// ============================================================================

function getCorsHeaders(
  liveUrl: string | null | undefined,
  stagingUrl: string | null | undefined,
  origin: string | null
) {
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }

  // Check if origin matches the project's liveUrl (with or without www)
  const matchesLive =
    liveUrl &&
    (origin === `https://${liveUrl}` || origin === `https://www.${liveUrl}`);

  // Check if origin matches the project's configured stagingUrl exactly
  const matchesStaging =
    stagingUrl &&
    (origin === `https://${stagingUrl}` || origin === stagingUrl);

  const allowedOrigin = matchesLive || matchesStaging ? origin : null;

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// ============================================================================
// LEAD INGESTION ENDPOINT
// ============================================================================

http.route({
  path: "/api/ingest-lead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");

    let body: { projectId?: string; source?: string; data?: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const projectId = body.projectId as string;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing projectId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Validate projectId exists and is LIVE or IN_REVIEW
    const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
      projectId,
    });

    if (!project) {
      return new Response(JSON.stringify({ error: "Invalid project" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Allow LIVE and IN_REVIEW for testing
    const allowedStatuses = ["LIVE", "IN_REVIEW"];
    if (!allowedStatuses.includes(project.projectStatus ?? "")) {
      return new Response(JSON.stringify({ error: "Project not accepting leads" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const corsHeaders = getCorsHeaders(
      project.deployment?.liveUrl,
      project.deployment?.stagingUrl,
      origin
    );

    // 2. Validate origin matches project's liveUrl or stagingUrl
    if (!corsHeaders["Access-Control-Allow-Origin"]) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Rate limit by IP (5 leads per minute per project per IP)
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown";

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "leadSubmission", {
      key: `${projectId}:${ip}`,
    });

    if (!ok) {
      return new Response(JSON.stringify({ error: "Rate limited", retryAfter }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Validate lead data structure
    const leadData = body.data as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    if (!leadData?.name || !leadData?.email) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Insert lead
    const leadId = await ctx.runMutation(internal.clientLeads.create, {
      projectId,
      source: (body.source as string) || "contact-form",
      data: {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        message: leadData.message,
      },
    });

    // 6. Trigger email notification (fire and forget)
    ctx.runAction(internal.emails.sendLeadNotification, {
      projectId,
      leadId,
      leadData: {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        message: leadData.message,
      },
    }).catch((err) => {
      console.error("[http] Failed to send lead notification email:", err);
    });

    return new Response(JSON.stringify({ success: true, leadId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// ANALYTICS PIXEL ENDPOINT
// ============================================================================

http.route({
  path: "/api/analytics/pixel",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");

    let body: { projectId?: string; path?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(null, { status: 400 });
    }

    const projectId = body.projectId as string;
    if (!projectId) {
      return new Response(null, { status: 400 });
    }

    // Validate projectId exists
    const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
      projectId,
    });

    if (!project) {
      return new Response(null, { status: 400 });
    }

    const corsHeaders = getCorsHeaders(
      project.deployment?.liveUrl,
      project.deployment?.stagingUrl,
      origin
    );

    // Validate origin
    if (!corsHeaders["Access-Control-Allow-Origin"]) {
      return new Response(null, { status: 403 });
    }

    // Rate limit analytics (higher limit, per project)
    const { ok } = await rateLimiter.limit(ctx, "analyticsPixel", {
      key: projectId,
    });

    if (!ok) {
      return new Response(null, { status: 429, headers: corsHeaders });
    }

    // Record page view
    await ctx.runMutation(internal.clientAnalytics.recordPageView, {
      projectId,
      path: body.path || "/",
    });

    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ============================================================================
// CORS PREFLIGHT HANDLERS
// ============================================================================
// Note: Preflight handlers are intentionally permissive because we cannot
// validate the origin against project-specific URLs during OPTIONS requests
// (the projectId is in the POST body, not the URL). The actual POST handlers
// perform strict origin validation using getCorsHeaders() and return 403 +
// empty CORS headers for invalid origins. Browsers will block the response
// from JavaScript when CORS headers don't match, preventing data exfiltration.
// Non-browser clients bypass CORS anyway, so server-side validation in POST
// handlers is the real security boundary.
// ============================================================================

const handleClientApiPreflight = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  return new Response(null, { status: 204, headers });
});

http.route({ path: "/api/ingest-lead", method: "OPTIONS", handler: handleClientApiPreflight });
http.route({ path: "/api/analytics/pixel", method: "OPTIONS", handler: handleClientApiPreflight });

export default http;

