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
  });
});
