/**
 * The generation prompt for website concepts.
 *
 * This file is the product. Everything else in the concept pipeline is
 * plumbing; what a prospect actually judges is the page this prompt produces.
 *
 * Two design decisions drive its shape:
 *
 * 1. **Structural variety is enforced, not requested.** Left alone, any model
 *    emits the same page for every business: centered hero, three feature
 *    cards, a testimonial strip, a CTA band, a four-column footer. Ten concepts
 *    built that way read as ten copies of one template, which destroys the only
 *    thing being sold — that this was made for *them*. So the caller picks one
 *    of six named macrostructures by fit and passes it in as a hard constraint.
 *
 * 2. **The type foundry is Apple's.** External fonts are banned, and these
 *    pages are opened almost exclusively on an iPhone inside Messenger's
 *    in-app browser. That makes the fonts bundled with iOS — New York, Iowan
 *    Old Style, Charter, Palatino, Didot, Optima, Avenir Next, Futura,
 *    Copperplate, American Typewriter — a genuine and free type library rather
 *    than a compromise. Each macrostructure names a stack, with a generic
 *    fallback so a desktop reviewer still sees a coherent page.
 *
 * `PROMPT_VERSION` is recorded on every concept row. Bump it whenever the rules
 * below change, so a concept generated last week can be told apart from one
 * generated after a prompt fix.
 */

import type { ConceptApprovedContent, ConceptBrief } from "./brief";
import { conceptAssetAllowlist } from "./brief";

export const CONCEPT_PROMPT_VERSION = "2026-08-12.1";

export type ConceptStructure = {
  id: string;
  /** Shown in the admin card so Layken knows which shape he is looking at. */
  name: string;
  /** One line on when this shape is the right call. */
  fitsWhen: string;
  /** The full structural spec handed to the model. */
  spec: string;
};

/**
 * Six page shapes, each a complete structural fingerprint: paper, type stack,
 * accent behaviour, section rhythm, header treatment, and footer treatment.
 *
 * They are deliberately far apart. Two of these built for two businesses should
 * look like two different studios made them, not one template recoloured.
 */
export const CONCEPT_STRUCTURES: Array<ConceptStructure> = [
  {
    id: "field-record",
    name: "Field Record",
    fitsWhen: "Three or more real work photos; trades judged on finished work.",
    spec: `PAPER: near-black (#111 to #16181a). Text is warm off-white (#f4f1ec).
TYPE: display "Copperplate", "Trajan Pro", "Iowan Old Style", ui-serif, Georgia, serif — set in small caps with wide letter-spacing (0.08em to 0.14em). Body: "Charter", "Iowan Old Style", ui-serif, Georgia, serif at 1.0625rem, line-height 1.65.
ACCENT: one desaturated safety tone (ochre #b8863b or oxide #9a4a2c) used only on rules and the phone CTA. Never as a section background.
RHYTHM: full-bleed photo plate, then a tight text band, alternating, four to six times. Photos run edge to edge with no border-radius and no card. Text bands are single-column, max-width 34rem, generously padded.
HEADER: no navigation bar at all. The business name sits as a small-caps wordmark centered above the first photo plate, with a hairline rule beneath it.
FOOTER: one centered block — wordmark, service area, phone as a large tappable line. No link columns.
NOTE: this shape carries itself on photography. Do not add decorative icons or illustrated shapes.`,
  },
  {
    id: "service-ledger",
    name: "Service Ledger",
    fitsWhen: "No usable photography; a clear list of services to organise.",
    spec: `PAPER: warm paper white (#faf8f4). Text is near-black ink (#1a1a18).
TYPE: display "New York", "Iowan Old Style", ui-serif, Georgia, "Times New Roman", serif at large sizes, normal weight, tight leading (1.05). Body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif at 1.0625rem.
ACCENT: deep ink blue (#1f3a5f) on rules, the phone CTA, and nothing else.
RHYTHM: the services list IS the page. A vertical stack of ruled rows, each row a service name at display scale with a one-line description beneath it in smaller sans. Hairline rules (1px, 12% ink) between rows, full-bleed to the container edges. Two short prose bands break the list: one after the second row, one before the footer.
HEADER: wordmark left, phone right, on one line, with a hairline rule beneath. No nav links.
FOOTER: a single ruled row matching the list rhythm — service area on the left, phone on the right.
NOTE: with no photos, the typography and the rules do all the work. Set the service names large enough to feel deliberate (clamp to at least 1.75rem on mobile).`,
  },
  {
    id: "dispatch",
    name: "Dispatch",
    fitsWhen: "Urgent-need trades: towing, locksmith, plumbing, pest, HVAC.",
    spec: `PAPER: flat mid-grey structural bands (#e8e8e6 and #ffffff) alternating. Text near-black.
TYPE: display system-ui, -apple-system, "Helvetica Neue", sans-serif at heavy weight (800), tight and condensed-feeling via letter-spacing -0.02em. Body: same stack at 400.
ACCENT: one high-visibility tone (#c2341d or #1c5f2c) used on the phone band and status chips.
RHYTHM: phone-number-first. A full-width accent band at the very top carrying the phone as the largest text on the page. Then: what we do (three to five short ruled lines, not cards), service area, then a second phone band. Short page — no long prose.
HEADER: the phone band IS the header. Wordmark sits beneath it, small.
FOOTER: service area and the trade in a compact two-row definition list, then the phone once more.
NOTE: utilitarian on purpose. No soft shadows, no rounded cards, no gradients. Information density is the aesthetic.`,
  },
  {
    id: "warm-editorial",
    name: "Warm Editorial",
    fitsWhen:
      "Consumer services where trust and care matter: cleaning, salons, childcare, senior care.",
    spec: `PAPER: soft warm blush-neutral (#f7f2ee). Text is a soft near-black (#2b2724).
TYPE: display "Didot", "Palatino", "New York", ui-serif, Georgia, serif — large, light, with generous leading (1.15) and a hint of italic on one pull-line only. Body: "Optima", "Avenir Next", system-ui, sans-serif at 1.0625rem, line-height 1.7.
ACCENT: muted terracotta (#a8624c) or sage (#6d7f6a), used on small rules and the phone CTA.
RHYTHM: generous vertical space. A quiet typographic opening (no photo above the fold), then one photo if available, then a short "how it works" sequence as three numbered lines (not cards), then service area, then the phone CTA. Whitespace is the main material — sections separated by 5rem or more on mobile.
HEADER: centered wordmark only, small, with wide letter-spacing. No nav.
FOOTER: a centered short paragraph plus the phone. Warm, not corporate.
NOTE: restraint is the design. No borders around anything, no cards, at most one hairline rule.`,
  },
  {
    id: "placard",
    name: "Placard",
    fitsWhen:
      "Very little verified content — name, category, city, phone and little else.",
    spec: `PAPER: a single saturated but dark ground (#1b2a2e, #23202b, or #2b211c — pick from the brand colour if one is known). Text is off-white.
TYPE: display "Futura", "Avenir Next", "Gill Sans", system-ui, sans-serif at very large scale, weight 500, letter-spacing -0.01em. Body: same stack at 400.
ACCENT: a single light tint of the paper hue used for one rule and the phone CTA border.
RHYTHM: poster, not page. One enormous statement occupying the first screen — business name and what they do, nothing else. Then three or four short scannable bands, each no more than two lines of text. Total page length is short and honest: do not pad it to look substantial.
HEADER: none. The statement is the header.
FOOTER: city and phone on one line.
NOTE: this shape exists for the case where inventing content would be the only way to fill a longer page. Say less, set it large, and let the confidence carry it.`,
  },
  {
    id: "estimate-sheet",
    name: "Estimate Sheet",
    fitsWhen:
      "Notes describe a process, quoting approach, or pricing structure.",
    spec: `PAPER: cool white (#fcfcfd) with one inset panel in pale grey (#f1f2f4). Text near-black.
TYPE: display "Superclarendon", "Charter", "Iowan Old Style", ui-serif, Georgia, serif at medium-large, weight 600. Body: system-ui, -apple-system, sans-serif. Numerals in "ui-monospace", "SFMono-Regular", Menlo, monospace wherever a figure or step number appears.
ACCENT: slate blue (#3d5a80) on step numerals, rules, and the phone CTA.
RHYTHM: the process IS the spine. A numbered sequence of steps down the page, each step a monospace numeral, a short heading, and two lines of body. One inset panel partway down holds the service area and category as a definition list. Photos, if any, sit small and inline beside a step rather than full-bleed.
HEADER: wordmark left with a monospace category label beneath it. Hairline rule. No nav.
FOOTER: a compact definition list — service area, category, phone.
NOTE: the monospace numerals and the definition lists are the fingerprint. Use them consistently; do not mix in rounded cards.`,
  },
];

/**
 * Choose a page shape by fit, then break ties deterministically.
 *
 * Fit comes first because the shapes genuinely suit different businesses — a
 * towing company should not get Warm Editorial. The name-derived tie-break
 * exists so that two similar businesses with equally-scoring briefs still get
 * visibly different pages instead of both landing on whichever shape sorts
 * first. Deterministic so a regeneration reproduces the same shape unless
 * Layken asks for a different one.
 */
export function pickConceptStructure(
  brief: ConceptBrief,
  override?: string,
): ConceptStructure {
  if (override) {
    const chosen = CONCEPT_STRUCTURES.find(
      (structure) => structure.id === override,
    );
    if (chosen) return chosen;
  }

  const approvedText = [
    brief.approvedFacebookContent,
    brief.approvedWebsiteContent,
  ]
    .filter((content): content is ConceptApprovedContent => Boolean(content))
    .flatMap((content) => [
      content.tagline,
      content.about,
      ...content.services.flatMap((service) => [
        service.name,
        service.description,
      ]),
      ...content.serviceAreas,
      ...content.differentiators,
      ...content.sensitiveClaims,
      ...content.hours,
    ])
    .filter(Boolean)
    .join(" ");
  const haystack = [brief.category, brief.notes, approvedText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const photoCount = brief.photoUrls.length;
  const contentRichness = (brief.notes?.length ?? 0) + approvedText.length;

  const has = (...words: Array<string>) =>
    words.some((word) => haystack.includes(word));

  const scores = new Map<string, number>();
  const bump = (id: string, amount: number) =>
    scores.set(id, (scores.get(id) ?? 0) + amount);

  // Field Record is photo-led. With nothing to show it is not merely a weaker
  // choice, it is impossible, so an absence of photography disqualifies it
  // outright rather than nudging it down.
  if (photoCount >= 3) bump("field-record", 6);
  else if (photoCount >= 1) bump("field-record", 2);
  else bump("field-record", -8);

  if (
    has(
      "concrete",
      "fence",
      "fencing",
      "roof",
      "marine",
      "bulkhead",
      "dock",
      "construct",
      "excavat",
      "landscap",
      "welding",
      "paving",
      "remodel",
      "carpentr",
    )
  ) {
    bump("field-record", 4);
  }

  if (has("services", "service list", "we offer", "specializ")) {
    bump("service-ledger", 4);
  }
  if (photoCount === 0) bump("service-ledger", 2);

  // "24 hour" is deliberately absent: ordinary copy like "a written report
  // within 24 hours" is not an emergency trade.
  if (
    has(
      "tow",
      "locksmith",
      "plumb",
      "pest",
      "hvac",
      "air condition",
      "emergency",
      "24/7",
      "septic",
      "restoration",
      "water damage",
    )
  ) {
    bump("dispatch", 7);
  }

  if (
    has(
      "clean",
      "maid",
      "housekeep",
      "salon",
      "spa",
      "hair",
      "nail",
      "childcare",
      "daycare",
      "senior",
      "caregiv",
      "pet sit",
      "photograph",
      "event",
      "florist",
      "bakery",
    )
  ) {
    bump("warm-editorial", 6);
  }

  if (has("estimate", "quote", "pricing", "process", "consult", "step")) {
    bump("estimate-sheet", 5);
  }

  // Placard is the fallback for a brief with almost nothing verified to say:
  // say less, set it large, rather than padding a longer page with invention.
  // It must never outrank a real category signal, so it only applies when
  // nothing else actually fit.
  const strongestFit = Math.max(
    0,
    ...CONCEPT_STRUCTURES.filter((structure) => structure.id !== "placard").map(
      (structure) => scores.get(structure.id) ?? 0,
    ),
  );
  if (contentRichness < 120 && photoCount === 0 && strongestFit < 4) {
    bump("placard", 8);
  }

  let best = CONCEPT_STRUCTURES[0];
  let bestScore = -Infinity;
  for (const structure of CONCEPT_STRUCTURES) {
    // Tie-break spread over 0..0.9 so it never outweighs a real fit signal.
    const jitter = (hashString(brief.businessName + structure.id) % 10) / 10;
    const score = (scores.get(structure.id) ?? 0) + jitter;
    if (score > bestScore) {
      bestScore = score;
      best = structure;
    }
  }

  return best;
}

/** FNV-1a. Stable across runtimes, which `String.hashCode`-style ad-hoc loops are not. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * The invariant rules. Everything here is either a hard technical constraint of
 * the sandbox, a factual-honesty rule, or a named anti-pattern that makes a
 * page read as machine-generated.
 */
export function buildConceptSystemPrompt(): string {
  return `You are a senior web designer producing one homepage concept for a real local business in Acadiana, Louisiana. The concept will be sent directly to the business owner as a sales artifact, so it must look like a studio made it specifically for them.

Return ONE complete HTML document and nothing else. No markdown fences, no commentary, no explanation before or after.

## Hard technical constraints

These are enforced by an automatic validator. Violating any one causes the whole document to be rejected.

- One \`<style>\` element in \`<head>\`. All CSS goes there or in \`style="..."\` attributes.
- NO JavaScript. No \`<script>\`, no \`onclick\` or any \`on*\` attribute, no \`javascript:\` URL.
- NO \`<iframe>\`, \`<object>\`, \`<embed>\`, \`<base>\`, \`<link>\`, \`<noscript>\`, \`<canvas>\`, \`<video>\`, \`<audio>\`, \`<source>\`.
- NO forms and NO form controls. No \`<form>\`, \`<input>\`, \`<textarea>\`, \`<select>\`, or \`<button>\`. A control that cannot work must not be drawn.
- NO external requests of any kind: no \`@import\`, no \`@font-face\`, no Google Fonts, no icon fonts, no analytics, no external images.
- NO \`target\` attribute on any element. Links must navigate in place.
- NO \`mailto:\` links. No email address is verified for this business.
- Images: ONLY the exact URLs given in the APPROVED IMAGE URLS list, used verbatim. If that list is empty, the page contains no \`<img>\` at all and no CSS \`url()\`. Inline \`<svg>\` you draw yourself is allowed and encouraged for marks and rules; \`data:image/svg+xml\` URLs are not.
- The only permitted \`href\` values are \`tel:\` with the verified phone, \`#\` fragment anchors to sections on this page, and the exact Google Maps URL if one is supplied.
- Required in \`<head>\`: \`<meta charset="utf-8">\`, \`<meta name="viewport" content="width=device-width, initial-scale=1">\`, and a \`<title>\` containing the business name.
- Do NOT add your own "this is a concept" banner or disclaimer. The page that frames this document already supplies one; a second is redundant.

## Factual honesty

The BRIEF below is the complete set of facts you may state. It is not a starting point to embellish.

- Do NOT invent services, credentials, licence or insurance claims, years in business, awards, staff counts, prices, guarantees, addresses, opening hours, or statistics.
- Do NOT invent testimonials or reviews. If APPROVED QUOTES is empty, the page contains no quoted customer language, no \`<blockquote>\`, and no review section.
- Do NOT write any phone number other than the verified one. If no phone is given, the page shows no phone number.
- Do NOT use star glyphs (★ ☆ ⭐) unless an APPROVED QUOTE carries a rating. There is no rating in this brief otherwise, and a star with nothing behind it is invented social proof.
- Do NOT invent metrics. No "500+ happy customers", no "20 years of experience", no "98% satisfaction" unless the brief states it.
- Never write placeholder text. No \`lorem ipsum\`, no \`TODO\`, no \`[Business Name]\`, no \`example.com\`, no "Your Business Here".
- If you do not have enough verified content to fill a section, remove the section. A shorter honest page beats a longer padded one.
- Chat widgets, booking calendars, and quote forms may be shown ONLY as clearly-labelled static illustrations of what could be built, marked with words like "Example" or "Concept". They must not look live.

## Mobile first

The recipient will open this on a phone, in Messenger's in-app browser. Design at 360px and let it grow.

- Every layout starts single-column. Promote to multi-column only inside \`@media (min-width: 640px)\` or wider.
- \`html, body { overflow-x: clip; margin: 0; }\`. Never \`overflow-x: hidden\`.
- No horizontal scrolling at 320px, 375px, 414px, or 768px.
- Tappable text must never wrap to two lines. Keep link and CTA labels to two or three words.
- Grid tracks holding images use \`minmax(0, 1fr)\`, never bare \`1fr\`.
- Large display headings need \`overflow-wrap: anywhere; min-width: 0;\` so long business names cannot push the layout wide.
- Use \`clamp()\` for display type so it scales without a media query.
- Tap targets are at least 44px tall.
- The phone CTA must be reachable without hunting: place it in the first screen and again near the end.

## Design rules

- Declare every colour, font stack, and space value as a custom property in \`:root\` and reference it by name. No raw hex values scattered through the rules.
- Use a 4pt spacing scale with semantic names (\`--space-xs\` through \`--space-3xl\`).
- Fonts: system and OS-bundled stacks ONLY, since no font may be downloaded. The named stacks in the STRUCTURE section are chosen deliberately — use them exactly. Always end a stack with a generic family.
- One accent colour. It appears on rules, the phone CTA, and at most one other place. It is never a full-width section background more than once.
- Motion: at most two CSS transitions in the whole page, on \`transform\` or \`opacity\` only, 150–250ms, with a named easing. Add \`@media (prefers-reduced-motion: reduce)\` collapsing them. No keyframe animations, no parallax.

## Named anti-patterns — do not emit these

These are the specific tells that make a page read as generated:

1. The default rhythm: centered hero → three equal feature cards → testimonial strip → CTA band → four-column footer. Follow the assigned STRUCTURE instead.
2. Eyebrow labels above headings — \`01 · OUR SERVICES\`, \`WHAT WE DO\`, \`— FEATURES —\`. Omit them entirely.
3. The two-column "label on the left, heading on the right" section header. Banned outright. If a small label is genuinely needed, stack it directly above its heading in the same column.
4. Three identical rounded cards with a circular icon, a two-word heading, and one sentence of filler.
5. Generic emoji or geometric shapes standing in for icons. Draw an inline \`<svg>\` or use nothing.
6. Purple-to-blue gradients, glassmorphism, large soft drop shadows, or a glow behind the hero.
7. Empty superlatives: "Quality You Can Trust", "Excellence in Everything", "Your Satisfaction Is Our Priority", "Elevate Your Experience". Write what the business actually does, in their words where the brief supplies them.
8. Fake browser chrome, fake phone frames, fake dashboard mockups.
9. A hero headline longer than about 50 characters. Aim for seven words or fewer.
10. A navigation bar with four or five inline links and a button on the right, or a footer with four columns of links. Use the header and footer treatment named in STRUCTURE.

## Before you answer

Check your document against this list and fix anything that fails:

- Does it contain any \`<script>\`, \`on*=\`, \`<form>\`, \`<button>\`, \`<link>\`, \`@import\`, \`@font-face\`, \`target=\`, or \`mailto:\`? Remove it.
- Does every image URL appear verbatim in APPROVED IMAGE URLS? Remove any that does not.
- Does every stated fact appear in the BRIEF? Remove any that does not.
- Is there any phone number other than the verified one? Remove it.
- Does it follow the assigned STRUCTURE's paper, type stack, rhythm, header, and footer?
- Does it read at 360px with no horizontal scroll and no two-line buttons?

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

/** The per-concept half of the prompt: the assigned shape and the verified facts. */
export function buildConceptUserPrompt(
  brief: ConceptBrief,
  structure: ConceptStructure,
): string {
  const allowlist = conceptAssetAllowlist(brief).filter(
    (url) => url !== brief.googleMapsUrl,
  );

  const lines: Array<string> = [];

  lines.push(`## STRUCTURE — ${structure.name}`);
  lines.push("");
  lines.push(
    "This is the assigned page shape. Follow it exactly; it is not a suggestion.",
  );
  lines.push("");
  lines.push(structure.spec);
  lines.push("");
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
    "Verified phone (the ONLY number that may appear)",
    brief.phone ?? "none — the page must show no phone number",
  );
  fact(
    "Google Maps URL (the only permitted external link)",
    brief.googleMapsUrl,
  );

  if (brief.notes) {
    lines.push("");
    lines.push(
      "Owner-supplied notes (services, slogan, differentiators, desired CTA). Treat this as the most authoritative source of voice and service detail:",
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
      `Their current brand colour is ${brief.existingPrimaryColor}. Work with it if it suits the assigned STRUCTURE's paper; otherwise use the STRUCTURE's accent.`,
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
    if (brief.logoUrl) {
      lines.push(`Logo: ${brief.logoUrl}`);
    }
    // The note is the reviewer's own description of the photograph. A model
    // told "hero — crew removing an oak limb" places and captions it far better
    // than one handed a bare storage URL, and the note cannot widen the
    // allowlist because the allowlist is built from the URLs alone.
    const notes = new Map(
      (brief.imageNotes ?? []).map((note) => [note.url, note]),
    );
    for (const url of brief.photoUrls) {
      const note = notes.get(url);
      const label = [note?.role, note?.alt].filter(Boolean).join(" — ");
      lines.push(`Photo: ${url}${label ? ` (${label})` : ""}`);
    }
    lines.push("");
    lines.push(
      "Use these exact strings. Every photo needs a descriptive alt attribute and explicit width and height attributes to prevent layout shift. Do not reference any other image.",
    );
    if (notes.size > 0) {
      lines.push(
        "The parenthetical after a photo is where it belongs on the page and what it shows. Use it; do not print it.",
      );
    }

    if (brief.logoUrl) {
      lines.push(
        "The logo must appear on the page at least once. A business that sent you their mark and does not see it will notice.",
      );
    }

    // The rule the live Rodriguez draft broke: one photo, used three times, as
    // filler for sections that had nothing to show.
    if (brief.photoUrls.length === 1) {
      lines.push(
        "There is exactly one photo. Use it once, or twice only if the second placement is a meaningfully different crop doing a different job. Never a third time.",
      );
      lines.push(
        "Sections with no photo are not a problem to solve. Carry them with typography, colour, rules, and space — a page with one strong image and three confident typographic sections beats the same photo repeated down the page.",
      );
    } else if (brief.photoUrls.length > 1) {
      lines.push(
        "Do not use any single photo more than twice, and give each photo a distinct job. Repeating one image to fill a section reads as padding.",
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
