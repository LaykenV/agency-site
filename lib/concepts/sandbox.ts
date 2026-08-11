/**
 * The iframe sandbox used to render model-generated concept HTML.
 *
 * Shared by `/preview/[token]` and the admin review card so the two cannot
 * drift. Reviewing a concept under weaker or stronger restrictions than the
 * recipient gets would make the review meaningless — a call button that works
 * for Layken and not for the prospect is exactly the bug this prevents.
 *
 * Deliberately absent: `allow-scripts`, `allow-forms`, `allow-same-origin`, and
 * `allow-popups`. Without them the document cannot execute, submit, reach the
 * parent DOM or cookies, or open a new context.
 *
 * `allow-top-navigation-by-user-activation` is granted because without it a
 * `tel:` link inside the frame silently fails in several browsers, and tapping
 * to call is the only conversion path these pages have. It requires a genuine
 * user gesture, scripts still cannot run, and `validateConceptHtml` has already
 * restricted every `href` to `tel:`, a `#` fragment, or one allowlisted maps URL.
 */
export const CONCEPT_IFRAME_SANDBOX = "allow-top-navigation-by-user-activation";
