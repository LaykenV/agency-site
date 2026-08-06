import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireProjectOwner } from "./projectAccess";
import { projectStatusValidator } from "./validators";
import { sha256Hex, timingSafeEqualHex } from "./credentialCrypto";
import { MSA_CANONICAL_HTML, MSA_VERSION } from "../lib/legal/msa";
import { buildOrderFormCanonicalHtml } from "../lib/legal/orderForm";

/**
 * Clickwrap acceptance of the MSA plus the project's issued order form.
 *
 * Both hashes are computed here, server-side, from documents this mutation
 * loads itself. The browser submits the displayed Order Form hash only as a
 * binding; it is accepted only when it matches the server's recomputation.
 */
export const createFromClickwrap = mutation({
  args: {
    projectId: v.id("projects"),
    orderFormId: v.id("order_forms"),
    orderFormHash: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.object({
    agreementId: v.id("agreements"),
    // The project's status *after* this call, which is not always
    // AWAITING_PAYMENT: a replay against an already-live project reports the
    // status it actually still has rather than the one it would have had.
    projectStatus: projectStatusValidator,
    paymentNextStep: v.union(
      v.literal("stripe_checkout"),
      v.literal("manual_invoice"),
    ),
  }),
  handler: async (ctx, args) => {
    const project = await requireProjectOwner(ctx, args.projectId);

    const existingAgreement = await ctx.db
      .query("agreements")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    const now = Date.now();

    if (existingAgreement) {
      // Advance only from AWAITING_AGREEMENT, which is the crash-recovery case
      // (agreement row written, status patch lost). Any later status means the
      // project has moved on; a double-submit or replay must not roll
      // AWAITING_ASSETS / IN_PROGRESS / LIVE backward into AWAITING_PAYMENT.
      const advanced = project.projectStatus === "AWAITING_AGREEMENT";
      if (advanced) {
        await ctx.db.patch(args.projectId, {
          projectStatus: "AWAITING_PAYMENT",
          updatedAt: now,
        });
      }
      const acceptedOrderForm = existingAgreement.orderFormId
        ? await ctx.db.get(existingAgreement.orderFormId)
        : null;
      return {
        agreementId: existingAgreement._id,
        projectStatus: advanced
          ? ("AWAITING_PAYMENT" as const)
          : project.projectStatus ?? ("AWAITING_PAYMENT" as const),
        paymentNextStep:
          acceptedOrderForm?.spec.pricing.collectionMethod === "manual_invoice"
            ? "manual_invoice"
            : "stripe_checkout",
      } as const;
    }

    // A first signature is only meaningful from the state that precedes it.
    // Without this, a stale tab could sign a project that admin has since
    // archived or advanced by hand, and drag it back to AWAITING_PAYMENT.
    if (project.projectStatus !== "AWAITING_AGREEMENT") {
      throw new Error(
        "This project is not awaiting an agreement. Refresh your portal to see its current state.",
      );
    }

    const orderForm = await ctx.db.get(args.orderFormId);

    if (
      !orderForm ||
      orderForm.projectId !== args.projectId ||
      orderForm.status !== "issued" ||
      !orderForm.issuedAt ||
      !orderForm.issuedHash
    ) {
      console.error("[agreement] displayed order form is no longer issuable", {
        projectId: args.projectId,
        orderFormId: args.orderFormId,
      });
      throw new Error(
        "This Order Form changed before it was accepted. Review the current version and try again.",
      );
    }

    if (orderForm.msaVersion !== MSA_VERSION) {
      throw new Error(
        "This Order Form references an older Master Services Agreement. Contact support for a current version.",
      );
    }

    const canonicalOrderForm = buildOrderFormCanonicalHtml(orderForm.spec, {
      projectSlug: orderForm.projectSlug,
      clientName: orderForm.clientName,
      msaVersion: orderForm.msaVersion,
      version: orderForm.version,
      issuedAt: orderForm.issuedAt,
    });
    const recomputedOrderFormHash = await sha256Hex(canonicalOrderForm);
    if (
      !timingSafeEqualHex(orderForm.issuedHash, recomputedOrderFormHash) ||
      !timingSafeEqualHex(args.orderFormHash, recomputedOrderFormHash)
    ) {
      throw new Error(
        "The displayed Order Form could not be verified. Refresh before accepting.",
      );
    }

    const msaHash = await sha256Hex(MSA_CANONICAL_HTML);

    const agreementId = await ctx.db.insert("agreements", {
      projectId: args.projectId,
      prospectId: project.prospectId,
      // requireProjectOwner already proved this equals the caller's user id.
      authUserId: project.authUserId,
      method: "clickwrap",
      source: "portal",
      // Legacy fields carry the MSA identity so existing readers keep working.
      termsVersion: MSA_VERSION,
      termsHash: msaHash,
      msaVersion: MSA_VERSION,
      msaHash,
      orderFormId: orderForm._id,
      orderFormVersion: orderForm.version,
      orderFormHash: recomputedOrderFormHash,
      acceptedAt: now,
      ip: args.ip,
      userAgent: args.userAgent,
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
        msaVersion: MSA_VERSION,
        orderFormId: orderForm._id,
        orderFormVersion: orderForm.version,
        engagementType: orderForm.spec.engagementType,
      },
      createdAt: now,
    });

    // Snapshot both documents exactly as accepted.
    await ctx.scheduler.runAfter(0, internal.agreementActions.generateAndStoreTermsSnapshot, {
      agreementId,
      orderFormId: orderForm._id,
      expectedMsaHash: msaHash,
      expectedOrderFormHash: recomputedOrderFormHash,
    });

    return {
      agreementId,
      projectStatus: "AWAITING_PAYMENT",
      paymentNextStep: orderForm.spec.pricing.collectionMethod,
    } as const;
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

export const internalGetLatestAgreementForProject = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.union(
    v.object({
      _id: v.id("agreements"),
      _creationTime: v.number(),
      projectId: v.id("projects"),
      prospectId: v.optional(v.id("prospects")),
      authUserId: v.string(),
      method: v.literal("clickwrap"),
      source: v.literal("portal"),
      termsVersion: v.string(),
      termsHash: v.string(),
      msaVersion: v.optional(v.string()),
      msaHash: v.optional(v.string()),
      orderFormId: v.optional(v.id("order_forms")),
      orderFormVersion: v.optional(v.string()),
      orderFormHash: v.optional(v.string()),
      orderFormSnapshotUrl: v.optional(v.string()),
      acceptedAt: v.number(),
      ip: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      snapshotUrl: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("agreements")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .first()) ?? null
    );
  },
});

export const internalPatchAgreementSnapshot = internalMutation({
  args: {
    agreementId: v.id("agreements"),
    snapshotUrl: v.optional(v.string()),
    orderFormSnapshotUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agreementId, {
      ...(args.snapshotUrl ? { snapshotUrl: args.snapshotUrl } : {}),
      ...(args.orderFormSnapshotUrl
        ? { orderFormSnapshotUrl: args.orderFormSnapshotUrl }
        : {}),
    });
    return null;
  },
});
