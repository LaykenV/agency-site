"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { refreshConceptBrief } from "../../lib/concepts/brief";
import type { ConceptBrief } from "../../lib/concepts/brief";
import { canUsePackItemAsPageImagery } from "../../lib/concepts/facebookPack";
import { parseImageDimensions } from "../../lib/concepts/imageDimensions";
import {
  CONCEPT_PROMPT_VERSION,
  buildConceptRepairUserPrompt,
  buildConceptSystemPrompt,
  buildConceptUserPrompt,
} from "../../lib/concepts/prompt";
import { detectSupportedImageMime } from "../../lib/concepts/remoteImage";
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
 *
 * Node runtime because approved photographs ride in the same request as the
 * brief. A homepage with a logo and a handful of job photos is past what the
 * default Convex runtime should be asked to hold as data URLs.
 */

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * The generation model lives here, in code, not in an environment variable.
 * A concept is a sales artifact; which model drew it belongs in the diff that
 * changed it, next to the prompt it was tuned against.
 *
 * `moonshotai/kimi-k3` is pinned to the version, not an alias —
 * `~moonshotai/kimi-latest` exists and is deliberately not used, because a
 * silent model swap changing how every page looks is not something to discover
 * from a prospect's reaction. It replaced `x-ai/grok-4.6` on 2026-08-12, which
 * had itself replaced `meta/muse-spark-1.2` earlier the same day.
 *
 * This one was adopted on its design record rather than a side-by-side: it
 * leads OpenRouter's design-arena website, uicomponent, and codecategories
 * boards. It is also the most expensive generator this feature has run — $3
 * per million in and $15 out, against Grok's roughly 8c a page — so a
 * generation costs something closer to a quarter. That is still a rounding
 * error next to the sale a concept is trying to open, but it is a real
 * multiple, and it is the number to revisit if generation volume grows.
 *
 * Several of its endpoints advertise `max_tokens`, `temperature`, `reasoning`,
 * and `reasoning_effort`, so `require_parameters: true` narrows routing rather
 * than failing it — Moonshot's own endpoint does not take `temperature` and is
 * routed past. OpenRouter no longer publishes per-provider training policy in
 * its API, so the `data_collection: "deny"` gate below could not be confirmed
 * from metadata before this change; a failed gate is a routing error on the
 * first generation, not a quiet fallback.
 */
const DEFAULT_MODEL = "moonshotai/kimi-k3";

/** A long homepage with inline CSS runs well past a default cap. */
const MAX_OUTPUT_TOKENS = 32_000;

/** High enough for varied design, low enough to respect hard constraints. */
const TEMPERATURE = 0.7;

/**
 * Kimi K3's effort ladder is `low`, `high`, `max` — there is no `medium`, which
 * is what this was under Grok. Reasoning is on by default and defaults to
 * `max`, so this is not a value that can be left unsent: reasoning tokens are
 * billed against `max_tokens`, and a maximum-effort trace on a long
 * multimodal brief can spend the whole output budget before the document
 * starts.
 *
 * `low` is the floor deliberately. The prompt now asks for a design plan to be
 * settled before any HTML is written, and that thinking happens here, so this
 * is the first knob to try if pages come back thin — one step to `high`, with
 * an eye on `finish_reason: "length"`.
 */
const REASONING_EFFORT = "low" as const;

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

/**
 * Encoded image payload attached to one generate request.
 *
 * Measured against the base64 the request actually carries, not the raw file
 * size, because base64 inflates by about a third and the ceiling exists to
 * bound the request. Past this, remaining files are still listed in the brief
 * with size and description; they just are not sent as pixels, and the brief
 * says so per photo.
 */
const GENERATE_MAX_IMAGE_BYTES = 16 * 1024 * 1024;

/**
 * Smallest edge, in pixels, worth sending to a vision model.
 *
 * Providers reject degenerate images rather than ignoring them, and they
 * reject the whole request when they do: xAI answered a sub-8px image with a
 * 400 that failed the entire generation, and nothing about routing to another
 * provider makes that safe to send. A spacer, a favicon rendition, or a
 * tracking pixel that survived harvesting is worth nothing as design material
 * anyway, so it is dropped from the attachments and reported as unseen. Its
 * URL stays allowlisted; only the pixels are withheld.
 */
const GENERATE_MIN_IMAGE_EDGE = 16;

type VisionContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ResolvedAsset = {
  url: string;
  storageId: Id<"_storage">;
  kind: "logo" | "photo";
  alt?: string;
};

type ImageNote = NonNullable<ConceptBrief["imageNotes"]>[number];

function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is required. Set it with: npx convex env set OPENROUTER_API_KEY sk-or-...",
    );
  }
  return key;
}

/**
 * `OPENROUTER_MODEL` is an unset escape hatch for an incident — a provider
 * outage worth routing around before a deploy can land. It is not where the
 * model is configured. Leaving it set is how production ends up quietly
 * disagreeing with `DEFAULT_MODEL` about what drew a page, so unset it again
 * once the incident is over.
 */
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

function mergeImageNotes(
  lists: Array<Array<ImageNote> | undefined>,
): Array<ImageNote> {
  const byUrl = new Map<string, ImageNote>();
  for (const list of lists) {
    for (const note of list ?? []) {
      const existing = byUrl.get(note.url);
      if (!existing) {
        byUrl.set(note.url, { ...note });
        continue;
      }
      byUrl.set(note.url, {
        url: note.url,
        role: existing.role ?? note.role,
        alt: existing.alt ?? note.alt,
        width: existing.width ?? note.width,
        height: existing.height ?? note.height,
        seen: existing.seen ?? note.seen,
      });
    }
  }
  return [...byUrl.values()];
}

async function callOpenRouter(
  systemPrompt: string,
  userContent: string | Array<VisionContentPart>,
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
      // budget are one decision, and the effort is set explicitly because this
      // model reasons at `max` when left alone.
      reasoning: { effort: REASONING_EFFORT, exclude: true },
      provider: {
        // The request carries the whole verified brief — a stranger's services,
        // their owner's notes, their customers' testimonials — and now the
        // owner's own photographs. It gets the same routing restriction as the
        // evidence that produced it.
        data_collection: "deny",
        require_parameters: true,
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
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
 * Only items `canUsePackItemAsPageImagery` admits are resolved, so a selection
 * that somehow named a screenshot still cannot produce a URL.
 */
async function resolvePackImagery(
  ctx: ActionCtx,
  concept: Doc<"website_concepts">,
): Promise<{
  logo?: ResolvedAsset;
  photos: Array<ResolvedAsset>;
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
    return url
      ? {
          url,
          storageId: item.storageId,
          alt: item.classification?.alt,
        }
      : null;
  };

  const logo = await urlFor(selection.logoItemId);
  const photos: Array<ResolvedAsset> = [];

  for (const itemId of [selection.heroItemId, ...selection.galleryItemIds]) {
    const resolved = await urlFor(itemId);
    if (!resolved) continue;
    photos.push({ ...resolved, kind: "photo" });
  }

  return {
    logo: logo ? { ...logo, kind: "logo" } : undefined,
    photos,
  };
}

function websiteHarvestAlts(
  concept: Doc<"website_concepts">,
): Map<Id<"_storage">, string> {
  const alts = new Map<Id<"_storage">, string>();
  const candidates = new Map(
    (concept.harvestImageCandidates ?? []).map((candidate) => [
      candidate.id,
      candidate,
    ]),
  );
  for (const asset of concept.importedWebsiteAssets ?? []) {
    const alt = candidates.get(asset.candidateId)?.alt?.trim();
    if (alt) alts.set(asset.storageId, alt);
  }
  return alts;
}

/**
 * Read one approved file and encode it for the vision request.
 *
 * A file that cannot be read, or is not a format the model accepts, still
 * yields a note so the URL keeps its description in the brief. It just has no
 * `dataUrl`, and the caller marks it as unseen rather than dropping it
 * silently — the URL is still in the allowlist, so the model has to be told
 * the difference between a photo it can look at and one it cannot.
 */
async function readApprovedImage(
  ctx: ActionCtx,
  asset: ResolvedAsset,
): Promise<{ note: ImageNote; dataUrl?: string; encodedBytes: number }> {
  try {
    const blob = await ctx.storage.get(asset.storageId);
    if (!blob) {
      return { note: { url: asset.url, alt: asset.alt }, encodedBytes: 0 };
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const size = parseImageDimensions(bytes);
    const note: ImageNote = {
      url: asset.url,
      alt: asset.alt,
      width: size?.width,
      height: size?.height,
    };

    // Format is decided from the bytes, not a stored content type. An iPhone
    // upload can be HEIC, which the model cannot read; that photo stays in the
    // allowlist and keeps its size and description, but no pixels are sent.
    const mime = detectSupportedImageMime(bytes);
    if (!mime) return { note, encodedBytes: 0 };

    const encoded = Buffer.from(bytes).toString("base64");
    return {
      note,
      dataUrl: `data:${mime};base64,${encoded}`,
      encodedBytes: encoded.length,
    };
  } catch (error) {
    console.warn("[concepts] approved image unreadable for generation", {
      storageId: asset.storageId,
      error,
    });
    return { note: { url: asset.url, alt: asset.alt }, encodedBytes: 0 };
  }
}

/**
 * Interleave the brief with the pixels.
 *
 * Each image is preceded by its own allowlisted URL. That label is the only
 * thing tying what the model sees to what it is allowed to write into `src`,
 * and it has to be explicit: list position cannot carry it, because any photo
 * can drop out of the attachment set for a format or budget reason while
 * staying in the allowlist, and two photos off the same phone routinely share
 * a pixel size.
 */
function buildUserContent(
  prompt: string,
  images: Array<{ label: string; dataUrl: string }>,
): string | Array<VisionContentPart> {
  if (images.length === 0) return prompt;
  const content: Array<VisionContentPart> = [{ type: "text", text: prompt }];
  for (const image of images) {
    content.push({ type: "text", text: image.label });
    content.push({ type: "image_url", image_url: { url: image.dataUrl } });
  }
  return content;
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
    generationRequestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept: Doc<"website_concepts"> | null = await ctx.runQuery(
      internal.concepts.internal.getById,
      { conceptId: args.conceptId },
    );
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
      const harvestAlts = websiteHarvestAlts(concept);
      const seenUrls = new Set<string>();
      const assets: Array<ResolvedAsset> = [];

      const pushAsset = (asset: ResolvedAsset) => {
        if (seenUrls.has(asset.url)) return;
        seenUrls.add(asset.url);
        assets.push(asset);
      };

      if (concept.logoStorageId) {
        const url = await ctx.storage.getUrl(concept.logoStorageId);
        if (url) {
          pushAsset({
            url,
            storageId: concept.logoStorageId,
            kind: "logo",
            alt: harvestAlts.get(concept.logoStorageId),
          });
        }
      }

      for (const storageId of concept.assetStorageIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) {
          pushAsset({
            url,
            storageId,
            kind: "photo",
            alt: harvestAlts.get(storageId),
          });
        }
      }

      const pack = await resolvePackImagery(ctx, concept);
      if (pack.logo) {
        const existing = assets.find((asset) => asset.kind === "logo");
        if (existing) {
          existing.alt = existing.alt ?? pack.logo.alt;
        } else {
          pushAsset(pack.logo);
        }
      }
      for (const photo of pack.photos) {
        const existing = assets.find((asset) => asset.url === photo.url);
        if (existing) {
          existing.alt = existing.alt ?? photo.alt;
        } else {
          pushAsset(photo);
        }
      }

      const logoUrl = assets.find((asset) => asset.kind === "logo")?.url;
      const photoUrls = assets
        .filter((asset) => asset.kind === "photo")
        .map((asset) => asset.url);

      // Pixels for the model, and a note per file for the brief. The label on
      // each attachment repeats the allowlisted URL so the model can say
      // "this photo, in this section" and write the right `src`. Anything that
      // could not be encoded, or that the budget cut off, is marked unseen so
      // the brief can tell the model it is designing that one blind.
      const attached: Array<{ label: string; dataUrl: string }> = [];
      const measuredNotes: Array<ImageNote> = [];
      let encodedTotal = 0;

      for (const asset of assets) {
        const read = await readApprovedImage(ctx, asset);

        // Unmeasurable is not the same as too small: a format whose header we
        // could not parse still goes, because dropping a real photo over a
        // parser gap costs more than the rare provider complaint.
        const tooSmall =
          read.note.width !== undefined &&
          read.note.height !== undefined &&
          Math.min(read.note.width, read.note.height) < GENERATE_MIN_IMAGE_EDGE;

        const attachable =
          read.dataUrl !== undefined &&
          !tooSmall &&
          encodedTotal + read.encodedBytes <= GENERATE_MAX_IMAGE_BYTES;

        measuredNotes.push({ ...read.note, seen: attachable });
        if (!attachable || !read.dataUrl) continue;

        encodedTotal += read.encodedBytes;
        const size =
          read.note.width && read.note.height
            ? `${read.note.width}×${read.note.height}`
            : "size unknown";
        attached.push({
          label: `IMAGE — ${asset.kind} — ${size} — use this exact src: ${asset.url}`,
          dataUrl: read.dataUrl,
        });
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
        imageNotes: mergeImageNotes([
          assets.map((asset) => ({ url: asset.url, alt: asset.alt })),
          measuredNotes,
        ]),
        approvedQuotes: concept.approvedQuotes,
        approvedWebsiteContent: concept.approvedWebsiteContent,
        approvedFacebookContent: concept.approvedFacebookContent,
      });

      const basePrompt = buildConceptUserPrompt(brief);

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
        // Only the first attempt carries pixels. The repair edits a document
        // the model already wrote and is told not to redesign it, so re-sending
        // megabytes of base64 would buy nothing.
        html = unwrapHtml(
          await callOpenRouter(
            buildConceptSystemPrompt(),
            attempt === 1
              ? buildUserContent(requestPrompt, attached)
              : requestPrompt,
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
