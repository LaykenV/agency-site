/**
 * Deterministic safety and factual validation for model-generated concept HTML.
 *
 * This is the second of three layers, and it is the only one that is automatic:
 *
 * 1. The sandbox. `/preview/[token]` renders the document inside an iframe with
 *    no `allow-scripts`, `allow-forms`, or `allow-same-origin`, so even a
 *    hostile page cannot reach the application DOM, cookies, storage, or
 *    network. That boundary does not depend on anything in this file.
 * 2. This validator. It rejects output that is unsafe, non-self-contained, or
 *    states a fact the brief does not support.
 * 3. Human review. Layken reads every concept before publishing.
 *
 * So the goal here is not to be a complete HTML sanitizer — a regex pass over
 * untrusted markup never is, and layer 1 is what makes that acceptable. The
 * goal is to make the common model failures impossible to publish by accident:
 * invented phone numbers, invented five-star testimonials, hotlinked stock
 * photography, Google Fonts, and leftover `lorem ipsum`.
 *
 * Every check returns a violation string rather than throwing, so the admin
 * review card can show Layken exactly what went wrong and let him regenerate.
 */

import type { ConceptBrief } from "./brief";
import { conceptAssetAllowlist } from "./brief";

/** Generated documents above this size are rejected as runaway output. */
const MAX_HTML_BYTES = 400_000;

/** Minimum length of a quoted run in body text before it counts as a claim. */
const QUOTE_CLAIM_MIN_LENGTH = 40;

export type ConceptHtmlValidation = {
  ok: boolean;
  violations: Array<string>;
};

/**
 * Attributes that can cause a fetch or a navigation. `data-*` is deliberately
 * absent: with no script able to run, a data attribute is inert.
 */
const URL_ATTRIBUTES = [
  "src",
  "srcset",
  "href",
  "poster",
  "action",
  "formaction",
  "background",
  "cite",
  "profile",
  "usemap",
  "xlink:href",
];

/**
 * Elements that either execute, embed, fetch, submit, or re-root the document.
 *
 * `<link>` is here because it is the main way a page pulls in Google Fonts.
 * `<button>` and the form controls are here because the plan forbids rendering
 * a control that looks interactive but cannot work in this sandbox.
 */
const BANNED_ELEMENTS = [
  "script",
  "iframe",
  "object",
  "embed",
  "base",
  "link",
  "form",
  "input",
  "textarea",
  "select",
  "button",
  "applet",
  "frame",
  "frameset",
  "portal",
  "foreignobject",
  "audio",
  "video",
  "source",
  "track",
  "canvas",
  "noscript",
  "marquee",
];

/**
 * Dangerous anywhere in the document, including body text: a URL scheme or an
 * external-resource directive has no innocent reading on a business homepage.
 */
const BANNED_ANYWHERE: Array<[needle: string, label: string]> = [
  ["javascript:", "javascript: URL"],
  ["vbscript:", "vbscript: URL"],
  ["data:text/html", "data:text/html URL"],
  ["data:application", "data: application URL"],
  ["data:image/svg+xml", "data: SVG URL (can carry script)"],
  ["@import", "CSS @import (external request)"],
  ["@font-face", "@font-face (external font request)"],
  ["srcdoc", "nested srcdoc"],
  ["<!--#", "server-side include"],
];

/**
 * Dangerous only in markup, CSS, or attribute position. These are scanned
 * against the document with text nodes removed, because a cleaning company
 * writing "we fetch (and haul) debris" is not making a network call.
 */
const BANNED_IN_MARKUP: Array<[needle: string, label: string]> = [
  ["fetch(", "fetch() call"],
  ["xmlhttprequest", "XMLHttpRequest"],
  ["sendbeacon", "navigator.sendBeacon"],
  ["eventsource", "EventSource"],
  ["websocket", "WebSocket"],
  ["localstorage", "localStorage"],
  ["sessionstorage", "sessionStorage"],
  ["document.cookie", "document.cookie"],
  ["expression(", "CSS expression()"],
];

/** Placeholder and template residue that must never reach a real prospect. */
const PLACEHOLDER_PATTERNS: Array<[pattern: RegExp, label: string]> = [
  [/lorem\s+ipsum/i, "lorem ipsum"],
  [/\blorem\b/i, "lorem"],
  [/\bTODO\b/, "TODO"],
  [/\bFIXME\b/, "FIXME"],
  [/example\.com/i, "example.com"],
  [/example\.org/i, "example.org"],
  [/yourbusiness/i, "yourbusiness"],
  [/\byour business name\b/i, "your business name"],
  [/\bbusiness name here\b/i, "business name here"],
  [
    /\[\s*(business|company|name|phone|city|address|logo|service)\s*\]/i,
    "bracketed placeholder",
  ],
  [/\{\{/, "template braces"],
  [/\bplaceholder\b/i, "placeholder"],
  [/\binsert\s+(your|the)\b/i, "insert your/the"],
  [/\bsample\s+text\b/i, "sample text"],
];

/**
 * Phone numbers reserved for fiction, or obvious keyboard-mash filler.
 * Matched against the ten-digit normalized form, so the 555-01XX range is
 * `<area code>55501XX` rather than a bare seven digits.
 */
const FAKE_PHONE_PATTERNS: Array<RegExp> = [
  /^\d{3}55501\d{2}$/,
  /^5{10}$/,
  /^1234567890$/,
  /^0{10}$/,
  /^9{10}$/,
];

const PHONE_IN_TEXT = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g;

const STAR_GLYPHS = /[★☆⭐]/;

/**
 * Characters a browser tolerates inside a URL scheme but a naive substring
 * match does not: whitespace, soft hyphen, and the zero-width family.
 */
const INVISIBLE_CHARS =
  /[\s\u0000-\u001f\u007f\u00ad\u200b-\u200d\u2060\ufeff]/g;

/**
 * Collapse a document into a form where scheme-splitting tricks do not work.
 *
 * Entity decoding matters because `&#106;avascript:` is a live URL in a browser
 * but not a substring match; invisible-character removal matters because
 * browsers tolerate control characters inside a scheme.
 */
function flattenForScan(value: string): string {
  return decodeEntities(value).replace(INVISIBLE_CHARS, "").toLowerCase();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
      safeCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);?/g, (_, dec: string) =>
      safeCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&colon;/gi, ":")
    .replace(/&sol;/gi, "/")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&lpar;/gi, "(")
    .replace(/&rpar;/gi, ")")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Body text with `<style>` blocks, comments, and all markup removed. */
function extractTextContent(html: string): string {
  return decodeEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The inverse of `extractTextContent`: every tag, plus the contents of every
 * `<style>` block, with prose discarded.
 */
function extractMarkupAndCss(html: string): string {
  const parts: Array<string> = [];
  for (const match of html.matchAll(/<style[\s\S]*?<\/style>/gi)) {
    parts.push(match[0]);
  }
  for (const match of html.matchAll(/<[^>]*>/g)) {
    parts.push(match[0]);
  }
  return parts.join("\n");
}

/** Every URL-shaped value the document references, from markup and from CSS. */
function extractReferencedUrls(html: string): Array<string> {
  const urls: Array<string> = [];

  const attributePattern = new RegExp(
    `(${URL_ATTRIBUTES.join("|")})\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "gi",
  );
  for (const match of html.matchAll(attributePattern)) {
    const attribute = match[1].toLowerCase();
    const raw = match[3] ?? match[4] ?? match[5] ?? "";
    if (attribute === "srcset") {
      for (const candidate of raw.split(",")) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url) urls.push(url);
      }
      continue;
    }
    urls.push(raw);
  }

  for (const match of html.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    urls.push(match[2]);
  }

  return urls.map((url) => decodeEntities(url).trim()).filter(Boolean);
}

/** Last ten digits, so `+1 (337) 555-1234` and `337.555.1234` compare equal. */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Quoted runs in body text long enough to be a claim rather than a stylistic
 * flourish. Curly and straight double quotes both count; apostrophes do not.
 */
function extractQuotedClaims(text: string): Array<string> {
  const claims: Array<string> = [];
  const patterns = [/“([^”]{1,600})”/g, /"([^"]{1,600})"/g];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const claim = match[1].trim();
      if (claim.length >= QUOTE_CLAIM_MIN_LENGTH) {
        claims.push(claim);
      }
    }
  }

  return claims;
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validate one generated document against the brief that produced it.
 *
 * `brief` is the source of factual truth: the image allowlist, the one
 * permitted phone number, and the only testimonial text that may appear.
 */
export function validateConceptHtml(
  html: string,
  brief: ConceptBrief,
): ConceptHtmlValidation {
  if (!html.trim()) {
    return { ok: false, violations: ["Generated HTML is empty."] };
  }

  const violations: Array<string> = [];
  const text = extractTextContent(html);
  const markup = extractMarkupAndCss(html);
  const flattenedAll = flattenForScan(html);
  const flattenedMarkup = flattenForScan(markup);

  // --- Shape ---

  const byteLength = new TextEncoder().encode(html).length;
  if (byteLength > MAX_HTML_BYTES) {
    violations.push(
      `Document is ${byteLength} bytes, over the ${MAX_HTML_BYTES}-byte ceiling.`,
    );
  }

  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) {
    violations.push("Not a complete HTML document (missing <html> element).");
  }

  // Without this the concept renders at desktop width inside the iframe on a
  // phone, which is the one thing the whole mobile-first brief exists to avoid.
  if (!/<meta[^>]+name\s*=\s*["']?viewport/i.test(html)) {
    violations.push('Missing <meta name="viewport"> — will not size on mobile.');
  }

  // --- Executable and embedded content ---

  for (const element of BANNED_ELEMENTS) {
    if (new RegExp(`<${element}[\\s/>]`, "i").test(html)) {
      violations.push(`Contains banned <${element}> element.`);
    }
  }

  if (/<meta[^>]+http-equiv\s*=\s*["']?refresh/i.test(html)) {
    violations.push("Contains a meta refresh redirect.");
  }

  // `onclick`, `onload`, `onerror`, and friends. Scanned in markup position
  // only, so prose containing "once=" cannot trip it.
  const eventHandler = markup.match(/\son[a-z]{2,20}\s*=/i);
  if (eventHandler) {
    violations.push(
      `Contains an inline event handler (${eventHandler[0].trim()}).`,
    );
  }

  for (const [needle, label] of BANNED_ANYWHERE) {
    if (flattenedAll.includes(needle)) {
      violations.push(`Contains ${label}.`);
    }
  }

  for (const [needle, label] of BANNED_IN_MARKUP) {
    if (flattenedMarkup.includes(needle)) {
      violations.push(`Contains ${label}.`);
    }
  }

  // A tap that opens a new browsing context cannot work in this sandbox, and
  // the plan forbids controls that look interactive but are not.
  if (/\starget\s*=/i.test(markup)) {
    violations.push("Contains a target attribute; links must navigate in place.");
  }

  // --- Asset allowlist ---

  const allowlist = new Set(conceptAssetAllowlist(brief));
  const briefPhone = brief.phone ? normalizePhone(brief.phone) : null;

  for (const url of extractReferencedUrls(html)) {
    const lower = url.toLowerCase();

    if (url.startsWith("#")) continue;

    if (lower.startsWith("tel:")) {
      const normalized = normalizePhone(url.slice(4));
      if (!briefPhone) {
        violations.push(`tel: link ${url} but the brief has no phone number.`);
      } else if (normalized !== briefPhone) {
        violations.push(`tel: link ${url} does not match the verified phone.`);
      }
      continue;
    }

    // No verified email address exists in the brief, so any mailto: address is
    // necessarily invented.
    if (lower.startsWith("mailto:")) {
      violations.push(`Contains an unverified mailto: link (${url}).`);
      continue;
    }

    if (lower.startsWith("data:image/") && !lower.startsWith("data:image/svg")) {
      continue;
    }

    if (lower.startsWith("http://") || lower.startsWith("https://")) {
      if (!allowlist.has(url)) {
        violations.push(`References a URL outside the approved allowlist: ${url}`);
      }
      continue;
    }

    violations.push(
      `References a non-self-contained URL (${url}); only approved absolute URLs, tel:, and #anchors are allowed.`,
    );
  }

  // --- Factual claims ---

  for (const [pattern, label] of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text) || pattern.test(markup)) {
      violations.push(`Contains placeholder text: ${label}.`);
    }
  }

  const seenPhones = new Set<string>();
  for (const match of text.matchAll(PHONE_IN_TEXT)) {
    const normalized = normalizePhone(match[0]);
    if (normalized.length < 10 || seenPhones.has(normalized)) continue;
    seenPhones.add(normalized);

    if (FAKE_PHONE_PATTERNS.some((pattern) => pattern.test(normalized))) {
      violations.push(`Contains a fictional phone number (${match[0]}).`);
      continue;
    }
    if (!briefPhone) {
      violations.push(
        `Displays a phone number (${match[0]}) but the brief has none.`,
      );
      continue;
    }
    if (normalized !== briefPhone) {
      violations.push(
        `Displays phone number ${match[0]}, which is not the verified number.`,
      );
    }
  }

  const approved = brief.approvedQuotes.map((quote) =>
    normalizeForComparison(quote.text),
  );

  if (/<blockquote[\s>]/i.test(html) && approved.length === 0) {
    violations.push(
      "Contains a <blockquote> testimonial but no quotes were approved for this concept.",
    );
  }

  for (const claim of extractQuotedClaims(text)) {
    const normalized = normalizeForComparison(claim);
    if (!approved.some((quote) => quote.includes(normalized))) {
      violations.push(
        `Contains quoted text not present in the approved quotes: "${claim.slice(0, 80)}".`,
      );
    }
  }

  // A rating is a fact. Star glyphs without one are decoration standing in for
  // social proof the business has not been shown to have.
  if (STAR_GLYPHS.test(text) && typeof brief.googleRating !== "number") {
    violations.push(
      "Renders star glyphs but the brief has no verified Google rating.",
    );
  }

  // Catches the failure where the model designs a beautiful page for a
  // different business than the one being pitched.
  if (
    !normalizeForComparison(text).includes(
      normalizeForComparison(brief.businessName),
    )
  ) {
    violations.push(
      `Business name "${brief.businessName}" does not appear in the page text.`,
    );
  }

  return { ok: violations.length === 0, violations };
}
