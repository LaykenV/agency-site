import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { prospectValidator, prospectPublicValidator } from "./validators";
import { authComponent } from "./auth";

/**
 * Project a prospect document onto the browser-safe shape.
 *
 * Explicit field selection rather than a spread: `resumeToken` authorizes
 * onboarding session writes, so a spread that silently picks up new secret-ish
 * fields is exactly the failure this projection exists to prevent.
 */
function toPublicProspect(prospect: Doc<"prospects">) {
  const { myNotes, ...publicDetails } = prospect.details;
  return {
    _id: prospect._id,
    _creationTime: prospect._creationTime,
    sessionId: prospect.sessionId,
    details: publicDetails,
    aiGeneratedPlan: prospect.aiGeneratedPlan,
    calProspectBooking: prospect.calProspectBooking,
    lastPlanRequestedAt: prospect.lastPlanRequestedAt,
    planGenerationInProgress: prospect.planGenerationInProgress,
    createdAt: prospect.createdAt,
    updatedAt: prospect.updatedAt,
  };
}

export const getProspectBySessionId = query({
  args: { sessionId: v.string() },
  returns: v.union(prospectPublicValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const userEmail = user?.email?.trim().toLowerCase();
    if (!userEmail) return null;

    const prospect = await ctx.db
      .query("prospects")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (
      !prospect ||
      prospect.details.contactEmail.trim().toLowerCase() !== userEmail
    ) {
      return null;
    }

    return toPublicProspect(prospect);
  },
});

/**
 * Internal only. An email address is not a secret, so a public version of this
 * is an unauthenticated lookup that discloses a prospect's name, phone,
 * business description, and AI plan to anyone who knows their address.
 * The sole caller is `auth.getPortalDecision`, which runs server-side after
 * resolving the signed-in user.
 */
export const findLatestByEmail = internalQuery({
  args: { email: v.string() },
  returns: v.union(prospectPublicValidator, v.null()),
  handler: async (ctx, args) => {
    const latestEntry = await ctx.db
      .query("prospects")
      .withIndex("by_contactEmail", (q) =>
        q.eq("details.contactEmail", args.email),
      )
      .order("desc")
      .first();

    if (!latestEntry) {
      return null;
    }

    return toPublicProspect(latestEntry);
  },
});

export const isKnownEmail = query({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const prospect = await ctx.db
      .query("prospects")
      .withIndex("by_contactEmail", (q) =>
        q.eq("details.contactEmail", args.email),
      )
      .first();
    if (prospect) {
      return true;
    }

    const billingCustomer = await ctx.db
      .query("billingCustomers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return billingCustomer !== null;
  },
});

export const internalGetProspectById = internalQuery({
  args: { prospectId: v.id("prospects") },
  returns: v.union(prospectValidator, v.null()),
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.prospectId);
    return prospect ?? null;
  },
});
