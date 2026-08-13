import { describe, expect, test } from "bun:test";
import {
  CONCEPT_IFRAME_SANDBOX,
  neuterConceptHrefs,
} from "../lib/concepts/sandbox";

describe("CONCEPT_IFRAME_SANDBOX", () => {
  test("grants no tokens", () => {
    expect(CONCEPT_IFRAME_SANDBOX).toBe("");
    expect(CONCEPT_IFRAME_SANDBOX).not.toContain("allow-");
  });
});

describe("neuterConceptHrefs", () => {
  test("strips tel:, maps, section, and hash hrefs", () => {
    const html = `
      <a href="tel:+13373842911">Call</a>
      <a href="https://maps.google.test/?cid=1">Directions</a>
      <a href="#services">Services</a>
      <a href="#">Already hash</a>
    `;
    const neutered = neuterConceptHrefs(html);
    expect(neutered).not.toMatch(/\shref\s*=/i);
    expect(neutered).not.toContain("tel:");
    expect(neutered).not.toContain("maps.google");
    expect(neutered).toContain("<a>Call</a>");
    expect(neutered).toContain("data-concept-inert");
    expect(neutered).toContain("pointer-events:none");
  });

  test("strips single-quoted and unquoted hrefs", () => {
    const html = `<a href='tel:1'>Call</a><a href=#services>Go</a>`;
    const neutered = neuterConceptHrefs(html);
    expect(neutered).toContain("<a>Call</a>");
    expect(neutered).toContain("<a>Go</a>");
    expect(neutered).not.toMatch(/\shref\s*=/i);
  });

  test("does not inject the inert style twice", () => {
    const once = neuterConceptHrefs("<head></head><a href='#'>X</a>");
    const twice = neuterConceptHrefs(once);
    expect(twice.match(/data-concept-inert/g)?.length).toBe(1);
    expect(twice.match(/data-concept-telephone-format/g)?.length).toBe(1);
  });

  test("disables iOS automatic phone-link styling", () => {
    const rendered = neuterConceptHrefs(
      "<!doctype html><html><head><title>Test</title></head><body>(337) 384-2911</body></html>",
    );

    expect(rendered).toContain(
      '<meta name="format-detection" content="telephone=no" data-concept-telephone-format>',
    );
    expect(rendered.indexOf("data-concept-telephone-format")).toBeLessThan(
      rendered.indexOf("</head>"),
    );
  });

  test("creates a head for the render guards when the document lacks one", () => {
    const rendered = neuterConceptHrefs(
      "<!doctype html><html><body>Call us</body></html>",
    );

    expect(rendered).toContain("<html><head>");
    expect(rendered).toContain("data-concept-telephone-format");
    expect(rendered).toContain("data-concept-inert");
  });
});
