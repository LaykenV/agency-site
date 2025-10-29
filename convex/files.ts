import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import type { Id } from "./_generated/dataModel";

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

    // Verify all storage IDs belong to this project
    const projectStorageIds = new Set<string>();
    if (project.buildDetails?.brand?.logoStorageId) {
      projectStorageIds.add(project.buildDetails.brand.logoStorageId);
    }
    if (project.buildDetails?.brand?.imageStorageIds) {
      project.buildDetails.brand.imageStorageIds.forEach(id => projectStorageIds.add(id));
    }

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

    // Verify the storage ID belongs to this project
    const projectStorageIds = new Set<string>();
    if (project.buildDetails?.brand?.logoStorageId) {
      projectStorageIds.add(project.buildDetails.brand.logoStorageId);
    }
    if (project.buildDetails?.brand?.imageStorageIds) {
      project.buildDetails.brand.imageStorageIds.forEach(id => projectStorageIds.add(id));
    }

    if (!projectStorageIds.has(args.storageId)) {
      throw new Error("Storage ID does not belong to this project");
    }

    await ctx.storage.delete(args.storageId);

    return { success: true };
  },
});

