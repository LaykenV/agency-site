import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import {
  triageVerdictValidator,
  triageObjectValidator,
} from "./validators";

// Lead status validator for reuse
const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("won"),
  v.literal("lost")
);

// Lead data validator
const leadDataValidator = v.object({
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  message: v.optional(v.string()),
});

// Internal: Create a new lead (called from HTTP action)
export const create = internalMutation({
  args: {
    projectId: v.string(),
    source: v.string(),
    data: leadDataValidator,
  },
  returns: v.id("client_leads"),
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert("client_leads", {
      projectId: args.projectId,
      status: "new",
      source: args.source,
      data: args.data,
      createdAt: Date.now(),
      triageVerdict: "untriaged" as const,
    });
    return leadId;
  },
});

// Internal: Get a lead by its ID (used by triage action)
export const getLeadById = internalQuery({
  args: { leadId: v.id("client_leads") },
  returns: v.union(
    v.object({
      _id: v.id("client_leads"),
      _creationTime: v.number(),
      projectId: v.string(),
      status: leadStatusValidator,
      source: v.string(),
      data: leadDataValidator,
      createdAt: v.number(),
      triageVerdict: v.optional(triageVerdictValidator),
      triage: v.optional(triageObjectValidator),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    return lead ?? null;
  },
});

// Internal: Apply AI triage result to a lead
export const applyTriage = internalMutation({
  args: {
    leadId: v.id("client_leads"),
    triageVerdict: v.union(v.literal("allow"), v.literal("spam"), v.literal("review")),
    triage: triageObjectValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) {
      console.warn("[clientLeads.applyTriage] Lead not found", { leadId: args.leadId });
      return null;
    }

    // Idempotent: don't overwrite if already triaged
    if (lead.triageVerdict && lead.triageVerdict !== "untriaged") {
      return null;
    }

    await ctx.db.patch(args.leadId, {
      triageVerdict: args.triageVerdict,
      triage: args.triage,
    });
    return null;
  },
});

// Public mutation: Mark a spam lead as "not spam" (client override)
export const markNotSpam = mutation({
  args: {
    projectId: v.string(),
    leadId: v.id("client_leads"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify user owns this project
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      throw new Error("Unauthorized");
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!project || project.authUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.projectId !== args.projectId) {
      throw new Error("Lead not found");
    }

    // Preserve original triage data, add override metadata
    const updatedTriage = lead.triage
      ? {
          ...lead.triage,
          overriddenBy: "client" as const,
          overriddenAt: Date.now(),
          overrideReason: args.reason ?? "client_marked_not_spam",
        }
      : undefined;

    await ctx.db.patch(args.leadId, {
      triageVerdict: "allow" as const,
      ...(updatedTriage ? { triage: updatedTriage } : {}),
    });

    return null;
  },
});

// Query: List leads for a project (for client portal)
export const listByProject = query({
  args: {
    projectId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(leadStatusValidator),
    triageVerdict: v.optional(triageVerdictValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("client_leads"),
      _creationTime: v.number(),
      projectId: v.string(),
      status: leadStatusValidator,
      source: v.string(),
      data: leadDataValidator,
      createdAt: v.number(),
      triageVerdict: v.optional(triageVerdictValidator),
      triage: v.optional(triageObjectValidator),
    })
  ),
  handler: async (ctx, { projectId, limit, status, triageVerdict }) => {
    // Verify user owns this project
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) return [];

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();

    if (!project || project.authUserId !== user._id) {
      return [];
    }

    let leads;
    if (triageVerdict) {
      // Use the triage-specific index for filtered queries
      leads = await ctx.db
        .query("client_leads")
        .withIndex("by_projectId_and_triageVerdict", (q) =>
          q.eq("projectId", projectId).eq("triageVerdict", triageVerdict)
        )
        .order("desc")
        .take(limit || 50);
    } else {
      leads = await ctx.db
        .query("client_leads")
        .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
        .order("desc")
        .take(limit || 50);
    }

    // Filter by status if provided
    const filtered = status ? leads.filter((l) => l.status === status) : leads;

    return filtered;
  },
});

// Query: Get leads summary with this month vs last month comparison
export const getLeadsSummary = query({
  args: { projectId: v.string() },
  returns: v.object({
    thisMonth: v.number(),
    lastMonth: v.number(),
    trend: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, { projectId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return { thisMonth: 0, lastMonth: 0, trend: 0, total: 0 };
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();

    if (!project || project.authUserId !== user._id) {
      return { thisMonth: 0, lastMonth: 0, trend: 0, total: 0 };
    }

    const leads = await ctx.db
      .query("client_leads")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .collect();

    // Calculate date boundaries
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    let thisMonthCount = 0;
    let lastMonthCount = 0;

    for (const lead of leads) {
      // Exclude spam leads from counts
      if (lead.triageVerdict === "spam") continue;

      if (lead.createdAt >= thisMonthStart) {
        thisMonthCount++;
      } else if (lead.createdAt >= lastMonthStart && lead.createdAt < thisMonthStart) {
        lastMonthCount++;
      }
    }

    // Total excludes spam
    const total = leads.filter((l) => l.triageVerdict !== "spam").length;

    const trend =
      lastMonthCount > 0
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : 0;

    return {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      trend,
      total,
    };
  },
});
