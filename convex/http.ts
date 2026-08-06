import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { authComponent, createAuth } from "./auth";
import { api, internal } from "./_generated/api";
import Stripe from "stripe";
import { rateLimiter } from "./rateLimiter";
import {
  jsonResponse,
  readJsonBodyWithLimit,
  validateClientEventPayload,
  validateLeadPayload,
  LEAD_FIELD_LIMITS,
} from "./httpValidation";
import {
  extractBearerToken,
  parseCredential,
  verifyPresentedCredential,
} from "./credentialCrypto";
import { classifyReferrer } from "./lib/referrerClass";

const http = httpRouter();

type HubCounterKind =
  | "lead_accepted"
  | "lead_fanout_paused"
  | "lead_rate_limited_ingest"
  | "lead_rate_limited_visitor"
  | "lead_rate_limited_no_trusted"
  | "lead_project_mismatch";

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
// LEAD INGESTION v2 — authenticated bearer (Stage 2 / Phase 1B)
// ============================================================================
// This is the only lead-ingestion route. The unauthenticated v1 and
// unversioned aliases were retired after every configured production spoke
// migrated and passed end-to-end verification.
// Auth order per waas_upgrade.md §3.4 — cheapest rejections first.
// Authorization is never logged (only keyId on success/failure).
//
// Pre-authentication failures (missing/malformed bearer, unknown or revoked
// keyId, hash mismatch) deliberately do NOT write a counter. A counter bump is a
// Convex mutation, so incrementing one before the caller is authenticated would
// let anyone POSTing garbage tokens drive an unbounded number of writes against a
// single shared document — billable, and contended enough to cause OCC retries
// under load. That is the same cost-amplification class Stage 1A closed on v1.
// These failures are observable via `[hub.lead.v2] auth_failed` log lines
// instead. Counters resume once a request is authenticated and a project is
// resolved, where the caller holds a real credential and volume is bounded.
// ============================================================================

const ingestLeadV2Handler = httpAction(async (ctx, request) => {
  // 1. Content-Type + streaming body ceiling (reuses Stage 1A validation)
  const parsed = await readJsonBodyWithLimit(request);
  if (!parsed.ok) {
    console.log("[hub.lead.v2] body_rejected", {
      status: parsed.status,
      error: parsed.error,
    });
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  // 2–3. Bearer credential: parse keyId → non-revoked secret → constant-time hash
  // Never log the Authorization header or raw token.
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    console.log("[hub.lead.v2] auth_failed", { reason: "missing_bearer" });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const rawToken = extractBearerToken(authorization);
  if (!rawToken) {
    console.log("[hub.lead.v2] auth_failed", { reason: "malformed_credential" });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const parsedCred = parseCredential(rawToken);
  if (!parsedCred || parsedCred.kind !== "secret") {
    console.log("[hub.lead.v2] auth_failed", { reason: "malformed_credential" });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const credential = await ctx.runQuery(
    internal.projectCredentials.getActiveSecretByKeyId,
    { keyId: parsedCred.keyId },
  );

  if (!credential) {
    // keyId is public-ish; safe to log for ops. Never log the secret portion.
    console.log("[hub.lead.v2] auth_failed", {
      reason: "unknown_or_revoked",
      keyId: parsedCred.keyId,
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Hex is case-insensitive; we store hashes of the lowercase canonical form.
  const hashOk = await verifyPresentedCredential(
    rawToken.toLowerCase(),
    credential.credentialHash,
  );
  if (!hashOk) {
    console.log("[hub.lead.v2] auth_failed", {
      reason: "hash_mismatch",
      keyId: parsedCred.keyId,
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Resolve project from credential (do not trust body projectId alone)
  const projectDoc = await ctx.runQuery(internal.projects.internalGetProjectById, {
    projectId: credential.projectId,
  });
  if (!projectDoc) {
    console.log("[hub.lead.v2] auth_failed", {
      reason: "project_missing",
      keyId: parsedCred.keyId,
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const projectId = projectDoc.projectId; // public slug used by client_leads

  const allowedStatuses = ["LIVE", "IN_REVIEW"];
  if (!allowedStatuses.includes(projectDoc.projectStatus ?? "")) {
    console.log("[hub.lead.v2] project_not_accepting", {
      projectId,
      keyId: parsedCred.keyId,
      status: projectDoc.projectStatus,
    });
    return jsonResponse({ error: "Project not accepting leads" }, 400);
  }

  // Optional body projectId must match credential's project when present
  const body = parsed.value as Record<string, unknown>;
  if (body.projectId !== undefined && body.projectId !== null && body.projectId !== "") {
    if (typeof body.projectId !== "string") {
      return jsonResponse({ error: "Invalid projectId" }, 400);
    }
    const bodyProjectId = body.projectId.trim().slice(0, LEAD_FIELD_LIMITS.projectId);
    if (bodyProjectId !== projectId) {
      await bumpHubCounter(ctx, projectId, "lead_project_mismatch");
      console.log("[hub.lead.v2] auth_failed", {
        reason: "project_mismatch",
        keyId: parsedCred.keyId,
        projectId,
      });
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  // 4–5. Field validation before rate-limit consumption / insert
  const validated = validateLeadPayload(body);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400);
  }

  // Optional visitorHash from the client Function (Stage 2 spoke path).
  // Accept it at the top level OR nested under `meta`: both reference spokes send
  // it inside `meta` alongside hp/renderedAt. Reading only the top level made
  // per-visitor limiting a silent no-op — every lead fell through to the project
  // bucket and `hasVisitorHash` logged false.
  // When absent, fall back to the project no-trusted-visitor bucket.
  const metaObject =
    body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : undefined;
  const rawVisitorHash = body.visitorHash ?? metaObject?.visitorHash;

  let visitorKey: string | null = null;
  if (
    rawVisitorHash !== undefined &&
    rawVisitorHash !== null &&
    rawVisitorHash !== ""
  ) {
    if (typeof rawVisitorHash !== "string") {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    const vh = rawVisitorHash.trim();
    // Accept a bounded hex/base64url digest only — reject free-form strings
    if (vh.length < 16 || vh.length > 128 || !/^[A-Za-z0-9+/=_-]+$/.test(vh)) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    visitorKey = vh;
  }

  // 4. Rate limits (project ceilings always; per-visitor when spoke supplies hash)
  if (visitorKey) {
    const visitorLimit = await rateLimiter.limit(ctx, "leadPerVisitor", {
      key: `${projectId}:${visitorKey}`,
    });
    if (!visitorLimit.ok) {
      await bumpHubCounter(ctx, projectId, "lead_rate_limited_visitor");
      console.log("[hub.lead.v2] rate_limited", {
        kind: "leadPerVisitor",
        projectId,
        keyId: parsedCred.keyId,
        retryAfter: visitorLimit.retryAfter,
      });
      return jsonResponse(
        { error: "Rate limited", retryAfter: visitorLimit.retryAfter },
        429,
      );
    }
  } else {
    const noTrusted = await rateLimiter.limit(ctx, "leadNoTrustedVisitor", {
      key: projectId,
    });
    if (!noTrusted.ok) {
      await bumpHubCounter(ctx, projectId, "lead_rate_limited_no_trusted");
      console.log("[hub.lead.v2] rate_limited", {
        kind: "leadNoTrustedVisitor",
        projectId,
        keyId: parsedCred.keyId,
        retryAfter: noTrusted.retryAfter,
      });
      await queueThresholdAlert(ctx, {
        projectId,
        limitName: "leadNoTrustedVisitor",
        detail:
          "Hourly no-trusted-visitor ceiling reached on v2. Further submissions are being REJECTED with 429.",
      });
      return jsonResponse(
        { error: "Rate limited", retryAfter: noTrusted.retryAfter },
        429,
      );
    }
  }

  const ingestLimit = await rateLimiter.limit(ctx, "leadIngestPerProject", {
    key: projectId,
  });
  if (!ingestLimit.ok) {
    await bumpHubCounter(ctx, projectId, "lead_rate_limited_ingest");
    console.log("[hub.lead.v2] rate_limited", {
      kind: "leadIngestPerProject",
      projectId,
      keyId: parsedCred.keyId,
      retryAfter: ingestLimit.retryAfter,
    });
    await queueThresholdAlert(ctx, {
      projectId,
      limitName: "leadIngestPerProject",
      detail:
        "Daily lead ingest ceiling reached on v2. Further submissions are being REJECTED with 429.",
    });
    return jsonResponse(
      { error: "Rate limited", retryAfter: ingestLimit.retryAfter },
      429,
    );
  }

  // 6. Insert lead + schedule triage (same fan-out pause semantics as v1)
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

  // Best-effort lastUsedAt — never fail the request if this patches late
  try {
    await ctx.runMutation(internal.projectCredentials.touchLastUsed, {
      credentialId: credential._id,
    });
  } catch (error) {
    console.error("[hub.lead.v2] touch_last_used_failed", {
      projectId,
      keyId: parsedCred.keyId,
      error,
    });
  }

  if (fanoutPaused) {
    await bumpHubCounter(ctx, projectId, "lead_fanout_paused");
    console.log("[hub.lead.v2] paid_fanout_paused", {
      projectId,
      leadId,
      keyId: parsedCred.keyId,
      retryAfter: fanout.retryAfter,
    });
    await queueThresholdAlert(ctx, {
      projectId,
      limitName: "paidFanoutPerProject",
      leadId,
      detail:
        "Daily paid fan-out ceiling reached on v2. Lead stored as untriaged; Groq/email/SMS skipped.",
    });
  } else {
    await ctx.scheduler.runAfter(0, internal.leadTriage.triageLead, {
      leadId,
    });
  }

  console.log("[hub.lead.v2] accepted", {
    projectId,
    leadId,
    keyId: parsedCred.keyId,
    fanoutPaused,
    hasVisitorHash: Boolean(visitorKey),
  });

  return jsonResponse({ success: true, leadId, fanoutPaused }, 200);
});

http.route({
  path: "/api/v2/leads",
  method: "POST",
  handler: ingestLeadV2Handler,
});

// ============================================================================
// The legacy analytics pixel (`/api/analytics/pixel`, `/api/v1/analytics/pixel`)
// was retired once every live spoke moved to `/api/v2/events`.
//
// It was not merely redundant. It needed no credential — a project slug plus an
// `Origin` header, both trivial for a non-browser client to supply — and it
// drew from the *same* `analyticsProjectFallback` bucket, on the same key, as
// authenticated v2 events. Forged pixel traffic could therefore drain a
// project's bucket and suppress that project's real analytics. Do not
// reintroduce an unauthenticated analytics alias; a new spoke gets a
// publishable key before it ships.
// ============================================================================

// ============================================================================
// EVENTS v2 — publishable key + Origin (Stage 3 / Phase 2)
// ============================================================================
// Typed pageviews and conversion clicks (tel / mailto / directions).
// Auth: full pk_live_… in body.publishableKey + browser Origin allowlist.
// Soft integrity boundary — not equivalent to secret lead auth.
// Pre-auth failures write no counters (same cost-amplification rule as leads).
// ============================================================================

const eventsV2Handler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  const parsed = await readJsonBodyWithLimit(request);
  if (!parsed.ok) {
    return new Response(null, {
      status: parsed.status === 413 ? 413 : 400,
    });
  }

  const body = parsed.value as Record<string, unknown>;

  // Publishable key from body (browser-safe; never use Authorization for pk_)
  const rawKey =
    typeof body.publishableKey === "string" ? body.publishableKey.trim() : "";
  if (!rawKey) {
    console.log("[hub.events.v2] auth_failed", { reason: "missing_key" });
    return new Response(null, { status: 401 });
  }

  const parsedCred = parseCredential(rawKey);
  if (!parsedCred || parsedCred.kind !== "publishable") {
    console.log("[hub.events.v2] auth_failed", { reason: "malformed_credential" });
    return new Response(null, { status: 401 });
  }

  const credential = await ctx.runQuery(
    internal.projectCredentials.getActivePublishableByKeyId,
    { keyId: parsedCred.keyId },
  );
  if (!credential) {
    console.log("[hub.events.v2] auth_failed", {
      reason: "unknown_or_revoked",
      keyId: parsedCred.keyId,
    });
    return new Response(null, { status: 401 });
  }

  const hashOk = await verifyPresentedCredential(
    rawKey.toLowerCase(),
    credential.credentialHash,
  );
  if (!hashOk) {
    console.log("[hub.events.v2] auth_failed", {
      reason: "hash_mismatch",
      keyId: parsedCred.keyId,
    });
    return new Response(null, { status: 401 });
  }

  const projectDoc = await ctx.runQuery(internal.projects.internalGetProjectById, {
    projectId: credential.projectId,
  });
  if (!projectDoc) {
    console.log("[hub.events.v2] auth_failed", {
      reason: "project_missing",
      keyId: parsedCred.keyId,
    });
    return new Response(null, { status: 401 });
  }

  // Full project (with deployment) for Origin allowlist — slug query returns deployment
  const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
    projectId: projectDoc.projectId,
  });
  if (!project) {
    return new Response(null, { status: 401 });
  }

  const corsHeaders = getCorsHeaders(
    project.deployment?.liveUrl,
    project.deployment?.stagingUrl,
    origin,
  );

  // Origin required for browser analytics (soft integrity boundary)
  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    console.log("[hub.events.v2] origin_rejected", {
      projectId: project.projectId,
      keyId: parsedCred.keyId,
      hasOrigin: Boolean(origin),
    });
    return new Response(null, { status: 403 });
  }

  // Optional body projectId must match when present
  if (body.projectId !== undefined && body.projectId !== null && body.projectId !== "") {
    if (typeof body.projectId !== "string") {
      return new Response(null, { status: 400, headers: corsHeaders });
    }
    const bodyProjectId = body.projectId.trim().slice(0, LEAD_FIELD_LIMITS.projectId);
    if (bodyProjectId !== project.projectId) {
      console.log("[hub.events.v2] auth_failed", {
        reason: "project_mismatch",
        keyId: parsedCred.keyId,
        projectId: project.projectId,
      });
      return new Response(null, { status: 401, headers: corsHeaders });
    }
  }

  const validated = validateClientEventPayload(body);
  if (!validated.ok) {
    return new Response(null, { status: 400, headers: corsHeaders });
  }

  // Project-scoped only. There is no per-visitor tier here: the Hub sees no
  // client IP it can trust, and browser events carry no authenticated visitor
  // identity the way `meta.visitorHash` gives leads one.
  const { ok: withinLimit } = await rateLimiter.limit(
    ctx,
    "analyticsProjectFallback",
    { key: project.projectId },
  );
  if (!withinLimit) {
    console.log("[hub.events.v2] rate_limited", {
      kind: "analyticsProjectFallback",
      projectId: project.projectId,
    });
    return new Response(null, { status: 429, headers: corsHeaders });
  }

  // `origin` is already proven to match the project's deployment URL above, so
  // its host is a trustworthy "this is us" check for self-referrals.
  let selfHost: string | null = null;
  try {
    selfHost = origin ? new URL(origin).hostname : null;
  } catch {
    selfHost = null;
  }

  const referrerClass = classifyReferrer(validated.referrer, selfHost);

  await ctx.runMutation(internal.clientEvents.recordEvent, {
    projectDocId: project._id,
    projectSlug: project.projectId,
    publishableKeyId: credential.keyId,
    type: validated.type,
    path: validated.path,
    referrerClass,
    ...(validated.type === "click" ? { payload: validated.payload } : {}),
    ...(validated.referrer ? { referrerForRollup: validated.referrer } : {}),
  });

  // Best-effort lastUsedAt. Throttled — one credential row serves every browser
  // event for the project, so an unthrottled patch per event contends on write.
  try {
    await ctx.runMutation(internal.projectCredentials.touchLastUsed, {
      credentialId: credential._id,
      minIntervalMs: 5 * 60_000,
    });
  } catch (error) {
    console.error("[hub.events.v2] touch_last_used_failed", {
      projectId: project.projectId,
      keyId: parsedCred.keyId,
      error,
    });
  }

  console.log("[hub.events.v2] accepted", {
    projectId: project.projectId,
    keyId: parsedCred.keyId,
    type: validated.type,
    ...(validated.type === "click" ? { target: validated.payload.target } : {}),
    referrerClass,
  });

  return new Response(null, { status: 204, headers: corsHeaders });
});

http.route({
  path: "/api/v2/events",
  method: "POST",
  handler: eventsV2Handler,
});

// ============================================================================
// CORS PREFLIGHT HANDLERS
// ============================================================================
// Note: Preflight handlers are intentionally permissive because we cannot
// validate the origin against project-specific URLs during OPTIONS requests
// (the credential is in the POST body, not the URL). The actual POST handler
// performs strict origin validation using getCorsHeaders() and returns 403 +
// empty CORS headers for invalid origins. Browsers will block the response
// from JavaScript when CORS headers don't match, preventing data exfiltration.
// Non-browser clients bypass CORS anyway, so server-side validation in the POST
// handler is the real security boundary.
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

http.route({ path: "/api/v2/events", method: "OPTIONS", handler: handleClientApiPreflight });

export default http;
