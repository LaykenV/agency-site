/** Guardrails for copying source-observed website images into Convex storage. */

export const REMOTE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const REMOTE_IMAGE_MAX_REDIRECTS = 3;

function isIpLiteral(hostname: string): boolean {
  const value = hostname.replace(/^\[|\]$/g, "");
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value) || value.includes(":");
}

/**
 * Validate one initial or redirect URL before DNS lookup and fetch.
 *
 * The candidate has already passed the separate provenance boundary: it must
 * be one of the image URLs Firecrawl observed on the admin-selected website.
 * Hosted-site builders serve those assets from an open-ended set of shared
 * CDNs, so tying eligibility to the business host or a vendor allowlist drops
 * legitimate imagery. Any syntactically safe public HTTPS hostname may proceed
 * to the DNS, response-size, MIME-header, and magic-byte checks in the importer.
 */
export function validateRemoteImageUrl(
  candidateUrl: string,
  harvestSourceUrl: string,
): URL {
  let candidate: URL;
  let source: URL;
  try {
    candidate = new URL(candidateUrl);
    source = new URL(harvestSourceUrl);
  } catch {
    throw new Error("Image URL is invalid.");
  }

  if (candidate.protocol !== "https:") {
    throw new Error("Website images must use HTTPS.");
  }
  if (candidate.username || candidate.password) {
    throw new Error("Image URLs cannot contain credentials.");
  }
  if (candidate.port) {
    throw new Error("Image URLs cannot use a custom port.");
  }
  if (source.protocol !== "https:" && source.protocol !== "http:") {
    throw new Error("Harvest source URL is invalid.");
  }

  const hostname = candidate.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isIpLiteral(hostname)
  ) {
    throw new Error("Image host is not public.");
  }

  return candidate;
}

function ipv4Parts(value: string): Array<number> | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map(Number);
  if (
    numbers.some(
      (part, index) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255 ||
        String(part) !== parts[index],
    )
  ) {
    return null;
  }
  return numbers;
}

/** True for addresses that must never be fetched by the staging worker. */
export function isBlockedImageAddress(address: string): boolean {
  const ipv4 = ipv4Parts(address);
  if (ipv4) {
    const [a, b, c] = ipv4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = normalized.match(/^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedImageAddress(mapped[1]);

  // Public IPv6 unicast is 2000::/3. Everything outside it is unsuitable for
  // this narrowly scoped fetcher; documentation and benchmarking blocks inside
  // it are excluded explicitly as well.
  const first = Number.parseInt(normalized.split(":")[0] || "0", 16);
  if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff) return true;
  return (
    normalized.startsWith("2001:db8:") ||
    normalized === "2001:db8::" ||
    normalized.startsWith("2001:2:")
  );
}

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

/** Detect the file from bytes rather than trusting a response header. */
export function detectSupportedImageMime(
  bytes: Uint8Array,
): SupportedImageMime | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
