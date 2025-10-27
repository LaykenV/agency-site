"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateAndStoreTermsSnapshot = internalAction({
  args: {
    agreementId: v.id("agreements"),
    termsVersion: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch the terms HTML from the canonical module
    // Note: In a Node.js action, we need to dynamically import the terms module
    const { TERMS_CANONICAL_HTML } = await import("../lib/legal/terms.js");
    
    // Store the HTML snapshot in Convex storage
    const blob = new Blob([TERMS_CANONICAL_HTML], { type: "text/html" });
    const storageId = await ctx.storage.store(blob);
    
    // Generate the URL for the stored snapshot
    const snapshotUrl: string | null = await ctx.storage.getUrl(storageId);
    
    if (!snapshotUrl) {
      console.error("[agreement] Failed to get storage URL for terms snapshot");
      return null;
    }
    
    // Update the agreement with the snapshot URL
    await ctx.runMutation(internal.agreement.internalPatchAgreementSnapshot, {
      agreementId: args.agreementId,
      snapshotUrl,
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

