import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { rateLimiter } from "../rateLimiter";

export const getDemoData = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      businessName: v.string(),
      description: v.string(),
      phone: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      review: v.optional(
        v.object({
          author: v.string(),
          text: v.string(),
          rating: v.number(),
        })
      ),
      demoViewedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("scraped_leads")
      .withIndex("by_demoToken", (q) => q.eq("demoToken", args.token))
      .first();

    if (!lead) {
      return null;
    }

    return {
      businessName: lead.googleData.businessName,
      description:
        lead.aiAnalysis?.businessDescription ??
        `${lead.googleData.businessName} can benefit from a modern, high-converting website refresh.`,
      phone: lead.googleData.phone,
      primaryColor: lead.websiteData?.primaryColor,
      imageUrl: lead.googleData.photoUrl ?? lead.websiteData?.heroImageUrl,
      review: lead.googleData.topReview,
      demoViewedAt: lead.demoViewedAt,
    };
  },
});

export const recordDemoView = mutation({
  args: {
    token: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { ok } = await rateLimiter.limit(ctx, "marketingDemoView", {
      key: args.token,
    });

    if (!ok) {
      return null;
    }

    const lead = await ctx.db
      .query("scraped_leads")
      .withIndex("by_demoToken", (q) => q.eq("demoToken", args.token))
      .first();

    if (!lead || lead.demoViewedAt) {
      return null;
    }

    await ctx.db.patch(lead._id, {
      demoViewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});
