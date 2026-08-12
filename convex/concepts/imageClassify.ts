"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  PACK_ANALYSIS_MAX_TOTAL_BYTES,
  PACK_CLASSIFICATION_PROMPT_VERSION,
  buildPackClassificationSystemPrompt,
  buildPackClassificationUserPrompt,
  parsePackClassification,
  parsePackJson,
  selectPackImagery,
  type PackItem,
} from "../../lib/concepts/facebookPack";
import {
  callVisionModel,
  getVisionModel,
  readPackImage,
  type VisionContentPart,
} from "./facebookPack";

/**
 * Choose the website images worth using, without asking a human to.
 *
 * Phase B put every staged website image in front of Layken with **Use as
 * logo**, **Add photo**, and **Reject** under each one. In practice a small
 * business site yields a favicon, three theme decorations, a stock handshake,
 * and one genuinely good photograph of a truck — twelve decisions to make the
 * same call the classifier already makes for the Facebook Pack.
 *
 * So this runs the same classifier over the staged copies, with one difference
 * in the prompt: the material came from a website rather than a Page. Only what
 * it calls a logo or a real photograph can be attached, which is the same
 * `canUsePackItemAsPageImagery` boundary the pack path uses, and stock graphics
 * and icons are explicitly named as unusable.
 *
 * The staged files are already in Convex storage and already passed the
 * remote-image checks in `imageImport.ts`, so nothing here fetches anything from
 * the business's host. It reads bytes this deployment stored.
 */

const MAX_CLASSIFICATION_TOKENS = 6_000;

export const classifyWebsiteImages = internalAction({
  args: {
    conceptId: v.id("website_concepts"),
    expectedHarvestedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const concept: Doc<"website_concepts"> | null = await ctx.runQuery(
      internal.concepts.internal.getById,
      { conceptId: args.conceptId },
    );
    // A newer harvest, a changed website, or a deleted concept all mean this
    // result describes images that are no longer the ones on the concept.
    if (!concept || concept.harvestedAt !== args.expectedHarvestedAt) {
      return null;
    }

    const staged = (concept.harvestImageCandidates ?? []).filter(
      (candidate) =>
        candidate.previewStorageId && candidate.stageStatus === "ready",
    );
    if (staged.length === 0) {
      await ctx.runMutation(
        internal.concepts.internal.failWebsiteImageAnalysis,
        {
          conceptId: args.conceptId,
          expectedHarvestedAt: args.expectedHarvestedAt,
          error:
            "No website images could be staged, so generation will continue without them.",
        },
      );
      return null;
    }

    // The classifier works on pack items, so each staged candidate is presented
    // as one. The candidate ID is reused as the item ID, which is what lets the
    // verdicts be matched back onto the harvest afterwards.
    const items: Array<PackItem<Id<"_storage">>> = staged.map((candidate) => ({
      id: candidate.id,
      kind: "image",
      storageId: candidate.previewStorageId,
      note: candidate.alt,
      capturedAt: args.expectedHarvestedAt,
    }));

    try {
      const content: Array<VisionContentPart> = [
        {
          type: "text",
          text: buildPackClassificationUserPrompt({
            businessName: concept.businessName,
            items,
          }),
        },
      ];

      const readable: Array<PackItem<Id<"_storage">>> = [];
      let totalBytes = 0;

      for (const item of items) {
        if (!item.storageId) continue;
        try {
          const image = await readPackImage(
            await ctx.storage.get(item.storageId),
            item,
          );
          // Past the request budget, the remaining images simply are not
          // considered. Twelve website images cannot exceed it in practice, and
          // stopping is better than a refused request that classifies none.
          if (totalBytes + image.bytes > PACK_ANALYSIS_MAX_TOTAL_BYTES) break;
          totalBytes += image.bytes;
          readable.push(item);
          content.push({ type: "text", text: `ITEM ${item.id}` });
          content.push({
            type: "image_url",
            image_url: { url: image.dataUrl },
          });
        } catch (error) {
          console.warn("[concepts] staged website image unreadable", {
            conceptId: args.conceptId,
            candidateId: item.id,
            error,
          });
        }
      }

      if (readable.length === 0) {
        await ctx.runMutation(
          internal.concepts.internal.failWebsiteImageAnalysis,
          {
            conceptId: args.conceptId,
            expectedHarvestedAt: args.expectedHarvestedAt,
            error:
              "The staged website images could not be read, so generation will continue without them.",
          },
        );
        return null;
      }

      const raw = await callVisionModel({
        systemPrompt: buildPackClassificationSystemPrompt("website"),
        content,
        model: getVisionModel(),
        maxTokens: MAX_CLASSIFICATION_TOKENS,
        pass: "website image classification",
      });

      const verdicts = parsePackClassification({
        json: parsePackJson(raw),
        sentItemIds: readable.map((item) => item.id),
        classifiedAt: Date.now(),
      });

      const classified = readable.map((item) => ({
        ...item,
        classification: verdicts.find((verdict) => verdict.itemId === item.id)
          ?.classification,
      }));
      const selection = selectPackImagery(classified);
      const altById = new Map(
        classified.map((item) => [item.id, item.classification?.alt]),
      );

      await ctx.runMutation(
        internal.concepts.internal.saveWebsiteImageSelection,
        {
          conceptId: args.conceptId,
          expectedHarvestedAt: args.expectedHarvestedAt,
          logoCandidateId: selection.logoItemId,
          photoCandidateIds: [
            ...(selection.heroItemId ? [selection.heroItemId] : []),
            ...selection.galleryItemIds,
          ],
          alts: classified
            .filter((item) => altById.get(item.id))
            .map((item) => ({
              candidateId: item.id,
              alt: altById.get(item.id)!,
            })),
          model: getVisionModel(),
          promptVersion: PACK_CLASSIFICATION_PROMPT_VERSION,
        },
      );
    } catch (error) {
      // A failed classification leaves the staged files in place and attaches
      // nothing. The facts from this harvest are already saved and the concept
      // is still generatable; imagery is the part that is missing, and the
      // warning says so.
      await ctx.runMutation(
        internal.concepts.internal.failWebsiteImageAnalysis,
        {
          conceptId: args.conceptId,
          expectedHarvestedAt: args.expectedHarvestedAt,
          error: `Website images could not be sorted, so none were attached: ${
            error instanceof Error ? error.message : "classification failed"
          }`,
        },
      );
    }

    return null;
  },
});
