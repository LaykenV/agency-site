import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { refreshConceptBrief } from "../../lib/concepts/brief";
import { canUsePackItemAsPageImagery } from "../../lib/concepts/facebookPack";
import {
  CONCEPT_PROMPT_VERSION,
  buildConceptRepairUserPrompt,
  buildConceptSystemPrompt,
  buildConceptUserPrompt,
  pickConceptStructure,
} from "../../lib/concepts/prompt";
import {
  buildHtmlRepairInstruction,
  validateConceptHtml,
} from "../../lib/concepts/validateConceptHtml";
import {
  isCurrentGeneration,
  type ConceptGenerationFailure,
} from "../../lib/concepts/lifecycle";
import {
  extractOpenRouterText,
  OPENROUTER_ATTRIBUTION_HEADERS,
  type OpenRouterMessageContent,
} from "../../lib/concepts/openRouter";

/**
 * Concept generation via OpenRouter.
 *
 * OpenRouter is called directly with `fetch` rather than through an AI SDK
 * provider: the request is one non-streaming chat completion, and the repo's
 * existing `@ai-sdk/groq` provider does not reach OpenRouter. Adding a second
 * provider dependency to send one JSON body would be the larger change.
 *
 * The model is configurable so the cheap default can be compared against a
 * stronger one without a deploy. Design quality is the whole product here, and
 * the honest expectation is that this is the knob most worth turning.
 */

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * `meta/muse-spark-1.2` is pinned to the version, not an alias: a concept is a
 * sales artifact, and a silent model swap changing how every page looks is not
 * something to discover from a prospect's reaction.
 *
 * Its endpoint advertises `max_tokens`, `temperature`, `response_format`, and
 * configurable reasoning, so `require_parameters: true` will not reject the
 * request over any parameter sent below.
 */
const DEFAULT_MODEL = "meta/muse-spark-1.2";

/** A long homepage with inline CSS runs well past a default cap. */
const MAX_OUTPUT_TOKENS = 32_000;

/** High enough for varied design, low enough to respect hard constraints. */
const TEMPERATURE = 0.7;

/**
 * Medium reasoning: enough to hold a long brief and a structure together,
 * without paying high-effort latency on what is mostly a writing task.
 */
const REASONING_EFFORT = "medium" as const;

/**
 * A generation that has not returned in four minutes is not going to.
 *
 * Without this a stalled provider leaves the concept sitting in `generating`
 * until the Convex action itself times out, with no error to read and no way to
 * start again. `AbortSignal.timeout` turns that into a failure with a sentence
 * on it.
 */
const REQUEST_TIMEOUT_MS = 240_000;

/**
 * Every paid call in one generation run shares this budget.
 *
 * Two attempts total. A first draft that fails the deterministic HTML
 * validator gets one charged repair. There is no post-generation claim audit:
 * a concept preview is a sales sketch, and the human review card is the gate
 * before anyone else sees it.
 */
const MAX_GENERATION_ATTEMPTS = 2;

function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is required. Set it with: npx convex env set OPENROUTER_API_KEY sk-or-...",
    );
  }
  return key;
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Strip a markdown fence if the model wrapped the document in one.
 *
 * The prompt forbids fences, but every model does it occasionally, and throwing
 * away an otherwise good page over three backticks would be silly.
 */
function unwrapHtml(raw: string): string {
  let text = raw.trim();

  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:html)?[ \t]*\r?\n?/i, "")
      .replace(/\r?\n?```\s*$/, "");
  }

  // Some models emit a sentence before the document. Anything before the
  // doctype or opening <html> is commentary, not markup.
  const docTypeIndex = text.search(/<!doctype html/i);
  if (docTypeIndex > 0) {
    text = text.slice(docTypeIndex);
  } else if (docTypeIndex === -1) {
    const htmlIndex = text.search(/<html[\s>]/i);
    if (htmlIndex > 0) text = text.slice(htmlIndex);
  }

  return text.trim();
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      // OpenRouter attribution headers. Optional, but they make spend on the
      // dashboard traceable to this feature.
      ...OPENROUTER_ATTRIBUTION_HEADERS,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: TEMPERATURE,
      max_tokens: MAX_OUTPUT_TOKENS,
      // Reasoning tokens are billed against `max_tokens`, so effort and output
      // budget are one decision. Medium measured around 600 reasoning tokens on
      // a full homepage brief, which leaves the document plenty of room.
      reasoning: { effort: REASONING_EFFORT, exclude: true },
      provider: {
        // The prompt carries the whole verified brief: a stranger's services,
        // their owner's notes, and their customers' testimonials. It gets the
        // same routing restriction as the evidence that produced it.
        data_collection: "deny",
        require_parameters: true,
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
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
      message?: {
        content?: OpenRouterMessageContent;
        reasoning?: string | null;
      };
      finish_reason?: string | null;
    }>;
    error?: { message?: string };
    usage?: {
      completion_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  };

  if (json.error?.message) {
    throw new Error(`OpenRouter error: ${json.error.message}`);
  }

  const choice = json.choices?.[0];

  // A truncated document is never valid HTML, and saying so plainly beats a
  // pile of confusing validation violations.
  if (choice?.finish_reason === "length") {
    throw new Error(
      `Model hit the ${MAX_OUTPUT_TOKENS}-token output cap before finishing the document.`,
    );
  }
  if (choice?.finish_reason === "error") {
    throw new Error("OpenRouter provider ended the completion with an error.");
  }

  const content = extractOpenRouterText(choice?.message?.content);
  if (!content) {
    const usage = json.usage;
    const reasoningTokens =
      usage?.completion_tokens_details?.reasoning_tokens ?? 0;
    const diagnostics = {
      requestId: json.id ?? "unknown",
      model: json.model ?? model,
      provider: json.provider ?? "unknown",
      finishReason: choice?.finish_reason ?? "missing",
      choices: json.choices?.length ?? 0,
      completionTokens: usage?.completion_tokens ?? "unknown",
      reasoningTokens,
      reasoningChars: choice?.message?.reasoning?.length ?? 0,
      /** Content-type shape, to tell "no message" from "message with no text". */
      contentShape: Array.isArray(choice?.message?.content)
        ? `array(${choice.message.content.length})`
        : typeof choice?.message?.content,
    };
    console.warn("[concepts] OpenRouter returned no final HTML", diagnostics);

    // The single most common cause, named plainly instead of leaving it to be
    // inferred from two numbers in a JSON blob: reasoning ate the budget.
    const hint =
      reasoningTokens > 0 &&
      usage?.completion_tokens !== undefined &&
      reasoningTokens >= usage.completion_tokens
        ? " The whole completion was reasoning tokens, so the output budget was spent before the document started."
        : "";

    throw new Error(
      `${model} returned no final HTML.${hint} Diagnostics: ${JSON.stringify(diagnostics)}`,
    );
  }

  return content;
}

/**
 * Turn the reviewer's visual selection into URLs the page may reference.
 *
 * Two rules live here. Only items `canUsePackItemAsPageImagery` admits are
 * resolved at all, so a selection record that somehow named a screenshot still
 * cannot produce a URL. And the hero comes first in `photoUrls`, because the
 * prompt asks for a lead image and the model reads the list in order.
 */
async function resolvePackImagery(
  ctx: ActionCtx,
  concept: Doc<"website_concepts">,
): Promise<{
  logoUrl?: string;
  photos: Array<{
    url: string;
    role?: "hero" | "gallery" | "background" | "supporting";
    alt?: string;
  }>;
}> {
  const selection = concept.facebookEvidence?.assets;
  const items = concept.facebookPackItems ?? [];
  if (!selection) return { photos: [] };

  const usable = new Map(
    items
      .filter((item) => canUsePackItemAsPageImagery(item) && item.storageId)
      .map((item) => [item.id, item]),
  );

  const urlFor = async (itemId: string | undefined) => {
    const item = itemId ? usable.get(itemId) : undefined;
    if (!item?.storageId) return null;
    const url = await ctx.storage.getUrl(item.storageId);
    return url ? { url, item } : null;
  };

  const logo = await urlFor(selection.logoItemId);
  const photos: Array<{
    url: string;
    role?: "hero" | "gallery" | "background" | "supporting";
    alt?: string;
  }> = [];

  for (const [itemId, role] of [
    [selection.heroItemId, "hero"] as const,
    ...selection.galleryItemIds.map((itemId) => [itemId, "gallery"] as const),
  ]) {
    const resolved = await urlFor(itemId);
    if (!resolved) continue;
    photos.push({
      url: resolved.url,
      role,
      alt: resolved.item.classification?.alt,
    });
  }

  return { logoUrl: logo?.url, photos };
}

/**
 * Take a token from the daily ceiling for the one repair attempt.
 *
 * A repair is a second paid generation, so it is charged like one. Refusing it
 * leaves the failed draft on screen with its reason, which is the honest outcome
 * when the budget is spent.
 */
async function reserveRepair(
  ctx: ActionCtx,
  conceptId: Id<"website_concepts">,
): Promise<boolean> {
  return await ctx.runMutation(
    internal.concepts.internal.reserveGenerationRetry,
    { conceptId },
  );
}

/** Sort a thrown provider failure into something the admin card can act on. */
function classifyThrownFailure(message: string): ConceptGenerationFailure {
  return /rate[- ]?limit|429|too many requests|temporar(?:y|ily)|overload|unavailable|503|529/i.test(
    message,
  )
    ? "provider_rate_limited"
    : "provider_error";
}

export const runGeneration = internalAction({
  args: {
    conceptId: v.id("website_concepts"),
    /** Force a specific page shape instead of the fit-based pick. */
    structureId: v.optional(v.string()),
    generationRequestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.runQuery(internal.concepts.internal.getById, {
      conceptId: args.conceptId,
    });
    if (!concept) return null;
    if (!isCurrentGeneration(concept, args.generationRequestId)) {
      return null;
    }

    if (!concept.researchBrief) {
      await ctx.runMutation(internal.concepts.internal.setStatus, {
        conceptId: args.conceptId,
        status: "failed",
        error: "Cannot generate before enrichment has produced a brief.",
        expectedGenerationRequestId: args.generationRequestId,
      });
      return null;
    }

    const model = getModel();

    try {
      // Asset URLs are resolved now rather than reused from the stored brief, so
      // photos uploaded after enrichment reach the page.
      let logoUrl = concept.logoStorageId
        ? ((await ctx.storage.getUrl(concept.logoStorageId)) ?? undefined)
        : undefined;

      const photoUrls: Array<string> = [];
      for (const storageId of concept.assetStorageIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) photoUrls.push(url);
      }

      // Imagery the evidence reviewer selected out of the Facebook Pack. It is
      // resolved after the manual assets and never replaces them: an upload is
      // Layken making a decision, and a model's pick does not overrule that.
      const pack = await resolvePackImagery(ctx, concept);
      if (!logoUrl && pack.logoUrl) {
        logoUrl = pack.logoUrl;
      }
      for (const photo of pack.photos) {
        if (!photoUrls.includes(photo.url)) photoUrls.push(photo.url);
      }

      const brief = refreshConceptBrief({
        research: concept.researchBrief,
        businessName: concept.businessName,
        phone: concept.phone,
        serviceArea: concept.serviceArea,
        notes: concept.notes,
        facebookPageUrl: concept.facebookPageUrl,
        logoUrl,
        photoUrls,
        imageNotes: pack.photos.filter((photo) =>
          photoUrls.includes(photo.url),
        ),
        approvedQuotes: concept.approvedQuotes,
        approvedWebsiteContent: concept.approvedWebsiteContent,
        approvedFacebookContent: concept.approvedFacebookContent,
      });

      const structure = pickConceptStructure(brief, args.structureId);
      const basePrompt = buildConceptUserPrompt(brief, structure);

      let html = "";
      let violations: Array<string> = [];
      let failure: ConceptGenerationFailure | undefined;
      let correction = "";

      // One shared budget. A first draft that fails the HTML validator spends
      // the same single repair, so no run can produce a third generation. The
      // repair receives both the exact failed document and the specific
      // offending lines.
      for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const requestPrompt =
          attempt === 1
            ? basePrompt
            : buildConceptRepairUserPrompt({
                basePrompt,
                previousHtml: html,
                correction,
              });
        html = unwrapHtml(
          await callOpenRouter(
            buildConceptSystemPrompt(),
            requestPrompt,
            model,
          ),
        );

        violations = validateConceptHtml(html, brief).violations;
        if (violations.length === 0) {
          failure = undefined;
          break;
        }

        failure = "html_invalid";
        if (attempt === MAX_GENERATION_ATTEMPTS) break;
        if (!(await reserveRepair(ctx, args.conceptId))) break;
        correction = buildHtmlRepairInstruction(violations);
      }

      await ctx.runMutation(internal.concepts.internal.saveGeneration, {
        conceptId: args.conceptId,
        brief,
        generatedHtml: html,
        structureId: structure.id,
        model,
        promptVersion: CONCEPT_PROMPT_VERSION,
        violations,
        failure,
        generationRequestId: args.generationRequestId,
      });
    } catch (error) {
      // A timeout aborts the fetch, which surfaces as a DOMException rather
      // than a provider message. Named here so the card does not report a
      // four-minute stall as an unexplained failure.
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      const message = timedOut
        ? `The model did not respond within ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds and the request was cancelled.`
        : error instanceof Error
          ? error.message
          : "Generation failed";

      await ctx.runMutation(internal.concepts.internal.setStatus, {
        conceptId: args.conceptId,
        status: "failed",
        error: message,
        failure: timedOut ? "provider_error" : classifyThrownFailure(message),
        expectedGenerationRequestId: args.generationRequestId,
      });
    }

    return null;
  },
});
