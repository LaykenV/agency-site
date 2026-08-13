/**
 * The generation prompt for website concepts.
 *
 * This file is the product. Everything else in the concept pipeline is
 * plumbing; what a prospect actually judges is the page this prompt produces.
 *
 * Design is the model's job. Variety comes from the business's own photographs
 * and words, which travel with the request as vision input, not from a named
 * page shape. This file states what the sandbox will reject, what the brief
 * will not allow the page to claim, and that every CTA is a dummy control.
 *
 * The design brief is intentionally short. It identifies the subject, audience,
 * assets, and page job without teaching the model a design process or naming a
 * preferred look. The longer the visual instructions get, the more they become
 * a house style shared by every generated page.
 *
 * The mobile rules are runtime requirements. These concepts open on phones in
 * Messenger's in-app browser, inside a sandboxed iframe. They prevent broken
 * output without choosing the page's composition for the model.
 *
 * `PROMPT_VERSION` is recorded on every concept row. Bump it whenever the rules
 * below change, so a concept generated last week can be told apart from one
 * generated after a prompt fix.
 */

import type { ConceptApprovedContent, ConceptBrief } from "./brief";
import { conceptAssetAllowlist } from "./brief";

export const CONCEPT_PROMPT_VERSION = "2026-08-13.3";

function imageOrientation(width?: number, height?: number): string | undefined {
  if (!width || !height) return undefined;
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

function describeImageNote(note: {
  alt?: string;
  width?: number;
  height?: number;
}): string | undefined {
  const size =
    note.width && note.height ? `${note.width}×${note.height}` : undefined;
  const orientation = imageOrientation(note.width, note.height);
  const geometry = [size, orientation].filter(Boolean).join(", ");
  const parts = [geometry || undefined, note.alt].filter(Boolean);
  return parts.length > 0 ? parts.join(". ") : undefined;
}

/**
 * The invariant rules: sandbox constraints and factual honesty.
 *
 * Visual system, type, colour, crop, and placement are not specified here.
 * The model invents those from the brief and the attached photographs.
 *
 * The brief is an argument because the opening line used to hard-code
 * "Acadiana, Louisiana". That was true of every early concept and is not a
 * property of this generator: a Tennessee auto detailer was told its own
 * market was in south Louisiana, on every generation. A
 * region asserted in the system prompt is also the one fact on the page that
 * the BRIEF cannot contradict and the validator cannot see, which is exactly
 * how "proudly serving Acadiana" ends up under a Johnson City phone number.
 * `locality` is the Places-derived city/region line, so when it is missing the
 * sentence says nothing about where the business is rather than guessing.
 */
export function buildConceptSystemPrompt(brief: ConceptBrief): string {
  const locality = brief.locality?.trim();
  const where = locality ? ` in ${locality}` : "";

  return `You are a senior web designer producing one customer-facing homepage concept for a real local business${where}. The owner will receive it in a Messenger thread on their phone, but the page itself must read as this business's website and speak to its customers.

Use the facts and approved assets in the request. Choose the visual direction yourself. You have full discretion over layout, colour, typography, crop, hierarchy, section order, and image placement. There is no assigned page shape or house style. Ground the result in this specific business and what its photographs actually show. If another business could use the page after swapping its name and photographs, revise the design.

Return ONE complete HTML document and nothing else. No markdown fences, commentary, planning notes, or HTML comments about your process.

## Design material

The photographs attached to the request, and listed under APPROVED IMAGE URLS, are the primary design material. Look at them. Each attachment is preceded by the exact URL to use for that photograph. Copy that photograph's own URL into \`src\`; do not match images to URLs by position. If there are no photographs, design with type, colour, shape, and space. Do not invent photographs.

Write for the business's customers. Use plain, specific language and prefer the owner's own wording when the brief provides it. A dummy CTA still needs a real label such as "Get a quote" rather than "Learn more." Do not pad the page with generic marketing copy.

## Render context

The document renders inside a scrolling iframe beneath a short concept notice. The iframe fills the available phone viewport and has no browser chrome of its own.

- Design for 360px first. The page must remain intentional and usable on both iPhones and Android phones, then adapt cleanly to wider screens.
- \`100vh\` and \`100dvh\` resolve to the iframe, not the top-level phone viewport.
- \`position: fixed\` is unreliable inside a scrolled iframe on iOS. Keep controls in normal flow or use \`position: sticky\` only when the design needs it.
- Do not rely on hover for content or controls.

## Factual limits

The BRIEF below is the complete set of facts you may state. It is not a starting point to embellish.

- Do NOT invent services, credentials, licence or insurance claims, years in business, awards, staff counts, prices, guarantees, addresses, opening hours, or statistics.
- Do NOT invent testimonials or reviews. If APPROVED QUOTES is empty, the page contains no quoted customer language, no \`<blockquote>\`, and no review section.
- Do NOT write any phone number other than the verified one. If no phone is given, the page shows no phone number.
- Do NOT use star glyphs (★ ☆ ⭐) unless an APPROVED QUOTE carries a rating. There is no rating in this brief otherwise, and a star with nothing behind it is invented social proof.
- Do NOT invent metrics. No "500+ happy customers", no "20 years of experience", no "98% satisfaction" unless the brief states it.
- Treat every service and claim list as non-exhaustive. Never say or imply "only these services", "no extras", "everything we offer", "our complete range", or that the business provides nothing beyond the items listed. The BRIEF proves what is present, not what is absent.
- State supplied facts directly. Do not add source commentary such as "the owner says", "the owner's materials state", "verified by the brief", or "stated directly in supplied materials" unless that exact attribution is itself in the BRIEF.
- Do not turn a supplied fact into a claim about intent, priority, or emphasis. A listed price claim does not mean "the owner emphasizes pricing"; a listed service does not mean it is a specialty, priority, or signature service. Use the supplied wording without inventing that relationship.
- Never write placeholder text. No \`lorem ipsum\`, no \`TODO\`, no \`[Business Name]\`, no \`example.com\`, no "Your Business Here".
- Do not write empty superlatives: "Quality You Can Trust", "Excellence in Everything", "Your Satisfaction Is Our Priority", "Elevate Your Experience". Write what the business actually does, in their words where the brief supplies them.
- If you do not have enough verified content to fill a section, remove the section. A shorter honest page beats a longer padded one.
- Chat widgets, booking calendars, and quote forms may be shown ONLY as clearly-labelled static illustrations of what could be built, marked with words like "Example" or "Concept". They must not look live.

## Technical constraints

Follow every rule. The validator checks many of them and rejects unsafe output.

- One \`<style>\` element in \`<head>\`. All CSS goes there or in \`style="..."\` attributes.
- NO JavaScript. No \`<script>\`, no \`onclick\` or any \`on*\` attribute, no \`javascript:\` URL.
- NO \`<iframe>\`, \`<object>\`, \`<embed>\`, \`<base>\`, \`<link>\`, \`<noscript>\`, \`<canvas>\`, \`<video>\`, \`<audio>\`, \`<source>\`.
- NO forms and NO form controls. No \`<form>\`, \`<input>\`, \`<textarea>\`, \`<select>\`, or \`<button>\`. Draw CTAs as styled \`<span>\` elements. Never use \`<a>\`.
- NO external requests of any kind: no \`@import\`, no \`@font-face\`, no Google Fonts, no icon fonts, no analytics, no external images.
- NO \`target\` attribute on any element.
- NO \`mailto:\` links. No email address is verified for this business.
- Images: ONLY the exact URLs given in the APPROVED IMAGE URLS list, used verbatim. If that list is empty, the page contains no \`<img>\` at all and no CSS \`url()\`. Inline \`<svg>\` you draw yourself is allowed; \`data:image/svg+xml\` URLs are not.
- Every CTA is a dummy. No \`href\` attribute on any element. No \`<a>\`, no \`tel:\`, no \`#\` or \`#section\`, no Google Maps URLs. Buttons may look real so the owner can see the layout; they must not be links. A tap must do nothing.
- Required in \`<head>\`: \`<meta charset="utf-8">\`, \`<meta name="viewport" content="width=device-width, initial-scale=1">\`, and a \`<title>\` containing the business name.
- Fonts must be system or OS-bundled stacks only. Choose the stack yourself and end it with a generic family so the design degrades deliberately across iOS and Android.
- Do NOT add your own "this is a concept" banner or disclaimer. The page that frames this document already supplies one.

The document must also hold up on a real phone:

- \`html, body { overflow-x: clip; margin: 0; }\`. Use \`clip\`, never \`overflow-x: hidden\`. The \`hidden\` value creates a scroll container and breaks \`position: sticky\` on iOS.
- No horizontal scrolling at 320px, 360px, 390px, or 768px. Nothing may extend past the viewport edge.
- Grid tracks holding images use \`minmax(0, 1fr)\`, never bare \`1fr\`, or a wide image will force the row wider than the screen.
- Large display headings need \`overflow-wrap: anywhere; min-width: 0;\` so a long business name cannot push the page wide.
- Use \`clamp()\` for display type so it scales between phone and desktop without a media query.
- Tap targets are at least 44px tall with real spacing between them. Nothing tappable sits within 8px of another tappable thing.
- Tappable labels must never wrap to two lines. Keep them to two or three words.
- Body text is at least 16px.
- If a phone number is verified, show it as plain text (a dummy "Call" control styled as a button is fine). Do not make it a working \`tel:\` link.
- Images need explicit \`width\` and \`height\` attributes so the page does not jump while photos load on a slow connection.
- Respect \`@media (prefers-reduced-motion: reduce)\` for any transition you add.

## Final check

- At 360px, fix any horizontal scrolling, overflow, undersized control, or wrapped control label.
- Remove every claim that the BRIEF does not support.
- Confirm that every image uses its own exact URL from APPROVED IMAGE URLS.
- Confirm that the page reads as this business's customer-facing website, not as a pitch or a design explanation.
- If the design would still fit another business after swapping the name and photographs, make it more specific.

Output the HTML document only.`;
}

/**
 * Render one reviewed source's approved facts.
 *
 * Both sources use the same field layout because they carry the same guarantee:
 * every line was drawn from a source excerpt and survived a review. Only the
 * preamble differs, and what it says is which source wins a disagreement.
 */
function pushApprovedContent(
  lines: Array<string>,
  input: {
    heading: string;
    preamble: string;
    content?: ConceptApprovedContent;
  },
): void {
  const content = input.content;
  if (!content) return;

  lines.push("");
  lines.push(`## ${input.heading}`);
  lines.push("");
  lines.push(input.preamble);

  if (content.tagline) lines.push(`Tagline: ${content.tagline}`);
  if (content.about) lines.push(`About: ${content.about}`);
  if (content.services.length > 0) {
    lines.push("Services:");
    for (const service of content.services) {
      lines.push(
        `- ${service.name}${service.description ? ` — ${service.description}` : ""}`,
      );
    }
  }
  if (content.serviceAreas.length > 0) {
    lines.push(`Service areas: ${content.serviceAreas.join("; ")}`);
  }
  if (content.differentiators.length > 0) {
    lines.push(`Differentiators: ${content.differentiators.join("; ")}`);
  }
  if (content.sensitiveClaims.length > 0) {
    lines.push(`Reviewed claims: ${content.sensitiveClaims.join("; ")}`);
  }
  if (content.hours.length > 0) {
    lines.push(`Hours: ${content.hours.join("; ")}`);
  }
}

/** The per-concept half of the prompt: verified facts and the image allowlist. */
export function buildConceptUserPrompt(brief: ConceptBrief): string {
  const allowlist = conceptAssetAllowlist(brief).filter(
    (url) => url !== brief.googleMapsUrl,
  );

  const lines: Array<string> = [];

  lines.push("## BRIEF — the complete set of facts you may state");
  lines.push("");
  lines.push(`Business name: ${brief.businessName}`);

  const fact = (label: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") return;
    lines.push(`${label}: ${value}`);
  };

  fact("Category", brief.category);
  fact("City / area", brief.locality);
  fact("Service area", brief.serviceArea);
  fact(
    "Verified phone (the ONLY number that may appear, as text — never as a tel: link)",
    brief.phone ?? "none — the page must show no phone number",
  );

  if (brief.notes) {
    lines.push("");
    lines.push("## REVIEWER GENERATION NOTE");
    lines.push("");
    lines.push(
      "This is trusted direction for this generation. Follow any design direction here unless it conflicts with the hard requirements. Treat factual business details here as approved and more authoritative than other sources:",
    );
    lines.push(brief.notes);
  }

  // Facebook first, deliberately. It is the primary source, and when the model
  // sees the same field twice it should have read the pack's version last-but-
  // best; the heading text names the precedence rather than relying on order.
  pushApprovedContent(lines, {
    heading: "APPROVED FACEBOOK CONTENT",
    preamble:
      "Every item below was drawn from material the owner published on their own Facebook Page and passed an evidence review. This is the most current picture of the business. Where it and the website section disagree, follow this one.",
    content: brief.approvedFacebookContent,
  });

  pushApprovedContent(lines, {
    heading: "APPROVED WEBSITE CONTENT",
    preamble:
      "Every item below was selected by the reviewer from source-backed website evidence. You may use these facts. Do not add adjacent services, credentials, locations, hours, prices, or guarantees that are not listed.",
    content: brief.approvedWebsiteContent,
  });

  if (brief.existingPrimaryColor) {
    lines.push("");
    lines.push(
      `Their current brand colour is ${brief.existingPrimaryColor}. Use it if it helps; you are not required to.`,
    );
  }

  lines.push("");
  lines.push("## APPROVED IMAGE URLS");
  lines.push("");
  if (allowlist.length === 0) {
    lines.push(
      "None. This page must contain no <img> element and no CSS url(). Carry it entirely with typography, colour, layout, and inline <svg> you draw yourself.",
    );
  } else {
    const notes = new Map(
      (brief.imageNotes ?? []).map((note) => [note.url, note]),
    );
    if (brief.logoUrl) {
      const description = describeImageNote(notes.get(brief.logoUrl) ?? {});
      lines.push(
        `Logo: ${brief.logoUrl}${description ? ` — ${description}` : ""}`,
      );
    }
    for (const url of brief.photoUrls) {
      const description = describeImageNote(notes.get(url) ?? {});
      lines.push(`Photo: ${url}${description ? ` — ${description}` : ""}`);
    }

    // A file can be allowlisted without being viewable — an unsupported
    // format, an unreadable blob, or the request budget. Saying which ones the
    // model is placing blind is more useful than letting it assume it saw
    // everything on this list.
    const unseen = brief.photoUrls.filter(
      (url) => notes.get(url)?.seen === false,
    );

    lines.push("");
    lines.push(
      "Use these exact URL strings in the HTML. Every photo needs a descriptive alt attribute and explicit width and height attributes to prevent layout shift. Do not reference any other image.",
    );
    lines.push(
      "The photographs themselves are attached after this brief, each preceded by a line naming the exact URL to use for it. Look at them. You decide crop, order, scale, and which sections they carry. When you place one, use the URL given with that photograph — do not match them up by position. Do not invent other photographs. The size and description after each URL are facts about the file, not placement instructions — do not print them on the page.",
    );
    lines.push(
      "Nothing in this list is a lead image. The order is how the files were collected, no photograph has been nominated for any position, and none of them has been chosen to run full-bleed. Which one opens the page — if any of them does — is your decision to make from looking at them.",
    );
    if (unseen.length > 0) {
      lines.push(
        `These photos are approved but were NOT attached, so you have not seen them: ${unseen.join(", ")}. Place them only where their description is enough to go on, and never as the lead image.`,
      );
    }

    if (brief.logoUrl) {
      lines.push(
        "The logo must appear on the page at least once. A business that sent you their mark and does not see it will notice.",
      );
    }

    if (brief.photoUrls.length === 1) {
      lines.push(
        "There is exactly one photo. Use it once, or twice only if the second placement is a meaningfully different crop doing a different job. Never a third time.",
      );
    } else if (brief.photoUrls.length > 1) {
      lines.push(
        "Do not use any single photo more than twice. Repeating one image to fill a section reads as padding.",
      );
    }
  }

  lines.push("");
  lines.push("## APPROVED QUOTES");
  lines.push("");
  if (brief.approvedQuotes.length === 0) {
    lines.push(
      "None. The page must contain no testimonial, no <blockquote>, no quoted customer language, and no reviews section.",
    );
  } else {
    for (const quote of brief.approvedQuotes) {
      lines.push(
        `- "${quote.text}" — ${quote.author}${quote.rating ? ` (${quote.rating} stars)` : ""}`,
      );
    }
    lines.push("");
    lines.push(
      "Reproduce these exactly as written. Do not edit, shorten, or add to them, and do not write any other quoted customer language.",
    );
  }

  lines.push("");
  lines.push(
    `Now produce the complete homepage for ${brief.businessName}. Output the HTML document only.`,
  );

  return lines.join("\n");
}
