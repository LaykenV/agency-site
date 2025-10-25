import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const createFromClickwrap = mutation({
  args: {
    projectId: v.id("projects"),
    termsVersion: v.string(),
    termsHash: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    snapshotUrl: v.optional(v.string()),
  },
  returns: v.object({
    agreementId: v.id("agreements"),
    projectStatus: v.literal("AWAITING_PAYMENT"),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.authUserId !== user._id) {
      throw new Error("Forbidden: project ownership mismatch");
    }

    const existingAgreement = await ctx.db
      .query("agreements")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    const now = Date.now();

    if (existingAgreement) {
      if (project.projectStatus !== "AWAITING_PAYMENT") {
        await ctx.db.patch(args.projectId, {
          projectStatus: "AWAITING_PAYMENT",
          updatedAt: now,
        });
      }
      return { agreementId: existingAgreement._id, projectStatus: "AWAITING_PAYMENT" } as const;
    }

    const agreementId = await ctx.db.insert("agreements", {
      projectId: args.projectId,
      prospectId: project.prospectId,
      authUserId: user._id,
      method: "clickwrap",
      source: "portal",
      termsVersion: args.termsVersion,
      termsHash: args.termsHash,
      acceptedAt: now,
      ip: args.ip,
      userAgent: args.userAgent,
      snapshotUrl: args.snapshotUrl,
    });

    await ctx.db.patch(args.projectId, {
      projectStatus: "AWAITING_PAYMENT",
      updatedAt: now,
    });

    await ctx.db.insert("activity_log", {
      projectId: args.projectId,
      prospectId: project.prospectId,
      actor: "user",
      kind: "agreement_signed",
      payload: {
        agreementId,
        termsVersion: args.termsVersion,
      },
      createdAt: now,
    });

    return { agreementId, projectStatus: "AWAITING_PAYMENT" } as const;
  },
});

export const internalAppendAgreementActivity = internalMutation({
  args: {
    projectId: v.id("projects"),
    prospectId: v.optional(v.id("prospects")),
    agreementId: v.id("agreements"),
    termsVersion: v.string(),
  },
  returns: v.id("activity_log"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("activity_log", {
      projectId: args.projectId,
      prospectId: args.prospectId,
      actor: "user",
      kind: "agreement_signed",
      payload: {
        agreementId: args.agreementId,
        termsVersion: args.termsVersion,
      },
      createdAt: Date.now(),
    });
  },
});

