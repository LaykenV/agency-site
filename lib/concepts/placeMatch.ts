/**
 * Conservative automatic identity matching for Google Places candidates.
 *
 * Provider ranking is never identity proof. A candidate is selected only when
 * the submitted business name agrees and at least one independent clue agrees,
 * or when both the submitted phone and website agree despite a name variant.
 * Ambiguous strong candidates deliberately fall back to human review.
 */

export type PlaceMatchCandidate = {
  placeId: string;
  businessName: string;
  formattedAddress: string;
  phone?: string;
  websiteUrl?: string;
  businessStatus?: string;
};

export type HighConfidencePlaceMatch = {
  placeId: string;
  reasons: Array<"name" | "phone" | "website" | "location">;
};

/** Live-only fields needed to identify and corroborate a Places candidate. */
export const PLACE_MATCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.primaryType",
  "places.businessStatus",
] as const;

export function isCurrentPlaceCandidate(
  placeId: string,
  candidates: Array<Pick<PlaceMatchCandidate, "placeId">>,
): boolean {
  return candidates.some((candidate) => candidate.placeId === placeId);
}

const LEGAL_SUFFIXES = new Set([
  "co",
  "company",
  "corp",
  "corporation",
  "inc",
  "incorporated",
  "llc",
  "llp",
  "ltd",
  "pllc",
]);

function normalizedWords(value: string): Array<string> {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function normalizedBusinessName(value: string): string {
  const words = normalizedWords(value);
  while (words.length > 1 && LEGAL_SUFFIXES.has(words.at(-1) ?? "")) {
    words.pop();
  }
  return words.join(" ");
}

function normalizedPhone(value: string | undefined): string | undefined {
  const digits = value?.replace(/\D/g, "");
  if (!digits) return undefined;
  const national = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
  return national.length === 10 ? national : undefined;
}

function normalizedHostname(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return url.hostname.toLowerCase().replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
}

function locationMatches(
  serviceArea: string | undefined,
  formattedAddress: string,
): boolean {
  const city = serviceArea?.split(",", 1)[0]?.trim();
  if (!city || city.length < 3) return false;

  const cityWords = normalizedWords(city);
  const addressWords = normalizedWords(formattedAddress);
  if (cityWords.length === 0 || addressWords.length === 0) return false;

  const cityPhrase = ` ${cityWords.join(" ")} `;
  const addressPhrase = ` ${addressWords.join(" ")} `;
  return addressPhrase.includes(cityPhrase);
}

export function findHighConfidencePlaceMatch(input: {
  businessName: string;
  phone?: string;
  submittedWebsiteUrl?: string;
  serviceArea?: string;
  candidates: Array<PlaceMatchCandidate>;
}): HighConfidencePlaceMatch | null {
  const expectedName = normalizedBusinessName(input.businessName);
  const expectedPhone = normalizedPhone(input.phone);
  const expectedHostname = normalizedHostname(input.submittedWebsiteUrl);

  const strongMatches = input.candidates.flatMap((candidate) => {
    if (
      candidate.businessStatus &&
      candidate.businessStatus !== "OPERATIONAL"
    ) {
      return [];
    }

    const reasons: HighConfidencePlaceMatch["reasons"] = [];
    const nameMatches =
      Boolean(expectedName) &&
      normalizedBusinessName(candidate.businessName) === expectedName;
    const phoneMatches =
      Boolean(expectedPhone) && normalizedPhone(candidate.phone) === expectedPhone;
    const websiteMatches =
      Boolean(expectedHostname) &&
      normalizedHostname(candidate.websiteUrl) === expectedHostname;
    const areaMatches = locationMatches(
      input.serviceArea,
      candidate.formattedAddress,
    );

    if (nameMatches) reasons.push("name");
    if (phoneMatches) reasons.push("phone");
    if (websiteMatches) reasons.push("website");
    if (areaMatches) reasons.push("location");

    const independentlyCorroborated =
      nameMatches && (phoneMatches || websiteMatches || areaMatches);
    const sameContactIdentity = phoneMatches && websiteMatches;

    return independentlyCorroborated || sameContactIdentity
      ? [{ placeId: candidate.placeId, reasons }]
      : [];
  });

  return strongMatches.length === 1 ? strongMatches[0] : null;
}
