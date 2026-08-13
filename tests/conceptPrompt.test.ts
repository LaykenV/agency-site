import { describe, expect, test } from "bun:test";
import {
  buildConceptSystemPrompt,
  buildConceptUserPrompt,
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

describe("buildConceptSystemPrompt", () => {
  const prompt = buildConceptSystemPrompt(briefFor());

  describe("market", () => {
    test("names the region from the brief", () => {
      expect(
        buildConceptSystemPrompt(briefFor({ locality: "Johnson City, TN" })),
      ).toContain("a real local business in Johnson City, TN.");
    });

    test("claims no region when the brief has no locality", () => {
      expect(prompt).toContain("a real local business.");
    });

    test.each([briefFor(), briefFor({ locality: "Johnson City, TN" })])(
      "never asserts a home market of its own",
      (brief) => {
        expect(buildConceptSystemPrompt(brief)).not.toContain("Acadiana");
        expect(buildConceptSystemPrompt(brief)).not.toContain("Louisiana");
      },
    );
  });

  test.each([
    "<script>",
    "@font-face",
    "mailto:",
    "target",
    "<button>",
    "tel:",
    "lorem ipsum",
    "APPROVED IMAGE URLS",
    "APPROVED QUOTES",
  ])("states the %s rule", (needle) => {
    expect(prompt).toContain(needle);
  });

  test("does not assign a page shape or spacing system", () => {
    expect(prompt).not.toContain("STRUCTURE");
    expect(prompt).not.toContain("Field Record");
    expect(prompt).not.toContain("4pt spacing");
  });

  test("gives the model visual freedom without prescribing a formula", () => {
    expect(prompt).toContain(
      "full discretion over layout, colour, typography, crop, hierarchy, section order, and image placement",
    );
    expect(prompt).toContain("There is no assigned page shape or house style");
    expect(prompt).toContain(
      "If another business could use the page after swapping its name and photographs, revise the design",
    );

    for (const prescription of [
      "The type shelf",
      "Avenir Next",
      "#F4F1EA",
      "The hero is a thesis",
      "four to six specific values",
      "vertical sequence of screens",
      "one heading, one supporting line",
      "Thumbs live in the bottom third",
      "35 characters",
      "take one thing off",
    ]) {
      expect(prompt).not.toContain(prescription);
    }
  });

  test("asks the model to inspect photos without assigning their placement", () => {
    expect(prompt).toContain("Look at them");
    expect(prompt).toContain("do not match images to URLs by position");
  });

  test("does not invent an existing website or owner situation", () => {
    expect(prompt).not.toContain("site they have now");
    expect(prompt).not.toContain("sold templated web design");
    expect(prompt).not.toContain("standing on a job site");
    expect(prompt).toContain(
      "the page itself must read as this business's website and speak to its customers",
    );
  });

  describe("render surface", () => {
    test.each([
      "renders inside a scrolling iframe",
      "resolve to the iframe, not the top-level phone viewport",
      "`position: fixed` is unreliable inside a scrolled iframe on iOS",
      "use `position: sticky` only when the design needs it",
    ])("states that %s", (needle) => {
      expect(prompt).toContain(needle);
    });

    test("expects both iPhone and Android readers", () => {
      expect(prompt).toContain("both iPhones and Android phones");
    });
  });

  test("leaves font selection open while requiring safe fallbacks", () => {
    expect(prompt).toContain("Choose the stack yourself");
    expect(prompt).toContain("end it with a generic family");
  });

  describe("copy", () => {
    test.each([
      "Write for the business's customers",
      "prefer the owner's own wording",
      "A dummy CTA still needs a real label",
      "Do not pad the page with generic marketing copy",
    ])("states the %s rule", (needle) => {
      expect(prompt).toContain(needle);
    });

    test("keeps copy guidance subordinate to the factual limits", () => {
      expect(prompt).toContain("## Factual limits");
      expect(prompt).toContain(
        "The BRIEF below is the complete set of facts you may state",
      );
    });
  });

  test("tells the model to take the src from the label on each attachment", () => {
    expect(prompt).toContain("exact URL to use for that photograph");
    expect(prompt).toContain("do not match images to URLs by position");
  });

  describe("mobile first", () => {
    test.each([
      "Design for 360px first",
      "overflow-x: clip",
      "never `overflow-x: hidden`",
      "minmax(0, 1fr)",
      "overflow-wrap: anywhere",
      "at least 44px tall",
      "at least 16px",
      "clamp()",
      "prefers-reduced-motion",
    ])("keeps the %s rule", (needle) => {
      expect(prompt).toContain(needle);
    });

    test("re-checks the layout at 360px in the final checklist", () => {
      const checklist = prompt.slice(prompt.indexOf("## Final check"));
      expect(checklist).toContain("At 360px");
    });

    test("does not prescribe a breakpoint or column structure", () => {
      expect(prompt).not.toContain("min-width: 640px");
      expect(prompt).not.toContain("Every layout starts single-column");
    });
  });

  test("tells the model not to add its own concept disclaimer", () => {
    expect(prompt.toLowerCase()).toContain("do not add your own");
  });

  test("requires dummy span CTAs with no href", () => {
    expect(prompt).toContain("Every CTA is a dummy");
    expect(prompt).toContain("No `href` attribute on any element");
    expect(prompt).toContain("Never use `<a>`");
    expect(prompt).not.toContain("tel:` CTA");
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
  test("adds the optional generation note only when supplied", () => {
    const withoutNote = buildConceptUserPrompt(briefFor());
    const withNote = buildConceptUserPrompt(
      briefFor({
        notes: "Keep the page restrained and lead with storm cleanup.",
      }),
    );

    expect(withoutNote).not.toContain("## REVIEWER GENERATION NOTE");
    expect(withNote).toContain("## REVIEWER GENERATION NOTE");
    expect(withNote).toContain(
      "Keep the page restrained and lead with storm cleanup.",
    );
    expect(withNote).toContain("Follow any design direction here");
    expect(withNote).toContain(
      "unless it conflicts with the hard requirements",
    );
  });

  test("declares an empty image allowlist explicitly", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({ businessName: "Landry & Sons" }),
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
    );
    expect(prompt).toContain("Logo: https://d.convex.cloud/api/storage/logo");
    expect(prompt).toContain(`Photo: ${PHOTOS[0]}`);
  });

  test("prints image size and description without a placement role", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        photoUrls: [PHOTOS[0]],
        imageNotes: [
          {
            url: PHOTOS[0],
            role: "hero",
            alt: "Finished marble shower",
            width: 1536,
            height: 2048,
          },
        ],
      }),
    );
    expect(prompt).toContain(
      `Photo: ${PHOTOS[0]} — 1536×2048, portrait. Finished marble shower`,
    );
    expect(prompt).not.toContain("hero —");
    expect(prompt).toContain("not placement instructions");
  });

  test("tells the model to read the src off each attachment, not its position", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({ photoUrls: [PHOTOS[0], PHOTOS[1]] }),
    );
    expect(prompt).toContain("each preceded by a line naming the exact URL");
    expect(prompt).toContain("do not match them up by position");
  });

  /**
   * List position is the one channel an upstream placement decision can still
   * reach the generator through: `role` is never printed, but being first in
   * APPROVED IMAGE URLS reads as a nomination. `selectPackImagery` no longer
   * promotes a `hero` hint, and this says so in the prompt as well, because a
   * silent ordering rule is not something the model can infer.
   */
  test("states that list order nominates no lead image", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({ photoUrls: [PHOTOS[0], PHOTOS[1], PHOTOS[2]] }),
    );
    expect(prompt).toContain("Nothing in this list is a lead image");
    expect(prompt).toContain(
      "no photograph has been nominated for any position",
    );
    expect(prompt).toContain("none of them has been chosen to run full-bleed");
  });

  /**
   * A photo can be allowlisted without ever reaching the model: an iPhone HEIC
   * upload, an unreadable blob, or one that fell past the request budget. The
   * model must not lead with an image it has not seen, so the brief names them.
   */
  test("names approved photos that were not attached as pixels", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        photoUrls: [PHOTOS[0], PHOTOS[1]],
        imageNotes: [
          { url: PHOTOS[0], seen: true, width: 1200, height: 800 },
          { url: PHOTOS[1], seen: false, alt: "Crew on a roof" },
        ],
      }),
    );
    expect(prompt).toContain("you have not seen them");
    expect(prompt).toContain(PHOTOS[1]);
    expect(prompt).toContain("never as the lead image");

    const warning = prompt.slice(prompt.indexOf("you have not seen them"));
    expect(warning).not.toContain(PHOTOS[0]);
  });

  test("says nothing about unseen photos when every one was attached", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        photoUrls: [PHOTOS[0]],
        imageNotes: [{ url: PHOTOS[0], seen: true }],
      }),
    );
    expect(prompt).not.toContain("you have not seen them");
  });

  /**
   * Maps is identity only. Offering it as a permitted link invites a
   * directions button that cannot work in the sandbox.
   */
  test("does not offer the Google Maps URL as a link", () => {
    const mapsUrl = "https://maps.google.com/?cid=42";
    const prompt = buildConceptUserPrompt(
      briefFor({ googleMapsUrl: mapsUrl, photoUrls: [PHOTOS[0]] }),
    );
    expect(prompt).not.toContain(mapsUrl);
    expect(prompt).not.toContain("permitted external link");
  });

  test("states when no phone number is verified", () => {
    const prompt = buildConceptUserPrompt(briefFor());
    expect(prompt).toContain("none — the page must show no phone number");
  });

  test("forbids testimonials when no quotes are approved", () => {
    const prompt = buildConceptUserPrompt(briefFor());
    expect(prompt).toContain("no <blockquote>");
  });

  test("reproduces approved quotes with attribution", () => {
    const prompt = buildConceptUserPrompt(
      briefFor({
        approvedQuotes: [
          { author: "Dana R.", text: "Spotless every time.", rating: 5 },
        ],
      }),
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
    );
    expect(prompt).not.toContain("Google rating");
    expect(prompt).not.toContain("Google review count");
    expect(prompt).not.toContain("Business hours:");
    expect(prompt).not.toContain("Street address");
    expect(buildConceptSystemPrompt(briefFor())).toContain(
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
    );

    expect(prompt).toContain("## APPROVED FACEBOOK CONTENT");
    expect(prompt).toContain("Tree care done right");
    expect(prompt).toContain("Fully insured");
    expect(prompt).toContain(
      "Where it and the website section disagree, follow this one",
    );
    expect(prompt.indexOf("## APPROVED FACEBOOK CONTENT")).toBeLessThan(
      prompt.indexOf("## APPROVED WEBSITE CONTENT"),
    );
  });

  test("does not embed a structure spec", () => {
    const prompt = buildConceptUserPrompt(briefFor());
    expect(prompt).not.toContain("## STRUCTURE");
    expect(prompt).not.toContain("PAPER:");
  });
});
