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
  isSupportedPackImageType,
  packAnalysisBlockedReason,
  parsePackClassification,
  parsePackConflicts,
  parsePackJson,
  selectPackImagery,
  type PackItem,
} from "../../lib/concepts/facebookPack";
import {
  buildApprovedEvidence,
  dedupeEvidenceCandidates,
  remapEvidenceRefIndex,
  resolveEvidenceLocally,
} from "../../lib/concepts/evidence";
import { detectSupportedImageMime } from "../../lib/concepts/remoteImage";
import {
  extractOpenRouterText,
  OPENROUTER_ATTRIBUTION_HEADERS,
  type OpenRouterMessageContent,
} from "../../lib/concepts/openRouter";

/**
 * Facebook Pack analysis: one pass that classifies, extracts, and flags.
 *
 * A single vision call sorts everything Layken pasted out of the prospect's
 * Page — which image is the logo, which is real work photography, which is a
 * screenshot that can carry facts but must never appear on a page — reads the
 * facts out of whatever text it can see, and names any facts that contradict
 * each other.
 *
 * There used to be a second turn that ruled on those facts. It was removed: it
 * asked the same model to reconsider material it had just read, which is not the
 * independent check it resembled, and it cost a request, a failure mode, and a
 * share of the rate limit on every pack. The exclusion rules it applied now sit
 * in the extraction prompt, where the source is still in front of the model, and
 * admission is decided by `resolveEvidenceLocally` from the stored candidates.
 *
 * The independent check that survives is the one that reads a different
 * artifact: the final claim audit in `concepts/generate.ts`, which examines a
 * finished page written by a different model. Better extraction cannot prevent a
 * generator from adding a claim afterwards, so that audit stays.
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
 * The pass returns a short structured answer, not a document.
 *
 * Raised from the 8,000 the classification-only pass used, for two reasons that
 * compound. The pass now carries the exclusion work the review turn used to do,
 * so its answer is longer; and reasoning tokens are billed against this same
 * cap, so `medium` effort spends part of it before the first character of JSON.
 * A truncated answer here is a silently thinner page, because every item and
 * fact the model did not reach is simply absent.
 */
const MAX_ANALYSIS_TOKENS = 16_000;

/**
 * Medium reasoning, set explicitly rather than left to the endpoint default.
 *
 * This pass does OCR, classification, and structured extraction, and now also
 * applies the exclusion rules. Low is thin for deciding whether an excerpt
 * really supports a licence claim; high buys little on a reading task and is
 * paid in latency on every pack. Verified supported on every Luna endpoint, so
 * `require_parameters: true` will not reject the request over it.
 */
const REASONING_EFFORT = "medium" as const;

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
      reasoning: { effort: REASONING_EFFORT, exclude: true },
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
        maxTokens: MAX_ANALYSIS_TOKENS,
        pass: "analysis",
      });

      const classifiedAt = Date.now();
      const parsed = parsePackJson(raw);
      const verdicts = parsePackClassification({
        json: parsed,
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
      const sourceCandidates = verdicts.flatMap((verdict) => verdict.facts);
      const candidates = dedupeEvidenceCandidates(sourceCandidates);

      // No second request. The exclusion rules the reviewer used now run inside
      // the extraction prompt, and admission is decided here from the stored
      // candidates: an exact excerpt, an admissible kind, and nothing the
      // extractor flagged as contradicted.
      const {
        conflicts,
        refIndex: sourceRefIndex,
        truncated: conflictsTruncated,
      } = parsePackConflicts({
        json: parsed,
        verdicts,
      });

      // Every extracted fact must be addressable by a unique short ref, and
      // every ref used by a conflict must resolve. An incomplete conflict map is
      // not a harmless warning: it could approve one side of a disagreement.
      const factRefCount = verdicts.reduce(
        (sum, verdict) => sum + verdict.factRefs.length,
        0,
      );
      if (factRefCount !== sourceCandidates.length) {
        return await fail(
          "The analysis returned a fact without a conflict reference. Re-analyze the pack.",
          "classification",
        );
      }
      if (conflictsTruncated) {
        return await fail(
          "The analysis returned more conflict data than can be verified safely. Re-analyze a smaller pack.",
          "classification",
        );
      }
      for (const conflict of conflicts) {
        if (
          new Set(conflict.refs).size < 2 ||
          conflict.refs.some((ref) => (sourceRefIndex[ref]?.length ?? 0) === 0)
        ) {
          return await fail(
            "The analysis reported a conflict it could not resolve to both facts. Re-analyze the pack.",
            "classification",
          );
        }
      }

      const refIndex = remapEvidenceRefIndex({
        sourceCandidates,
        candidates,
        refIndex: sourceRefIndex,
      });
      const review = resolveEvidenceLocally({
        candidates,
        conflicts,
        refIndex,
      });

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
          // There is no separate review prompt any more. The field stays in the
          // schema until the stored rows that have one are migrated; leaving it
          // unset is what "this row was decided in one pass" looks like.
          reviewPromptVersion: undefined,
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
