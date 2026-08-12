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
  buildPackSourceLabels,
  isSupportedPackImageType,
  packAnalysisBlockedReason,
  parsePackClassification,
  parsePackJson,
  selectPackImagery,
  type PackItem,
} from "../../lib/concepts/facebookPack";
import {
  EVIDENCE_REVIEW_PROMPT_VERSION,
  buildApprovedEvidence,
  buildEvidenceReviewSystemPrompt,
  buildEvidenceReviewUserPrompt,
  dedupeEvidenceCandidates,
  parseEvidenceReview,
  type EvidenceCandidate,
  type EvidenceReview,
} from "../../lib/concepts/evidence";
import { detectSupportedImageMime } from "../../lib/concepts/remoteImage";
import {
  extractOpenRouterText,
  OPENROUTER_ATTRIBUTION_HEADERS,
  type OpenRouterMessageContent,
} from "../../lib/concepts/openRouter";

/**
 * Facebook Pack analysis: classify, extract, then review.
 *
 * Two model turns, deliberately separate. The first is a vision call that sorts
 * everything Layken pasted out of the prospect's Page — which image is the logo,
 * which is real work photography, which is a screenshot that can carry facts but
 * must never appear on a page — and reads the facts out of whatever text it can
 * see. The second is a text-only call that rules on those facts: it receives the
 * normalized candidates with their excerpts and decides which ones a generated
 * page may state.
 *
 * They are separate because the extractor is the wrong judge of its own output.
 * A model asked to find facts finds them; asking the same turn to also withhold
 * them makes the instruction fight itself. The reviewer sees only normalized
 * candidates and their source excerpts, with no memory of having produced them.
 *
 * Nothing here decides what reaches a generated page —
 * `lib/concepts/facebookPack.ts` and `lib/concepts/evidence.ts` own those rules,
 * and the database writes live in `concepts/internal.ts` with the rest of the
 * transactional surface.
 *
 * Images are sent as data URLs rather than Convex storage links. That costs
 * request size and buys two things worth more: the model sees exactly the bytes
 * this action verified, with no window between the check and a third-party
 * fetch, and screenshots of a prospect's Page are never handed out as URLs that
 * outlive the request.
 *
 * Node runtime because a pack can be twenty megabytes of image bytes, which is
 * past what the default Convex runtime should be asked to hold.
 */

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * The evidence and vision model, pinned rather than aliased for the same reason
 * the generator is: a silent swap changes what gets classified as a photograph.
 */
const DEFAULT_VISION_MODEL = "openai/gpt-5.6-luna";

/**
 * Both passes return a short structured answer, not a document.
 *
 * The review pass gets more room than classification: it answers per candidate
 * rather than per item, and a truncated review is a silently thinner page,
 * because every candidate it did not reach is rejected by default.
 */
const MAX_CLASSIFICATION_TOKENS = 8_000;
const MAX_REVIEW_TOKENS = 8_000;

function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is required. Set it with: npx convex env set OPENROUTER_API_KEY sk-or-...",
    );
  }
  return key;
}

export function getVisionModel(): string {
  return process.env.OPENROUTER_VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Read one stored image and prove it is the file type it claims to be.
 *
 * The declared content type was checked when the item was attached; magic bytes
 * are checked here because a declared type is a claim about a file and this is
 * the first moment the bytes themselves are in hand.
 */
export async function readPackImage(
  blob: Blob | null,
  item: Pick<PackItem<Id<"_storage">>, "contentType">,
): Promise<{ dataUrl: string; bytes: number }> {
  if (!blob) throw new Error("Pack image file is missing.");

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = detectSupportedImageMime(bytes);
  if (!mime) {
    throw new Error("Pack image is not a JPEG, PNG, or WebP file.");
  }
  if (item.contentType && item.contentType !== mime) {
    throw new Error("Pack image bytes did not match its declared file type.");
  }
  if (!isSupportedPackImageType(mime)) {
    throw new Error("Pack image type is not supported.");
  }

  return {
    dataUrl: `data:${mime};base64,${toBase64(bytes)}`,
    bytes: bytes.byteLength,
  };
}

export type VisionContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export async function callVisionModel(input: {
  systemPrompt: string;
  content: Array<VisionContentPart>;
  model: string;
  maxTokens: number;
  /** Names the pass in errors and logs, so a failure says which one broke. */
  pass: string;
}): Promise<string> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      ...OPENROUTER_ATTRIBUTION_HEADERS,
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      response_format: { type: "json_object" },
      provider: {
        // Packs can contain names, comments, messages, and other contextual
        // material copied from Facebook. Route only through endpoints that do
        // not retain provider inputs, and do not let an endpoint silently
        // ignore the structured-response requirements.
        data_collection: "deny",
        require_parameters: true,
      },
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.content },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `OpenRouter request failed: ${response.status} ${details.slice(0, 500)}`,
    );
  }

  const json = (await response.json()) as {
    id?: string;
    model?: string;
    provider?: string;
    choices?: Array<{
      message?: { content?: OpenRouterMessageContent };
      finish_reason?: string | null;
    }>;
    error?: { message?: string };
  };

  if (json.error?.message) {
    throw new Error(`OpenRouter error: ${json.error.message}`);
  }

  const choice = json.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error(
      `Model hit the ${input.maxTokens}-token cap before finishing the ${input.pass}.`,
    );
  }
  if (choice?.finish_reason === "error") {
    throw new Error("OpenRouter provider ended the completion with an error.");
  }

  const content = extractOpenRouterText(choice?.message?.content);
  if (!content) {
    console.warn(`[concepts] pack ${input.pass} returned no text`, {
      requestId: json.id ?? "unknown",
      model: json.model ?? input.model,
      provider: json.provider ?? "unknown",
      finishReason: choice?.finish_reason ?? "missing",
    });
    throw new Error(`The ${input.pass} model returned no answer.`);
  }

  return content;
}

/**
 * Rule on the extracted candidates in a second, separately prompted turn.
 *
 * Text only: the reviewer judges excerpts against the claims drawn from them,
 * and re-sending twenty megabytes of images so it can re-read a screenshot it
 * would have to trust the transcription of anyway buys nothing.
 *
 * An empty candidate list never reaches here — a pack of photographs with no
 * readable text is a normal outcome, and it should not cost a request.
 */
async function reviewEvidence(input: {
  businessName: string;
  candidates: Array<EvidenceCandidate>;
  sourceLabels: Record<string, string>;
  model: string;
}): Promise<EvidenceReview> {
  const raw = await callVisionModel({
    systemPrompt: buildEvidenceReviewSystemPrompt(),
    content: [
      {
        type: "text",
        text: buildEvidenceReviewUserPrompt({
          businessName: input.businessName,
          candidates: input.candidates,
          sourceLabels: input.sourceLabels,
        }),
      },
    ],
    model: input.model,
    maxTokens: MAX_REVIEW_TOKENS,
    pass: "evidence review",
  });

  return parseEvidenceReview({
    json: parsePackJson(raw),
    candidateIds: input.candidates.map((candidate) => candidate.id),
  });
}

export const runPackAnalysis = internalAction({
  args: {
    conceptId: v.id("website_concepts"),
    facebookPackRequestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const concept: Doc<"website_concepts"> | null = await ctx.runQuery(
      internal.concepts.internal.getById,
      { conceptId: args.conceptId },
    );
    if (!concept) return null;
    if (concept.facebookPackRequestId !== args.facebookPackRequestId) {
      return null;
    }

    const fail = async (
      message: string,
      stage?: "classification" | "review",
    ): Promise<null> => {
      await ctx.runMutation(
        internal.concepts.internal.failFacebookPackAnalysis,
        {
          conceptId: args.conceptId,
          facebookPackRequestId: args.facebookPackRequestId,
          error: message,
          stage,
        },
      );
      return null;
    };

    const items = concept.facebookPackItems ?? [];
    const blocked = packAnalysisBlockedReason(items);
    if (blocked) return await fail(blocked);

    try {
      // Item order is the manifest order, so the model can tie each attached
      // image to the ID announced immediately before it.
      const content: Array<VisionContentPart> = [
        {
          type: "text",
          text: buildPackClassificationUserPrompt({
            businessName: concept.businessName,
            items,
          }),
        },
      ];

      const unreadable = new Map<string, string>();
      let totalBytes = 0;

      for (const item of items) {
        if (item.kind !== "image") continue;
        try {
          if (!item.storageId)
            throw new Error("Pack image has no stored file.");
          const image = await readPackImage(
            await ctx.storage.get(item.storageId),
            item,
          );
          totalBytes += image.bytes;
          if (totalBytes > PACK_ANALYSIS_MAX_TOTAL_BYTES) {
            return await fail(
              "This pack is larger than the analysis limit. Remove the largest images and try again.",
            );
          }
          content.push({ type: "text", text: `ITEM ${item.id}` });
          content.push({
            type: "image_url",
            image_url: { url: image.dataUrl },
          });
        } catch (error) {
          // One unreadable file is not a failed analysis. It is recorded
          // against that item so the admin can remove and re-paste it.
          unreadable.set(
            item.id,
            error instanceof Error
              ? error.message.slice(0, 240)
              : "Pack image could not be read.",
          );
        }
      }

      const sentItemIds = items
        .filter((item) => !unreadable.has(item.id))
        .map((item) => item.id);
      if (sentItemIds.length === 0) {
        return await fail(
          "None of the items in this pack could be read. Remove them and paste again.",
        );
      }

      const model = getVisionModel();
      const raw = await callVisionModel({
        systemPrompt: buildPackClassificationSystemPrompt(),
        content,
        model,
        maxTokens: MAX_CLASSIFICATION_TOKENS,
        pass: "classification",
      });

      const classifiedAt = Date.now();
      const verdicts = parsePackClassification({
        json: parsePackJson(raw),
        sentItemIds,
        classifiedAt,
      });
      if (verdicts.length === 0) {
        return await fail(
          "The classification model returned nothing usable for this pack.",
        );
      }

      const byItemId = new Map(
        verdicts.map((verdict) => [verdict.itemId, verdict.classification]),
      );
      const classifiedItems = items.map((item) => ({
        ...item,
        classification: byItemId.get(item.id),
        classificationError:
          unreadable.get(item.id) ??
          (byItemId.has(item.id)
            ? undefined
            : "The model returned no verdict for this item."),
      }));

      // Facts are deduplicated across items before review: two screenshots of
      // the same About section otherwise put the same claim in front of the
      // reviewer twice, which can be approved once and rejected once.
      const candidates = dedupeEvidenceCandidates(
        verdicts.flatMap((verdict) => verdict.facts),
      );

      let review: EvidenceReview = { decisions: [], conflicts: [] };
      if (candidates.length > 0) {
        try {
          review = await reviewEvidence({
            businessName: concept.businessName,
            candidates,
            sourceLabels: buildPackSourceLabels(classifiedItems),
            model,
          });
        } catch (error) {
          // Nothing is stored when the reviewer fails. Saving the classification
          // with an empty evidence set would read as "this pack said nothing",
          // which is the one wrong answer here.
          return await fail(
            error instanceof Error
              ? error.message
              : "The evidence review failed.",
            "review",
          );
        }
      }

      const approved = buildApprovedEvidence({
        candidates,
        decisions: review.decisions,
      });

      await ctx.runMutation(
        internal.concepts.internal.saveFacebookPackAnalysis,
        {
          conceptId: args.conceptId,
          facebookPackRequestId: args.facebookPackRequestId,
          items: classifiedItems,
          model,
          promptVersion: PACK_CLASSIFICATION_PROMPT_VERSION,
          reviewPromptVersion: EVIDENCE_REVIEW_PROMPT_VERSION,
          evidence: {
            compiledAt: Date.now(),
            candidates,
            decisions: review.decisions,
            conflicts: review.conflicts,
            assets: selectPackImagery(classifiedItems),
          },
          approvedContent: approved.content,
          approvedQuotes: approved.quotes,
        },
      );
    } catch (error) {
      return await fail(
        error instanceof Error ? error.message : "Pack analysis failed.",
      );
    }

    return null;
  },
});
