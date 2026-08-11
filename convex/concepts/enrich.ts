import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { runPageSpeed } from "../lib/pagespeed";
import type { ConceptBrief } from "../../lib/concepts/brief";
import {
  findHighConfidencePlaceMatch,
  isCurrentPlaceCandidate,
  PLACE_MATCH_FIELD_MASK,
} from "../../lib/concepts/placeMatch";
import { conceptGoogleMapsUrl } from "../../lib/concepts/googleMaps";
import { conceptPlaceCandidateValidator } from "../validators";

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
 * Google Places answers one persisted question: which business is this. Live
 * candidate details help a human recognize the listing but are never written
 * or passed to generation — Places content carries retention and attribution requirements,
 * review text was written by customers who did not agree to appear on a
 * mock-up, and the concept must be something Layken can defend line by line.
 * The confirmed place ID is retained because Google's policy exempts it.
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
  googleMapsUri?: string;
  primaryType?: string;
  businessStatus?: string;
};

type PlaceCandidate = {
  placeId: string;
  businessName: string;
  formattedAddress: string;
  phone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
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
      "X-Goog-FieldMask": PLACE_MATCH_FIELD_MASK.join(","),
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
    primaryType: place.primaryType,
    businessStatus: place.businessStatus,
  };
}

/**
 * The single query shape used for both automatic matching and the live match
 * panel, so what a human is asked to choose between is exactly what the
 * automatic pass considered and rejected.
 */
async function searchCandidatesFor(concept: {
  businessName: string;
  serviceArea?: string;
}): Promise<Array<PlaceCandidate>> {
  const region = concept.serviceArea?.trim() || "Acadiana, Louisiana";
  const places = await runPlacesTextSearch(`${concept.businessName} ${region}`);

  return places
    .map(toCandidate)
    .filter((candidate): candidate is PlaceCandidate => candidate !== null)
    .slice(0, MAX_CANDIDATES);
}

/**
 * Phase A: find the business on Google.
 *
 * A unique candidate can proceed automatically only when its name and an
 * independent clue agree. Everything else parks in `matching` for a human, and
 * the candidate list is deliberately dropped rather than saved: an unresolved
 * concept keeps no Places content at all, and `listPlaceCandidates` re-runs
 * this same search when the match panel actually opens.
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
      const candidates = await searchCandidatesFor(concept);

      const autoMatch = findHighConfidencePlaceMatch({
        businessName: concept.businessName,
        phone: concept.phone,
        submittedWebsiteUrl: concept.submittedWebsiteUrl,
        serviceArea: concept.serviceArea,
        candidates,
      });

      const matched = autoMatch
        ? candidates.find(
            (candidate) => candidate.placeId === autoMatch.placeId,
          )
        : undefined;

      await ctx.runMutation(internal.concepts.internal.savePlaceMatchResult, {
        conceptId: args.conceptId,
        candidateCount: candidates.length,
        autoMatch: matched
          ? {
              placeId: matched.placeId,
              reasons: autoMatch?.reasons ?? [],
            }
          : undefined,
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

/**
 * Candidates for the admin match panel, fetched live and never stored.
 *
 * Google requires Places content to be shown with attribution and not retained,
 * so this is an action rather than a query: it reaches Google when the panel
 * opens and the response lives only as long as the page that displays it.
 */
export const listPlaceCandidates = action({
  args: { conceptId: v.id("website_concepts") },
  returns: v.array(conceptPlaceCandidateValidator),
  // Annotated because this action reads its own module's API through
  // `internal`, which TypeScript cannot resolve without a fixed point.
  handler: async (ctx, args): Promise<Array<PlaceCandidate>> => {
    await ctx.runQuery(internal.concepts.internal.assertAdmin, {});

    const concept: Doc<"website_concepts"> | null = await ctx.runQuery(
      internal.concepts.internal.getById,
      { conceptId: args.conceptId },
    );
    if (!concept) throw new Error("Concept not found");

    return await searchCandidatesFor(concept);
  },
});

/**
 * Confirm which Google business this concept is for, or declare there is none.
 *
 * An action rather than a mutation because the candidate list is no longer
 * stored: the place ID arriving from the browser must still belong to a fresh
 * Places lookup for the current concept. Passing `placeId: null`
 * is the "no Google match" path — plenty of real Facebook leads have no listing
 * at all, and the concept must still be buildable from Layken's notes.
 */
export const confirmPlaceMatch = action({
  args: {
    conceptId: v.id("website_concepts"),
    placeId: v.union(v.string(), v.null()),
    /** Deprecated compatibility input. Generation is now always explicit. */
    thenGenerate: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.runQuery(internal.concepts.internal.assertAdmin, {});

    if (args.placeId !== null) {
      const concept: Doc<"website_concepts"> | null = await ctx.runQuery(
        internal.concepts.internal.getById,
        { conceptId: args.conceptId },
      );
      if (!concept) throw new Error("Concept not found");

      // Proving that a place ID exists does not prove it belongs to this
      // concept. Bind the click to a fresh copy of the search that populated
      // the panel, so stale or crafted IDs cannot attach another business.
      const candidates = await searchCandidatesFor(concept);
      if (!isCurrentPlaceCandidate(args.placeId, candidates)) {
        throw new Error(
          "That listing is no longer a candidate for this business. Re-open the match panel and pick again.",
        );
      }
    }

    await ctx.runMutation(internal.concepts.internal.savePlaceMatchConfirmed, {
      conceptId: args.conceptId,
      placeId: args.placeId ?? undefined,
      thenGenerate: false,
    });

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
 * brief, then stop at Draft for content preparation and explicit generation.
 *
 * Firecrawl and PageSpeed failures are recorded but not fatal. A business with
 * no website — the best kind of lead here — has nothing to scrape, and a
 * concept must still be producible from Places facts and Layken's notes alone.
 */
export const runSiteResearch = internalAction({
  args: {
    conceptId: v.id("website_concepts"),
    /** Deprecated compatibility input. Ignored intentionally. */
    thenGenerate: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const concept = await ctx.runQuery(internal.concepts.internal.getById, {
      conceptId: args.conceptId,
    });
    if (!concept) return null;

    try {
      const websiteUrl =
        normalizeWebsiteUrl(concept.submittedWebsiteUrl) ??
        normalizeWebsiteUrl(concept.verifiedWebsiteUrl);

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

      // The machine half of the brief. Human-owned fields (assets, notes,
      // quotes) are laid over this at generation time.
      //
      // Nothing Google-specific survives except the directions link, which is
      // rebuilt from the exempt place ID. Rating, review count, opening hours,
      // street address, and review themes are gone on purpose; a fact the page
      // states has to come from Layken or, from B2 onward, from approved
      // website content.
      const researchBrief: ConceptBrief = {
        businessName: concept.businessName,
        serviceArea: concept.serviceArea,
        phone: concept.phone,
        googleMapsUrl: conceptGoogleMapsUrl({
          placeId: concept.matchedGooglePlaceId,
          businessName: concept.businessName,
        }),
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
      };

      await ctx.runMutation(internal.concepts.internal.saveResearch, {
        conceptId: args.conceptId,
        researchBrief,
        verifiedWebsiteUrl: websiteUrl,
      });

      await ctx.runMutation(internal.concepts.internal.setStatus, {
        conceptId: args.conceptId,
        status: "draft",
      });
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
