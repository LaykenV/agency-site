/**
 * Coarse referrer classification for Stage 3 telemetry.
 *
 * Honest scope: organic / social / direct / other only.
 * A bare Google referrer is NOT proof of campaign or GBP attribution —
 * that requires deferred UTM work (Stage 8).
 */

export type ReferrerClass = "organic" | "social" | "direct" | "other";

const ORGANIC_HOST_RE =
  /(^|\.)(google|bing|yahoo|duckduckgo|baidu|yandex|ecosia|ask|aol|brave)\./i;

const SOCIAL_HOST_RE =
  /(^|\.)(facebook|fb\.com|instagram|twitter|x\.com|t\.co|linkedin|lnkd\.in|tiktok|pinterest|reddit|youtube|youtu\.be|whatsapp|telegram|threads\.net|snapchat|nextdoor)\./i;

/**
 * Classify a raw referrer string (URL, host, or the literal "direct").
 * Empty / missing / "direct" → direct.
 */
function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

export function classifyReferrer(
  referrer: string | undefined | null,
  /**
   * The site's own host, from the already-validated request Origin. A referrer
   * from this host is internal navigation, not a traffic source.
   */
  selfHost?: string | null,
): ReferrerClass | undefined {
  if (referrer === undefined || referrer === null) return "direct";
  const trimmed = referrer.trim();
  if (!trimmed || trimmed.toLowerCase() === "direct") return "direct";

  let host = "";
  try {
    // Absolute URL
    if (/^https?:\/\//i.test(trimmed)) {
      host = new URL(trimmed).hostname.toLowerCase();
    } else if (trimmed.includes("/") || trimmed.includes(".")) {
      // Host-only or host/path without scheme
      host = trimmed.split("/")[0]!.toLowerCase().replace(/:\d+$/, "");
    } else {
      return "other";
    }
  } catch {
    return "other";
  }

  if (!host) return "direct";

  // Internal navigation — a full page load between our own pages sets
  // `document.referrer` to our own host. Attributing that to any source is
  // wrong: `other` implies an unrecognized external site, and `direct` would
  // overwrite the visit's real origin. Without sessions (deferred to Stage 8)
  // the honest answer is to record no source at all.
  if (selfHost && stripWww(host) === stripWww(selfHost.toLowerCase())) {
    return undefined;
  }

  // Normalize for regex: ensure trailing dot so `(^|\.)foo\.` matches
  const hostForMatch = host.endsWith(".") ? host : `${host}.`;

  if (ORGANIC_HOST_RE.test(hostForMatch)) return "organic";
  if (SOCIAL_HOST_RE.test(hostForMatch)) return "social";
  return "other";
}
