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
  test("rewrites tel:, maps, and section anchors to #", () => {
    const html = `
      <a href="tel:+13373842911">Call</a>
      <a href="https://maps.google.test/?cid=1">Directions</a>
      <a href="#services">Services</a>
      <a href="#">Already dummy</a>
    `;
    const neutered = neuterConceptHrefs(html);
    expect(neutered).not.toContain("tel:");
    expect(neutered).not.toContain("maps.google");
    expect(neutered).not.toContain("#services");
    expect(neutered.match(/href="#"/g)?.length).toBe(4);
  });

  test("rewrites single-quoted and unquoted hrefs", () => {
    const html = `<a href='tel:1'>Call</a><a href=#services>Go</a>`;
    expect(neuterConceptHrefs(html)).toBe(
      `<a href="#">Call</a><a href="#">Go</a>`,
    );
  });
});
