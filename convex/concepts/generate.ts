import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { refreshConceptBrief } from "../../lib/concepts/brief";
import type { ConceptBrief } from "../../lib/concepts/brief";
import { canUsePackItemAsPageImagery } from "../../lib/concepts/facebookPack";
import {
  buildClaimAuditRetryInstruction,
  buildClaimAuditSystemPrompt,
  buildClaimAuditUserPrompt,
  claimAuditViolations,
  extractAuditableText,
  parseClaimAudit,
  type ClaimAudit,
} from "../../lib/concepts/claimAudit";
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

/**
 * The auditor is the evidence model, not the generator.
 *
 * Pinned to the same model that reviewed the evidence: the audit asks the same
 * question the reviewer asked, one step later, and answering it well is a
 * reading task rather than a writing one.
 */
const DEFAULT_AUDIT_MODEL = "openai/gpt-5.6-luna";

/** A long homepage with inline CSS runs well past a default cap. */
const MAX_OUTPUT_TOKENS = 32_000;

/** The audit returns a claim list, not a document, but a long page has many. */
const MAX_AUDIT_TOKENS = 8_000;

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

/** Shares `OPENROUTER_VISION_MODEL` with pack analysis: one evidence model. */
function getAuditModel(): string {
  return process.env.OPENROUTER_VISION_MODEL?.trim() || DEFAULT_AUDIT_MODEL;
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

/**
 * Ask the evidence model whether the page's claims survive the brief.
 *
 * A separate model from the generator on purpose: the auditor has never seen
 * the page being written and has no investment in keeping a good sentence. It
 *
 * Do not send `temperature` here. Luna's OpenRouter endpoint does not advertise
 * that parameter, and `require_parameters: true` correctly rejects the request
 * when an unsupported parameter is present. The audit remains constrained by
 * its prompt and structured JSON response.
 */
async function auditGeneratedClaims(input: {
  brief: ConceptBrief;
  html: string;
}): Promise<ClaimAudit | null> {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      ...OPENROUTER_ATTRIBUTION_HEADERS,
    },
    body: JSON.stringify({
      model: getAuditModel(),
      max_tokens: MAX_AUDIT_TOKENS,
      response_format: { type: "json_object" },
      provider: { data_collection: "deny", require_parameters: true },
      messages: [
        { role: "system", content: buildClaimAuditSystemPrompt() },
        {
          role: "user",
          content: buildClaimAuditUserPrompt({
            brief: input.brief,
            pageText: extractAuditableText(input.html),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Claim audit request failed: ${response.status} ${details.slice(0, 500)}`,
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{
      message?: { content?: OpenRouterMessageContent };
      finish_reason?: string | null;
    }>;
    error?: { message?: string };
  };
  if (json.error?.message) {
    throw new Error(`Claim audit error: ${json.error.message}`);
  }

  const choice = json.choices?.[0];
  // A truncated audit has silently stopped listing claims, and the ones it
  // never reached would read as approved. That is the one failure mode this
  // check exists to prevent, so it is an audit failure, not a short pass.
  if (choice?.finish_reason === "length") {
    throw new Error(
      `Claim audit hit the ${MAX_AUDIT_TOKENS}-token cap before finishing.`,
    );
  }
  if (choice?.finish_reason === "error") {
    throw new Error("Claim audit provider ended the completion with an error.");
  }

  const content = extractOpenRouterText(choice?.message?.content);
  if (!content) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  return parseClaimAudit(parsed);
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
    ...selection.galleryItemIds.map(
      (itemId) => [itemId, "gallery"] as const,
    ),
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
        imageNotes: pack.photos.filter((photo) => photoUrls.includes(photo.url)),
        approvedQuotes: concept.approvedQuotes,
        approvedWebsiteContent: concept.approvedWebsiteContent,
        approvedFacebookContent: concept.approvedFacebookContent,
      });

      const structure = pickConceptStructure(brief, args.structureId);
      const basePrompt = buildConceptUserPrompt(brief, structure);

      let html = "";
      let violations: Array<string> = [];
      let correction = "";

      // At most two attempts. The second exists for one specific failure — the
      // page states something the brief does not support — and it is given the
      // offending sentences rather than a repeat of the rules that already
      // failed to prevent them. A deterministic validation failure is not
      // retried here: those are prompt bugs, and the invalid draft is kept
      // precisely so the prompt can be fixed by looking at it.
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        html = unwrapHtml(
          await callOpenRouter(
            buildConceptSystemPrompt(),
            `${basePrompt}${correction}`,
            model,
          ),
        );

        violations = validateConceptHtml(html, brief).violations;
        if (violations.length > 0) break;

        const audit = await auditGeneratedClaims({ brief, html });
        if (!audit) {
          // The auditor answered with something unreadable. Treated as a
          // failure rather than a pass, and not retried, because a second
          // unreadable answer costs another generation to learn nothing.
          violations = [
            "The factual audit did not return a readable answer. Regenerate to try again.",
          ];
          break;
        }

        if (audit.unsupported.length === 0) break;

        violations = claimAuditViolations(audit);
        if (attempt === 2) break;

        // The retry is a second paid generation, so it takes a second token
        // from the same daily ceiling. Refusing it leaves the audited failure
        // on screen, which is the honest outcome when the budget is spent.
        const retryAllowed: boolean = await ctx.runMutation(
          internal.concepts.internal.reserveGenerationRetry,
          { conceptId: args.conceptId },
        );
        if (!retryAllowed) break;

        correction = buildClaimAuditRetryInstruction(audit);
      }

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
