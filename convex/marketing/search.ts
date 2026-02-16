import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAdmin } from "../adminGuard";
import {
  aiLeadAnalysisValidator,
  marketingSearchStatusValidator,
  pageSpeedDataValidator,
  scrapedLeadStatusValidator,
  websiteDataValidator,
} from "../validators";

const FOLLOW_UP_WINDOW_DAYS = 7;

type ScrapedLeadDoc = Doc<"scraped_leads">;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function summarizeLeadForProspect(lead: ScrapedLeadDoc): string {
  const fitScore = lead.aiAnalysis?.fitScore ?? "N/A";
  const painPoints = lead.aiAnalysis?.painPoints?.length
    ? lead.aiAnalysis.painPoints.join("; ")
    : "None captured";
  const outreachAngle = lead.aiAnalysis?.outreachAngle ?? "None captured";
  const demoLink = lead.demoToken
    ? `${process.env.SITE_URL ?? "http://localhost:3000"}/demo/${lead.demoToken}`
    : "No demo generated";

  return [
    `Fit score: ${fitScore}`,
    `Pain points: ${painPoints}`,
    `Outreach angle: ${outreachAngle}`,
    `Demo link: ${demoLink}`,
  ].join("\n");
}

export const createSearch = mutation({
  args: {
    city: v.string(),
    state: v.string(),
    industry: v.string(),
  },
  returns: v.id("marketing_searches"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const city = args.city.trim();
    const state = args.state.trim();
    const industry = args.industry.trim();
    const searchQuery = `${industry} in ${city}, ${state}`;

    const searchId = await ctx.db.insert("marketing_searches", {
      city,
      state,
      industry,
      searchQuery,
      status: "searching",
      totalFound: 0,
      totalScraped: 0,
      totalQualified: 0,
      createdAt: now,
      updatedAt: now,
    });

    try {
      const workflowId = await ctx.scheduler.runAfter(
        0,
        internal.marketing.workflow.runMarketingSearchWorkflow,
        { searchId }
      );

      await ctx.db.patch(searchId, {
        workflowId: String(workflowId),
        updatedAt: Date.now(),
      });

      await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
        actor: "admin",
        kind: "marketing.search_created",
        payload: {
          searchId,
          workflowId: String(workflowId),
          query: searchQuery,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow start failed";
      await ctx.db.patch(searchId, {
        status: "failed",
        error: message,
        updatedAt: Date.now(),
      });
      throw error;
    }

    return searchId;
  },
});

export const cancelSearch = mutation({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const search = await ctx.db.get(args.searchId);
    if (!search) {
      throw new Error("Search not found");
    }

    if (search.workflowId) {
      try {
        await ctx.scheduler.cancel(search.workflowId as Id<"_scheduled_functions">);
      } catch (error) {
        console.warn("[marketing] failed to cancel scheduled workflow", {
          workflowId: search.workflowId,
          error,
        });
      }
    }

    await ctx.db.patch(args.searchId, {
      status: "canceled",
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      kind: "marketing.search_canceled",
      payload: { searchId: args.searchId },
    });

    return null;
  },
});

export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    status: scrapedLeadStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await ctx.db.patch(args.leadId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.marketing.search.internalRecalculateSearchCounters, {
      searchId: lead.searchId,
    });

    return null;
  },
});

export const updateLeadNotes = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    adminNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.leadId, {
      adminNotes: args.adminNotes,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateLeadContactEmail = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    contactEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.leadId, {
      contactEmail: normalizeEmail(args.contactEmail),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setFollowUp = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    followUpAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await ctx.db.patch(args.leadId, {
      followUpAt: args.followUpAt,
      status: "follow_up",
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.marketing.search.internalRecalculateSearchCounters, {
      searchId: lead.searchId,
    });

    return null;
  },
});

export const markCalled = mutation({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    await ctx.db.patch(args.leadId, {
      calledAt: Date.now(),
      status: "contacted",
      contactAttempts: (lead.contactAttempts ?? 0) + 1,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.marketing.search.internalRecalculateSearchCounters, {
      searchId: lead.searchId,
    });

    return null;
  },
});

export const triggerMockupEmail = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.scheduler.runAfter(0, internal.marketing.emails.sendMockupEmail, {
      leadId: args.leadId,
      recipientEmail: normalizeEmail(args.recipientEmail),
      recipientName: args.recipientName,
    });

    return null;
  },
});

export const triggerFollowUpEmail = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    recipientEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.scheduler.runAfter(0, internal.marketing.emails.sendFollowUpEmail, {
      leadId: args.leadId,
      recipientEmail: normalizeEmail(args.recipientEmail),
    });

    return null;
  },
});

export const convertToProspect = mutation({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.id("prospects"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    if (lead.convertedToProspectId || lead.status === "converted") {
      throw new Error("Lead already converted");
    }

    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomUUID();

    const prospectId = await ctx.db.insert("prospects", {
      sessionId,
      resumeToken,
      details: {
        contactName: "",
        contactEmail: lead.contactEmail ?? "",
        companyName: lead.googleData.businessName,
        phone: lead.googleData.phone ?? "",
        currentWebsite: lead.googleData.websiteUrl ?? "",
        businessDescription:
          lead.aiAnalysis?.businessDescription ?? lead.googleData.primaryType ?? "",
        prospectNotes: summarizeLeadForProspect(lead),
        myNotes: lead.adminNotes,
      },
      aiGeneratedPlan: undefined,
      lastPlanRequestedAt: undefined,
      planGenerationInProgress: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.leadId, {
      status: "converted",
      convertedToProspectId: prospectId,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      actor: "admin",
      prospectId,
      kind: "marketing.lead_converted",
      payload: {
        leadId: args.leadId,
        businessName: lead.googleData.businessName,
      },
    });

    await ctx.scheduler.runAfter(0, internal.marketing.search.internalRecalculateSearchCounters, {
      searchId: lead.searchId,
    });

    return prospectId;
  },
});

export const listSearches = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 25, 100);

    return await ctx.db
      .query("marketing_searches")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
      .order("desc")
      .take(limit);
  },
});

export const getSearchById = query({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.searchId);
  },
});

export const getLeadsBySearch = query({
  args: {
    searchId: v.id("marketing_searches"),
    status: v.optional(scrapedLeadStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 100, 500);

    if (args.status) {
      return await ctx.db
        .query("scraped_leads")
        .withIndex("by_searchId_and_status", (q) =>
          q.eq("searchId", args.searchId).eq("status", args.status!)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("scraped_leads")
      .withIndex("by_searchId", (q) => q.eq("searchId", args.searchId))
      .order("desc")
      .take(limit);
  },
});

export const listLeads = query({
  args: {
    status: v.optional(scrapedLeadStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const limit = Math.min(args.limit ?? 100, 500);

    if (args.status) {
      return await ctx.db
        .query("scraped_leads")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("scraped_leads")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
      .order("desc")
      .take(limit);
  },
});

export const listQualifiedLeads = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return await ctx.db
      .query("scraped_leads")
      .withIndex("by_status", (q) => q.eq("status", "qualified"))
      .order("desc")
      .take(Math.min(args.limit ?? 100, 500));
  },
});

export const listFollowUps = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const windowEnd = Date.now() + FOLLOW_UP_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const candidates = await ctx.db
      .query("scraped_leads")
      .withIndex("by_followUpAt", (q) => q.gte("followUpAt", 0))
      .collect();

    return candidates
      .filter((lead) => typeof lead.followUpAt === "number" && lead.followUpAt <= windowEnd)
      .sort((a, b) => (a.followUpAt ?? 0) - (b.followUpAt ?? 0));
  },
});

export const getLeadById = query({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.leadId);
  },
});

export const getQualifiedLeadIds = query({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.array(v.id("scraped_leads")),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const leads = await ctx.db
      .query("scraped_leads")
      .withIndex("by_searchId_and_status", (q) =>
        q.eq("searchId", args.searchId).eq("status", "qualified")
      )
      .collect();

    return leads.map((lead) => lead._id);
  },
});

export const internalGetSearch = internalQuery({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.searchId);
  },
});

export const internalGetLeadById = internalQuery({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leadId);
  },
});

export const internalGetLeadByDemoToken = internalQuery({
  args: {
    token: v.string(),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scraped_leads")
      .withIndex("by_demoToken", (q) => q.eq("demoToken", args.token))
      .first();
  },
});

export const internalGetQualifiedLeadIds = internalQuery({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.array(v.id("scraped_leads")),
  handler: async (ctx, args) => {
    const qualified = await ctx.db
      .query("scraped_leads")
      .withIndex("by_searchId_and_status", (q) =>
        q.eq("searchId", args.searchId).eq("status", "qualified")
      )
      .collect();

    return qualified.map((lead) => lead._id);
  },
});

export const internalInsertLead = internalMutation({
  args: {
    searchId: v.id("marketing_searches"),
    placeId: v.string(),
    googleData: v.object({
      businessName: v.string(),
      formattedAddress: v.string(),
      phone: v.optional(v.string()),
      websiteUrl: v.optional(v.string()),
      rating: v.optional(v.number()),
      reviewCount: v.optional(v.number()),
      googleMapsUrl: v.optional(v.string()),
      primaryType: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
      topReview: v.optional(
        v.object({
          author: v.string(),
          text: v.string(),
          rating: v.number(),
        })
      ),
    }),
  },
  returns: v.union(v.id("scraped_leads"), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scraped_leads")
      .withIndex("by_searchId_and_placeId", (q) =>
        q.eq("searchId", args.searchId).eq("placeId", args.placeId)
      )
      .first();

    if (existing) {
      return null;
    }

    const now = Date.now();
    return await ctx.db.insert("scraped_leads", {
      searchId: args.searchId,
      placeId: args.placeId,
      googleData: args.googleData,
      status: "new",
      contactAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const internalUpdateLeadStatus = internalMutation({
  args: {
    leadId: v.id("scraped_leads"),
    status: scrapedLeadStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const internalUpdateLeadWebsiteData = internalMutation({
  args: {
    leadId: v.id("scraped_leads"),
    websiteData: websiteDataValidator,
    pageSpeedData: v.optional(pageSpeedDataValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      websiteData: args.websiteData,
      pageSpeedData: args.pageSpeedData,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const internalUpdateLeadAiAnalysis = internalMutation({
  args: {
    leadId: v.id("scraped_leads"),
    aiAnalysis: aiLeadAnalysisValidator,
    status: scrapedLeadStatusValidator,
    demoToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      aiAnalysis: args.aiAnalysis,
      status: args.status,
      demoToken: args.demoToken,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const internalUpdateLeadDemoScreenshot = internalMutation({
  args: {
    leadId: v.id("scraped_leads"),
    demoScreenshotUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      demoScreenshotUrl: args.demoScreenshotUrl,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const internalUpdateSearchCounters = internalMutation({
  args: {
    searchId: v.id("marketing_searches"),
    totalFound: v.optional(v.number()),
    totalScraped: v.optional(v.number()),
    totalQualified: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: {
      totalFound?: number;
      totalScraped?: number;
      totalQualified?: number;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (typeof args.totalFound === "number") patch.totalFound = args.totalFound;
    if (typeof args.totalScraped === "number") patch.totalScraped = args.totalScraped;
    if (typeof args.totalQualified === "number") patch.totalQualified = args.totalQualified;

    await ctx.db.patch(args.searchId, patch);
    return null;
  },
});

export const internalRecalculateSearchCounters = internalMutation({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("scraped_leads")
      .withIndex("by_searchId", (q) => q.eq("searchId", args.searchId))
      .collect();

    const totalFound = leads.length;
    const totalScraped = leads.filter((lead) =>
      [
        "scraped",
        "analyzing",
        "qualified",
        "disqualified",
        "contacted",
        "follow_up",
        "responded",
        "converted",
        "not_interested",
      ].includes(lead.status)
    ).length;
    const totalQualified = leads.filter((lead) =>
      ["qualified", "contacted", "follow_up", "responded", "converted"].includes(
        lead.status
      )
    ).length;

    await ctx.db.patch(args.searchId, {
      totalFound,
      totalScraped,
      totalQualified,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const markLeadError = internalMutation({
  args: {
    leadId: v.id("scraped_leads"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      status: "error",
      error: args.error.slice(0, 1000),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateSearchStatus = internalMutation({
  args: {
    searchId: v.id("marketing_searches"),
    status: marketingSearchStatusValidator,
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.searchId, {
      status: args.status,
      error: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const completeSearch = internalMutation({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
      searchId: args.searchId,
    });

    await ctx.db.patch(args.searchId, {
      status: "completed",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const internalMarkEmailSent = internalMutation({
  args: {
    leadId: v.id("scraped_leads"),
    followUpAt: v.optional(v.number()),
    isFollowUp: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      return null;
    }

    await ctx.db.patch(args.leadId, {
      emailSentAt: Date.now(),
      followUpAt: args.followUpAt,
      status: args.isFollowUp ? "follow_up" : "contacted",
      contactAttempts: (lead.contactAttempts ?? 0) + 1,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
      searchId: lead.searchId,
    });

    return null;
  },
});

export const internalMarkDemoViewed = internalMutation({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.demoViewedAt) {
      return null;
    }

    await ctx.db.patch(args.leadId, {
      demoViewedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});
