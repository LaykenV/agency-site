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
const TELEPHONE_FORMAT_META =
  '<meta name="format-detection" content="telephone=no" data-concept-telephone-format>';

/**
 * Prepare generated HTML for the shared admin and recipient preview.
 *
 * `href="#"` is not dummy: in a `srcDoc` iframe the browser resolves it to
 * the parent preview URL, and a click loads that page *inside* the frame —
 * stacking another concept notice on each tap. Removing the attribute leaves
 * an inert `<a>`. The injected style is a second lock for already-published
 * documents that still contain links.
 *
 * iOS also detects plain-text phone numbers and restyles them as blue,
 * underlined links even when the document contains no anchor. The injected
 * format-detection meta tag keeps the number as the model designed it. This is
 * a render concern, not another instruction every generation has to remember.
 */
export function neuterConceptHrefs(html: string): string {
  const stripped = html.replace(
    /\s(?:href|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    "",
  );

  const guards = [
    stripped.includes("data-concept-telephone-format")
      ? ""
      : TELEPHONE_FORMAT_META,
    stripped.includes("data-concept-inert") ? "" : INERT_STYLE,
  ].join("");

  if (!guards) return stripped;
  if (/<head[\s>]/i.test(stripped)) {
    return stripped.replace(/<head([^>]*)>/i, `<head$1>${guards}`);
  }
  if (/<html[\s>]/i.test(stripped)) {
    return stripped.replace(/<html([^>]*)>/i, `<html$1><head>${guards}</head>`);
  }
  return `${guards}${stripped}`;
}
