import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { projectStatusValidator } from "./validators";
import type { Doc, Id } from "./_generated/dataModel";

export const findOrCreateProjectForProspect = mutation({
  args: {
    authUserId: v.string(),
    prospectId: v.id("prospects"),
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    // Try to find existing project
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .filter((q) => q.eq(q.field("prospectId"), args.prospectId))
      .first();

    if (existing) {
      console.log("[projects] found existing project", {
        projectId: existing._id,
        authUserId: args.authUserId,
        prospectId: args.prospectId,
      });
      return existing._id;
    }

    const prospect = await ctx.db.get(args.prospectId);
    if (!prospect) {
      console.error("[projects] prospect not found", {
        prospectId: args.prospectId,
      });
      throw new Error("Prospect not found");
    }

    // Create new project
    const now = Date.now();
    const projectId = crypto.randomUUID();

    const newProjectId = await ctx.db.insert("projects", {
      authUserId: args.authUserId,
      projectId,
      prospectId: prospect._id,
      projectStatus: "AWAITING_AGREEMENT",
      createdAt: now,
      updatedAt: now,
    } as const);

    // Log activity
    await ctx.db.insert("activity_log", {
      projectId: newProjectId,
      prospectId: prospect._id,
      actor: "system",
      kind: "project_created",
      payload: { authUserId: args.authUserId },
      createdAt: now,
    });

    console.log("[projects] created new project", {
      projectId: newProjectId,
      authUserId: args.authUserId,
      prospectId: prospect._id,
    });

    return newProjectId;
  },
});

export const internalGetLatestProjectByAuthUser = internalQuery({
  args: { authUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      authUserId: v.string(),
      projectId: v.string(),
      prospectId: v.optional(v.id("prospects")),
      projectStatus: v.optional(projectStatusValidator),
      _creationTime: v.number(),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const projectQuery = ctx.db
      .query("projects")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .order("desc");

    return await findPrimaryProject(projectQuery);
  },
});

export const getPortalProject = query({
  args: {
    projectId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      projectId: v.string(),
      projectStatus: v.optional(projectStatusValidator),
      prospectId: v.optional(v.id("prospects")),
      authUserId: v.string(),
      _creationTime: v.number(),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return null;
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (index) => index.eq("projectId", args.projectId))
      .first();

    if (!project) {
      return null;
    }

    if (project.authUserId !== user._id) {
      return null;
    }

    return {
      _id: project._id,
      projectId: project.projectId,
      projectStatus: project.projectStatus,
      prospectId: project.prospectId,
      authUserId: project.authUserId,
      _creationTime: project._creationTime,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    } as const;
  },
});

export const internalSetStatusIfEligible = internalMutation({
  args: {
    projectId: v.id("projects"),
    status: projectStatusValidator,
    expectedCurrentStatus: v.optional(projectStatusValidator),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return false;
    }
    if (args.expectedCurrentStatus && project.projectStatus !== args.expectedCurrentStatus) {
      return false;
    }
    await ctx.db.patch(args.projectId, {
      projectStatus: args.status,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("activity_log", {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "system",
      kind: "project_status_updated",
      payload: {
        status: args.status,
      },
      createdAt: Date.now(),
    });
    return true;
  },
});

const findPrimaryProject = async (
  projects: AsyncIterable<Doc<"projects">>,
): Promise<Doc<"projects"> | null> => {
  let fallback: Doc<"projects"> | null = null;
  for await (const project of projects) {
    if (!fallback) {
      fallback = project;
    }
    if (project.projectStatus !== "ARCHIVED") {
      return project;
    }
  }
  return fallback;
};
