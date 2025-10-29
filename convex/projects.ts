import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { projectStatusValidator, buildDetailsValidator, deploymentValidator, calBookingValidator } from "./validators";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

export const findOrCreateProjectForProspect = mutation({
  args: {
    prospectId: v.id("prospects"),
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    const authedUser = await authComponent.getAuthUser(ctx);
    if (!authedUser?._id) {
      console.warn("[projects] findOrCreateProjectForProspect unauthenticated call");
      throw new Error("Authentication required");
    }

    const authUserId = authedUser._id;

    const prospect = await ctx.db.get(args.prospectId);
    if (!prospect) {
      console.error("[projects] prospect not found", {
        prospectId: args.prospectId,
        authUserId,
      });
      throw new Error("Prospect not found");
    }

    const normalizedUserEmail = (authedUser.email ?? "").trim().toLowerCase();
    const normalizedProspectEmail = prospect.details.contactEmail.trim().toLowerCase();

    if (!normalizedUserEmail || normalizedUserEmail !== normalizedProspectEmail) {
      console.warn("[projects] prospect email mismatch", {
        authUserId,
        userEmail: authedUser.email,
        prospectEmail: prospect.details.contactEmail,
        prospectId: args.prospectId,
      });
      throw new Error("Prospect does not belong to this account");
    }

    let existing: Doc<"projects"> | null = null;
    for await (const project of ctx.db
      .query("projects")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))) {
      if (project.prospectId && project.prospectId === args.prospectId) {
        existing = project;
        break;
      }
    }

    if (existing) {
      console.log("[projects] found existing project", {
        projectId: existing._id,
        authUserId,
        prospectId: args.prospectId,
      });
      return existing._id;
    }

    const now = Date.now();
    const projectId = crypto.randomUUID();

    const newProjectId = await ctx.db.insert("projects", {
      authUserId,
      projectId,
      prospectId: prospect._id,
      projectStatus: "AWAITING_AGREEMENT",
      createdAt: now,
      updatedAt: now,
    } as const);

    await ctx.db.insert("activity_log", {
      projectId: newProjectId,
      prospectId: prospect._id,
      actor: "system",
      kind: "project_created",
      payload: { authUserId },
      createdAt: now,
    });

    console.log("[projects] created new project", {
      projectId: newProjectId,
      authUserId,
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

    const project = await findPrimaryProject(projectQuery);
    
    if (!project) {
      return null;
    }

    // Return only the fields specified in the validator
    return {
      _id: project._id,
      authUserId: project.authUserId,
      projectId: project.projectId,
      prospectId: project.prospectId,
      projectStatus: project.projectStatus,
      _creationTime: project._creationTime,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },
});

export const internalGetProjectById = internalQuery({
  args: { projectId: v.id("projects") },
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
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }
    return {
      _id: project._id,
      authUserId: project.authUserId,
      projectId: project.projectId,
      prospectId: project.prospectId,
      projectStatus: project.projectStatus,
      _creationTime: project._creationTime,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
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
      buildDetails: v.optional(v.object({
        headline: v.union(v.string(), v.null()),
        domainPreference: v.union(v.string(), v.null()),
        inspirationLinks: v.array(v.string()),
        brand: v.object({
          colorScheme: v.object({
            primary: v.string(),
            accent: v.string(),
          }),
          logoStorageId: v.optional(v.id("_storage")),
          imageStorageIds: v.optional(v.array(v.id("_storage"))),
        }),
        brandAssetsUploaded: v.boolean(),
      })),
      deployment: v.optional(deploymentValidator),
      calKickoffBooking: v.optional(calBookingValidator),
      calReviewBooking: v.optional(calBookingValidator),
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

    // Omit myNotes from buildDetails for client-facing return
    const buildDetails = project.buildDetails ? {
      headline: project.buildDetails.headline,
      domainPreference: project.buildDetails.domainPreference,
      inspirationLinks: project.buildDetails.inspirationLinks,
      brand: {
        colorScheme: project.buildDetails.brand.colorScheme ?? { primary: "#111827", accent: "#6EE7B7" },
        logoStorageId: project.buildDetails.brand.logoStorageId,
        imageStorageIds: project.buildDetails.brand.imageStorageIds,
      },
      brandAssetsUploaded: project.buildDetails.brandAssetsUploaded,
    } : undefined;

    return {
      _id: project._id,
      projectId: project.projectId,
      projectStatus: project.projectStatus,
      prospectId: project.prospectId,
      authUserId: project.authUserId,
      _creationTime: project._creationTime,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      buildDetails,
      deployment: project.deployment,
      calKickoffBooking: project.calKickoffBooking,
      calReviewBooking: project.calReviewBooking,
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
    return true;
  },
});

export const upsertBuildDetails = mutation({
  args: {
    projectId: v.id("projects"),
    headline: v.optional(v.string()),
    domainPreference: v.optional(v.string()),
    inspirationLinks: v.optional(v.array(v.string())),
    brand: v.optional(v.object({
      colorScheme: v.optional(v.object({
        primary: v.string(),
        accent: v.string(),
      })),
    })),
    logoStorageId: v.optional(v.id("_storage")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      throw new Error("Authentication required");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.authUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const existingBuildDetails = project.buildDetails;

    // Shallow merge with existing buildDetails
    const updatedBuildDetails = {
      headline: args.headline !== undefined ? args.headline : existingBuildDetails?.headline ?? null,
      domainPreference: args.domainPreference !== undefined ? args.domainPreference : existingBuildDetails?.domainPreference ?? null,
      inspirationLinks: args.inspirationLinks !== undefined ? args.inspirationLinks : existingBuildDetails?.inspirationLinks ?? [],
      myNotes: existingBuildDetails?.myNotes ?? null, // Preserve admin-only field
      brand: {
        colorScheme: args.brand?.colorScheme !== undefined ? args.brand.colorScheme : existingBuildDetails?.brand?.colorScheme ?? { primary: "#111827", accent: "#6EE7B7" },
        logoStorageId: args.logoStorageId !== undefined ? args.logoStorageId : existingBuildDetails?.brand?.logoStorageId,
        imageStorageIds: args.imageStorageIds !== undefined ? args.imageStorageIds : existingBuildDetails?.brand?.imageStorageIds,
      },
      brandAssetsUploaded: Boolean(args.logoStorageId || args.imageStorageIds || existingBuildDetails?.brandAssetsUploaded),
    };

    await ctx.db.patch(args.projectId, {
      buildDetails: updatedBuildDetails,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "user",
      kind: "build.details_updated",
      payload: {
        updatedFields: Object.keys(args).filter(k => k !== "projectId"),
      },
    });

    console.log("[projects] build details updated", {
      projectId: args.projectId,
      authUserId: user._id,
    });

    return { success: true };
  },
});

export const createEditRequest = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    details: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.object({ id: v.id("edit_requests") }),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      throw new Error("Authentication required");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.authUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    const priority = args.priority ?? "normal";

    const requestId = await ctx.db.insert("edit_requests", {
      projectId: args.projectId,
      authUserId: user._id,
      title: args.title,
      details: args.details,
      status: "open",
      priority,
      attachments: args.attachmentIds,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "user",
      kind: "ticket.created",
      payload: {
        ticketId: requestId,
        title: args.title,
        priority,
      },
    });

    console.log("[projects] edit request created", {
      id: requestId,
      projectId: args.projectId,
      authUserId: user._id,
    });

    return { id: requestId };
  },
});

export const listEditRequests = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.array(v.object({
    _id: v.id("edit_requests"),
    title: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting_on_client"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    createdAt: v.number(),
    details: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return [];
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return [];
    }

    if (project.authUserId !== user._id) {
      return [];
    }

    const requests = await ctx.db
      .query("edit_requests")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .take(20);

    return requests.map(req => ({
      _id: req._id,
      title: req.title,
      status: req.status,
      priority: req.priority,
      createdAt: req.createdAt,
      details: req.details,
    }));
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
