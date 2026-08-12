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
 * Deliberately low-pressure and honest about what the link is: a direction
 * sketch built from the information and photos already on hand, not the
 * finished website. The next step is a conversation, not a purchase.
 */
export function buildMessengerDraft(input: {
  businessName: string;
  token: string;
}): string {
  return [
    `I mocked up a homepage concept for ${input.businessName} from the photos and info I had: ${conceptPreviewUrl(input.token)}`,
    "",
    "It's just a sketch so you can see a direction — not the finished site. Buttons don't do anything, and the real build will have more pages and a tighter design. If you like the vibe we can keep that look; if not, we start from wherever you want.",
  ].join("\n");
}
