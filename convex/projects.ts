import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    });

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
