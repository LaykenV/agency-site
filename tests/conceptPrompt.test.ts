import { describe, expect, test } from "bun:test";
import {
  buildConceptRepairUserPrompt,
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
  const prompt = buildConceptSystemPrompt();

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

  test("does not assign a page shape or type stack", () => {
    expect(prompt).not.toContain("STRUCTURE");
    expect(prompt).not.toContain("Field Record");
    expect(prompt).not.toContain("Copperplate");
    expect(prompt).not.toContain("4pt spacing");
  });

  test("gives the model placement discretion and asks it to look at the photos", () => {
    expect(prompt).toContain("full discretion");
    expect(prompt).toContain("Look at them");
  });

  test("tells the model to take the src from the label on each attachment", () => {
    expect(prompt).toContain("exact URL to use for it");
    expect(prompt).toContain("Do not guess by position");
  });

  /**
   * Design freedom is the point of this prompt version, but the phone is not
   * part of what the model gets to decide. These concepts are opened in
   * Messenger's in-app browser, so every rule here is a hard requirement and
   * has to survive future edits to the design section above it.
   */
  describe("mobile first", () => {
    test.each([
      "Mobile first — this is not a secondary concern",
      "Design at 360px first",
      "overflow-x: clip",
      "never `overflow-x: hidden`",
      "minmax(0, 1fr)",
      "overflow-wrap: anywhere",
      "at least 44px tall",
      "at least 16px",
      "clamp()",
      "min-width: 640px",
      "prefers-reduced-motion",
    ])("keeps the %s rule", (needle) => {
      expect(prompt).toContain(needle);
    });

    test("names the phone as the real design target, not a fallback", () => {
      expect(prompt).toContain("The phone is the real design target");
      expect(prompt).toContain(
        "beautiful at 1440px and broken at 360px is a failed concept",
      );
    });

    test("re-checks the layout at 360px in the final checklist", () => {
      const checklist = prompt.slice(prompt.indexOf("## Before you answer"));
      expect(checklist).toContain("Read the page again at 360px wide");
    });
  });

  test("tells the model not to add its own concept disclaimer", () => {
    expect(prompt.toLowerCase()).toContain("do not add your own");
  });

  test("requires dummy CTAs with href=\"#\" only", () => {
    expect(prompt).toContain("Every CTA is a dummy");
    expect(prompt).toContain("The only permitted `href` is exactly `#`");
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

describe("buildConceptRepairUserPrompt", () => {
  test("gives the retry the exact failed document and correction", () => {
    const repaired = buildConceptRepairUserPrompt({
      basePrompt: "BRIEF AND IMAGES",
      previousHtml: "<html><body>Unsupported sentence.</body></html>",
      correction: "Remove Unsupported sentence.",
    });

    expect(repaired).toContain("BRIEF AND IMAGES");
    expect(repaired).toContain("<<<UNTRUSTED_EXISTING_HTML");
    expect(repaired).toContain(
      "<html><body>Unsupported sentence.</body></html>",
    );
    expect(repaired).toContain("Remove Unsupported sentence.");
    expect(repaired).toContain("Do not redesign the page");
  });
});
