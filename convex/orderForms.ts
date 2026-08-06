import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./adminGuard";
import { getProjectIfOwner } from "./projectAccess";
import { sha256Hex } from "./credentialCrypto";
import {
  orderFormSpecValidator,
  orderFormStatusValidator,
} from "./validators";
import { MSA_VERSION } from "../lib/legal/msa";
import {
  WAAS_LOCAL_ORDER_FORM_SPEC,
  buildOrderFormCanonicalHtml,
  validateOrderFormForIssue,
  type OrderFormSpec,
} from "../lib/legal/orderForm";

/**
 * Stage 4A: per-project order forms.
 *
 * The MSA is universal and versioned in code. Everything commercial — price,
 * term, scope, deliverables, what the client owns at the end — lives here in a
 * per-project version stream, so a five-figure bespoke build and a $199/mo
 * hosted site can share one set of universal terms.
 *
 * Exactly one row per project may be `issued`. Issuing supersedes the previous
 * unsigned one rather than mutating it. Once an agreement references a row,
 * Stage 4A blocks replacement until a separate re-acceptance flow exists.
 */

const orderFormRowValidator = v.object({
  _id: v.id("order_forms"),
  _creationTime: v.number(),
  projectId: v.id("projects"),
  version: v.string(),
  status: orderFormStatusValidator,
  spec: orderFormSpecValidator,
  msaVersion: v.string(),
  clientName: v.string(),
  projectSlug: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  issuedAt: v.optional(v.number()),
  supersededAt: v.optional(v.number()),
  issuedHash: v.optional(v.string()),
  stripePriceId: v.optional(v.string()),
  setupStripePriceId: v.optional(v.string()),
  snapshotUrl: v.optional(v.string()),
  authoredBy: v.union(v.literal("system"), v.literal("admin")),
});

/** Company name for the document header, falling back to the project slug. */
async function resolveClientName(
  ctx: MutationCtx,
  project: Doc<"projects">,
): Promise<string> {
  if (project.prospectId) {
    const prospect = await ctx.db.get(project.prospectId);
    const companyName = prospect?.details.companyName?.trim();
    if (companyName) return companyName;
  }
  return project.projectId;
}

async function nextVersion(
  ctx: MutationCtx,
  projectId: Id<"projects">,
): Promise<string> {
  const existing = await ctx.db
    .query("order_forms")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .collect();
  const highest = existing.reduce((max, row) => {
    const parsed = Number.parseInt(row.version, 10);
    return Number.isSafeInteger(parsed) ? Math.max(max, parsed) : max;
  }, 0);
  return String(highest + 1);
}

function defaultStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ID must be configured before creating the standard Order Form draft",
    );
  }
  return priceId;
}

/**
 * Seed the standard $199/month Order Form as an editable draft when an admin
 * explicitly creates a project. Nothing is client-visible until the admin
 * reviews and issues it.
 */
export async function createDefaultOrderFormDraft(
  ctx: MutationCtx,
  projectId: Id<"projects">,
): Promise<Id<"order_forms"> | null> {
  const project = await ctx.db.get(projectId);
  if (!project) return null;

  const existing = await ctx.db
    .query("order_forms")
    .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
    .first();
  if (existing) return null;

  const now = Date.now();
  const clientName = await resolveClientName(ctx, project);
  const spec: OrderFormSpec = WAAS_LOCAL_ORDER_FORM_SPEC;
  const stripePriceId = defaultStripePriceId();

  const orderFormId = await ctx.db.insert("order_forms", {
    projectId,
    version: "1",
    status: "draft",
    spec,
    msaVersion: MSA_VERSION,
    clientName,
    projectSlug: project.projectId,
    createdAt: now,
    updatedAt: now,
    stripePriceId,
    authoredBy: "system",
  });

  return orderFormId;
}

export const internalGetIssuedForProject = internalQuery({
  args: { projectId: v.id("projects") },
  returns: v.union(orderFormRowValidator, v.null()),
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("order_forms")
        .withIndex("by_projectId_and_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", "issued"),
        )
        .first()) ?? null
    );
  },
});

export const internalGetById = internalQuery({
  args: { orderFormId: v.id("order_forms") },
  returns: v.union(orderFormRowValidator, v.null()),
  handler: async (ctx, args) => {
    return (await ctx.db.get(args.orderFormId)) ?? null;
  },
});

export const internalPatchSnapshot = internalMutation({
  args: {
    orderFormId: v.id("order_forms"),
    snapshotUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderFormId, { snapshotUrl: args.snapshotUrl });
    return null;
  },
});

/**
 * Portal read. Renders the commercial terms on the agreement page, so the
 * client sees the price and scope they are actually accepting.
 */
export const getIssuedForMyProject = query({
  args: { projectId: v.id("projects") },
  returns: v.union(orderFormRowValidator, v.null()),
  handler: async (ctx, args) => {
    const project = await getProjectIfOwner(ctx, args.projectId);
    if (!project) return null;

    return (
      (await ctx.db
        .query("order_forms")
        .withIndex("by_projectId_and_status", (q) =>
          q.eq("projectId", project._id).eq("status", "issued"),
        )
        .first()) ?? null
    );
  },
});

/**
 * The immutable Order Form referenced by this project's signed agreement.
 * Checkout and post-signature UI must use this rather than whichever amendment
 * happens to be currently issued.
 */
export const getAcceptedForMyProject = query({
  args: { projectId: v.id("projects") },
  returns: v.union(orderFormRowValidator, v.null()),
  handler: async (ctx, args) => {
    const project = await getProjectIfOwner(ctx, args.projectId);
    if (!project) return null;

    const agreement = await ctx.db
      .query("agreements")
      .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
      .order("desc")
      .first();
    if (!agreement?.orderFormId) return null;

    return (await ctx.db.get(agreement.orderFormId)) ?? null;
  },
});

export const listForProject = query({
  args: { projectId: v.id("projects") },
  returns: v.array(orderFormRowValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("order_forms")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

/**
 * Create or update a draft. Issued and superseded rows are immutable — an
 * accepted agreement references their hash.
 */
export const saveDraft = mutation({
  args: {
    projectId: v.id("projects"),
    orderFormId: v.optional(v.id("order_forms")),
    spec: orderFormSpecValidator,
    stripePriceId: v.optional(v.string()),
    setupStripePriceId: v.optional(v.string()),
  },
  returns: v.id("order_forms"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const now = Date.now();

    if (args.orderFormId) {
      const existing = await ctx.db.get(args.orderFormId);
      if (!existing || existing.projectId !== args.projectId) {
        throw new Error("Order form not found for this project");
      }
      if (existing.status !== "draft") {
        throw new Error(
          "Issued order forms are immutable — create a new draft and issue it instead",
        );
      }
      await ctx.db.patch(args.orderFormId, {
        spec: args.spec,
        msaVersion: MSA_VERSION,
        stripePriceId:
          args.spec.pricing.collectionMethod === "stripe_checkout"
            ? args.stripePriceId?.trim()
            : undefined,
        setupStripePriceId:
          args.spec.pricing.collectionMethod === "stripe_checkout" &&
          args.spec.pricing.setupFeeCents > 0
            ? args.setupStripePriceId?.trim()
            : undefined,
        updatedAt: now,
      });
      return args.orderFormId;
    }

    const clientName = await resolveClientName(ctx, project);
    return await ctx.db.insert("order_forms", {
      projectId: args.projectId,
      version: await nextVersion(ctx, args.projectId),
      status: "draft",
      spec: args.spec,
      msaVersion: MSA_VERSION,
      stripePriceId:
        args.spec.pricing.collectionMethod === "stripe_checkout"
          ? args.stripePriceId?.trim()
          : undefined,
      setupStripePriceId:
        args.spec.pricing.collectionMethod === "stripe_checkout" &&
        args.spec.pricing.setupFeeCents > 0
          ? args.setupStripePriceId?.trim()
          : undefined,
      clientName,
      projectSlug: project.projectId,
      createdAt: now,
      updatedAt: now,
      authoredBy: "admin",
    });
  },
});

/**
 * Issue a draft. Computes and stores the canonical hash, then supersedes any
 * previously issued row so exactly one stays live.
 */
export const issue = mutation({
  args: { orderFormId: v.id("order_forms") },
  returns: v.object({
    orderFormId: v.id("order_forms"),
    version: v.string(),
    issuedHash: v.string(),
    supersededId: v.union(v.id("order_forms"), v.null()),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const draft = await ctx.db.get(args.orderFormId);
    if (!draft) throw new Error("Order form not found");
    if (draft.status !== "draft") {
      throw new Error("Only a draft order form can be issued");
    }

    const project = await ctx.db.get(draft.projectId);
    if (!project) throw new Error("Project not found");

    const signedAgreement = await ctx.db
      .query("agreements")
      .withIndex("by_projectId", (q) => q.eq("projectId", draft.projectId))
      .first();
    if (signedAgreement) {
      throw new Error(
        "This project already has a signed agreement. A replacement Order Form requires a new acceptance workflow; do not overwrite the signed engagement.",
      );
    }

    const issueErrors = validateOrderFormForIssue(
      draft.spec,
      draft.stripePriceId,
      draft.setupStripePriceId,
    );
    if (issueErrors.length > 0) {
      throw new Error(`Order Form cannot be issued: ${issueErrors.join("; ")}`);
    }

    const now = Date.now();

    const previous = await ctx.db
      .query("order_forms")
      .withIndex("by_projectId_and_status", (q) =>
        q.eq("projectId", draft.projectId).eq("status", "issued"),
      )
      .first();

    // Re-resolve the header fields at issue time so a company rename before
    // issue is reflected in the document that actually gets hashed.
    const clientName = await resolveClientName(ctx, project);

    const canonicalHtml = buildOrderFormCanonicalHtml(draft.spec, {
      projectSlug: project.projectId,
      clientName,
      msaVersion: MSA_VERSION,
      version: draft.version,
      issuedAt: now,
    });
    const issuedHash = await sha256Hex(canonicalHtml);

    if (previous) {
      await ctx.db.patch(previous._id, {
        status: "superseded",
        supersededAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.orderFormId, {
      status: "issued",
      msaVersion: MSA_VERSION,
      clientName,
      projectSlug: project.projectId,
      issuedAt: now,
      issuedHash,
      updatedAt: now,
    });

    await ctx.db.insert("activity_log", {
      projectId: draft.projectId,
      prospectId: project.prospectId,
      actor: "admin",
      kind: "order_form_issued",
      payload: {
        orderFormId: args.orderFormId,
        version: draft.version,
        engagementType: draft.spec.engagementType,
        authoredBy: draft.authoredBy,
        supersededId: previous?._id ?? null,
      },
      createdAt: now,
    });

    return {
      orderFormId: args.orderFormId,
      version: draft.version,
      issuedHash,
      supersededId: previous?._id ?? null,
    };
  },
});

export const deleteDraft = mutation({
  args: { orderFormId: v.id("order_forms") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db.get(args.orderFormId);
    if (!existing) return null;
    if (existing.status !== "draft") {
      throw new Error("Only a draft order form can be deleted");
    }
    await ctx.db.delete(args.orderFormId);
    return null;
  },
});

/** Seed an editable draft from the standard waas_local terms. */
export const createDraftFromDefault = mutation({
  args: { projectId: v.id("projects") },
  returns: v.object({
    orderFormId: v.id("order_forms"),
    spec: orderFormSpecValidator,
    stripePriceId: v.optional(v.string()),
    setupStripePriceId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const issued = await ctx.db
      .query("order_forms")
      .withIndex("by_projectId_and_status", (q) =>
        q.eq("projectId", args.projectId).eq("status", "issued"),
      )
      .first();

    const now = Date.now();
    const clientName = await resolveClientName(ctx, project);
    const spec = issued?.spec ?? WAAS_LOCAL_ORDER_FORM_SPEC;

    const stripePriceId =
      spec.pricing.collectionMethod === "stripe_checkout"
        ? issued?.stripePriceId ?? defaultStripePriceId()
        : undefined;
    const setupStripePriceId =
      spec.pricing.collectionMethod === "stripe_checkout"
        ? issued?.setupStripePriceId
        : undefined;
    const orderFormId = await ctx.db.insert("order_forms", {
      projectId: args.projectId,
      version: await nextVersion(ctx, args.projectId),
      status: "draft",
      // Start from the live unsigned terms where they exist, so a replacement
      // is an edit rather than a retype.
      spec,
      msaVersion: MSA_VERSION,
      stripePriceId,
      setupStripePriceId,
      clientName,
      projectSlug: project.projectId,
      createdAt: now,
      updatedAt: now,
      authoredBy: "admin",
    });
    return { orderFormId, spec, stripePriceId, setupStripePriceId };
  },
});
