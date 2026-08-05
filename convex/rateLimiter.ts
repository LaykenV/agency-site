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

  /** Analytics per trusted visitor. */
  eventsPerVisitor: {
    kind: "token bucket",
    rate: 60,
    period: MINUTE,
    capacity: 60,
  },

  /**
   * Stricter project-only analytics fallback when no trusted visitor key exists
   * (prevents a single spoofed Origin from draining a 60/min project bucket).
   */
  analyticsProjectFallback: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 30,
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

  // --- Existing surfaces (unchanged) ---

  /** @deprecated Prefer leadPerVisitor / leadNoTrustedVisitor. Kept for safety during deploy. */
  leadSubmission: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },

  /** @deprecated Prefer eventsPerVisitor / analyticsProjectFallback. */
  analyticsPixel: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 60 },

  marketingAuditView: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
  publicAuditSubmit: { kind: "token bucket", rate: 3, period: MINUTE, capacity: 3 },
});
