"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const MAX_PARALLELISM = 2;

async function runInBatches<T>(
  items: Array<T>,
  worker: (item: T) => Promise<unknown>,
  batchSize = MAX_PARALLELISM
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item) => worker(item)));
  }
}

export const runMarketingSearchWorkflow = internalAction({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const leadIds = await ctx.runAction(internal.marketing.pipeline.executeSearch, {
        searchId: args.searchId,
      });

      await ctx.runMutation(internal.marketing.search.updateSearchStatus, {
        searchId: args.searchId,
        status: "scraping",
      });

      await runInBatches(leadIds, (leadId) =>
        ctx.runAction(internal.marketing.pipeline.scrapeOneLead, { leadId })
      );

      await ctx.runMutation(internal.marketing.search.updateSearchStatus, {
        searchId: args.searchId,
        status: "analyzing",
      });

      await runInBatches(leadIds, (leadId) =>
        ctx.runAction(internal.marketing.pipeline.analyzeOneLead, { leadId })
      );

      const qualifiedLeadIds = await ctx.runQuery(
        internal.marketing.search.internalGetQualifiedLeadIds,
        {
          searchId: args.searchId,
        }
      );

      await runInBatches(qualifiedLeadIds, (leadId) =>
        ctx.runAction(internal.marketing.pipeline.screenshotDemoPage, { leadId })
      );

      await ctx.runMutation(internal.marketing.search.completeSearch, {
        searchId: args.searchId,
      });

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow failed";
      await ctx.runMutation(internal.marketing.search.updateSearchStatus, {
        searchId: args.searchId,
        status: "failed",
        error: message,
      });
      throw error;
    }
  },
});
