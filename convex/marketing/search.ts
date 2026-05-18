import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAdmin } from "../adminGuard";
import {
  aiLeadAnalysisValidator,
  marketingSearchDocValidator,
  marketingSearchStatusValidator,
  pageSpeedDataValidator,
  physicalPresenceValidator,
  scrapedLeadDocValidator,
  scrapedLeadStatusValidator,
  websiteDataValidator,
} from "../validators";
import type { WorkflowId } from "@convex-dev/workflow";
import { workflow } from "./workflow";

const FOLLOW_UP_WINDOW_DAYS = 7;

type ScrapedLeadDoc = Doc<"scraped_leads">;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const SCRAPED_STATUSES = new Set([
  "scraped",
  "analyzing",
  "qualified",
  "disqualified",
  "contacted",
  "follow_up",
  "responded",
  "converted",
  "not_interested",
]);

const QUALIFIED_STATUSES = new Set([
  "qualified",
  "contacted",
  "follow_up",
  "responded",
  "converted",
]);

function isAdminAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "Authentication required" ||
      error.message === "Admin access required")
  );
}

async function recalculateCounters(ctx: MutationCtx, searchId: Id<"marketing_searches">) {
  const leads = await ctx.db
    .query("scraped_leads")
    .withIndex("by_searchId", (q) => q.eq("searchId", searchId))
    .collect();

  const totalFound = leads.length;
  const totalScraped = leads.filter((l) => SCRAPED_STATUSES.has(l.status)).length;
  const totalQualified = leads.filter((l) => QUALIFIED_STATUSES.has(l.status)).length;

  await ctx.db.patch(searchId, {
    totalFound,
    totalScraped,
    totalQualified,
    updatedAt: Date.now(),
  });
}

function summarizeLeadForProspect(lead: ScrapedLeadDoc): string {
  const fitScore = lead.aiAnalysis?.fitScore ?? "N/A";
  const painPoints = lead.aiAnalysis?.painPoints?.length
    ? lead.aiAnalysis.painPoints.join("; ")
    : "None captured";
  const outreachAngle = lead.aiAnalysis?.outreachAngle ?? "None captured";
  const auditLink = lead.demoToken
    ? `/audit/${lead.demoToken}`
    : "No audit generated";

  return [
    `Fit score: ${fitScore}`,
    `Pain points: ${painPoints}`,
    `Outreach angle: ${outreachAngle}`,
    `Audit link: ${auditLink}`,
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
      const workflowId = await workflow.start(
        ctx,
        internal.marketing.workflow.marketingSearchWorkflow,
        { searchId },
        {
          onComplete: internal.marketing.search.onWorkflowComplete,
          context: searchId,
        },
      );

      await ctx.db.patch(searchId, {
        workflowId: workflowId as string,
        updatedAt: Date.now(),
      });

      await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
        actor: "admin",
        kind: "marketing.search_created",
        payload: {
          searchId,
          workflowId: workflowId as string,
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
        await workflow.cancel(ctx, search.workflowId as WorkflowId);
      } catch (error) {
        console.warn("[marketing] failed to cancel workflow", {
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

export const triggerAuditEmail = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.scheduler.runAfter(0, internal.marketing.emails.sendAuditEmail, {
      leadId: args.leadId,
      recipientEmail: normalizeEmail(args.recipientEmail),
      recipientName: args.recipientName,
    });

    return null;
  },
});

export const triggerBulkAuditEmail = mutation({
  args: {
    leads: v.array(
      v.object({
        leadId: v.id("scraped_leads"),
        recipientEmail: v.string(),
        recipientName: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    scheduled: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let scheduled = 0;
    let skipped = 0;

    for (const entry of args.leads) {
      const lead = await ctx.db.get(entry.leadId);
      if (!lead || !lead.demoToken) {
        skipped++;
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.marketing.emails.sendAuditEmail, {
        leadId: entry.leadId,
        recipientEmail: normalizeEmail(entry.recipientEmail),
        recipientName: entry.recipientName,
      });

      scheduled++;
    }

    return { scheduled, skipped };
  },
});

export const triggerPortfolioEmail = mutation({
  args: {
    leadId: v.id("scraped_leads"),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.scheduler.runAfter(0, internal.marketing.emails.sendPortfolioEmail, {
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
  returns: v.array(marketingSearchDocValidator),
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
  returns: v.union(marketingSearchDocValidator, v.null()),
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
  returns: v.array(scrapedLeadDocValidator),
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
  returns: v.array(scrapedLeadDocValidator),
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
  returns: v.array(scrapedLeadDocValidator),
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
  returns: v.array(scrapedLeadDocValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const windowEnd = Date.now() + FOLLOW_UP_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("scraped_leads")
      .withIndex("by_followUpAt", (q) =>
        q.gte("followUpAt", 0).lte("followUpAt", windowEnd)
      )
      .take(500);
  },
});

export const getLeadById = query({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.union(scrapedLeadDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.leadId);
  },
});

export const getLeadByIdForCallHelp = query({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.object({
    unauthorized: v.boolean(),
    lead: v.union(scrapedLeadDocValidator, v.null()),
  }),
  handler: async (ctx, args) => {
    try {
      await requireAdmin(ctx);
    } catch (error) {
      if (!isAdminAccessError(error)) {
        throw error;
      }

      return {
        unauthorized: true,
        lead: null,
      };
    }

    return {
      unauthorized: false,
      lead: await ctx.db.get(args.leadId),
    };
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
  returns: v.union(marketingSearchDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.searchId);
  },
});

export const internalGetLeadById = internalQuery({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.union(scrapedLeadDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.leadId);
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
      types: v.optional(v.array(v.string())),
      businessStatus: v.optional(v.string()),
      pureServiceAreaBusiness: v.optional(v.boolean()),
      location: v.optional(
        v.object({
          latitude: v.number(),
          longitude: v.number(),
        })
      ),
      addressComponents: v.optional(
        v.array(
          v.object({
            longText: v.optional(v.string()),
            shortText: v.optional(v.string()),
            types: v.array(v.string()),
            languageCode: v.optional(v.string()),
          })
        )
      ),
      regularOpeningHours: v.optional(
        v.object({
          openNow: v.optional(v.boolean()),
          weekdayDescriptions: v.optional(v.array(v.string())),
        })
      ),
      currentOpeningHours: v.optional(
        v.object({
          openNow: v.optional(v.boolean()),
          weekdayDescriptions: v.optional(v.array(v.string())),
        })
      ),
      photoUrl: v.optional(v.string()),
      topReview: v.optional(
        v.object({
          author: v.string(),
          text: v.string(),
          rating: v.number(),
        })
      ),
    }),
    physicalPresence: physicalPresenceValidator,
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
      physicalPresence: args.physicalPresence,
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
    contactEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.contactEmail) {
      const lead = await ctx.db.get(args.leadId);
      if (lead && !lead.contactEmail) {
        await ctx.db.patch(args.leadId, {
          websiteData: args.websiteData,
          pageSpeedData: args.pageSpeedData,
          contactEmail: args.contactEmail,
          updatedAt: Date.now(),
        });
        return null;
      }
    }
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
    await recalculateCounters(ctx, args.searchId);
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
    await recalculateCounters(ctx, args.searchId);
    await ctx.db.patch(args.searchId, {
      status: "completed",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const onWorkflowComplete = internalMutation({
  args: {
    workflowId: v.string(),
    context: v.union(v.id("marketing_searches"), v.null()),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const searchId = args.context;
    if (!searchId) return null;

    if (args.result.kind === "success") {
      const search = await ctx.db.get(searchId);
      if (search && search.status !== "completed") {
        await recalculateCounters(ctx, searchId);
        await ctx.db.patch(searchId, {
          status: "completed",
          updatedAt: Date.now(),
        });
      }
    } else if (args.result.kind === "failed") {
      await ctx.db.patch(searchId, {
        status: "failed",
        error: args.result.error.slice(0, 1000),
        updatedAt: Date.now(),
      });
    } else if (args.result.kind === "canceled") {
      await ctx.db.patch(searchId, {
        status: "canceled",
        updatedAt: Date.now(),
      });
    }

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

    await recalculateCounters(ctx, lead.searchId);

    return null;
  },
});
