import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Lead form submissions: 5 per minute per project+IP
  leadSubmission: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  // Analytics pixel: 60 per minute per project (high volume expected)
  analyticsPixel: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 60 },
  // Audit report impressions: throttle to reduce abusive token hammering
  marketingAuditView: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
});
