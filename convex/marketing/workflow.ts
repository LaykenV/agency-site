import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: 2,
  },
});

export const marketingSearchWorkflow = workflow.define({
  args: {
    searchId: v.id("marketing_searches"),
  },
  handler: async (step, { searchId }) => {
    // Step 1: Google Places search → writes leads to DB, returns IDs
    const leadIds = await step.runAction(
      internal.marketing.pipeline.executeSearch,
      { searchId },
      { retry: true },
    );

    // Step 2: Transition to scraping phase
    await step.runMutation(
      internal.marketing.search.updateSearchStatus,
      { searchId, status: "scraping" as const },
    );

    // Step 2b: Scrape each lead's website (Firecrawl + PageSpeed)
    await Promise.all(
      leadIds.map((leadId) =>
        step.runAction(
          internal.marketing.pipeline.scrapeOneLead,
          { leadId },
          { retry: { maxAttempts: 2, initialBackoffMs: 3000, base: 2 } },
        ),
      ),
    );

    // Step 3: Transition to analyzing phase
    await step.runMutation(
      internal.marketing.search.updateSearchStatus,
      { searchId, status: "analyzing" as const },
    );

    // Step 3b: AI analyze each lead (Groq)
    await Promise.all(
      leadIds.map((leadId) =>
        step.runAction(
          internal.marketing.pipeline.analyzeOneLead,
          { leadId },
          { retry: true },
        ),
      ),
    );

    // Step 4: Screenshot demo pages for qualified leads
    const qualifiedIds = await step.runQuery(
      internal.marketing.search.internalGetQualifiedLeadIds,
      { searchId },
    );

    await Promise.all(
      qualifiedIds.map((leadId) =>
        step.runAction(
          internal.marketing.pipeline.screenshotDemoPage,
          { leadId },
          { retry: { maxAttempts: 2, initialBackoffMs: 3000, base: 2 } },
        ),
      ),
    );

    // Step 5: Mark search complete
    await step.runMutation(
      internal.marketing.search.completeSearch,
      { searchId },
    );
  },
});
