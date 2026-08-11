import { RateLimiter, MINUTE, HOUR, DAY } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * Hub rate limits.
 *
 * Fixed windows are intentional for daily cost ceilings (a token bucket refills
 * continuously and is not a hard per-day maximum). Project-scoped ceilings must
 * hold even when visitor IP headers are spoofed or missing.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // --- Stage 1A lead / analytics containment ---

  /** Best-effort per trusted visitor when an edge IP is available. */
  leadPerVisitor: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },

  /**
   * When no trusted visitor signal exists, do not fall back to spoofable XFF.
   * Cap submissions per project instead (local service volume is low).
   *
   * Sized for burst control, not cost control: every TB Tree lead arrives here
   * (Server Action, no Origin and no edge IP header), so an aggressive value
   * rejects real customers. Cost is bounded by paidFanoutPerProject instead.
   */
  leadNoTrustedVisitor: {
    kind: "fixed window",
    rate: 30,
    period: HOUR,
  },

  /**
   * Storage-abuse ceiling — exhausted => 429, do not insert.
   *
   * Deliberately much looser than paidFanoutPerProject. Exhausting this rejects
   * a paying client's real customers for the rest of the window, so it is sized
   * to stop database abuse, not to control spend. Storage is cheap; Groq,
   * Resend, and Twilio are not.
   */
  leadIngestPerProject: {
    kind: "fixed window",
    rate: 1000,
    period: DAY,
  },

  /**
   * Paid fan-out circuit breaker (Groq + Resend + Twilio).
   * Exhausted => still store lead as untriaged, skip fan-out, one threshold alert.
   */
  paidFanoutPerProject: {
    kind: "fixed window",
    rate: 50,
    period: DAY,
  },

  /** Hard daily SMS ceiling per project. */
  smsPerProject: {
    kind: "fixed window",
    rate: 20,
    period: DAY,
  },

  /**
   * The only ceiling on `/api/v2/events`, shared by every visitor on a project.
   *
   * Sized for a busy day, not a quiet one. There is no per-visitor tier: the
   * Hub sees no trustworthy client IP, and a spoofable header would let a
   * caller escape this bucket by rotating it. The failure mode here is silent
   * undercounting on exactly the day a client runs a promo, so this is set well
   * above realistic local-business traffic and the ceiling is a burst guard
   * rather than a cost control — a rejected event spends nothing.
   */
  analyticsProjectFallback: {
    kind: "token bucket",
    rate: 120,
    period: MINUTE,
    capacity: 120,
  },

  /**
   * One threshold alert per project+limit name per day.
   * Keyed as `${projectId}:${limitName}`.
   */
  thresholdAlertPerProjectLimit: {
    kind: "fixed window",
    rate: 1,
    period: DAY,
  },

  /**
   * Global cap on admin-ops alert *delivery* (email/SMS).
   * Persistence always happens even when this is exhausted.
   */
  adminOpsAlertGlobal: {
    kind: "fixed window",
    rate: 20,
    period: HOUR,
  },

  // --- Unauthenticated public marketing surfaces ---
  //
  // Public audits spend Firecrawl + PageSpeed + Groq. Global keys are the
  // point — a per-session or per-host key is defeated by rotating the value.

  /** Per-host and per-minute burst guard for public audits. */
  publicAuditSubmit: { kind: "token bucket", rate: 3, period: MINUTE, capacity: 3 },

  /**
   * Hard daily ceiling on public audit spend (Firecrawl + PageSpeed + Groq).
   *
   * `publicAuditSubmit` is a token bucket, so on its own it permits ~4,300
   * audits/day sustained. Real QR-scan volume is single digits.
   */
  publicAuditGlobalDaily: {
    kind: "fixed window",
    rate: 200,
    period: DAY,
  },

  // --- Website concepts ---

  /**
   * Global ceiling on concept-open recording.
   *
   * `concepts/public.recordView` spends no money, but it is an unauthenticated
   * write reachable by anyone holding a preview token. A per-token key would not
   * hold — the token is the thing the caller controls — so the ceiling is
   * global. Real volume is a handful of opens per concept.
   */
  conceptViewGlobal: {
    kind: "fixed window",
    rate: 500,
    period: HOUR,
  },

  /**
   * Runaway guard on concept generation (OpenRouter + Firecrawl + PageSpeed).
   *
   * Generation is admin-authenticated, so this is not an abuse control — it is
   * insurance against a UI or retry bug looping regenerate. Layken produces a
   * handful of concepts a week by hand, so this is generous by two orders of
   * magnitude and should never be reached in normal use.
   */
  conceptGenerateGlobalDaily: {
    kind: "fixed window",
    rate: 100,
    period: DAY,
  },

  /**
   * Runaway guard on structured website harvesting.
   *
   * Separate from the generation ceiling because harvesting runs *before*
   * `queueGeneration` and would otherwise be unprotected: one harvest costs one
   * Firecrawl map plus up to six scrapes, and a retry loop could spend a
   * month's credits without ever reaching a paid model call. One unit is
   * reserved per harvest request, refresh included.
   */
  conceptHarvestGlobalDaily: {
    kind: "fixed window",
    rate: 60,
    period: DAY,
  },
});
