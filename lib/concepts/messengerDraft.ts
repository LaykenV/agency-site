/**
 * The Messenger handoff draft and the public preview URL.
 *
 * Kept pure and separate from the admin UI so the wording is one edit in one
 * place. The message is always sent by hand in Messenger — nothing in this
 * repository sends it, and nothing should.
 */

/**
 * Canonical public origin for concept links.
 *
 * `NEXT_PUBLIC_BASE_URL` is preferred because this runs in the browser inside
 * the admin card, where server-only `SITE_URL` is not available. The localhost
 * fallback is a development convenience; a link copied in development is
 * obviously not sendable, which is the correct signal.
 */
export function conceptPreviewOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return "http://localhost:3000";
  const trimmed = configured.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function conceptPreviewUrl(token: string): string {
  return `${conceptPreviewOrigin()}/preview/${token}`;
}

/**
 * The default handoff message.
 *
 * Deliberately low-pressure and honest about provenance: it says the concept
 * was built from the information and photos already on hand, which is exactly
 * what happened, and it names adjustment rather than purchase as the next step.
 */
export function buildMessengerDraft(input: {
  businessName: string;
  token: string;
}): string {
  return [
    `I put together the website concept we talked about using the information and photos I had for ${input.businessName}: ${conceptPreviewUrl(input.token)}`,
    "",
    "Take a look when you have a minute. If you like the direction, we can adjust anything you want and talk about getting it live.",
  ].join("\n");
}
