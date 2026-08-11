import { describe, expect, test } from "bun:test";
import {
  buildApprovedHarvestSelection,
  HARVEST_MAX_CANDIDATES,
  HARVEST_MAX_IMAGE_CANDIDATES,
  HARVEST_MAX_PAGES,
  buildHarvestSnapshot,
  canonicalizeHarvestUrl,
  classifyHarvestRisk,
  harvestCandidateId,
  harvestCompleteness,
  isSameHarvestHost,
  parsePageExtraction,
  selectHarvestPages,
  type PageExtraction,
} from "../lib/concepts/harvest";

const SITE = "https://bayoufence.com";

function mapResult(path: string, title?: string) {
  return { url: `${SITE}${path}`, title };
}

describe("selectHarvestPages", () => {
  test("always includes the homepage first", () => {
    const { pages } = selectHarvestPages({
      siteUrl: SITE,
      mapResults: [mapResult("/about"), mapResult("/services")],
      businessName: "Bayou Fence",
    });
    expect(pages[0]).toEqual({ url: `${SITE}/`, pageType: "home" });
  });

  test("never exceeds six pages", () => {
    const { pages } = selectHarvestPages({
      siteUrl: SITE,
      mapResults: [
        mapResult("/services"),
        mapResult("/about"),
        mapResult("/gallery"),
        mapResult("/contact"),
        mapResult("/faq"),
        mapResult("/process"),
        mapResult("/team"),
        mapResult("/portfolio"),
      ],
      businessName: "Bayou Fence",
    });
    expect(pages.length).toBe(HARVEST_MAX_PAGES);
  });

  test("orders by what the page is likely to contain", () => {
    const { pages } = selectHarvestPages({
      siteUrl: SITE,
      mapResults: [
        mapResult("/faq"),
        mapResult("/contact"),
        mapResult("/services"),
        mapResult("/about"),
      ],
      businessName: "Bayou Fence",
    });
    expect(pages.map((page) => page.pageType)).toEqual([
      "home",
      "services",
      "about",
      "contact",
      "faq",
    ]);
  });

  test("refuses to leave the verified host", () => {
    const { pages, warnings } = selectHarvestPages({
      siteUrl: SITE,
      mapResults: [
        { url: "https://evil.example.com/services" },
        { url: "https://shop.bayoufence.com/services" },
        mapResult("/services"),
      ],
      businessName: "Bayou Fence",
    });
    expect(pages.map((page) => page.url)).toEqual([
      `${SITE}/`,
      `${SITE}/services`,
    ]);
    expect(warnings.some((warning) => warning.includes("outside"))).toBe(true);
  });

  test("treats www and the bare host as the same site", () => {
    const { pages } = selectHarvestPages({
      siteUrl: "https://www.bayoufence.com",
      mapResults: [mapResult("/services")],
      businessName: "Bayou Fence",
    });
    expect(pages.length).toBe(2);
  });

  test("collapses query variants and trailing slashes to one page", () => {
    const { pages } = selectHarvestPages({
      siteUrl: SITE,
      mapResults: [
        mapResult("/services"),
        mapResult("/services/"),
        mapResult("/services?utm_source=nav"),
      ],
      businessName: "Bayou Fence",
    });
    expect(pages.length).toBe(2);
  });

  test("excludes carts, logins, legal pages, feeds, and individual posts", () => {
    const { pages } = selectHarvestPages({
      siteUrl: SITE,
      mapResults: [
        mapResult("/cart"),
        mapResult("/my-account"),
        mapResult("/privacy-policy"),
        mapResult("/feed"),
        mapResult("/blog/why-cypress-fences-last"),
        mapResult("/2026/08/a-post"),
        mapResult("/brochure.pdf"),
      ],
      businessName: "Bayou Fence",
    });
    expect(pages.map((page) => page.url)).toEqual([`${SITE}/`]);
  });

  test("warns when only the homepage survived", () => {
    const { warnings } = selectHarvestPages({
      siteUrl: SITE,
      mapResults: [],
      businessName: "Bayou Fence",
    });
    expect(
      warnings.some((warning) => warning.includes("Only the homepage")),
    ).toBe(true);
  });

  test("reports an unusable site URL instead of throwing", () => {
    const { pages, warnings } = selectHarvestPages({
      siteUrl: "not a url",
      mapResults: [],
      businessName: "Bayou Fence",
    });
    expect(pages).toEqual([]);
    expect(warnings.length).toBe(1);
  });
});

describe("canonicalizeHarvestUrl", () => {
  test("rejects non-http schemes", () => {
    expect(canonicalizeHarvestUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeHarvestUrl("ftp://bayoufence.com/x")).toBeNull();
  });

  test("allows only the bare/www form of the same host", () => {
    expect(
      isSameHarvestHost(
        "https://www.bayoufence.com/services",
        "https://bayoufence.com/about",
      ),
    ).toBe(true);
    expect(
      isSameHarvestHost(
        "https://bayoufence.com/services",
        "https://cdn.example.com/about",
      ),
    ).toBe(false);
  });
});

describe("parsePageExtraction", () => {
  test("rejects malformed scalar fields instead of iterating their characters", () => {
    const extraction = parsePageExtraction({
      sourceUrl: `${SITE}/`,
      pageType: "home",
      json: { taglines: "Hello", services: "Fence installation" },
    });
    expect(extraction.taglines).toEqual([]);
    expect(extraction.services).toEqual([]);
  });

  test("caps remote arrays before snapshot normalization", () => {
    const extraction = parsePageExtraction({
      sourceUrl: `${SITE}/services`,
      pageType: "services",
      json: {
        services: Array.from({ length: 500 }, (_, index) => ({
          name: `Service ${index}`,
          evidence: `Service ${index}`,
        })),
      },
    });
    expect(extraction.services?.length).toBe(HARVEST_MAX_CANDIDATES);
  });
});

describe("classifyHarvestRisk", () => {
  const sensitive = [
    "Licensed and insured",
    "Bonded contractors",
    "Serving Acadiana since 1998",
    "20+ years of experience",
    "Voted best of Lafayette",
    "100% satisfaction guaranteed",
    "Fences from $18 per linear foot",
    "Financing available",
    "24/7 emergency service",
    "Over 2,000 homes served",
  ];

  for (const value of sensitive) {
    test(`treats "${value}" as sensitive`, () => {
      expect(classifyHarvestRisk("differentiator", value)).toBe("sensitive");
    });
  }

  test("leaves an ordinary service standard", () => {
    expect(
      classifyHarvestRisk("service", "Wood privacy fence installation"),
    ).toBe("standard");
  });

  test("treats every quote as sensitive regardless of wording", () => {
    expect(classifyHarvestRisk("quote", "They did a great job.")).toBe(
      "sensitive",
    );
  });
});

describe("harvestCandidateId", () => {
  test("is stable across reruns", () => {
    const args = {
      kind: "service",
      value: "Wood privacy fence installation",
      sourceUrl: `${SITE}/services`,
    };
    expect(harvestCandidateId(args)).toBe(harvestCandidateId(args));
  });

  test("ignores whitespace and case differences in the value", () => {
    expect(
      harvestCandidateId({
        kind: "service",
        value: "  Wood Privacy  Fence Installation ",
        sourceUrl: `${SITE}/services`,
      }),
    ).toBe(
      harvestCandidateId({
        kind: "service",
        value: "wood privacy fence installation",
        sourceUrl: `${SITE}/services`,
      }),
    );
  });

  test("separates the same value on different pages", () => {
    expect(
      harvestCandidateId({
        kind: "service",
        value: "Gates",
        sourceUrl: `${SITE}/a`,
      }),
    ).not.toBe(
      harvestCandidateId({
        kind: "service",
        value: "Gates",
        sourceUrl: `${SITE}/b`,
      }),
    );
  });
});

function pageFor(overrides: Partial<PageExtraction> = {}): PageExtraction {
  return {
    sourceUrl: `${SITE}/services`,
    pageType: "services",
    ...overrides,
  };
}

describe("buildHarvestSnapshot", () => {
  test("discards a factual candidate with no evidence", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          services: [
            { name: "Chain link", evidence: "Chain link fencing from 4ft." },
            { name: "Invented service" },
          ],
        }),
      ],
    });
    expect(snapshot.candidates.map((c) => c.value)).toEqual(["Chain link"]);
    expect(
      snapshot.warnings.some((warning) =>
        warning.includes("no source excerpt"),
      ),
    ).toBe(true);
  });

  test("lets copy stand as its own evidence", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [pageFor({ taglines: ["Fences built for the coast."] })],
    });
    expect(snapshot.candidates[0].evidence).toBe("Fences built for the coast.");
  });

  test("attaches the scraped page URL, never a model-supplied one", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          sourceUrl: `${SITE}/about`,
          aboutSections: ["A family fence company on Bayou Vermilion."],
        }),
      ],
    });
    expect(snapshot.candidates[0].sourceUrl).toBe(`${SITE}/about`);
  });

  test("re-files a sensitive claim filed under a standard kind", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          services: [
            {
              name: "Licensed and insured installation",
              evidence: "We are licensed and insured.",
            },
          ],
        }),
      ],
    });
    expect(snapshot.candidates[0].kind).toBe("sensitiveClaim");
    expect(snapshot.candidates[0].risk).toBe("sensitive");
  });

  test("deduplicates the same fact across pages and keeps the best excerpt", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({ services: [{ name: "Gates", evidence: "Gates." }] }),
        pageFor({
          sourceUrl: `${SITE}/gallery`,
          services: [
            {
              name: "gates",
              evidence: "Custom driveway gates in wood or steel.",
            },
          ],
        }),
      ],
    });
    expect(snapshot.candidates.length).toBe(1);
    expect(snapshot.candidates[0].evidence).toBe(
      "Custom driveway gates in wood or steel.",
    );
    expect(snapshot.candidates[0].sourceUrl).toBe(`${SITE}/gallery`);
    expect(snapshot.candidates[0].id).toBe(
      harvestCandidateId({
        kind: "service",
        value: "Gates",
        sourceUrl: `${SITE}/gallery`,
      }),
    );
  });

  test("caps the candidate list and says so", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          services: Array.from({ length: 80 }, (_, index) => ({
            name: `Service number ${index}`,
            evidence: `We install service number ${index}.`,
          })),
        }),
      ],
    });
    expect(snapshot.candidates.length).toBe(HARVEST_MAX_CANDIDATES);
    expect(snapshot.warnings.some((w) => w.includes("most useful"))).toBe(true);
  });

  test("strips markup and collapses whitespace", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [pageFor({ taglines: ["**Fences**   built\n\nto last"] })],
    });
    expect(snapshot.candidates[0].value).toBe("Fences built to last");
  });

  test("flags a website phone that disagrees with the concept phone", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      submittedPhone: "(337) 555-0100",
      pages: [
        pageFor({
          phones: [
            { value: "(337) 555-0199", evidence: "Call (337) 555-0199" },
          ],
        }),
      ],
    });
    expect(snapshot.warnings.some((w) => w.includes("differ from"))).toBe(true);
  });

  test("does not flag the same phone written differently", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      submittedPhone: "(337) 555-0100",
      pages: [
        pageFor({
          phones: [
            { value: "+1 337-555-0100", evidence: "Call +1 337-555-0100" },
          ],
        }),
      ],
    });
    expect(snapshot.warnings.some((w) => w.includes("differ from"))).toBe(
      false,
    );
  });
});

describe("buildHarvestSnapshot — images", () => {
  test("accepts only URLs Firecrawl actually saw", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          rawImageUrls: [`${SITE}/img/crew.jpg`],
          imageSelections: [
            { url: `${SITE}/img/crew.jpg`, roleHint: "photo", alt: "Crew" },
            { url: "https://attacker.example.com/x.jpg", roleHint: "photo" },
          ],
        }),
      ],
    });
    expect(snapshot.imageCandidates.map((image) => image.remoteUrl)).toEqual([
      `${SITE}/img/crew.jpg`,
    ]);
  });

  test("takes the homepage branding logo as a logo candidate", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          sourceUrl: `${SITE}/`,
          pageType: "home",
          brandingLogoUrl: `${SITE}/img/logo.png`,
        }),
      ],
    });
    expect(snapshot.imageCandidates[0].remoteUrl).toBe(`${SITE}/img/logo.png`);
    expect(snapshot.imageCandidates[0].roleHint).toBe("logo");
  });

  test("rejects non-https image candidates", () => {
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          rawImageUrls: ["http://bayoufence.com/img/crew.jpg"],
          imageSelections: [{ url: "http://bayoufence.com/img/crew.jpg" }],
        }),
      ],
    });
    expect(snapshot.imageCandidates).toEqual([]);
  });

  test("caps the image candidates", () => {
    const urls = Array.from(
      { length: 30 },
      (_, index) => `${SITE}/img/${index}.jpg`,
    );
    const snapshot = buildHarvestSnapshot({
      businessName: "Bayou Fence",
      pages: [
        pageFor({
          rawImageUrls: urls,
          imageSelections: urls.map((url) => ({ url, roleHint: "photo" })),
        }),
      ],
    });
    expect(snapshot.imageCandidates.length).toBe(HARVEST_MAX_IMAGE_CANDIDATES);
  });
});

describe("harvestCompleteness", () => {
  test("only identity is required", () => {
    const rows = harvestCompleteness({
      placeMatchResolved: true,
      hasPhone: false,
      serviceCount: 0,
      hasAbout: false,
      hasLogo: false,
      photoCount: 0,
      approvedQuoteCount: 0,
    });
    const required = rows.filter((row) => row.requirement === "required");
    expect(required.map((row) => row.key)).toEqual(["identity"]);
    expect(required[0].met).toBe(true);
  });

  test("three photos satisfies the photo row", () => {
    const rows = harvestCompleteness({
      placeMatchResolved: true,
      hasPhone: true,
      serviceCount: 2,
      hasAbout: true,
      hasLogo: true,
      photoCount: 3,
      approvedQuoteCount: 0,
    });
    expect(rows.find((row) => row.key === "photos")?.met).toBe(true);
  });
});

describe("buildApprovedHarvestSelection", () => {
  test("materializes only the explicitly selected source-backed facts", () => {
    const candidates = [
      {
        id: "service",
        kind: "service" as const,
        value: "Tree removal",
        detail: "Safe removal for hazardous trees.",
        evidence: "Tree removal and hazardous tree service",
        sourceUrl: `${SITE}/services`,
        risk: "standard" as const,
      },
      {
        id: "claim",
        kind: "sensitiveClaim" as const,
        value: "Licensed and insured",
        evidence: "Our licensed and insured crew",
        sourceUrl: `${SITE}/about`,
        risk: "sensitive" as const,
      },
      {
        id: "unselected",
        kind: "serviceArea" as const,
        value: "Central Louisiana",
        evidence: "Serving Central Louisiana",
        sourceUrl: `${SITE}/areas`,
        risk: "standard" as const,
      },
    ];

    const selection = buildApprovedHarvestSelection({
      candidates,
      selectedIds: ["service", "claim"],
    });

    expect(selection.candidateIds).toEqual(["service", "claim"]);
    expect(selection.content.services).toEqual([
      {
        name: "Tree removal",
        description: "Safe removal for hazardous trees.",
      },
    ]);
    expect(selection.content.sensitiveClaims).toEqual(["Licensed and insured"]);
    expect(selection.content.serviceAreas).toEqual([]);
  });

  test("keeps harvested phones out and requires attribution for testimonials", () => {
    const selection = buildApprovedHarvestSelection({
      candidates: [
        {
          id: "phone",
          kind: "phone",
          value: "337-555-0199",
          evidence: "Call 337-555-0199",
          sourceUrl: `${SITE}/contact`,
          risk: "standard",
        },
        {
          id: "anonymous-quote",
          kind: "quote",
          value: "Excellent work.",
          evidence: "Excellent work.",
          sourceUrl: `${SITE}/`,
          risk: "sensitive",
        },
        {
          id: "quote",
          kind: "quote",
          value: "They left the yard spotless.",
          detail: "Jamie R.",
          evidence: "They left the yard spotless. — Jamie R.",
          sourceUrl: `${SITE}/testimonials`,
          risk: "sensitive",
        },
      ],
      selectedIds: ["phone", "anonymous-quote", "quote", "unknown"],
    });

    expect(selection.candidateIds).toEqual(["quote"]);
    expect(selection.websiteQuotes).toEqual([
      {
        text: "They left the yard spotless.",
        author: "Jamie R.",
        sourceUrl: `${SITE}/testimonials`,
        sourceKind: "website",
      },
    ]);
  });
});
