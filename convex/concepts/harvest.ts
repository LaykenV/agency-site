import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  HARVEST_MAX_MAP_URLS,
  buildHarvestSnapshot,
  isSameHarvestHost,
  parsePageExtraction,
  selectHarvestPages,
  type HarvestPageType,
  type MapResult,
  type PageExtraction,
  type SelectedPage,
} from "../../lib/concepts/harvest";
import {
  harvestCandidatesToEvidence,
  resolveEvidenceLocally,
} from "../../lib/concepts/evidence";

/**
 * Structured harvesting of a prospect's existing website: the gap-fill source.
 *
 * One Firecrawl Map call discovers the site's URLs, then at most six targeted
 * Scrape calls read the pages a human would have opened. Deliberately not
 * Firecrawl's crawl job or its autonomous Agent: the domain is already known,
 * the page count is small, and a bounded synchronous sequence is cheaper to
 * run, easier to retry, and possible to explain from the logs afterwards.
 *
 * What happens next is now a server rule rather than a model turn. The
 * candidates were cut deterministically out of each page's own text, so they go
 * straight to `resolveEvidenceLocally`: a website no longer produces a queue of
 * checkboxes, no longer parks the concept in `content_review`, and no longer
 * spends a request re-reading text it already has. The contract underneath is
 * unchanged — every candidate carries a source excerpt and a page URL,
 * `lib/concepts/evidence.ts` decides what an approval may become, and the
 * database writes live in `concepts/internal.ts`.
 *
 * Failure is partial by design. A page that will not scrape becomes a warning,
 * not a lost harvest, and a Firecrawl-wide failure leaves the concept exactly as
 * it was, with manual notes and uploads untouched.
 */

const FIRECRAWL_MAP_ENDPOINT = "https://api.firecrawl.dev/v2/map";
const FIRECRAWL_SCRAPE_ENDPOINT = "https://api.firecrawl.dev/v2/scrape";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** The evidence model, shared with pack analysis and the final claim audit. */
const DEFAULT_REVIEW_MODEL = "openai/gpt-5.6-luna";
const MAX_REVIEW_TOKENS = 8_000;

function getReviewModel(): string {
  return process.env.OPENROUTER_VISION_MODEL?.trim() || DEFAULT_REVIEW_MODEL;
}

/** Firecrawl's cache, in milliseconds. Bypassed by an explicit refresh. */
const FIRECRAWL_CACHE_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 700;

function getFirecrawlApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is required");
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST to Firecrawl, retrying only what is worth retrying.
 *
 * `429` and `5xx` are transient and get capped exponential backoff. A `4xx`
 * that is not `429` means the request itself is wrong — a bad URL, a blocked
 * page, a revoked key — and repeating it just spends time and credits.
 */
async function firecrawlPost(
  endpoint: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getFirecrawlApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const payload = (await response.json()) as Record<string, unknown>;
      if (payload.success !== true) {
        throw new Error("Firecrawl returned an unsuccessful response.");
      }
      return payload;
    }

    const details = (await response.text()).slice(0, 300);
    lastError = `${response.status} ${details}`;

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
  }

  throw new Error(`Firecrawl request failed: ${lastError}`);
}

/** Firecrawl returns map links as objects or bare strings depending on version. */
function toMapResults(payload: Record<string, unknown>): Array<MapResult> {
  const raw = Array.isArray(payload.links)
    ? payload.links
    : Array.isArray(payload.urls)
      ? payload.urls
      : [];

  const results: Array<MapResult> = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      results.push({ url: entry });
      continue;
    }
    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      if (typeof record.url === "string") {
        results.push({
          url: record.url,
          title: typeof record.title === "string" ? record.title : undefined,
          description:
            typeof record.description === "string"
              ? record.description
              : undefined,
        });
      }
    }
  }
  return results;
}

/**
 * The extraction schema.
 *
 * It asks for candidates with evidence, not for a finished company profile.
 * Every factual array carries an `evidence` excerpt because a candidate that
 * cannot be checked against its own page is dropped during normalization.
 */
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    pageType: {
      type: "string",
      enum: ["home", "services", "about", "gallery", "contact", "faq", "other"],
    },
    taglines: { type: "array", items: { type: "string" } },
    aboutSections: { type: "array", items: { type: "string" } },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["name", "evidence"],
      },
    },
    serviceAreas: {
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "string" }, evidence: { type: "string" } },
        required: ["value", "evidence"],
      },
    },
    differentiators: {
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "string" }, evidence: { type: "string" } },
        required: ["value", "evidence"],
      },
    },
    sensitiveClaims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          type: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["value", "evidence"],
      },
    },
    phones: {
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "string" }, evidence: { type: "string" } },
        required: ["value", "evidence"],
      },
    },
    hours: {
      type: "array",
      items: {
        type: "object",
        properties: { value: { type: "string" }, evidence: { type: "string" } },
        required: ["value", "evidence"],
      },
    },
    socialLinks: {
      type: "array",
      items: {
        type: "object",
        properties: { platform: { type: "string" }, url: { type: "string" } },
      },
    },
    quotes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          author: { type: "string" },
          rating: { type: "number" },
          evidence: { type: "string" },
        },
        required: ["text"],
      },
    },
    imageSelections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          roleHint: { type: "string", enum: ["logo", "photo"] },
          alt: { type: "string" },
        },
        required: ["url"],
      },
    },
  },
} as const;

const EXTRACTION_PROMPT = [
  "Extract what this business says about itself, as candidates for human review.",
  "Every factual item must include a short verbatim excerpt from the page in its `evidence` field.",
  "Put credentials, licences, insurance, bonding, awards, guarantees, warranties, prices, financing, years in business, statistics, and 24/7 or emergency availability in `sensitiveClaims`.",
  "Put customer testimonials in `quotes` with their attribution.",
  "For `imageSelections`, choose only from image URLs that appear on this page, copied exactly. Do not construct or guess a URL.",
  "Omit anything the page does not actually say. Do not summarize generously, and do not invent.",
].join(" ");

/** Firecrawl's `images` result: strings, or objects carrying `url`/`src`. */
function toImageUrls(value: unknown): Array<string> {
  if (!Array.isArray(value)) return [];
  const urls: Array<string> = [];
  for (const entry of value.slice(0, 200)) {
    if (typeof entry === "string") {
      urls.push(entry);
    } else if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const url = record.url ?? record.src ?? record.imageUrl;
      if (typeof url === "string") urls.push(url);
    }
  }
  return urls;
}

function toBrandingLogoUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const branding = value as Record<string, unknown>;
  const direct = branding.logoUrl ?? branding.logo ?? branding.favicon;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") {
    const nested = (direct as Record<string, unknown>).url;
    if (typeof nested === "string") return nested;
  }
  return undefined;
}

/**
 * Scrape one selected page.
 *
 * The homepage uses `onlyMainContent: false` so navigation, footer contact
 * details, social links, and the logo stay visible; every other page uses
 * `onlyMainContent: true` because their value is the body copy and the
 * boilerplate is the same on all of them.
 */
async function scrapePage(
  page: SelectedPage,
  options: { bypassCache: boolean },
): Promise<PageExtraction> {
  const isHome = page.pageType === "home";

  const formats: Array<Record<string, unknown>> = [
    { type: "markdown" },
    { type: "images" },
    { type: "json", schema: EXTRACTION_SCHEMA, prompt: EXTRACTION_PROMPT },
  ];
  if (isHome) formats.push({ type: "branding" });

  const payload = await firecrawlPost(FIRECRAWL_SCRAPE_ENDPOINT, {
    url: page.url,
    onlyMainContent: !isHome,
    formats,
    maxAge: options.bypassCache ? 0 : FIRECRAWL_CACHE_MAX_AGE_MS,
  });

  const data = (payload.data ?? {}) as Record<string, unknown>;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Firecrawl returned no scrape data.");
  }

  const metadata =
    data.metadata &&
    typeof data.metadata === "object" &&
    !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {};
  for (const key of ["sourceURL", "url"] as const) {
    const returnedUrl = metadata[key];
    if (
      typeof returnedUrl === "string" &&
      !isSameHarvestHost(page.url, returnedUrl)
    ) {
      throw new Error(
        `Firecrawl followed ${page.url} outside the verified website.`,
      );
    }
  }

  // The page type and source URL chosen by the server win over model output.
  // Markdown is carried only long enough to prove every extracted value and
  // evidence excerpt came from this page; it is never persisted.
  return parsePageExtraction({
    sourceUrl: page.url,
    pageType: page.pageType,
    json: data.json,
    sourceText: typeof data.markdown === "string" ? data.markdown : undefined,
    rawImageUrls: toImageUrls(data.images),
    brandingLogoUrl: isHome ? toBrandingLogoUrl(data.branding) : undefined,
  });
}

/**
 * Map, scrape, normalize, and park the concept for review.
 *
 * The request ID is checked when the result is saved, not here, so a slow
 * harvest that finishes after Layken changed the website URL or started a
 * refresh is discarded rather than overwriting the newer snapshot.
 */
export const runHarvest = internalAction({
  args: {
    conceptId: v.id("website_concepts"),
    harvestRequestId: v.string(),
    /** An explicit refresh bypasses Firecrawl's cache. */
    bypassCache: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const concept: Doc<"website_concepts"> | null = await ctx.runQuery(
      internal.concepts.internal.getById,
      { conceptId: args.conceptId },
    );
    if (!concept) return null;

    const siteUrl = concept.verifiedWebsiteUrl ?? concept.submittedWebsiteUrl;
    if (!siteUrl) {
      await ctx.runMutation(internal.concepts.internal.failHarvest, {
        conceptId: args.conceptId,
        harvestRequestId: args.harvestRequestId,
        error: "This concept has no website to harvest.",
      });
      return null;
    }

    try {
      const mapPayload = await firecrawlPost(FIRECRAWL_MAP_ENDPOINT, {
        url: siteUrl,
        limit: HARVEST_MAX_MAP_URLS,
        includeSubdomains: false,
        ignoreQueryParameters: true,
      });

      const { pages, warnings } = selectHarvestPages({
        siteUrl,
        mapResults: toMapResults(mapPayload),
        businessName: concept.businessName,
      });

      if (pages.length === 0) {
        await ctx.runMutation(internal.concepts.internal.failHarvest, {
          conceptId: args.conceptId,
          harvestRequestId: args.harvestRequestId,
          error: warnings[0] ?? "No usable pages were found on that website.",
        });
        return null;
      }

      // Sequential rather than parallel: six requests against one small
      // business's site should not arrive as a burst, and a 429 partway through
      // is cheaper to back off from one page at a time.
      const extractions: Array<PageExtraction> = [];
      const pageWarnings: Array<string> = [];

      for (const page of pages) {
        try {
          extractions.push(
            await scrapePage(page, { bypassCache: args.bypassCache }),
          );
        } catch (error) {
          pageWarnings.push(
            `Could not read ${page.url}: ${
              error instanceof Error ? error.message : "scrape failed"
            }`.slice(0, 300),
          );
        }
      }

      if (extractions.length === 0) {
        await ctx.runMutation(internal.concepts.internal.failHarvest, {
          conceptId: args.conceptId,
          harvestRequestId: args.harvestRequestId,
          error: "Every page on that website failed to scrape.",
        });
        return null;
      }

      const snapshot = buildHarvestSnapshot({
        businessName: concept.businessName,
        submittedPhone: concept.phone,
        pages: extractions,
      });

      // No second model turn. Firecrawl's structured extraction is untrusted
      // until `buildHarvestSnapshot` proves both the value and its evidence
      // occur in the Markdown returned for that same page. That makes the
      // extractor a selector over source text, not an authority that can invent
      // a business claim.
      //
      // Admission is the same server rule the Facebook Pack now uses. Nothing
      // flags conflicts on this path: there is no model reading the pages to
      // notice that two of them disagree. What still stands between a harvested
      // claim and a published page is the final audit of the generated page.
      const review = resolveEvidenceLocally({
        candidates: harvestCandidatesToEvidence(snapshot.candidates),
        conflicts: [],
        refIndex: {},
      });

      await ctx.runMutation(internal.concepts.internal.saveHarvest, {
        conceptId: args.conceptId,
        harvestRequestId: args.harvestRequestId,
        sourceUrl: siteUrl,
        pages: extractions.map((extraction) => ({
          url: extraction.sourceUrl,
          title: pages.find((page) => page.url === extraction.sourceUrl)?.title,
        })),
        candidates: snapshot.candidates,
        imageCandidates: snapshot.imageCandidates,
        warnings: [...warnings, ...pageWarnings, ...snapshot.warnings].slice(
          0,
          20,
        ),
        decisions: review.decisions,
        conflicts: review.conflicts,
        // No model ruled on this harvest, so there is no review model or review
        // prompt to record. Both fields stay in the schema until the stored rows
        // that have them are migrated.
        reviewModel: undefined,
        reviewPromptVersion: undefined,
      });
    } catch (error) {
      await ctx.runMutation(internal.concepts.internal.failHarvest, {
        conceptId: args.conceptId,
        harvestRequestId: args.harvestRequestId,
        error:
          error instanceof Error ? error.message : "Website harvest failed.",
      });
    }

    return null;
  },
});
