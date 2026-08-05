import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./adminGuard";
import {
  normalizeLiveUrlForPageSpeed,
  runPageSpeed,
} from "./lib/pagespeed";
import { pageSpeedDataValidator } from "./validators";

/**
 * Stage 3: one-time / admin-refreshed PageSpeed snapshot for client projects.
 * Fail-open: status transitions never depend on PageSpeed success.
 */

export const getSnapshotFields = internalQuery({
  args: { projectId: v.id("projects") },
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      projectId: v.string(),
      liveUrl: v.union(v.string(), v.null()),
      hasSnapshot: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    return {
      _id: project._id,
      projectId: project.projectId,
      liveUrl: project.deployment?.liveUrl ?? null,
      hasSnapshot: Boolean(project.pageSpeedSnapshot),
    };
  },
});

export const storeSnapshot = internalMutation({
  args: {
    projectId: v.id("projects"),
    snapshot: pageSpeedDataValidator,
    snapshotUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    await ctx.db.patch(args.projectId, {
      pageSpeedSnapshot: args.snapshot,
      pageSpeedSnapshotUrl: args.snapshotUrl,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Non-blocking capture. When `onlyIfMissing` is true, skip if a snapshot exists
 * (used on first LIVE transition).
 */
export const captureSnapshot = internalAction({
  args: {
    projectId: v.id("projects"),
    onlyIfMissing: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(internal.projectPageSpeed.getSnapshotFields, {
      projectId: args.projectId,
    });
    if (!project) {
      console.log("[project.pagespeed] project_missing", {
        projectId: args.projectId,
      });
      return null;
    }

    if (args.onlyIfMissing && project.hasSnapshot) {
      return null;
    }

    const measuredUrl = normalizeLiveUrlForPageSpeed(project.liveUrl);
    if (!measuredUrl) {
      console.log("[project.pagespeed] no_live_url", {
        projectId: project.projectId,
      });
      return null;
    }

    try {
      const snapshot = await runPageSpeed(measuredUrl);
      await ctx.runMutation(internal.projectPageSpeed.storeSnapshot, {
        projectId: args.projectId,
        snapshot,
        snapshotUrl: measuredUrl,
      });
      console.log("[project.pagespeed] snapshot_stored", {
        projectId: project.projectId,
        performanceScore: snapshot.performanceScore,
        measuredUrl,
      });
    } catch (error) {
      // Fail-open: never block portal/status on PageSpeed errors
      console.error("[project.pagespeed] capture_failed", {
        projectId: project.projectId,
        measuredUrl,
        error,
      });
    }

    return null;
  },
});

/**
 * Admin-only refresh — schedules a non-blocking capture that may replace
 * an existing snapshot. Returns immediately; result appears on the project.
 */
export const requestRefresh = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (!project.deployment?.liveUrl) {
      throw new Error("No live URL configured");
    }

    await ctx.scheduler.runAfter(0, internal.projectPageSpeed.captureSnapshot, {
      projectId: args.projectId,
      onlyIfMissing: false,
    });

    await ctx.db.insert("activity_log", {
      projectId: args.projectId,
      actor: "admin",
      kind: "project.pagespeed_refresh_requested",
      payload: {
        liveUrl: project.deployment.liveUrl,
      },
      createdAt: Date.now(),
    });

    return null;
  },
});
