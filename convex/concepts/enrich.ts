import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { runPageSpeed } from "../lib/pagespeed";
import type { ConceptBrief } from "../../lib/concepts/brief";
import { findHighConfidencePlaceMatch } from "../../lib/concepts/placeMatch";

/**
 * Single-business enrichment for one website concept.
 *
 * This is the useful half of the retired batch pipeline: one Places lookup, one
 * Firecrawl scrape, one PageSpeed run. The city-and-industry batch search it was
 * extracted from is gone on purpose — it produced volume, not conversations.
 *
 * Runs in the default Convex runtime rather than Node: everything here is
 * `fetch`, so there is nothing to gain from the heavier runtime.
 *
 * Google photos and review text are research signals only. Neither becomes a
 * preview asset: Places content has storage and attribution requirements,
 * review text is written by customers who did not agree to appear on a mock-up,
 * and the concept must be something Layken can defend line by line.
 */

const PLACES_SEARCH_ENDPOINT =
  "https://places.googleapis.com/v1/places:searchText";
const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2/scrape";

/** How many candidates a human is asked to choose between. */
const MAX_CANDIDATES = 5;

/** Characters of existing-site copy handed to the model. */
const SITE_SUMMARY_LIMIT = 2400;

type PlaceResult = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryType?: string;
  businessStatus?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: Array<string>;
  }>;
  regularOpeningHours?: { weekdayDescriptions?: Array<string> };
  reviews?: Array<{ text?: { text?: string }; rating?: number }>;
};

type PlaceCandidate = {
  placeId: string;
  businessName: string;
  formattedAddress: string;
  phone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  primaryType?: string;
  businessStatus?: string;
};

function getPlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY is required");
  return key;
}

function getFirecrawlApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is required");
  return key;
}

function humanizeCategory(primaryType?: string): string | undefined {
  if (!primaryType) return undefined;
  return primaryType.replace(/_/g, " ");
}

/** City and state from Places address components, for the page's locality line. */
function extractLocality(place: PlaceResult): string | undefined {
  const components = place.addressComponents ?? [];
  const find = (type: string) =>
    components.find((component) => component.types?.includes(type));

  const city =
    find("locality")?.longText ??
    find("sublocality")?.longText ??
    find("administrative_area_level_3")?.longText;
  const state = find("administrative_area_level_1")?.shortText;

  if (city && state) return `${city}, ${state}`;
  return city ?? undefined;
}

/**
 * Condense review text into themes without reproducing it.
 *
 * The output is labelled RESEARCH ONLY in the prompt and must never reach the
 * page. Truncating each review hard also keeps the prompt from becoming a
 * copy-paste source the model can lift a "testimonial" from verbatim.
 */
function summarizeReviews(place: PlaceResult): string | undefined {
  const snippets = (place.reviews ?? [])
    .map((review) => review.text?.text?.trim())
    .filter((text): text is string => Boolean(text))
    .slice(0, 4)
    .map((text) => text.replace(/\s+/g, " ").slice(0, 160));

  if (snippets.length === 0) return undefined;
  return snippets.map((snippet) => `- ${snippet}`).join("\n");
}

function normalizeWebsiteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

async function runPlacesTextSearch(
  textQuery: string,
): Promise<Array<PlaceResult>> {
  const response = await fetch(PLACES_SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getPlacesApiKey(),
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.googleMapsUri",
        "places.primaryType",
        "places.businessStatus",
        "places.addressComponents",
        "places.regularOpeningHours",
        "places.reviews",
      ].join(","),
    },
    // One page only. This is a single-business lookup, not a harvest.
    body: JSON.stringify({ textQuery, pageSize: MAX_CANDIDATES }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Google Places search failed: ${response.status} ${details}`,
    );
  }

  const json = (await response.json()) as { places?: Array<PlaceResult> };
  return Array.isArray(json.places) ? json.places : [];
}

function toCandidate(place: PlaceResult): PlaceCandidate | null {
  const placeId = place.id;
  const businessName = place.displayName?.text?.trim();
  if (!placeId || !businessName) return null;

  return {
    placeId,
    businessName,
    formattedAddress: place.formattedAddress?.trim() ?? "Address not listed",
    phone: place.nationalPhoneNumber,
    websiteUrl: normalizeWebsiteUrl(place.websiteUri),
    googleMapsUrl: place.googleMapsUri,
    rating: typeof place.rating === "number" ? place.rating : undefined,
    reviewCount:
      typeof place.userRatingCount === "number"
        ? place.userRatingCount
        : undefined,
    primaryType: place.primaryType,
    businessStatus: place.businessStatus,
  };
}

/**
 * Phase A: find the business on Google.
 *
 * A unique candidate can proceed automatically only when its name and an
 * independent clue agree. Everything else parks in `matching` for a human.
 */
export const runPlacesMatch = internalAction({
  args: { conceptId: v.id("website_concepts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.runQuery(internal.concepts.internal.getById, {
      conceptId: args.conceptId,
    });
    if (!concept) return null;

    try {
      const region = concept.serviceArea?.trim() || "Acadiana, Louisiana";
      const places = await runPlacesTextSearch(
        `${concept.businessName} ${region}`,
      );

      const candidates = places
        .map(toCandidate)
        .filter((candidate): candidate is PlaceCandidate => candidate !== null)
        .slice(0, MAX_CANDIDATES);

      const autoMatch = findHighConfidencePlaceMatch({
        businessName: concept.businessName,
        phone: concept.phone,
        submittedWebsiteUrl: concept.submittedWebsiteUrl,
        serviceArea: concept.serviceArea,
        candidates,
      });

      await ctx.runMutation(internal.concepts.internal.savePlaceCandidates, {
        conceptId: args.conceptId,
        candidates,
        autoMatchedPlaceId: autoMatch?.placeId,
        autoMatchReasons: autoMatch?.reasons,
      });
    } catch (error) {
      await ctx.runMutation(internal.concepts.internal.setStatus, {
        conceptId: args.conceptId,
        status: "failed",
        error: error instanceof Error ? error.message : "Places lookup failed",
      });
    }

    return null;
  },
});

type SiteScrape = {
  primaryColor?: string;
  technology?: string;
  summary?: string;
};

function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)
    ? trimmed
    : undefined;
}

function normalizeTechnology(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  const known = [
    "wix",
    "squarespace",
    "wordpress",
    "godaddy",
    "weebly",
    "custom",
  ];
  return known.includes(normalized) ? normalized : "custom";
}

/**
 * Scrape the business's current site for what they say they do.
 *
 * Unlike the retired audit pipeline this does not request a screenshot: the
 * concept is a replacement proposal, and nothing downstream renders a picture of
 * the old site.
 */
async function runFirecrawlScrape(url: string): Promise<SiteScrape> {
  const response = await fetch(FIRECRAWL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getFirecrawlApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [
        { type: "markdown" },
        {
          type: "json",
          prompt:
            "Extract primaryColor (hex) and technology (wix/squarespace/wordpress/godaddy/weebly/custom).",
          schema: {
            type: "object",
            properties: {
              primaryColor: { type: "string" },
              technology: { type: "string" },
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Firecrawl scrape failed: ${response.status} ${details}`);
  }

  const json = (await response.json()) as {
    data?: {
      markdown?: string;
      metadata?: { title?: string; description?: string };
      json?: { primaryColor?: string; technology?: string };
    };
  };
  const data = json.data ?? {};

  const summaryParts = [
    data.metadata?.title?.trim(),
    data.metadata?.description?.trim(),
    data.markdown?.replace(/\s+/g, " ").trim(),
  ].filter((part): part is string => Boolean(part));

  return {
    primaryColor: sanitizeColor(data.json?.primaryColor),
    technology: normalizeTechnology(data.json?.technology),
    summary:
      summaryParts.join("\n\n").slice(0, SITE_SUMMARY_LIMIT) || undefined,
  };
}

/**
 * Phase B: research the confirmed business and build the machine half of the
 * brief, then hand off to generation.
 *
 * Firecrawl and PageSpeed failures are recorded but not fatal. A business with
 * no website — the best kind of lead here — has nothing to scrape, and a
 * concept must still be producible from Places facts and Layken's notes alone.
 */
export const runSiteResearch = internalAction({
  args: {
    conceptId: v.id("website_concepts"),
    thenGenerate: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.runQuery(internal.concepts.internal.getById, {
      conceptId: args.conceptId,
    });
    if (!concept) return null;

    try {
      const matched = concept.placeCandidates?.find(
        (candidate) => candidate.placeId === concept.matchedGooglePlaceId,
      );

      const websiteUrl =
        normalizeWebsiteUrl(concept.submittedWebsiteUrl) ??
        normalizeWebsiteUrl(matched?.websiteUrl);

      let scrape: SiteScrape = {};
      let performanceScore: number | undefined;

      if (websiteUrl) {
        const [scrapeResult, pageSpeedResult] = await Promise.allSettled([
          runFirecrawlScrape(websiteUrl),
          runPageSpeed(websiteUrl),
        ]);

        if (scrapeResult.status === "fulfilled") {
          scrape = scrapeResult.value;
        } else {
          console.warn("[concepts] Firecrawl failed", {
            conceptId: args.conceptId,
            error: scrapeResult.reason,
          });
        }

        if (pageSpeedResult.status === "fulfilled") {
          performanceScore = pageSpeedResult.value.performanceScore;
        } else {
          console.warn("[concepts] PageSpeed failed", {
            conceptId: args.conceptId,
            error: pageSpeedResult.reason,
          });
        }
      }

      // Re-fetch the raw Places record for the fields a candidate row does not
      // carry: locality components, opening hours, and review themes.
      let locality: string | undefined;
      let hours: Array<string> | undefined;
      let googleReviewSummary: string | undefined;

      if (concept.matchedGooglePlaceId) {
        try {
          const detail = await fetchPlaceDetail(concept.matchedGooglePlaceId);
          if (detail) {
            locality = extractLocality(detail);
            hours = detail.regularOpeningHours?.weekdayDescriptions;
            googleReviewSummary = summarizeReviews(detail);
          }
        } catch (error) {
          console.warn("[concepts] Places detail failed", {
            conceptId: args.conceptId,
            error,
          });
        }
      }

      // The machine half of the brief. Human-owned fields (assets, notes,
      // quotes) are laid over this at generation time.
      const researchBrief: ConceptBrief = {
        businessName: concept.businessName,
        category: humanizeCategory(matched?.primaryType),
        address: matched?.formattedAddress,
        locality,
        serviceArea: concept.serviceArea,
        phone: concept.phone ?? matched?.phone,
        googleRating: matched?.rating,
        googleReviewCount: matched?.reviewCount,
        hours,
        googleMapsUrl: concept.matchedGoogleMapsUrl ?? matched?.googleMapsUrl,
        existingWebsiteUrl: websiteUrl,
        existingTechnology: scrape.technology,
        existingPerformanceScore: performanceScore,
        existingPrimaryColor: scrape.primaryColor,
        existingSiteSummary: scrape.summary,
        notes: concept.notes,
        facebookPageUrl: concept.facebookPageUrl,
        logoUrl: undefined,
        photoUrls: [],
        approvedQuotes: concept.approvedQuotes,
        googleReviewSummary,
      };

      await ctx.runMutation(internal.concepts.internal.saveResearch, {
        conceptId: args.conceptId,
        researchBrief,
        verifiedWebsiteUrl: websiteUrl,
      });

      if (args.thenGenerate) {
        await ctx.scheduler.runAfter(
          0,
          internal.concepts.internal.queueGeneration,
          { conceptId: args.conceptId },
        );
      } else {
        await ctx.runMutation(internal.concepts.internal.setStatus, {
          conceptId: args.conceptId,
          status: "draft",
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.concepts.internal.setStatus, {
        conceptId: args.conceptId,
        status: "failed",
        error: error instanceof Error ? error.message : "Enrichment failed",
      });
    }

    return null;
  },
});

async function fetchPlaceDetail(placeId: string): Promise<PlaceResult | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": getPlacesApiKey(),
        "X-Goog-FieldMask":
          "addressComponents,regularOpeningHours,reviews,primaryType",
      },
    },
  );

  if (!response.ok) return null;
  return (await response.json()) as PlaceResult;
}
