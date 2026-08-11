/**
 * The one Google-derived value a concept page may link to.
 *
 * Google's Places policy restricts retaining Places content but explicitly
 * exempts the place ID, so the concept stores that and nothing else. The
 * directions link is rebuilt from it on demand rather than persisting the
 * `googleMapsUri` a search response happened to return.
 *
 * The URL shape is Google's documented Maps URL API: `query` is required and
 * `query_place_id` is what actually resolves the pin, so the business name is
 * passed as the human-readable half of the pair.
 *
 * Deterministic on purpose. `validateConceptHtml` allowlists this exact string
 * as the single permitted external href, so it has to reproduce byte for byte
 * between the brief that was generated and the brief that is re-validated at
 * publish time.
 */
export function conceptGoogleMapsUrl(input: {
  placeId?: string;
  businessName: string;
}): string | undefined {
  const placeId = input.placeId?.trim();
  if (!placeId) return undefined;

  const query = encodeURIComponent(input.businessName.trim() || placeId);
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(placeId)}`;
}
