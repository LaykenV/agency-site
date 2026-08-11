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

export type OpenRouterMessageContent =
  | string
  | Array<{ type?: string; text?: string }>
  | null
  | undefined;

/** Normalize both Chat Completions content shapes into the final text. */
export function extractOpenRouterText(
  content: OpenRouterMessageContent,
): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .filter((part) => part.type === undefined || part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}
