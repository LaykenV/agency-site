import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { projectStatusValidator, buildDetailsValidator, deploymentValidator, calBookingValidator } from "./validators";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  buildBuildDetails,
  deleteProjectStorageIdsIfUnreferenced,
} from "./projectStorage";

const E164_NOTIFICATION_PHONE_REGEX = /^\+[1-9]\d{9,14}$/;

function normalizeNotificationPhone(input: string): string | undefined {
  const raw = input.trim();
  if (!raw) return undefined;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return undefined;

  const normalized = digits.length === 10 ? `+1${digits}` : `+${digits}`;
  if (!E164_NOTIFICATION_PHONE_REGEX.test(normalized)) {
    throw new Error("Invalid notification phone number. Use E.164 format (e.g. +13375551234).");
  }

  return normalized;
}

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

    // First, check for ANY existing non-archived project for this user (prevents duplicate projects)
    // This is a safety guard for when the user has multiple prospects with the same email
    let anyExistingProject: Doc<"projects"> | null = null;
    let exactMatch: Doc<"projects"> | null = null;
    
    for await (const project of ctx.db
      .query("projects")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))) {
      // Skip archived projects
      if (project.projectStatus === "ARCHIVED") {
        continue;
      }
      
      // Track first non-archived project as fallback
      if (!anyExistingProject) {
        anyExistingProject = project;
      }
      
      // Check for exact prospect match
      if (project.prospectId && project.prospectId === args.prospectId) {
        exactMatch = project;
        break;
      }
    }

    // If we found an exact match (same prospect), return it
    if (exactMatch) {
      console.log("[projects] found existing project with matching prospect", {
        projectId: exactMatch._id,
        authUserId,
        prospectId: args.prospectId,
      });
      return exactMatch._id;
    }

    // If user has any existing non-archived project (even with different prospect), return it
    // This prevents creating duplicate projects when multiple prospects exist for the same email
    if (anyExistingProject) {
      console.log("[projects] user already has a project, returning existing (different prospect)", {
        projectId: anyExistingProject._id,
        authUserId,
        requestedProspectId: args.prospectId,
        existingProspectId: anyExistingProject.prospectId,
      });
      return anyExistingProject._id;
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

// Internal: Get project by projectId slug (for HTTP actions - lead ingestion, analytics)
export const getByProjectIdSlug = internalQuery({
  args: { projectId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      projectId: v.string(),
      projectStatus: v.optional(projectStatusValidator),
      authUserId: v.string(),
      prospectId: v.optional(v.id("prospects")),
      buildDetails: v.optional(v.object({
        headline: v.union(v.string(), v.null()),
        notificationPhone: v.optional(v.string()),
        smsConsent: v.optional(v.object({
          acceptedAt: v.number(),
          disclosureVersion: v.string(),
          source: v.string(),
        })),
      })),
      deployment: v.optional(deploymentValidator),
    }),
    v.null()
  ),
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();

    if (!project) return null;

    return {
      _id: project._id,
      projectId: project.projectId,
      projectStatus: project.projectStatus,
      authUserId: project.authUserId,
      prospectId: project.prospectId,
      buildDetails: project.buildDetails
        ? {
            headline: project.buildDetails.headline,
            notificationPhone: project.buildDetails.notificationPhone,
            smsConsent: project.buildDetails.smsConsent,
          }
        : undefined,
      deployment: project.deployment,
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
        notificationPhone: v.optional(v.string()),
        smsConsent: v.optional(v.object({
          acceptedAt: v.number(),
          disclosureVersion: v.string(),
          source: v.string(),
        })),
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
      notificationPhone: project.buildDetails.notificationPhone,
      smsConsent: project.buildDetails.smsConsent,
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
    notificationPhone: v.optional(v.string()),
    smsConsentAccepted: v.optional(v.boolean()),
    smsConsentDisclosureVersion: v.optional(v.string()),
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
    const existingNotificationPhone = existingBuildDetails?.notificationPhone;
    const normalizedNotificationPhone =
      args.notificationPhone !== undefined
        ? normalizeNotificationPhone(args.notificationPhone)
        : undefined;
    const isSameNotificationPhone =
      normalizedNotificationPhone !== undefined && existingNotificationPhone === normalizedNotificationPhone;

    if (args.notificationPhone !== undefined && normalizedNotificationPhone && !isSameNotificationPhone && !args.smsConsentAccepted) {
      throw new Error("SMS consent is required before saving a new phone number.");
    }

    const nextSmsConsent =
      args.notificationPhone !== undefined
        ? normalizedNotificationPhone
          ? isSameNotificationPhone && args.smsConsentAccepted !== false && existingBuildDetails?.smsConsent
            ? existingBuildDetails.smsConsent
            : args.smsConsentAccepted
              ? {
                  acceptedAt: now,
                  disclosureVersion: args.smsConsentDisclosureVersion ?? "2026-03-20",
                  source: "portal_build_details_checkbox",
                }
              : undefined
          : undefined
        : existingBuildDetails?.smsConsent;

    const updatedBuildDetails = buildBuildDetails({
      existingBuildDetails,
      headline: args.headline,
      domainPreference: args.domainPreference,
      inspirationLinks: args.inspirationLinks,
      myNotes: existingBuildDetails?.myNotes,
      notificationPhone:
        args.notificationPhone !== undefined
          ? normalizedNotificationPhone ?? null
          : undefined,
      smsConsent:
        args.notificationPhone !== undefined ? nextSmsConsent ?? null : undefined,
      colorScheme: args.brand?.colorScheme,
      logoStorageId: args.logoStorageId,
      imageStorageIds: args.imageStorageIds,
    });

    await ctx.db.patch(args.projectId, {
      buildDetails: updatedBuildDetails,
      updatedAt: now,
    });

    const storageIdsToDelete = new Set<typeof updatedBuildDetails.brand.logoStorageId>();
    const existingLogoStorageId = existingBuildDetails?.brand?.logoStorageId;
    if (
      args.logoStorageId !== undefined &&
      existingLogoStorageId &&
      existingLogoStorageId !== updatedBuildDetails.brand.logoStorageId
    ) {
      storageIdsToDelete.add(existingLogoStorageId);
    }

    if (args.imageStorageIds !== undefined) {
      const nextImageStorageIds = new Set(
        updatedBuildDetails.brand.imageStorageIds ?? [],
      );
      for (const storageId of existingBuildDetails?.brand?.imageStorageIds ?? []) {
        if (!nextImageStorageIds.has(storageId)) {
          storageIdsToDelete.add(storageId);
        }
      }
    }

    await deleteProjectStorageIdsIfUnreferenced(
      ctx,
      args.projectId,
      Array.from(storageIdsToDelete).filter(
        (storageId): storageId is NonNullable<typeof storageId> =>
          storageId !== undefined,
      ),
    );

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

    if (args.attachmentIds && args.attachmentIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
        projectId: args.projectId,
        prospectId: project.prospectId,
        actor: "user",
        kind: "ticket.attachment_added",
        payload: {
          requestId,
          count: args.attachmentIds.length,
        },
      });
    }

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
    attachments: v.optional(v.array(v.id("_storage"))),
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
      attachments: req.attachments,
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
