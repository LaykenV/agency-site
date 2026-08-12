/**
 * The iframe sandbox used to render model-generated concept HTML.
 *
 * Shared by `/preview/[token]` and the admin review card so the two cannot
 * drift. Reviewing a concept under weaker or stronger restrictions than the
 * recipient gets would make the review meaningless.
 *
 * No tokens are granted. `allow-scripts`, `allow-forms`, `allow-same-origin`,
 * `allow-popups`, and `allow-top-navigation-by-user-activation` are all
 * withheld, so the document cannot execute, submit, reach the parent DOM or
 * cookies, open a new context, or navigate the parent. Concept CTAs are dummy
 * controls; there is no in-frame conversion path that needs a live `tel:` or
 * maps link.
 */
export const CONCEPT_IFRAME_SANDBOX = "";

const INERT_STYLE =
  "<style data-concept-inert>a,area{pointer-events:none;cursor:default}</style>";

/**
 * Strip every `href` so concept CTAs cannot navigate.
 *
 * `href="#"` is not dummy: in a `srcDoc` iframe the browser resolves it to
 * the parent preview URL, and a click loads that page *inside* the frame —
 * stacking another concept notice on each tap. Removing the attribute leaves
 * an inert `<a>`. The injected style is a second lock for already-published
 * documents that still contain links.
 */
export function neuterConceptHrefs(html: string): string {
  const stripped = html.replace(
    /\s(?:href|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    "",
  );

  if (stripped.includes("data-concept-inert")) return stripped;
  if (/<head[\s>]/i.test(stripped)) {
    return stripped.replace(/<head([^>]*)>/i, `<head$1>${INERT_STYLE}`);
  }
  return `${INERT_STYLE}${stripped}`;
}
