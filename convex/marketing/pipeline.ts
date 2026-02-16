"use node";

import { groq } from "@ai-sdk/groq";
import { Agent } from "@convex-dev/agent";
import { internalAction } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";

type PlaceApiReview = {
  authorAttribution?: { displayName?: string };
  text?: { text?: string };
  rating?: number;
};

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
  photos?: Array<{ name?: string }>;
  reviews?: Array<PlaceApiReview>;
};

const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2/scrape";
const PLACES_SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const PAGESPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const GROQ_MODEL = "openai/gpt-oss-120b";

const leadScoringAgent = new Agent(components.agent, {
  name: "marketing-lead-scoring",
  languageModel: groq(GROQ_MODEL),
  instructions: [
    "You score local service businesses for website rebuild potential.",
    "Always return JSON only.",
    'Output exact shape: {"fitScore": number, "businessDescription": string, "painPoints": string[], "sellingPoints": string[], "outreachAngle": string}.',
    "fitScore is 1-10, where 10 means highest fit for outreach.",
    "Prefer concrete observations over generic advice.",
  ].join(" "),
});

function getAppBaseUrl(): string {
  if (process.env.SITE_URL) {
    if (process.env.SITE_URL.startsWith("http")) {
      return process.env.SITE_URL;
    }
    return `https://${process.env.SITE_URL}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    if (process.env.NEXT_PUBLIC_APP_URL.startsWith("http")) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    return `https://${process.env.NEXT_PUBLIC_APP_URL}`;
  }

  return "http://localhost:3000";
}

function getPlacesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY is required");
  }
  return key;
}

function getFirecrawlApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error("FIRECRAWL_API_KEY is required");
  }
  return key;
}

function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

function normalizeTechnology(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  const known = ["wix", "squarespace", "wordpress", "godaddy", "weebly", "custom"];
  if (known.includes(normalized)) return normalized;
  return "custom";
}

function pickBestReview(reviews?: Array<PlaceApiReview>):
  | {
      author: string;
      text: string;
      rating: number;
    }
  | undefined {
  if (!reviews || reviews.length === 0) return undefined;

  // Sort by rating desc, prefer reviews with longer text for more compelling quotes
  const candidates = reviews
    .map((r) => ({
      author: r.authorAttribution?.displayName?.trim(),
      text: r.text?.text?.trim(),
      rating: typeof r.rating === "number" ? r.rating : undefined,
    }))
    .filter(
      (r): r is { author: string; text: string; rating: number } =>
        !!r.author && !!r.text && typeof r.rating === "number",
    )
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.text.length - a.text.length;
    });

  return candidates[0];
}

async function fetchBestReview(placeId: string): Promise<
  | {
      author: string;
      text: string;
      rating: number;
    }
  | undefined
> {
  const apiKey = getPlacesApiKey();
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "reviews",
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const json = (await response.json()) as { reviews?: Array<PlaceApiReview> };
  return pickBestReview(json.reviews);
}

async function fetchPhotoUrl(photoName?: string): Promise<string | undefined> {
  if (!photoName) {
    return undefined;
  }

  const apiKey = getPlacesApiKey();
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&skipHttpRedirect=true&key=${encodeURIComponent(apiKey)}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    return undefined;
  }

  const json = (await response.json()) as { photoUri?: string };
  return json.photoUri;
}


async function runPlacesSearch(textQuery: string): Promise<Array<PlaceResult>> {
  const apiKey = getPlacesApiKey();
  const allPlaces: Array<PlaceResult> = [];

  let pageToken: string | undefined;
  let pages = 0;

  do {
    const payload: { textQuery: string; pageSize: number; pageToken?: string } = {
      textQuery,
      pageSize: 20,
    };

    if (pageToken) {
      payload.pageToken = pageToken;
    }

    const response = await fetch(PLACES_SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryType,places.photos,places.reviews,nextPageToken",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Google Places search failed: ${response.status} ${details}`);
    }

    const json = (await response.json()) as {
      places?: Array<PlaceResult>;
      nextPageToken?: string;
    };

    if (Array.isArray(json.places)) {
      allPlaces.push(...json.places);
    }

    pageToken = json.nextPageToken;
    pages += 1;
  } while (pageToken && pages < 3);

  return allPlaces;
}

async function runFirecrawlScrape(url: string) {
  const apiKey = getFirecrawlApiKey();

  const response = await fetch(FIRECRAWL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      // Confirmed against Firecrawl v2 scrape docs and local response tests (2026-02-16).
      formats: [
        { type: "markdown" },
        { type: "screenshot" },
        {
          type: "json",
          prompt:
            "Extract primaryColor (hex), heroImageUrl (url), technology (wix/squarespace/wordpress/godaddy/weebly/custom), and contactEmail (any email address found on the page, prefer info@ or contact@ addresses)",
          schema: {
            type: "object",
            properties: {
              primaryColor: { type: "string" },
              heroImageUrl: { type: "string" },
              technology: { type: "string" },
              contactEmail: { type: "string" },
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
      metadata?: {
        title?: string;
        description?: string;
      };
      screenshot?: string | { url?: string };
      json?: {
        primaryColor?: string;
        heroImageUrl?: string;
        technology?: string;
        contactEmail?: string;
      };
    };
  };

  const data = json.data ?? {};
  // Firecrawl can return screenshot as either a direct URL string or { url }.
  const screenshotValue =
    typeof data.screenshot === "string"
      ? data.screenshot
      : typeof data.screenshot?.url === "string"
        ? data.screenshot.url
        : undefined;

  // Try to extract email: prefer AI-extracted, fall back to regex on markdown
  let contactEmail: string | undefined;
  const aiEmail = data.json?.contactEmail?.trim().toLowerCase();
  if (aiEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(aiEmail)) {
    contactEmail = aiEmail;
  } else if (data.markdown) {
    const emailMatch = data.markdown.match(
      /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/
    );
    if (emailMatch) {
      contactEmail = emailMatch[1].toLowerCase();
    }
  }

  return {
    primaryColor: sanitizeColor(data.json?.primaryColor),
    heroImageUrl:
      typeof data.json?.heroImageUrl === "string" && data.json.heroImageUrl.trim().length > 0
        ? data.json.heroImageUrl.trim()
        : undefined,
    technology: normalizeTechnology(data.json?.technology),
    metaTitle:
      typeof data.metadata?.title === "string" && data.metadata.title.trim().length > 0
        ? data.metadata.title.trim()
        : undefined,
    metaDescription:
      typeof data.metadata?.description === "string" && data.metadata.description.trim().length > 0
        ? data.metadata.description.trim()
        : undefined,
    screenshotUrl: screenshotValue,
    hasHttps: url.startsWith("https://"),
    contactEmail,
  };
}

async function runFirecrawlScreenshot(url: string): Promise<string | undefined> {
  const apiKey = getFirecrawlApiKey();

  const response = await fetch(FIRECRAWL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [{ type: "screenshot" }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Firecrawl screenshot failed: ${response.status} ${details}`);
  }

  const json = (await response.json()) as {
    data?: {
      screenshot?: string | { url?: string };
    };
  };

  if (typeof json.data?.screenshot === "string") {
    return json.data.screenshot;
  }
  if (typeof json.data?.screenshot?.url === "string") {
    return json.data.screenshot.url;
  }

  return undefined;
}

async function runPageSpeed(url: string) {
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    params.set("key", apiKey);
  }

  const response = await fetch(`${PAGESPEED_ENDPOINT}?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`PageSpeed failed: ${response.status} ${details}`);
  }

  const json = (await response.json()) as {
    lighthouseResult?: {
      categories?: {
        performance?: {
          score?: number;
        };
      };
      audits?: {
        "first-contentful-paint"?: { numericValue?: number };
        "largest-contentful-paint"?: { numericValue?: number };
        "cumulative-layout-shift"?: { numericValue?: number };
      };
    };
  };

  const perfScore = json.lighthouseResult?.categories?.performance?.score;
  const normalizedScore =
    typeof perfScore === "number"
      ? Math.round(
          perfScore <= 1
            ? Math.max(0, Math.min(1, perfScore)) * 100
            : Math.max(0, Math.min(100, perfScore))
        )
      : 0;

  return {
    performanceScore: normalizedScore,
    fcp: json.lighthouseResult?.audits?.["first-contentful-paint"]?.numericValue,
    lcp: json.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue,
    cls: json.lighthouseResult?.audits?.["cumulative-layout-shift"]?.numericValue,
    fetchedAt: Date.now(),
  };
}

function buildAnalysisPrompt(lead: {
  googleData: {
    businessName: string;
    websiteUrl?: string;
    rating?: number;
    reviewCount?: number;
    primaryType?: string;
  };
  websiteData?: {
    technology?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
  pageSpeedData?: {
    performanceScore: number;
    fcp?: number;
    lcp?: number;
    cls?: number;
  };
}) {
  return [
    "Score this business for website redesign outreach.",
    "Rules:",
    "- No website usually means high fit (8-10).",
    "- Wix/Squarespace/GoDaddy often medium/high fit (6-8).",
    "- Mobile performance < 50 suggests high fit (7-9).",
    "- Good reviews + weak site/speed should increase fit.",
    "- Strong custom site + strong speed should decrease fit.",
    "Return JSON only in the required shape.",
    "",
    `Business name: ${lead.googleData.businessName}`,
    `Business type: ${lead.googleData.primaryType ?? "unknown"}`,
    `Website URL: ${lead.googleData.websiteUrl ?? "none"}`,
    `Google rating: ${lead.googleData.rating ?? "unknown"}`,
    `Review count: ${lead.googleData.reviewCount ?? "unknown"}`,
    `Detected website technology: ${lead.websiteData?.technology ?? "unknown"}`,
    `Meta title: ${lead.websiteData?.metaTitle ?? "none"}`,
    `Meta description: ${lead.websiteData?.metaDescription ?? "none"}`,
    `Mobile performance score: ${lead.pageSpeedData?.performanceScore ?? "unknown"}`,
    `FCP: ${lead.pageSpeedData?.fcp ?? "unknown"}`,
    `LCP: ${lead.pageSpeedData?.lcp ?? "unknown"}`,
    `CLS: ${lead.pageSpeedData?.cls ?? "unknown"}`,
  ].join("\n");
}

function parseAgentResponse(raw: string): {
  fitScore: number;
  businessDescription: string;
  painPoints: Array<string>;
  sellingPoints: Array<string>;
  outreachAngle: string;
} {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(text) as {
      fitScore?: number;
      businessDescription?: string;
      painPoints?: Array<string>;
      sellingPoints?: Array<string>;
      outreachAngle?: string;
    };

    const fitScore =
      typeof parsed.fitScore === "number"
        ? Math.max(1, Math.min(10, Math.round(parsed.fitScore)))
        : 5;

    return {
      fitScore,
      businessDescription:
        typeof parsed.businessDescription === "string" && parsed.businessDescription.trim().length > 0
          ? parsed.businessDescription.trim()
          : "Local service business that may benefit from a conversion-focused website refresh.",
      painPoints:
        Array.isArray(parsed.painPoints) && parsed.painPoints.length > 0
          ? parsed.painPoints.slice(0, 5).map((item) => String(item).trim()).filter(Boolean)
          : ["Website likely underperforms on mobile or conversion clarity."],
      sellingPoints:
        Array.isArray(parsed.sellingPoints) && parsed.sellingPoints.length > 0
          ? parsed.sellingPoints.slice(0, 5).map((item) => String(item).trim()).filter(Boolean)
          : ["Fast-loading custom site", "Local-first messaging", "Done-for-you updates"],
      outreachAngle:
        typeof parsed.outreachAngle === "string" && parsed.outreachAngle.trim().length > 0
          ? parsed.outreachAngle.trim()
          : "Lead with speed and trust improvements tied to more calls.",
    };
  } catch {
    return {
      fitScore: 5,
      businessDescription:
        "Local service business that may benefit from a conversion-focused website refresh.",
      painPoints: ["Website likely underperforms on mobile or conversion clarity."],
      sellingPoints: ["Fast-loading custom site", "Local-first messaging", "Done-for-you updates"],
      outreachAngle: "Lead with speed and trust improvements tied to more calls.",
    };
  }
}

export const executeSearch = internalAction({
  args: {
    searchId: v.id("marketing_searches"),
  },
  returns: v.array(v.id("scraped_leads")),
  handler: async (ctx, args) => {
    const search = await ctx.runQuery(internal.marketing.search.internalGetSearch, {
      searchId: args.searchId,
    });

    if (!search) {
      throw new Error("Search not found");
    }

    const places = await runPlacesSearch(search.searchQuery);
    const leadIds: Array<Id<"scraped_leads">> = [];

    for (const place of places) {
      const placeId = place.id;
      const businessName = place.displayName?.text?.trim();
      const formattedAddress = place.formattedAddress?.trim();
      if (!placeId || !businessName || !formattedAddress) {
        continue;
      }

      const inlineReview = pickBestReview(place.reviews);
      const topReview = inlineReview ?? (await fetchBestReview(placeId));
      const photoUrl = await fetchPhotoUrl(place.photos?.[0]?.name);

      const leadId = await ctx.runMutation(internal.marketing.search.internalInsertLead, {
        searchId: args.searchId,
        placeId,
        googleData: {
          businessName,
          formattedAddress,
          phone: place.nationalPhoneNumber,
          websiteUrl: place.websiteUri,
          rating: typeof place.rating === "number" ? place.rating : undefined,
          reviewCount:
            typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
          googleMapsUrl: place.googleMapsUri,
          primaryType: place.primaryType,
          photoUrl,
          topReview,
        },
      });

      if (leadId) {
        leadIds.push(leadId);
      }
    }

    await ctx.runMutation(internal.marketing.search.internalUpdateSearchCounters, {
      searchId: args.searchId,
      totalFound: places.length,
    });

    await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
      searchId: args.searchId,
    });

    return leadIds;
  },
});

export const scrapeOneLead = internalAction({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.object({
    leadId: v.id("scraped_leads"),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.marketing.search.internalUpdateLeadStatus, {
        leadId: args.leadId,
        status: "scraping",
      });

      const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
        leadId: args.leadId,
      });

      if (!lead) {
        return { leadId: args.leadId, status: "missing" };
      }

      const websiteUrl = lead.googleData.websiteUrl;
      if (!websiteUrl) {
        await ctx.runMutation(internal.marketing.search.internalUpdateLeadStatus, {
          leadId: args.leadId,
          status: "scraped",
        });

        await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
          searchId: lead.searchId,
        });

        return { leadId: args.leadId, status: "scraped" };
      }

      const [scrapeResult, pageSpeedData] = await Promise.all([
        runFirecrawlScrape(websiteUrl),
        runPageSpeed(websiteUrl),
      ]);

      await ctx.runMutation(internal.marketing.search.internalUpdateLeadWebsiteData, {
        leadId: args.leadId,
        websiteData: {
          primaryColor: scrapeResult.primaryColor,
          heroImageUrl: scrapeResult.heroImageUrl,
          technology: scrapeResult.technology,
          metaTitle: scrapeResult.metaTitle,
          metaDescription: scrapeResult.metaDescription,
          screenshotUrl: scrapeResult.screenshotUrl,
          hasHttps: scrapeResult.hasHttps,
          scrapedAt: Date.now(),
        },
        pageSpeedData,
        contactEmail: scrapeResult.contactEmail,
      });

      await ctx.runMutation(internal.marketing.search.internalUpdateLeadStatus, {
        leadId: args.leadId,
        status: "scraped",
      });

      await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
        searchId: lead.searchId,
      });

      return { leadId: args.leadId, status: "scraped" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scrape failed";

      const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
        leadId: args.leadId,
      });

      await ctx.runMutation(internal.marketing.search.markLeadError, {
        leadId: args.leadId,
        error: message,
      });

      if (lead) {
        await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
          searchId: lead.searchId,
        });
      }

      return { leadId: args.leadId, status: "error" };
    }
  },
});

export const analyzeOneLead = internalAction({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.object({
    leadId: v.id("scraped_leads"),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.marketing.search.internalUpdateLeadStatus, {
        leadId: args.leadId,
        status: "analyzing",
      });

      const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
        leadId: args.leadId,
      });
      if (!lead) {
        return { leadId: args.leadId, status: "missing" };
      }

      const thread = await leadScoringAgent.createThread(ctx, {
        title: `Lead analysis ${lead.googleData.businessName}`,
      });

      const response = await leadScoringAgent.generateText(ctx, thread, {
        prompt: buildAnalysisPrompt(lead),
      });

      const parsed = parseAgentResponse(response.text ?? "");
      const qualified = parsed.fitScore >= 6;

      await ctx.runMutation(internal.marketing.search.internalUpdateLeadAiAnalysis, {
        leadId: args.leadId,
        aiAnalysis: {
          fitScore: parsed.fitScore,
          businessDescription: parsed.businessDescription,
          painPoints: parsed.painPoints,
          sellingPoints: parsed.sellingPoints,
          outreachAngle: parsed.outreachAngle,
          analyzedAt: Date.now(),
        },
        status: qualified ? "qualified" : "disqualified",
        demoToken: qualified ? crypto.randomUUID() : undefined,
      });

      await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
        searchId: lead.searchId,
      });

      return {
        leadId: args.leadId,
        status: qualified ? "qualified" : "disqualified",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
        leadId: args.leadId,
      });

      await ctx.runMutation(internal.marketing.search.markLeadError, {
        leadId: args.leadId,
        error: message,
      });

      if (lead) {
        await ctx.runMutation(internal.marketing.search.internalRecalculateSearchCounters, {
          searchId: lead.searchId,
        });
      }

      return { leadId: args.leadId, status: "error" };
    }
  },
});

export const screenshotDemoPage = internalAction({
  args: {
    leadId: v.id("scraped_leads"),
  },
  returns: v.object({
    leadId: v.id("scraped_leads"),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      const lead = await ctx.runQuery(internal.marketing.search.internalGetLeadById, {
        leadId: args.leadId,
      });

      if (!lead?.demoToken) {
        return { leadId: args.leadId, status: "skipped" };
      }

      const demoUrl = `${getAppBaseUrl()}/demo/${lead.demoToken}`;
      const screenshotUrl = await runFirecrawlScreenshot(demoUrl);

      if (screenshotUrl) {
        await ctx.runMutation(internal.marketing.search.internalUpdateLeadDemoScreenshot, {
          leadId: args.leadId,
          demoScreenshotUrl: screenshotUrl,
        });
      }

      return { leadId: args.leadId, status: screenshotUrl ? "ok" : "no_screenshot" };
    } catch (error) {
      console.warn("[marketing] screenshotDemoPage failed", {
        leadId: args.leadId,
        error,
      });
      return { leadId: args.leadId, status: "error" };
    }
  },
});
