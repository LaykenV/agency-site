import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin } from "./adminGuard";
import {
  projectStatusValidator,
  triageObjectValidator,
  triageVerdictValidator,
} from "./validators";

const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("won"),
  v.literal("lost"),
);

const leadDataValidator = v.object({
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  message: v.optional(v.string()),
});

const clientLeadValidator = v.object({
  _id: v.id("client_leads"),
  _creationTime: v.number(),
  projectId: v.string(),
  status: leadStatusValidator,
  source: v.string(),
  data: leadDataValidator,
  createdAt: v.number(),
  triageVerdict: v.optional(triageVerdictValidator),
  triage: v.optional(triageObjectValidator),
});

const leadFilterValidator = v.union(
  v.literal("allowed"),
  v.literal("spam"),
  v.literal("all"),
);

/**
 * Cross-client lead stream for the admin dashboard.
 * Each filter branch uses an index so pagination never scans unrelated rows.
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: leadFilterValidator,
    projectId: v.optional(v.string()),
  },
  returns: paginationResultValidator(clientLeadValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const triageVerdict =
      args.filter === "allowed"
        ? ("allow" as const)
        : args.filter === "spam"
          ? ("spam" as const)
          : null;

    if (args.projectId && triageVerdict) {
      return await ctx.db
        .query("client_leads")
        .withIndex("by_projectId_and_triageVerdict", (q) =>
          q.eq("projectId", args.projectId!).eq("triageVerdict", triageVerdict),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (args.projectId) {
      return await ctx.db
        .query("client_leads")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId!))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    if (triageVerdict) {
      return await ctx.db
        .query("client_leads")
        .withIndex("by_triageVerdict", (q) =>
          q.eq("triageVerdict", triageVerdict),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("client_leads")
      .withIndex("by_createdAt")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Projects that currently have at least one stored client lead. */
export const listClients = query({
  args: {},
  returns: v.array(
    v.object({
      projectId: v.string(),
      companyName: v.union(v.string(), v.null()),
      liveUrl: v.union(v.string(), v.null()),
      projectStatus: v.union(projectStatusValidator, v.null()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const projects = await ctx.db.query("projects").collect();
    const clients = await Promise.all(
      projects.map(async (project) => {
        const firstLead = await ctx.db
          .query("client_leads")
          .withIndex("by_projectId", (q) =>
            q.eq("projectId", project.projectId),
          )
          .first();

        if (!firstLead) return null;

        const prospect = project.prospectId
          ? await ctx.db.get(project.prospectId)
          : null;

        return {
          projectId: project.projectId,
          companyName: prospect?.details.companyName?.trim() || null,
          liveUrl: project.deployment?.liveUrl?.trim() || null,
          projectStatus: project.projectStatus ?? null,
        };
      }),
    );

    return clients.filter((client) => client !== null);
  },
});
