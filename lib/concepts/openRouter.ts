/** OpenRouter attribution headers must remain printable ASCII. */
export const OPENROUTER_ATTRIBUTION_HEADERS = {
  "HTTP-Referer": "https://acadianawebdesign.com",
  "X-Title": "Acadiana Web Design - concept generator",
} as const;

export function hasOnlyAsciiHeaderValues(
  headers: Record<string, string>,
): boolean {
  return Object.values(headers).every((value) => /^[\x20-\x7e]*$/.test(value));
}
