import { describe, expect, test } from "bun:test";
import {
  CONCEPT_STRUCTURES,
  buildConceptRepairUserPrompt,
  buildConceptSystemPrompt,
  buildConceptUserPrompt,
  pickConceptStructure,
} from "../lib/concepts/prompt";
import type { ConceptBrief } from "../lib/concepts/brief";

function briefFor(override: Partial<ConceptBrief> = {}): ConceptBrief {
  return {
    businessName: "Test Business LLC",
    photoUrls: [],
    approvedQuotes: [],
    ...override,
  };
}

const PHOTOS = [
  "https://deploy.convex.cloud/api/storage/a-1.jpg",
  "https://deploy.convex.cloud/api/storage/a-2.jpg",
  "https://deploy.convex.cloud/api/storage/a-3.jpg",
  "https://deploy.convex.cloud/api/storage/a-4.jpg",
];

describe("pickConceptStructure — fit", () => {
  test("routes an urgent trade to Dispatch", () => {
    const structure = pickConceptStructure(
      briefFor({
        businessName: "Bayou Towing & Recovery",
        category: "towing service",
        notes: "24/7 emergency towing and roadside assistance.",
      }),
    );
    expect(structure.id).toBe("dispatch");
  });

  test("routes a consumer care service to Warm Editorial", () => {
    const structure = pickConceptStructure(
      briefFor({
        businessName: "Shay's Cleaning Services",
        category: "cleaning service",
        notes:
          "Residential and move-out cleaning. Deep cleans, recurring visits.",
      }),
    );
    expect(structure.id).toBe("warm-editorial");
  });

  test("routes a photo-rich trade to Field Record", () => {
    const structure = pickConceptStructure(
      briefFor({
        businessName: "Gator Constructors",
        category: "general contractor",
        notes: "Bulkheads, docks, and concrete work across Vermilion Parish.",
        photoUrls: PHOTOS,
      }),
    );
    expect(structure.id).toBe("field-record");
  });

  test("routes a photo-less service list to Service Ledger", () => {
    const structure = pickConceptStructure(
      briefFor({
        businessName: "Acadiana Accounting Group",
        category: "accounting",
        notes:
          "We offer bookkeeping, payroll, tax preparation, and business advisory services for small local businesses across the region.",
      }),
    );
    expect(structure.id).toBe("service-ledger");
  });

  test("routes a near-empty brief to Placard", () => {
    const structure = pickConceptStructure(
      briefFor({ businessName: "Landry & Sons", locality: "Youngsville, LA" }),
    );
    expect(structure.id).toBe("placard");
  });

  test("routes a process-led brief to Estimate Sheet", () => {
    const structure = pickConceptStructure(
      briefFor({
        businessName: "Teche Home Inspections",
        category: "home inspector",
        notes:
          "Our process: we schedule the inspection, walk the property, then deliver a written estimate and report within 24 hours. Flat pricing by square footage.",
      }),
    );
    expect(structure.id).toBe("estimate-sheet");
  });

  test("uses Facebook evidence when choosing the page shape", () => {
    const structure = pickConceptStructure(
      briefFor({
        businessName: "Bayou Recovery",
        approvedFacebookContent: {
          tagline: "Help when the road stops",
          about: undefined,
          services: [
            { name: "Emergency towing" },
            { name: "Roadside assistance" },
          ],
          serviceAreas: ["Acadiana"],
          differentiators: [],
          sensitiveClaims: ["24/7 service"],
          hours: [],
        },
      }),
    );
    expect(structure.id).toBe("dispatch");
  });
});

describe("pickConceptStructure — determinism and variety", () => {
  test("is stable across repeated calls for the same brief", () => {
    const brief = briefFor({ businessName: "Broussard Fence Co" });
    const first = pickConceptStructure(brief);
    for (let i = 0; i < 5; i += 1) {
      expect(pickConceptStructure(brief).id).toBe(first.id);
    }
  });

  test("honours an explicit override", () => {
    const brief = briefFor({
      businessName: "Bayou Towing",
      notes: "24/7 towing",
    });
    expect(pickConceptStructure(brief).id).toBe("dispatch");
    expect(pickConceptStructure(brief, "placard").id).toBe("placard");
  });

  test("ignores an unknown override rather than throwing", () => {
    const brief = briefFor({
      businessName: "Bayou Towing",
      notes: "24/7 towing",
    });
    expect(pickConceptStructure(brief, "does-not-exist").id).toBe("dispatch");
  });

  /**
   * The whole point of the structure catalogue: a run of real Acadiana
   * businesses must not collapse onto one page shape. Ten concepts that share a
   * rhythm read as ten copies of a template, which destroys the only thing the
   * concept is selling — that it was made for this business.
   */
  test("spreads a realistic corpus across several shapes", () => {
    const corpus: Array<Partial<ConceptBrief>> = [
      {
        businessName: "Bayou Towing",
        category: "towing service",
        notes: "24/7 emergency towing.",
      },
      {
        businessName: "Shay's Cleaning Services",
        category: "cleaning service",
        notes: "Residential and move-out cleaning.",
      },
      {
        businessName: "Gator Constructors",
        category: "general contractor",
        notes: "Bulkheads and docks.",
        photoUrls: PHOTOS,
      },
      {
        businessName: "Acadiana Accounting Group",
        category: "accounting",
        notes: "We offer bookkeeping, payroll, and tax preparation services.",
      },
      { businessName: "Landry & Sons", locality: "Youngsville, LA" },
      {
        businessName: "Teche Home Inspections",
        category: "home inspector",
        notes:
          "Our process: schedule, walk the property, deliver a written estimate.",
      },
    ];

    const picked = new Set(
      corpus.map((override) => pickConceptStructure(briefFor(override)).id),
    );
    expect(picked.size).toBeGreaterThanOrEqual(4);
  });

  test("every structure carries a spec, a name, and a fit note", () => {
    expect(CONCEPT_STRUCTURES.length).toBe(6);
    for (const structure of CONCEPT_STRUCTURES) {
      expect(structure.name.length).toBeGreaterThan(0);
      expect(structure.fitsWhen.length).toBeGreaterThan(0);
      expect(structure.spec).toContain("PAPER:");
      expect(structure.spec).toContain("TYPE:");
      expect(structure.spec).toContain("RHYTHM:");
      expect(structure.spec).toContain("FOOTER:");
    }
  });
});

describe("buildConceptSystemPrompt", () => {
  const prompt = buildConceptSystemPrompt();

  test.each([
    "<script>",
    "@font-face",
    "mailto:",
    "target",
    "<button>",
    "lorem ipsum",
    "prefers-reduced-motion",
    "overflow-x: clip",
    "minmax(0, 1fr)",
    "APPROVED IMAGE URLS",
    "APPROVED QUOTES",
  ])("states the %s rule", (needle) => {
    expect(prompt).toContain(needle);
  });

  test("tells the model not to add its own concept disclaimer", () => {
    expect(prompt.toLowerCase()).toContain("do not add your own");
  });

  test("forbids completeness and invented-emphasis meta claims", () => {
    expect(prompt).toContain(
      "Treat every service and claim list as non-exhaustive",
    );
    expect(prompt).toContain('does not mean "the owner emphasizes pricing"');
    expect(prompt).toContain("Do not add source commentary");
  });
});

describe("buildConceptUserPrompt", () => {
  test("declares an empty image allowlist explicitly", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({ businessName: "Landry & Sons" }),
      CONCEPT_STRUCTURES[0],
    );
    expect(prompt).toContain("## APPROVED IMAGE URLS");
    expect(prompt).toContain("no <img> element and no CSS url()");
  });

  test("lists logo and photos verbatim", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        logoUrl: "https://d.convex.cloud/api/storage/logo",
        photoUrls: [PHOTOS[0]],
      }),
      CONCEPT_STRUCTURES[0],
    );
    expect(prompt).toContain("Logo: https://d.convex.cloud/api/storage/logo");
    expect(prompt).toContain(`Photo: ${PHOTOS[0]}`);
  });

  /**
   * The maps URL is allowlisted as an href, not as an image source. Listing it
   * under APPROVED IMAGE URLS would invite the model to render it as a photo.
   */
  test("keeps the Google Maps URL out of the image list", () => {
    const mapsUrl = "https://maps.google.com/?cid=42";
    const prompt = buildConceptUserPrompt(
      briefFor({ googleMapsUrl: mapsUrl, photoUrls: [PHOTOS[0]] }),
      CONCEPT_STRUCTURES[0],
    );
    const imageSection = prompt.slice(prompt.indexOf("## APPROVED IMAGE URLS"));
    expect(imageSection).not.toContain(mapsUrl);
    expect(prompt).toContain(
      `Google Maps URL (the only permitted external link): ${mapsUrl}`,
    );
  });

  test("states when no phone number is verified", () => {
    const prompt = buildConceptUserPrompt(briefFor(), CONCEPT_STRUCTURES[0]);
    expect(prompt).toContain("none — the page must show no phone number");
  });

  test("forbids testimonials when no quotes are approved", () => {
    const prompt = buildConceptUserPrompt(briefFor(), CONCEPT_STRUCTURES[0]);
    expect(prompt).toContain("no <blockquote>");
  });

  test("reproduces approved quotes with attribution", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        approvedQuotes: [
          { author: "Dana R.", text: "Spotless every time.", rating: 5 },
        ],
      }),
      CONCEPT_STRUCTURES[0],
    );
    expect(prompt).toContain('"Spotless every time." — Dana R. (5 stars)');
  });

  /**
   * Google is an identity provider, not a content library. No Places-derived
   * fact reaches the prompt any more, so the star rule now hangs off approved
   * quotes and the brief carries no rating, review count, hours, or address.
   */
  test("states no Google rating, review, hours, or address fact", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({ locality: "Youngsville, LA" }),
      CONCEPT_STRUCTURES[0],
    );
    expect(prompt).not.toContain("Google rating");
    expect(prompt).not.toContain("Google review count");
    expect(prompt).not.toContain("Business hours:");
    expect(prompt).not.toContain("Street address");
    expect(buildConceptSystemPrompt()).toContain(
      "unless an APPROVED QUOTE carries a rating",
    );
  });

  test("uses only the approved structured website subset", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        existingSiteSummary: "UNREVIEWED stump grinding and crane rentals",
        approvedWebsiteContent: {
          tagline: "Rooted in reliable service",
          services: [
            { name: "Tree removal", description: "Hazardous tree removal." },
          ],
          serviceAreas: ["Central Louisiana"],
          differentiators: ["Locally operated"],
          sensitiveClaims: ["Licensed and insured"],
          hours: ["Monday-Friday, 7 AM-5 PM"],
        },
      }),
      CONCEPT_STRUCTURES[0],
    );

    expect(prompt).toContain("## APPROVED WEBSITE CONTENT");
    expect(prompt).toContain("Tree removal — Hazardous tree removal.");
    expect(prompt).toContain("Licensed and insured");
    expect(prompt).not.toContain("UNREVIEWED");
  });

  test("renders Facebook content as the primary approved source", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        approvedFacebookContent: {
          tagline: "Tree care done right",
          about: "Family owned since the storm.",
          services: [{ name: "Storm cleanup" }],
          serviceAreas: ["Acadiana"],
          differentiators: [],
          sensitiveClaims: ["Fully insured"],
          hours: [],
        },
        approvedWebsiteContent: {
          tagline: "Stale website tagline",
          about: undefined,
          services: [{ name: "Website-only service" }],
          serviceAreas: [],
          differentiators: [],
          sensitiveClaims: [],
          hours: [],
        },
      }),
      CONCEPT_STRUCTURES[0],
    );

    expect(prompt).toContain("## APPROVED FACEBOOK CONTENT");
    expect(prompt).toContain("Tree care done right");
    expect(prompt).toContain("Fully insured");
    expect(prompt).toContain(
      "Where it and the website section disagree, follow this one",
    );
    // Facebook section appears before website so the model reads the primary
    // source first and the gap-fill second.
    expect(prompt.indexOf("## APPROVED FACEBOOK CONTENT")).toBeLessThan(
      prompt.indexOf("## APPROVED WEBSITE CONTENT"),
    );
  });

  test("attaches role and alt notes to photo URLs without inventing URLs", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        photoUrls: [PHOTOS[0]],
        imageNotes: [
          {
            url: PHOTOS[0],
            role: "hero",
            alt: "Crew removing an oak limb",
          },
        ],
      }),
      CONCEPT_STRUCTURES[0],
    );

    expect(prompt).toContain(
      `Photo: ${PHOTOS[0]} (hero — Crew removing an oak limb)`,
    );
    expect(prompt).toContain("where it belongs on the page and what it shows");
  });

  test("embeds the assigned structure spec", () => {
    const structure = CONCEPT_STRUCTURES[2];
    const prompt = buildConceptUserPrompt(briefFor(), structure);
    expect(prompt).toContain(`## STRUCTURE — ${structure.name}`);
    expect(prompt).toContain(structure.spec);
  });
});

describe("buildConceptRepairUserPrompt", () => {
  test("gives the retry the exact failed document and correction", () => {
    const repaired = buildConceptRepairUserPrompt({
      basePrompt: "BRIEF AND STRUCTURE",
      previousHtml: "<html><body>Unsupported sentence.</body></html>",
      correction: "Remove Unsupported sentence.",
    });

    expect(repaired).toContain("BRIEF AND STRUCTURE");
    expect(repaired).toContain("<<<UNTRUSTED_EXISTING_HTML");
    expect(repaired).toContain(
      "<html><body>Unsupported sentence.</body></html>",
    );
    expect(repaired).toContain("Remove Unsupported sentence.");
    expect(repaired).toContain("Do not redesign the page");
  });
});
