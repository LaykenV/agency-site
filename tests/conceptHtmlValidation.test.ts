import { describe, expect, test } from "bun:test";
import { validateConceptHtml } from "../lib/concepts/validateConceptHtml";
import {
  conceptAssetAllowlist,
  type ConceptBrief,
} from "../lib/concepts/brief";

const LOGO_URL =
  "https://sturdy-marmot-123.convex.cloud/api/storage/1a2b3c4d-logo.png";
const PHOTO_URL =
  "https://sturdy-marmot-123.convex.cloud/api/storage/5e6f7a8b-crew.jpg";

const brief: ConceptBrief = {
  businessName: "Shay's Cleaning Services",
  category: "cleaning service",
  locality: "Youngsville, LA",
  phone: "(337) 384-2911",
  logoUrl: LOGO_URL,
  photoUrls: [PHOTO_URL],
  approvedQuotes: [],
};

/** A minimal document that satisfies every rule, used as the mutation base. */
function validDocument(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shay's Cleaning Services</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif}</style>
</head>
<body>
<header><img src="${LOGO_URL}" alt="Shay's Cleaning Services" width="160" height="48"><h1>Shay's Cleaning Services</h1></header>
${body}
</body>
</html>`;
}

const baseline = validDocument(`<main>
<p>Residential and move-out cleaning in Youngsville, LA.</p>
<img src="${PHOTO_URL}" alt="Cleaning crew at work" width="800" height="600">
<a href="tel:+13373842911">Call (337) 384-2911</a>
<a href="#services">Services</a>
</main>`);

function violationsFor(html: string, override?: Partial<ConceptBrief>) {
  return validateConceptHtml(html, { ...brief, ...override }).violations;
}

describe("validateConceptHtml — baseline", () => {
  test("accepts a self-contained, factually grounded document", () => {
    const result = validateConceptHtml(baseline, brief);
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("rejects empty output", () => {
    expect(validateConceptHtml("   ", brief).ok).toBe(false);
  });
});

describe("validateConceptHtml — executable content", () => {
  test("rejects a script element", () => {
    const html = validDocument("<main><script>alert(1)</script></main>");
    expect(violationsFor(html)).toContain("Contains banned <script> element.");
  });

  test.each([
    ["iframe", '<iframe src="https://x.test"></iframe>'],
    ["object", '<object data="x"></object>'],
    ["embed", '<embed src="x">'],
    ["base", '<base href="https://x.test/">'],
    ["form", '<form action="/x"><input name="a"></form>'],
    ["button", "<button>Send</button>"],
    ["link", '<link rel="stylesheet" href="https://fonts.test/x.css">'],
  ])("rejects a %s element", (element, markup) => {
    const violations = violationsFor(validDocument(`<main>${markup}</main>`));
    expect(violations.some((v) => v.includes(`<${element}>`))).toBe(true);
  });

  test("rejects a meta refresh redirect", () => {
    const html = validDocument(
      '<main><meta http-equiv="refresh" content="0;url=https://x.test"></main>',
    );
    expect(violationsFor(html)).toContain("Contains a meta refresh redirect.");
  });

  test("rejects an inline event handler", () => {
    const html = validDocument('<main><div onclick="x()">Tap</div></main>');
    expect(violationsFor(html).some((v) => v.includes("event handler"))).toBe(
      true,
    );
  });

  test("rejects a javascript: URL", () => {
    const html = validDocument(
      '<main><a href="javascript:alert(1)">Go</a></main>',
    );
    expect(violationsFor(html)).toContain("Contains javascript: URL.");
  });

  test("rejects an entity-encoded javascript: URL", () => {
    const html = validDocument(
      '<main><a href="&#106;avascript&colon;alert(1)">Go</a></main>',
    );
    expect(violationsFor(html)).toContain("Contains javascript: URL.");
  });

  test("rejects a javascript: URL split by an invisible character", () => {
    const html = validDocument(
      '<main><a href="java\tscript:alert(1)">Go</a></main>',
    );
    expect(violationsFor(html)).toContain("Contains javascript: URL.");
  });
});

describe("validateConceptHtml — self-containment", () => {
  test("rejects an external stylesheet import", () => {
    const html = validDocument(
      '<main><style>@import url("https://fonts.test/x.css");</style></main>',
    );
    expect(violationsFor(html)).toContain(
      "Contains CSS @import (external request).",
    );
  });

  test("rejects a webfont declaration", () => {
    const html = validDocument(
      "<main><style>@font-face{font-family:X;src:url(x.woff2)}</style></main>",
    );
    expect(violationsFor(html).some((v) => v.includes("@font-face"))).toBe(
      true,
    );
  });

  test("rejects an image outside the allowlist", () => {
    const html = validDocument(
      '<main><img src="https://images.unsplash.test/photo.jpg" alt="Stock"></main>',
    );
    expect(
      violationsFor(html).some((v) =>
        v.includes("outside the approved allowlist"),
      ),
    ).toBe(true);
  });

  test("rejects a CSS background outside the allowlist", () => {
    const html = validDocument(
      '<main><div style="background:url(https://cdn.test/hero.jpg)">Hi</div></main>',
    );
    expect(
      violationsFor(html).some((v) =>
        v.includes("outside the approved allowlist"),
      ),
    ).toBe(true);
  });

  test("accepts an allowlisted logo in a CSS background", () => {
    const html = validDocument(
      `<main><div style="background:url(${LOGO_URL})">Hi</div></main>`,
    );
    expect(violationsFor(html)).toEqual([]);
  });

  test("rejects a relative asset path", () => {
    const html = validDocument(
      '<main><img src="/images/hero.jpg" alt="Hero"></main>',
    );
    expect(
      violationsFor(html).some((v) => v.includes("non-self-contained URL")),
    ).toBe(true);
  });

  test("rejects a target attribute", () => {
    const html = validDocument(
      '<main><a href="#services" target="_blank">Services</a></main>',
    );
    expect(violationsFor(html)).toContain(
      "Contains a target attribute; links must navigate in place.",
    );
  });

  test("rejects an unverified mailto: link", () => {
    const html = validDocument(
      '<main><a href="mailto:info@shayscleaning.test">Email</a></main>',
    );
    expect(
      violationsFor(html).some((v) => v.includes("unverified mailto:")),
    ).toBe(true);
  });

  test("accepts an inline raster data URI but rejects an SVG one", () => {
    const raster = validDocument(
      '<main><img src="data:image/png;base64,iVBORw0KGgo=" alt="Mark"></main>',
    );
    expect(violationsFor(raster)).toEqual([]);

    const svg = validDocument(
      '<main><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" alt="Mark"></main>',
    );
    expect(violationsFor(svg).some((v) => v.includes("data: SVG URL"))).toBe(
      true,
    );
  });

  test("requires a viewport meta tag", () => {
    const html = baseline.replace(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      "",
    );
    expect(violationsFor(html).some((v) => v.includes("viewport"))).toBe(true);
  });

  /**
   * The prompt asks for `clip` by name. `hidden` is how a model papers over a
   * layout that genuinely overflows, and it breaks `position: sticky` in the
   * iOS browser these concepts are actually opened in.
   */
  test("rejects overflow-x: hidden and accepts overflow-x: clip", () => {
    const hidden = baseline.replace("body{margin:0", "body{overflow-x:hidden;margin:0");
    expect(
      violationsFor(hidden).some((v) => v.includes("overflow-x: clip")),
    ).toBe(true);

    const clip = baseline.replace("body{margin:0", "body{overflow-x:clip;margin:0");
    expect(violationsFor(clip)).toEqual([]);
  });

  test("rejects a document over the size ceiling", () => {
    const html = validDocument(`<main><p>${"a".repeat(420_000)}</p></main>`);
    expect(violationsFor(html).some((v) => v.includes("byte ceiling"))).toBe(
      true,
    );
  });
});

describe("validateConceptHtml — factual claims", () => {
  test("rejects placeholder copy", () => {
    const html = validDocument(
      "<main><p>Lorem ipsum dolor sit amet.</p></main>",
    );
    expect(violationsFor(html).some((v) => v.includes("lorem ipsum"))).toBe(
      true,
    );
  });

  test("rejects a phone number that is not the verified one", () => {
    const html = validDocument(
      '<main><a href="tel:+13375550000">Call (337) 555-0000</a></main>',
    );
    const violations = violationsFor(html);
    expect(violations.some((v) => v.includes("does not match"))).toBe(true);
    expect(violations.some((v) => v.includes("not the verified number"))).toBe(
      true,
    );
  });

  test("rejects any phone number when the brief has none", () => {
    const violations = violationsFor(baseline, { phone: undefined });
    expect(
      violations.some((v) => v.includes("the brief has no phone number")),
    ).toBe(true);
    expect(violations.some((v) => v.includes("but the brief has none"))).toBe(
      true,
    );
  });

  test("rejects a fictional 555-01xx phone number", () => {
    const html = validDocument(
      "<main><p>Call us at (337) 555-0142 today.</p></main>",
    );
    expect(
      violationsFor(html, { phone: "(337) 555-0142" }).some((v) =>
        v.includes("fictional phone number"),
      ),
    ).toBe(true);
  });

  test("rejects a testimonial when no quotes were approved", () => {
    const html = validDocument(
      "<main><blockquote>They did an incredible job on our whole house.</blockquote></main>",
    );
    const violations = violationsFor(html);
    expect(violations.some((v) => v.includes("no quotes were approved"))).toBe(
      true,
    );
  });

  test("rejects quoted copy that is not an approved quote", () => {
    const html = validDocument(
      "<main><p>“Shay and her team left our home absolutely spotless.”</p></main>",
    );
    expect(
      violationsFor(html).some((v) =>
        v.includes("not present in the approved"),
      ),
    ).toBe(true);
  });

  test("accepts an approved quote reproduced verbatim", () => {
    const quote = "Shay and her team left our home absolutely spotless.";
    const html = validDocument(`<main><p>“${quote}”</p></main>`);
    expect(
      violationsFor(html, {
        approvedQuotes: [{ author: "Dana R.", text: quote, rating: 5 }],
      }),
    ).toEqual([]);
  });

  test("rejects star glyphs when no approved quote carries a rating", () => {
    const html = validDocument(
      "<main><p>★★★★★ Rated by our customers</p></main>",
    );
    expect(violationsFor(html).some((v) => v.includes("star glyphs"))).toBe(
      true,
    );
  });

  // Google ratings no longer reach the brief at all, so the only thing that can
  // put a star on the page is a testimonial Layken approved by hand.
  test("rejects star glyphs when an approved quote has no rating", () => {
    const quote = "Shay and her team left our home absolutely spotless.";
    const html = validDocument(`<main><p>★★★★★</p><p>“${quote}”</p></main>`);
    expect(
      violationsFor(html, {
        approvedQuotes: [{ author: "Dana R.", text: quote }],
      }).some((v) => v.includes("star glyphs")),
    ).toBe(true);
  });

  test("accepts star glyphs when an approved quote carries a rating", () => {
    const quote = "Shay and her team left our home absolutely spotless.";
    const html = validDocument(`<main><p>★★★★★</p><p>“${quote}”</p></main>`);
    expect(
      violationsFor(html, {
        approvedQuotes: [{ author: "Dana R.", text: quote, rating: 5 }],
      }),
    ).toEqual([]);
  });

  test("rejects a page for the wrong business", () => {
    const html = validDocument(
      "<main><p>Welcome to Gator Constructors.</p></main>",
    )
      .replace(
        "<h1>Shay's Cleaning Services</h1>",
        "<h1>Gator Constructors</h1>",
      )
      .replace(
        "<title>Shay's Cleaning Services</title>",
        "<title>Gator</title>",
      );
    expect(
      violationsFor(html).some((v) =>
        v.includes("does not appear in the page text"),
      ),
    ).toBe(true);
  });
});

describe("validateConceptHtml — prose is not markup", () => {
  /**
   * Regression guard for the markup/text split. These tokens are only
   * dangerous in markup, CSS, or attribute position; a hauling company
   * describing its service is not making a network call.
   */
  test("allows JavaScript-shaped words in body copy", () => {
    const html = validDocument(
      "<main><p>We fetch (and haul) debris, and we never leave a websocket of mess behind.</p></main>",
    );
    expect(violationsFor(html)).toEqual([]);
  });

  test("allows an attribute-shaped word in body copy", () => {
    const html = validDocument(
      "<main><p>Once = done. We clean once and it stays clean.</p></main>",
    );
    expect(violationsFor(html)).toEqual([]);
  });

  test("still rejects those tokens inside a style block", () => {
    const html = validDocument(
      "<main><style>body{width:expression(alert(1))}</style></main>",
    );
    expect(violationsFor(html).some((v) => v.includes("expression()"))).toBe(
      true,
    );
  });
});

describe("conceptAssetAllowlist", () => {
  test("collects logo, photos, and the maps URL without duplicates", () => {
    expect(
      conceptAssetAllowlist({
        ...brief,
        photoUrls: [PHOTO_URL, PHOTO_URL],
        googleMapsUrl: "https://maps.google.test/?cid=1",
      }),
    ).toEqual([LOGO_URL, PHOTO_URL, "https://maps.google.test/?cid=1"]);
  });

  test("omits absent assets", () => {
    expect(
      conceptAssetAllowlist({ ...brief, logoUrl: undefined, photoUrls: [] }),
    ).toEqual([]);
  });
});

/**
 * The rejection tests above prove the validator blocks bad output. This proves
 * it does not block good output — an over-strict rule that fails every real
 * generation would be just as broken, and far harder to notice.
 */
describe("validateConceptHtml — a realistic generated page", () => {
  const realistic = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shay's Cleaning Services — Youngsville, LA</title>
<style>
:root{
  --paper:#f7f2ee; --ink:#2b2724; --accent:#a8624c;
  --font-display:"Didot","Palatino","New York",ui-serif,Georgia,serif;
  --font-body:"Optima","Avenir Next",system-ui,sans-serif;
  --space-sm:.5rem; --space-md:1rem; --space-xl:3rem; --space-3xl:5rem;
}
html,body{overflow-x:clip;margin:0}
body{background:var(--paper);color:var(--ink);font-family:var(--font-body);line-height:1.7}
h1{font-family:var(--font-display);font-size:clamp(2.25rem,9vw,4rem);line-height:1.15;
   font-weight:400;overflow-wrap:anywhere;min-width:0;margin:0}
.wrap{max-width:34rem;margin:0 auto;padding:0 var(--space-md)}
.band{padding:var(--space-3xl) 0}
.rule{height:1px;background:color-mix(in oklab,var(--ink) 12%,transparent);border:0}
.call{display:inline-block;padding:.9rem 1.6rem;border:1px solid var(--accent);
      color:var(--accent);text-decoration:none;font-weight:600;min-height:44px}
.call:hover{opacity:.85}
.steps{display:grid;gap:var(--space-xl);grid-template-columns:minmax(0,1fr)}
figure{margin:0}
img{display:block;width:100%;height:auto}
@media (prefers-reduced-motion: reduce){.call{transition:none}}
@media (min-width:640px){.steps{grid-template-columns:repeat(3,minmax(0,1fr))}}
</style>
</head>
<body>
<header class="band wrap">
  <img src="${LOGO_URL}" alt="Shay's Cleaning Services" width="160" height="48">
  <p style="letter-spacing:.18em;font-size:.75rem;text-transform:uppercase">Shay's Cleaning Services</p>
  <h1>Homes that feel cared for, not just cleaned.</h1>
  <p>Residential and move-out cleaning across Youngsville and Lafayette Parish.</p>
  <a class="call" href="tel:+13373842911">Call (337) 384-2911</a>
</header>
<hr class="rule">
<section class="band wrap" id="services">
  <h2>What we clean</h2>
  <div class="steps">
    <div><h3>Recurring visits</h3><p>Weekly, every other week, or monthly.</p></div>
    <div><h3>Deep cleans</h3><p>Baseboards, blinds, inside the oven and fridge.</p></div>
    <div><h3>Move-out</h3><p>Left ready for the walkthrough.</p></div>
  </div>
</section>
<figure>
  <img src="${PHOTO_URL}" alt="Kitchen after a deep clean" width="1200" height="800">
</figure>
<section class="band wrap">
  <h2>How it works</h2>
  <p>A walkthrough, a written quote, then a standing slot on the calendar.</p>
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 12h16" stroke="currentColor" stroke-width="2" fill="none"/>
  </svg>
</section>
<footer class="band wrap">
  <p>Serving Youngsville, LA</p>
  <a class="call" href="tel:+13373842911">Call (337) 384-2911</a>
</footer>
</body>
</html>`;

  test("accepts it with no violations", () => {
    const result = validateConceptHtml(realistic, brief);
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("validateConceptHtml — approved imagery is used, and used once", () => {
  test("rejects a page that never displays the approved logo", () => {
    const noLogo = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shay's Cleaning Services</title>
</head>
<body>
<header><h1>Shay's Cleaning Services</h1></header>
<main><img src="${PHOTO_URL}" alt="Crew" width="800" height="600"></main>
</body>
</html>`;
    expect(violationsFor(noLogo)).toContain(
      "An approved logo was supplied but the page never displays it.",
    );
  });

  test("says nothing about a logo when the brief has none", () => {
    const noLogo = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shay's Cleaning Services</title>
</head>
<body>
<header><h1>Shay's Cleaning Services</h1></header>
<main><img src="${PHOTO_URL}" alt="Crew" width="800" height="600"></main>
</body>
</html>`;
    expect(violationsFor(noLogo, { logoUrl: undefined })).toEqual([]);
  });

  test("allows one approved photo twice", () => {
    const twice = validDocument(`<main>
<img src="${PHOTO_URL}" alt="Crew at work" width="800" height="600">
<img src="${PHOTO_URL}" alt="A closer crop of the same job" width="400" height="400">
</main>`);
    expect(violationsFor(twice)).toEqual([]);
  });

  test("rejects the same approved photo used three times", () => {
    const thrice = validDocument(`<main>
<img src="${PHOTO_URL}" alt="Crew at work" width="800" height="600">
<img src="${PHOTO_URL}" alt="Crew at work" width="400" height="400">
<img src="${PHOTO_URL}" alt="Crew at work" width="200" height="200">
</main>`);
    expect(violationsFor(thrice)).toEqual([
      "Repeats one approved photo 3 times; use it at most 2. Design the remaining sections without a photo.",
    ]);
  });

  test("counts a CSS background use of the same photo toward the repeat cap", () => {
    const mixed = validDocument(`<main>
<img src="${PHOTO_URL}" alt="Crew at work" width="800" height="600">
<img src="${PHOTO_URL}" alt="Crew at work" width="400" height="400">
<div style="background-image:url('${PHOTO_URL}')"></div>
</main>`);
    expect(violationsFor(mixed)).toContain(
      "Repeats one approved photo 3 times; use it at most 2. Design the remaining sections without a photo.",
    );
  });
});
