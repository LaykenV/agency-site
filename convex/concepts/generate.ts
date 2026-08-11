import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { refreshConceptBrief } from "../../lib/concepts/brief";
import {
  CONCEPT_PROMPT_VERSION,
  buildConceptSystemPrompt,
  buildConceptUserPrompt,
  pickConceptStructure,
} from "../../lib/concepts/prompt";
import { validateConceptHtml } from "../../lib/concepts/validateConceptHtml";
import { isCurrentGeneration } from "../../lib/concepts/lifecycle";
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
 * `deepseek/deepseek-v4-flash-0731` is pinned rather than the
 * `~deepseek/deepseek-v4-flash-latest` alias: a concept is a sales artifact, and
 * a silent model swap changing how every page looks is not something to discover
 * from a prospect's reaction.
 */
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash-0731";

/** A long homepage with inline CSS runs well past a default cap. */
const MAX_OUTPUT_TOKENS = 32_000;

/** High enough for varied design, low enough to respect hard constraints. */
const TEMPERATURE = 0.7;

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
    body: JSON.stringify({
      model,
      temperature: TEMPERATURE,
      max_tokens: MAX_OUTPUT_TOKENS,
      // DeepSeek V4 Flash defaults to high reasoning. For a constrained HTML
      // generation task that can consume the output budget and return no final
      // document, while also making a cheap draft take several minutes. Low is
      // ample for following the brief and leaves most tokens for the page.
      reasoning: { effort: "low", exclude: true },
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
    const diagnostics = {
      requestId: json.id ?? "unknown",
      model: json.model ?? model,
      provider: json.provider ?? "unknown",
      finishReason: choice?.finish_reason ?? "missing",
      completionTokens: json.usage?.completion_tokens ?? "unknown",
      reasoningTokens:
        json.usage?.completion_tokens_details?.reasoning_tokens ?? "unknown",
      reasoningChars: choice?.message?.reasoning?.length ?? 0,
    };
    console.warn("[concepts] OpenRouter returned no final HTML", diagnostics);
    throw new Error(
      `OpenRouter returned no final HTML (${JSON.stringify(diagnostics)}).`,
    );
  }

  return content;
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
      const logoUrl = concept.logoStorageId
        ? ((await ctx.storage.getUrl(concept.logoStorageId)) ?? undefined)
        : undefined;

      const photoUrls: Array<string> = [];
      for (const storageId of concept.assetStorageIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) photoUrls.push(url);
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
        approvedQuotes: concept.approvedQuotes,
        approvedWebsiteContent: concept.approvedWebsiteContent,
      });

      const structure = pickConceptStructure(brief, args.structureId);
      const html = unwrapHtml(
        await callOpenRouter(
          buildConceptSystemPrompt(),
          buildConceptUserPrompt(brief, structure),
          model,
        ),
      );

      const { violations } = validateConceptHtml(html, brief);

      await ctx.runMutation(internal.concepts.internal.saveGeneration, {
        conceptId: args.conceptId,
        brief,
        generatedHtml: html,
        structureId: structure.id,
        model,
        promptVersion: CONCEPT_PROMPT_VERSION,
        violations,
        generationRequestId: args.generationRequestId,
      });
    } catch (error) {
      await ctx.runMutation(internal.concepts.internal.setStatus, {
        conceptId: args.conceptId,
        status: "failed",
        error: error instanceof Error ? error.message : "Generation failed",
        expectedGenerationRequestId: args.generationRequestId,
      });
    }

    return null;
  },
});
