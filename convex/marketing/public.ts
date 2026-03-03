import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { rateLimiter } from "../rateLimiter";

export const getAuditData = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      businessName: v.string(),
      description: v.string(),
      phone: v.optional(v.string()),
      websiteUrl: v.optional(v.string()),
      address: v.optional(v.string()),
      rating: v.optional(v.number()),
      reviewCount: v.optional(v.number()),
      screenshotUrl: v.optional(v.string()),
      technology: v.optional(v.string()),
      isHttps: v.optional(v.boolean()),
      performanceScore: v.optional(v.number()),
      fcp: v.optional(v.number()),
      lcp: v.optional(v.number()),
      cls: v.optional(v.number()),
      painPoints: v.array(v.string()),
      sellingPoints: v.array(v.string()),
      outreachAngle: v.optional(v.string()),
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
      websiteUrl: lead.googleData.websiteUrl,
      address: lead.googleData.formattedAddress,
      rating: lead.googleData.rating,
      reviewCount: lead.googleData.reviewCount,
      screenshotUrl: lead.websiteData?.screenshotUrl,
      technology: lead.websiteData?.technology,
      isHttps: lead.websiteData?.hasHttps,
      performanceScore: lead.pageSpeedData?.performanceScore,
      fcp: lead.pageSpeedData?.fcp,
      lcp: lead.pageSpeedData?.lcp,
      cls: lead.pageSpeedData?.cls,
      painPoints: lead.aiAnalysis?.painPoints ?? [],
      sellingPoints: lead.aiAnalysis?.sellingPoints ?? [],
      outreachAngle: lead.aiAnalysis?.outreachAngle,
      review: lead.googleData.topReview,
      demoViewedAt: lead.demoViewedAt,
    };
  },
});

export const recordAuditView = mutation({
  args: {
    token: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { ok } = await rateLimiter.limit(ctx, "marketingAuditView", {
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
