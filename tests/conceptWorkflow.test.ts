import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("concept workflow wiring", () => {
  test("matching and baseline research never trigger a paid generation", () => {
    const internalSource = readSource("convex/concepts/internal.ts");
    const enrichSource = readSource("convex/concepts/enrich.ts");

    expect(internalSource).not.toContain("thenGenerate: true");
    expect(enrichSource).not.toContain(
      "internal.concepts.internal.queueGeneration",
    );
  });

  test("the mobile review exposes approval and regeneration as one action", () => {
    const reviewSource = readSource(
      "components/admin/concepts/ConceptHarvestReview.tsx",
    );

    expect(reviewSource).toContain("Approve and regenerate");
    expect(reviewSource).toContain("Needs care");
    expect(reviewSource).toContain("Check source evidence");
  });
});
