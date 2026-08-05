import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authComponent, createAuth } from "./auth";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";
import { rateLimiter } from "./rateLimiter";
import {
  jsonResponse,
  logVisitorObservation,
  normalizeAnalyticsPath,
  normalizeReferrer,
  observeTrustedVisitor,
  readJsonBodyWithLimit,
  validateLeadPayload,
  LEAD_FIELD_LIMITS,
} from "./httpValidation";

const http = httpRouter();

type HubCounterKind =
  | "lead_accepted"
  | "lead_fanout_paused"
  | "lead_rate_limited_ingest"
  | "lead_rate_limited_visitor"
  | "lead_rate_limited_no_trusted";

/** Telemetry must never turn an accepted/rejected request into a 500. */
async function bumpHubCounter(
  ctx: ActionCtx,
  projectId: string,
  kind: HubCounterKind,
): Promise<void> {
  try {
    await ctx.runMutation(internal.hubOperations.bumpCounter, {
      projectId,
      kind,
    });
  } catch (error) {
    console.error("[hub.counter] increment_failed", {
      projectId,
      kind,
      error,
    });
  }
}

async function queueThresholdAlert(
  ctx: ActionCtx,
  args: {
    projectId: string;
    limitName: string;
    leadId?: Id<"client_leads">;
    detail: string;
  },
): Promise<void> {
  try {
    await ctx.runMutation(internal.hubOperations.queueThresholdAlert, args);
  } catch (error) {
    console.error("[hub.threshold_alert] queue_failed", {
      projectId: args.projectId,
      limitName: args.limitName,
      error,
    });
  }
}

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
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2025-10-29.clover" });
          const event = await stripe.webhooks.constructEventAsync(
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
// LEAD INGESTION ENDPOINT (v1 + unversioned — Stage 1A containment)
// ============================================================================
// Stage 1A deliberately keeps the no-Origin compatibility path: TB Tree's live
// Next.js Server Action posts server-to-server without a browser Origin. That
// hole is closed in Stage 2 (authenticated v2), not here. Turnstile was never
// implemented; do not claim it as a control.
// ============================================================================

const ingestLeadHandler = httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");

    // 1. Body ceiling + JSON parse (reject before allocating huge work)
    const parsed = await readJsonBodyWithLimit(request);
    if (!parsed.ok) {
      console.log("[hub.lead] body_rejected", {
        status: parsed.status,
        error: parsed.error,
      });
      return jsonResponse({ error: parsed.error }, parsed.status);
    }

    const body = parsed.value as Record<string, unknown>;
    const projectIdRaw = body.projectId;
    if (typeof projectIdRaw !== "string" || !projectIdRaw.trim()) {
      return jsonResponse({ error: "Missing projectId" }, 400);
    }
    const projectId = projectIdRaw.trim().slice(0, LEAD_FIELD_LIMITS.projectId);

    // 2. Validate projectId exists and is LIVE or IN_REVIEW
    const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
      projectId,
    });

    if (!project) {
      return jsonResponse({ error: "Invalid project" }, 400);
    }

    const allowedStatuses = ["LIVE", "IN_REVIEW"];
    if (!allowedStatuses.includes(project.projectStatus ?? "")) {
      return jsonResponse({ error: "Project not accepting leads" }, 400);
    }

    const corsHeaders = getCorsHeaders(
      project.deployment?.liveUrl,
      project.deployment?.stagingUrl,
      origin
    );

    // 3. Origin: browser requests must match configured live/staging URL.
    // Migration exception (Stage 1A): missing Origin is allowed for TB Tree's
    // Server Action. Removal gate = both clients proven on authenticated v2.
    if (origin && !corsHeaders["Access-Control-Allow-Origin"]) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // 4. Field validation before rate-limit consumption / insert / schedule
    const validated = validateLeadPayload(body);
    if (!validated.ok) {
      return jsonResponse({ error: validated.error }, 400, corsHeaders);
    }

    // 5. Observe visitor headers (never key security on spoofable XFF)
    const visitor = await observeTrustedVisitor(request);
    logVisitorObservation("lead", projectId, visitor);

    // 6. Visitor / no-trusted-visitor bucket. This must run before the daily
    // ingest counter so rejected burst traffic cannot burn the full-day quota.
    if (visitor.key) {
      const visitorLimit = await rateLimiter.limit(ctx, "leadPerVisitor", {
        key: `${projectId}:${visitor.key}`,
      });
      if (!visitorLimit.ok) {
        await bumpHubCounter(ctx, projectId, "lead_rate_limited_visitor");
        console.log("[hub.lead] rate_limited", {
          kind: "leadPerVisitor",
          projectId,
          retryAfter: visitorLimit.retryAfter,
        });
        return jsonResponse(
          { error: "Rate limited", retryAfter: visitorLimit.retryAfter },
          429,
          corsHeaders,
        );
      }
    } else {
      const noTrusted = await rateLimiter.limit(ctx, "leadNoTrustedVisitor", {
        key: projectId,
      });
      if (!noTrusted.ok) {
        await bumpHubCounter(ctx, projectId, "lead_rate_limited_no_trusted");
        console.log("[hub.lead] rate_limited", {
          kind: "leadNoTrustedVisitor",
          projectId,
          retryAfter: noTrusted.retryAfter,
        });
        // Also a rejected customer submission — alert for the same reason.
        await queueThresholdAlert(ctx, {
          projectId,
          limitName: "leadNoTrustedVisitor",
          detail:
            "Hourly no-trusted-visitor ceiling reached. Further submissions are being REJECTED with 429 — real customer leads are being lost until the window resets.",
        });
        return jsonResponse(
          { error: "Rate limited", retryAfter: noTrusted.retryAfter },
          429,
          corsHeaders,
        );
      }
    }

    // 7. Project storage ceiling (holds under rotated XFF). Consume it only for
    // a request that survived the burst limiter and is about to be inserted.
    const ingestLimit = await rateLimiter.limit(ctx, "leadIngestPerProject", {
      key: projectId,
    });
    if (!ingestLimit.ok) {
      await bumpHubCounter(ctx, projectId, "lead_rate_limited_ingest");
      console.log("[hub.lead] rate_limited", {
        kind: "leadIngestPerProject",
        projectId,
        retryAfter: ingestLimit.retryAfter,
      });
      await queueThresholdAlert(ctx, {
        projectId,
        limitName: "leadIngestPerProject",
        detail:
          "Daily lead ingest ceiling reached. Further submissions are being REJECTED with 429 — real customer leads are being lost until the window resets.",
      });
      return jsonResponse(
        { error: "Rate limited", retryAfter: ingestLimit.retryAfter },
        429,
        corsHeaders,
      );
    }

    // 8. Paid fan-out ceiling — store lead either way; never drop silently
    const fanout = await rateLimiter.limit(ctx, "paidFanoutPerProject", {
      key: projectId,
    });
    const fanoutPaused = !fanout.ok;

    const leadId = await ctx.runMutation(internal.clientLeads.create, {
      projectId,
      source: validated.source,
      data: validated.data,
      ...(fanoutPaused
        ? {
            fanoutPaused: true,
            fanoutPausedReason: "paid_fanout_ceiling",
          }
        : {}),
    });

    await bumpHubCounter(ctx, projectId, "lead_accepted");

    if (fanoutPaused) {
      await bumpHubCounter(ctx, projectId, "lead_fanout_paused");
      console.log("[hub.lead] paid_fanout_paused", {
        projectId,
        leadId,
        retryAfter: fanout.retryAfter,
      });
      // Persist + optionally deliver one threshold alert (separate admin path)
      await queueThresholdAlert(ctx, {
        projectId,
        limitName: "paidFanoutPerProject",
        leadId,
        detail:
          "Daily paid fan-out ceiling reached. Lead stored as untriaged; Groq/email/SMS skipped.",
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.leadTriage.triageLead, {
        leadId,
      });
    }

    console.log("[hub.lead] accepted", {
      projectId,
      leadId,
      fanoutPaused,
      hasOrigin: Boolean(origin),
      hasTrustedVisitor: Boolean(visitor.key),
    });

    return jsonResponse(
      { success: true, leadId, fanoutPaused },
      200,
      corsHeaders,
    );
  });

http.route({
  path: "/api/ingest-lead",
  method: "POST",
  handler: ingestLeadHandler,
});

http.route({
  path: "/api/v1/ingest-lead",
  method: "POST",
  handler: ingestLeadHandler,
});

// ============================================================================
// ANALYTICS PIXEL ENDPOINT
// ============================================================================

const analyticsPixelHandler = httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");

    const parsed = await readJsonBodyWithLimit(request);
    if (!parsed.ok) {
      return new Response(null, { status: parsed.status === 413 ? 413 : 400 });
    }

    const body = parsed.value as Record<string, unknown>;
    const projectIdRaw = body.projectId;
    if (typeof projectIdRaw !== "string" || !projectIdRaw.trim()) {
      return new Response(null, { status: 400 });
    }
    const projectId = projectIdRaw.trim().slice(0, LEAD_FIELD_LIMITS.projectId);

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

    // Analytics requires Origin match (mandatory)
    if (!corsHeaders["Access-Control-Allow-Origin"]) {
      return new Response(null, { status: 403 });
    }

    const visitor = await observeTrustedVisitor(request);
    logVisitorObservation("analytics", projectId, visitor);

    // Trusted visitor key when available; stricter project fallback otherwise.
    // Never key on spoofable XFF.
    if (visitor.key) {
      const { ok } = await rateLimiter.limit(ctx, "eventsPerVisitor", {
        key: `${projectId}:${visitor.key}`,
      });
      if (!ok) {
        console.log("[hub.analytics] rate_limited", {
          kind: "eventsPerVisitor",
          projectId,
        });
        return new Response(null, { status: 429, headers: corsHeaders });
      }
    } else {
      const { ok } = await rateLimiter.limit(ctx, "analyticsProjectFallback", {
        key: projectId,
      });
      if (!ok) {
        console.log("[hub.analytics] rate_limited", {
          kind: "analyticsProjectFallback",
          projectId,
        });
        return new Response(null, { status: 429, headers: corsHeaders });
      }
    }

    const path = normalizeAnalyticsPath(body.path);
    const referrer = normalizeReferrer(body.referrer);

    await ctx.runMutation(internal.clientAnalytics.recordPageView, {
      projectId,
      path,
      ...(referrer ? { referrer } : {}),
    });

    return new Response(null, { status: 204, headers: corsHeaders });
  });

http.route({
  path: "/api/analytics/pixel",
  method: "POST",
  handler: analyticsPixelHandler,
});

http.route({
  path: "/api/v1/analytics/pixel",
  method: "POST",
  handler: analyticsPixelHandler,
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
http.route({ path: "/api/v1/ingest-lead", method: "OPTIONS", handler: handleClientApiPreflight });
http.route({ path: "/api/analytics/pixel", method: "OPTIONS", handler: handleClientApiPreflight });
http.route({ path: "/api/v1/analytics/pixel", method: "OPTIONS", handler: handleClientApiPreflight });

export default http;
