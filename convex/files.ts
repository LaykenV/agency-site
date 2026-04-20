import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  buildBuildDetails,
  deleteProjectStorageIdsIfUnreferenced,
  listProjectStorageIds,
} from "./projectStorage";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      throw new Error("Authentication required");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrls = query({
  args: {
    projectId: v.id("projects"),
    storageIds: v.array(v.id("_storage")),
  },
  returns: v.record(v.id("_storage"), v.string()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      throw new Error("Authentication required");
    }

    // Verify the project belongs to the user
    const project = await ctx.db.get(args.projectId);
    if (!project || project.authUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    const projectStorageIds = await listProjectStorageIds(ctx, args.projectId);

    // Only return URLs for storage IDs that belong to this project
    const result: Record<Id<"_storage">, string> = {};
    for (const storageId of args.storageIds) {
      if (projectStorageIds.has(storageId)) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) {
          result[storageId] = url;
        }
      }
    }

    return result;
  },
});

export const deleteFile = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      throw new Error("Authentication required");
    }

    // Verify the project belongs to the user
    const project = await ctx.db.get(args.projectId);
    if (!project || project.authUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    const projectStorageIds = await listProjectStorageIds(ctx, args.projectId);

    if (!projectStorageIds.has(args.storageId)) {
      throw new Error("Storage ID does not belong to this project");
    }

    const now = Date.now();
    const existingBuildDetails = project.buildDetails;
    const isLogo = existingBuildDetails?.brand?.logoStorageId === args.storageId;
    const isBrandImage =
      existingBuildDetails?.brand?.imageStorageIds?.includes(args.storageId) ??
      false;

    if (existingBuildDetails && (isLogo || isBrandImage)) {
      await ctx.db.patch(args.projectId, {
        buildDetails: buildBuildDetails({
          existingBuildDetails,
          myNotes: existingBuildDetails.myNotes,
          logoStorageId: isLogo
            ? null
            : existingBuildDetails.brand?.logoStorageId,
          imageStorageIds: isBrandImage
            ? existingBuildDetails.brand?.imageStorageIds?.filter(
                (storageId) => storageId !== args.storageId,
              )
            : existingBuildDetails.brand?.imageStorageIds,
        }),
        updatedAt: now,
      });
    }

    const updatedRequestIds: Array<Id<"edit_requests">> = [];
    for await (const request of ctx.db
      .query("edit_requests")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))) {
      if (!request.attachments?.includes(args.storageId)) {
        continue;
      }

      updatedRequestIds.push(request._id);
      const remainingAttachments = request.attachments.filter(
        (storageId) => storageId !== args.storageId,
      );

      await ctx.db.patch(request._id, {
        attachments:
          remainingAttachments.length > 0 ? remainingAttachments : undefined,
        updatedAt: now,
      });
    }

    const deletedStorageIds = await deleteProjectStorageIdsIfUnreferenced(
      ctx,
      args.projectId,
      [args.storageId],
    );

    const refreshedProject = await ctx.db.get(args.projectId);
    const brandAssetsUploaded =
      refreshedProject?.buildDetails?.brandAssetsUploaded ?? false;

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "user",
      kind: "file.deleted",
      payload: {
        storageId: args.storageId,
        wasLogo: isLogo,
        wasBrandImage: isBrandImage,
        removedFromRequestIds: updatedRequestIds,
        storageDeleted: deletedStorageIds.includes(args.storageId),
        brandAssetsUploaded,
      },
    });

    return { success: true };
  },
});
