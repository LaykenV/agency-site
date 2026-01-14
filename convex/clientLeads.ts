import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";

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
    });
    return leadId;
  },
});

// Query: List leads for a project (for client portal)
export const listByProject = query({
  args: {
    projectId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(leadStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("client_leads"),
      projectId: v.string(),
      status: leadStatusValidator,
      source: v.string(),
      data: leadDataValidator,
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, { projectId, limit, status }) => {
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

    const leads = await ctx.db
      .query("client_leads")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(limit || 50);

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
      if (lead.createdAt >= thisMonthStart) {
        thisMonthCount++;
      } else if (lead.createdAt >= lastMonthStart && lead.createdAt < thisMonthStart) {
        lastMonthCount++;
      }
    }

    const trend =
      lastMonthCount > 0
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : 0;

    return {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      trend,
      total: leads.length,
    };
  },
});
