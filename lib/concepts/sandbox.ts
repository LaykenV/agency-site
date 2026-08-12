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

/**
 * Force every `href` in generated HTML to `#`.
 *
 * New generations are already rejected if they contain a live link. This
 * rewrite covers already-published documents that still carry `tel:`, a maps
 * URL, or a `#section` anchor, so those taps stay dummy without a regenerate.
 */
export function neuterConceptHrefs(html: string): string {
  return html.replace(
    /(\shref\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/gi,
    `$1"#"`,
  );
}
