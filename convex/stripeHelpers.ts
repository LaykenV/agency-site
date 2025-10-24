import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const getCustomerMappingByUser = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("billingCustomers"),
      userId: v.string(),
      stripeCustomerId: v.string(),
      email: v.optional(v.string()),
      createdAtMs: v.number(),
      _creationTime: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const writeCustomerMapping = internalMutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.object({ stripeCustomerId: v.string() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("billingCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!existing) {
      await ctx.db.insert("billingCustomers", {
        userId: args.userId,
        stripeCustomerId: args.stripeCustomerId,
        email: args.email,
        createdAtMs: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, {
        stripeCustomerId: args.stripeCustomerId,
        email: args.email ?? existing.email,
      });
    }
    return { stripeCustomerId: args.stripeCustomerId };
  },
});

export const writeSubscription = internalMutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    subscriptionId: v.string(),
    status: v.string(),
    priceId: v.string(),
    currentPeriodStartMs: v.number(),
    currentPeriodEndMs: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    paymentBrand: v.optional(v.string()),
    paymentLast4: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.subscriptionId))
      .unique();
    const doc = {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      subscriptionId: args.subscriptionId,
      status: args.status,
      priceId: args.priceId,
      currentPeriodStartMs: args.currentPeriodStartMs,
      currentPeriodEndMs: args.currentPeriodEndMs,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      paymentBrand: args.paymentBrand,
      paymentLast4: args.paymentLast4,
      updatedAtMs: Date.now(),
    } as const;
    if (!existing) {
      await ctx.db.insert("subscriptions", doc);
    } else {
      await ctx.db.patch(existing._id, doc);
    }
    return null;
  },
});

export const getCustomerByStripeId = internalQuery({
  args: { stripeCustomerId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("billingCustomers"),
      userId: v.string(),
      stripeCustomerId: v.string(),
      email: v.optional(v.string()),
      createdAtMs: v.number(),
      _creationTime: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingCustomers")
      .withIndex("by_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();
  },
});

export const getMySubscription = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("subscriptions"),
      userId: v.string(),
      stripeCustomerId: v.string(),
      subscriptionId: v.string(),
      status: v.string(),
      priceId: v.string(),
      currentPeriodStartMs: v.number(),
      currentPeriodEndMs: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      paymentBrand: v.optional(v.string()),
      paymentLast4: v.optional(v.string()),
      updatedAtMs: v.number(),
      _creationTime: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const userId = user?._id;
    if (!userId || typeof userId !== "string") return null;
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});
