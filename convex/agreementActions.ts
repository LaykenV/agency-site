"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Snapshot both halves of the agreement: the universal MSA and the project's
 * order form, each exactly as accepted. The order form is re-rendered from its
 * stored spec and issue-time binding, so it reproduces the bytes that were
 * hashed at issue.
 */
export const generateAndStoreTermsSnapshot = internalAction({
  args: {
    agreementId: v.id("agreements"),
    orderFormId: v.optional(v.id("order_forms")),
    expectedMsaHash: v.string(),
    expectedOrderFormHash: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Node.js action: the legal modules are dynamically imported.
    const { MSA_CANONICAL_HTML } = await import("../lib/legal/msa.js");
    const { sha256Hex, timingSafeEqualHex } = await import(
      "./credentialCrypto.js"
    );
    const msaHash = await sha256Hex(MSA_CANONICAL_HTML);
    if (!timingSafeEqualHex(msaHash, args.expectedMsaHash)) {
      throw new Error("MSA snapshot bytes no longer match the accepted hash");
    }

    const msaBlob = new Blob([MSA_CANONICAL_HTML], { type: "text/html" });
    const msaStorageId = await ctx.storage.store(msaBlob);
    const snapshotUrl: string | null = await ctx.storage.getUrl(msaStorageId);

    if (!snapshotUrl) {
      console.error("[agreement] Failed to get storage URL for MSA snapshot");
    }

    let orderFormSnapshotUrl: string | null = null;

    if (args.orderFormId) {
      const orderForm = await ctx.runQuery(internal.orderForms.internalGetById, {
        orderFormId: args.orderFormId,
      });

      if (orderForm?.issuedAt) {
        const { buildOrderFormCanonicalHtml } = await import(
          "../lib/legal/orderForm.js"
        );
        const canonicalHtml = buildOrderFormCanonicalHtml(orderForm.spec, {
          projectSlug: orderForm.projectSlug,
          clientName: orderForm.clientName,
          msaVersion: orderForm.msaVersion,
          version: orderForm.version,
          issuedAt: orderForm.issuedAt,
        });
        const snapshotHash = await sha256Hex(canonicalHtml);
        if (
          !args.expectedOrderFormHash ||
          !orderForm.issuedHash ||
          !timingSafeEqualHex(snapshotHash, args.expectedOrderFormHash) ||
          !timingSafeEqualHex(snapshotHash, orderForm.issuedHash)
        ) {
          throw new Error(
            "Order Form snapshot bytes no longer match the accepted hash",
          );
        }
        const orderFormStorageId = await ctx.storage.store(
          new Blob([canonicalHtml], { type: "text/html" }),
        );
        orderFormSnapshotUrl = await ctx.storage.getUrl(orderFormStorageId);

        if (orderFormSnapshotUrl) {
          await ctx.runMutation(internal.orderForms.internalPatchSnapshot, {
            orderFormId: args.orderFormId,
            snapshotUrl: orderFormSnapshotUrl,
          });
        }
      } else {
        console.error("[agreement] order form missing or not issued", {
          orderFormId: args.orderFormId,
        });
      }
    }

    if (!snapshotUrl && !orderFormSnapshotUrl) {
      return null;
    }

    await ctx.runMutation(internal.agreement.internalPatchAgreementSnapshot, {
      ...(snapshotUrl ? { snapshotUrl } : {}),
      ...(orderFormSnapshotUrl ? { orderFormSnapshotUrl } : {}),
      agreementId: args.agreementId,
    });

    return null;
  },
});

export const sendWelcomeEmailAfterSnapshot = internalAction({
  args: {
    agreementId: v.id("agreements"),
    projectId: v.id("projects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Wait for the snapshot to be available (with retry logic)
    let agreement = await ctx.runQuery(internal.agreement.internalGetLatestAgreementForProject, {
      projectId: args.projectId,
    });

    // Retry up to 3 times if snapshot is not ready yet
    let retries = 0;
    while ((!agreement?.snapshotUrl) && retries < 3) {
      console.log(`[agreementActions] Waiting for snapshot to be ready, attempt ${retries + 1}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      agreement = await ctx.runQuery(internal.agreement.internalGetLatestAgreementForProject, {
        projectId: args.projectId,
      });
      retries++;
    }

    if (!agreement) {
      console.error("[agreementActions] Agreement not found", { 
        agreementId: args.agreementId, 
        projectId: args.projectId 
      });
      return null;
    }

    // Fetch project details
    const project = await ctx.runQuery(internal.projects.internalGetProjectById, {
      projectId: args.projectId,
    });

    if (!project) {
      console.error("[agreementActions] Project not found", { projectId: args.projectId });
      return null;
    }

    // Fetch prospect if available
    const prospect = project.prospectId
      ? await ctx.runQuery(internal.prospects.internalGetProspectById, {
          prospectId: project.prospectId,
        })
      : null;

    if (!prospect) {
      console.error("[agreementActions] Prospect not found", { 
        prospectId: project.prospectId,
        projectId: args.projectId 
      });
      return null;
    }

    // Fetch billing customer to get email
    const billingCustomer = await ctx.runQuery(internal.stripeHelpers.getCustomerMappingByUser, {
      userId: project.authUserId,
    });

    // Resolve email with fallback strategy
    const userEmail = billingCustomer?.email || prospect.details.contactEmail;

    if (!userEmail) {
      console.error("[agreementActions] No email found for welcome email", {
        projectId: args.projectId,
        prospectId: project.prospectId,
        authUserId: project.authUserId,
        hasBillingCustomer: !!billingCustomer,
        hasProspect: !!prospect,
      });
      return null;
    }

    // Send the welcome email
    try {
      await ctx.runAction(internal.emails.sendWelcomeEmail, {
        projectId: args.projectId,
        userEmail,
        userName: prospect.details.contactName,
        companyName: prospect.details.companyName,
      });
      console.log("[agreementActions] Welcome email sent successfully", {
        projectId: args.projectId,
        userEmail,
      });
    } catch (error) {
      console.error("[agreementActions] Failed to send welcome email", {
        projectId: args.projectId,
        userEmail,
        error,
      });
    }

    return null;
  },
});
