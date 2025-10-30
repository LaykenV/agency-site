import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { prospectValidator, prospectDetailsValidator, projectStatusValidator, deploymentValidator, scheduledCallValidator } from "./validators";
import { requireAdmin } from "./adminGuard";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const getProspects = query({
  args: {},
  returns: v.array(prospectValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("prospects").collect();
  },
});

export const listProspects = query({
  args: {},
  returns: v.array(prospectValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("prospects")
      .withIndex("by_updatedAt", (q) => q.gte("updatedAt", 0))
      .order("desc")
      .collect();
  },
});

export const listProjects = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("projects"),
    projectId: v.string(),
    authUserId: v.string(),
    prospectId: v.optional(v.id("prospects")),
    projectStatus: v.optional(projectStatusValidator),
    buildDetails: v.optional(v.object({
      headline: v.union(v.string(), v.null()),
      brandAssetsUploaded: v.boolean(),
    })),
    deployment: v.optional(deploymentValidator),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_updatedAt", (q) => q.gte("updatedAt", 0))
      .order("desc")
      .collect();
    
    return projects.map(p => ({
      _id: p._id,
      projectId: p.projectId,
      authUserId: p.authUserId,
      prospectId: p.prospectId,
      projectStatus: p.projectStatus,
      buildDetails: p.buildDetails ? {
        headline: p.buildDetails.headline,
        brandAssetsUploaded: p.buildDetails.brandAssetsUploaded,
      } : undefined,
      deployment: p.deployment,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

export const listScheduledCalls = query({
  args: {
    type: v.optional(v.union(
      v.literal("confirmation"),
      v.literal("kickoff"),
      v.literal("review"),
      v.literal("support"),
    )),
    projectId: v.optional(v.id("projects")),
    prospectId: v.optional(v.id("prospects")),
    startAfter: v.optional(v.number()),
    startBefore: v.optional(v.number()),
  },
  returns: v.array(scheduledCallValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let queryBuilder;
    
    if (args.projectId) {
      queryBuilder = ctx.db
        .query("scheduled_calls")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId));
    } else if (args.prospectId) {
      queryBuilder = ctx.db
        .query("scheduled_calls")
        .withIndex("by_prospectId", (q) => q.eq("prospectId", args.prospectId));
    } else {
      queryBuilder = ctx.db
        .query("scheduled_calls")
        .withIndex("by_startTime", (q) => q.gte("startTime", 0));
    }
    
    const calls = await queryBuilder.order("desc").collect();
    
    let filtered = calls;
    if (args.type) {
      filtered = filtered.filter(c => c.type === args.type);
    }
    if (args.startAfter) {
      filtered = filtered.filter(c => c.startTime >= args.startAfter!);
    }
    if (args.startBefore) {
      filtered = filtered.filter(c => c.startTime <= args.startBefore!);
    }
    
    return filtered;
  },
});

export const listEditRequests = query({
  args: {
    status: v.optional(v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_on_client"),
      v.literal("resolved"),
      v.literal("closed")
    )),
  },
  returns: v.array(v.object({
    _id: v.id("edit_requests"),
    projectId: v.id("projects"),
    authUserId: v.string(),
    title: v.string(),
    details: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_on_client"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    let queryBuilder;
    
    if (args.status) {
      queryBuilder = ctx.db
        .query("edit_requests")
        .withIndex("by_status", (q) => q.eq("status", args.status!));
    } else {
      queryBuilder = ctx.db.query("edit_requests");
    }
    
    const requests = await queryBuilder.order("desc").collect();
    
    // Default filter: show open, in_progress, waiting_on_client if no status specified
    if (!args.status) {
      return requests.filter(r => 
        r.status === "open" || 
        r.status === "in_progress" || 
        r.status === "waiting_on_client"
      );
    }
    
    return requests;
  },
});

export const createProspect = mutation({
  args: {
    details: prospectDetailsValidator,
  },
  returns: v.id("prospects"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const resumeToken = crypto.randomUUID();

    const prospectId = await ctx.db.insert("prospects", {
      sessionId,
      resumeToken,
      details: args.details,
      aiGeneratedPlan: undefined,
      lastPlanRequestedAt: undefined,
      planGenerationInProgress: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log("[admin] prospect created", { prospectId, sessionId });

    return prospectId;
  },
});

export const updateProspectDetails = mutation({
  args: {
    prospectId: v.id("prospects"),
    details: prospectDetailsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const prospect = await ctx.db.get(args.prospectId);

    if (!prospect) {
      throw new Error("Prospect not found");
    }

    await ctx.db.patch(args.prospectId, {
      details: args.details,
      updatedAt: Date.now(),
    });

    console.log("[admin] prospect updated", { prospectId: args.prospectId });

    return null;
  },
});

export const logMagicLinkSent = mutation({
  args: {
    prospectId: v.id("prospects"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.insert("activity_log", {
      prospectId: args.prospectId,
      actor: "admin",
      kind: "magic_link_sent",
      payload: { email: args.email },
      createdAt: Date.now(),
    });

    console.log("[admin] logged magic link sent", {
      prospectId: args.prospectId,
      email: args.email,
    });

    return null;
  },
});

export const updateProjectStatus = mutation({
  args: {
    projectId: v.id("projects"),
    status: projectStatusValidator,
    expectedCurrentStatus: v.optional(projectStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    
    if (args.expectedCurrentStatus && project.projectStatus !== args.expectedCurrentStatus) {
      throw new Error(`Project status mismatch. Expected ${args.expectedCurrentStatus}, got ${project.projectStatus}`);
    }
    
    const fromStatus = project.projectStatus ?? null;
    const now = Date.now();
    
    await ctx.db.patch(args.projectId, {
      projectStatus: args.status,
      updatedAt: now,
    });
    
    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "admin",
      kind: "project.status_updated",
      payload: { from: fromStatus, to: args.status },
    });
    
    console.log("[admin] project status updated", {
      projectId: args.projectId,
      from: fromStatus,
      to: args.status,
    });
    
    return null;
  },
});

export const updateProjectMyNotes = mutation({
  args: {
    projectId: v.id("projects"),
    myNotes: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    
    // Normalize and validate notes
    const normalizedNotes = args.myNotes ? args.myNotes.trim().slice(0, 8000) : null;
    
    const now = Date.now();
    const existingBuildDetails = project.buildDetails;
    
    // Properly merge buildDetails with required fields
    const updatedBuildDetails = existingBuildDetails ? {
      headline: existingBuildDetails.headline,
      domainPreference: existingBuildDetails.domainPreference,
      inspirationLinks: existingBuildDetails.inspirationLinks,
      myNotes: normalizedNotes,
      brand: existingBuildDetails.brand,
      brandAssetsUploaded: existingBuildDetails.brandAssetsUploaded,
    } : {
      headline: null,
      domainPreference: null,
      inspirationLinks: [],
      myNotes: normalizedNotes,
      brand: {
        colorScheme: { primary: "#111827", accent: "#6EE7B7" },
      },
      brandAssetsUploaded: false,
    };
    
    await ctx.db.patch(args.projectId, {
      buildDetails: updatedBuildDetails,
      updatedAt: now,
    });
    
    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "admin",
      kind: "build.admin_notes_updated",
      payload: { projectId: args.projectId },
    });
    
    console.log("[admin] project myNotes updated", {
      projectId: args.projectId,
    });
    
    return null;
  },
});

export const updateDeployment = mutation({
  args: {
    projectId: v.id("projects"),
    liveUrl: v.optional(v.string()),
    stagingUrl: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    
    // Normalize URLs
    const normalizeUrl = (url: string | undefined) => {
      if (!url) return undefined;
      const trimmed = url.trim();
      return trimmed || undefined;
    };
    
    const now = Date.now();
    const existingDeployment = project.deployment ?? {};
    
    const updatedDeployment = {
      liveUrl: args.liveUrl !== undefined ? normalizeUrl(args.liveUrl) : existingDeployment.liveUrl,
      stagingUrl: args.stagingUrl !== undefined ? normalizeUrl(args.stagingUrl) : existingDeployment.stagingUrl,
      vercelProjectId: args.vercelProjectId !== undefined ? normalizeUrl(args.vercelProjectId) : existingDeployment.vercelProjectId,
    };
    
    await ctx.db.patch(args.projectId, {
      deployment: updatedDeployment,
      updatedAt: now,
    } as const);
    
    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "admin",
      kind: "project.deployment_updated",
      payload: {
        liveUrl: updatedDeployment.liveUrl,
        stagingUrl: updatedDeployment.stagingUrl,
        vercelProjectId: updatedDeployment.vercelProjectId,
      },
    });
    
    console.log("[admin] project deployment updated", {
      projectId: args.projectId,
      deployment: updatedDeployment,
    });
    
    return null;
  },
});

export const updateEditRequestStatus = mutation({
  args: {
    requestId: v.id("edit_requests"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_on_client"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Edit request not found");
    }
    
    const fromStatus = request.status;
    const now = Date.now();
    
    const updateData: {
      status: typeof args.status;
      priority?: typeof args.priority;
      updatedAt: number;
    } = {
      status: args.status,
      updatedAt: now,
    };
    
    if (args.priority !== undefined) {
      updateData.priority = args.priority;
    }
    
    await ctx.db.patch(args.requestId, updateData);
    
    const project = await ctx.db.get(request.projectId);
    
    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      projectId: request.projectId,
      prospectId: project?.prospectId,
      actor: "admin",
      kind: "ticket.status_updated",
      payload: {
        requestId: args.requestId,
        from: fromStatus,
        to: args.status,
        priority: args.priority,
      },
    });
    
    console.log("[admin] edit request status updated", {
      requestId: args.requestId,
      from: fromStatus,
      to: args.status,
      priority: args.priority,
    });
    
    return null;
  },
});
