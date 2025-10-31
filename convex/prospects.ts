import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { prospectValidator, prospectPublicValidator } from "./validators";

export const getProspectBySessionId = query({
  args: { sessionId: v.string() },
  returns: v.union(prospectPublicValidator, v.null()),
  handler: async (ctx, args) => {
    const prospect = await ctx.db
      .query("prospects")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!prospect) {
      return null;
    }

    // Strip myNotes from public response (admin-only field)
    const { myNotes, ...publicDetails } = prospect.details;
    return {
      ...prospect,
      details: publicDetails,
    };
  },
});

export const findLatestByEmail = query({
  args: { email: v.string() },
  returns: v.union(prospectPublicValidator, v.null()),
  handler: async (ctx, args) => {
    const queryResult = ctx.db
      .query("prospects")
      .withIndex("by_contactEmail", (q) => q.eq("details.contactEmail", args.email))
      .order("desc");
    const latestEntry = await queryResult.first();
    
    if (!latestEntry) {
      return null;
    }

    // Strip myNotes from public response (admin-only field)
    const { myNotes, ...publicDetails } = latestEntry.details;
    return {
      ...latestEntry,
      details: publicDetails,
    };
  },
});

export const isKnownEmail = query({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const prospect = await ctx.db
      .query("prospects")
      .withIndex("by_contactEmail", (q) => q.eq("details.contactEmail", args.email))
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

