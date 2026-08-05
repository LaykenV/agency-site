/**
 * Shared PageSpeed Insights helper.
 * Used by the marketing audit pipeline, public audits, and Stage 3 project snapshots.
 */

const PAGESPEED_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PageSpeedSnapshot = {
  performanceScore: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  fetchedAt: number;
};

/**
 * Run a mobile performance PageSpeed Insights request against `url`.
 * Throws on non-OK HTTP responses.
 */
export async function runPageSpeed(url: string): Promise<PageSpeedSnapshot> {
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });

  const apiKey =
    process.env.GOOGLE_PAGESPEED_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
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
            : Math.max(0, Math.min(100, perfScore)),
        )
      : 0;

  return {
    performanceScore: normalizedScore,
    fcp: json.lighthouseResult?.audits?.["first-contentful-paint"]
      ?.numericValue,
    lcp: json.lighthouseResult?.audits?.["largest-contentful-paint"]
      ?.numericValue,
    cls: json.lighthouseResult?.audits?.["cumulative-layout-shift"]
      ?.numericValue,
    fetchedAt: Date.now(),
  };
}

/**
 * Normalize a deployment liveUrl (host or full URL) into an absolute https URL
 * suitable for the PageSpeed API.
 */
export function normalizeLiveUrlForPageSpeed(
  liveUrl: string | undefined | null,
): string | null {
  if (!liveUrl) return null;
  const trimmed = liveUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
