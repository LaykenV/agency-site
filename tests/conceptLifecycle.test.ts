import { describe, expect, test } from "bun:test";
import {
  canGenerateConcept,
  isCurrentGeneration,
  statusAfterGenerationInputChange,
} from "../lib/concepts/lifecycle";

describe("concept lifecycle", () => {
  test("generation requires both confirmed identity and completed research", () => {
    expect(
      canGenerateConcept({
        placeMatchResolved: true,
        hasResearchBrief: true,
      }),
    ).toBe(true);
    expect(
      canGenerateConcept({
        placeMatchResolved: false,
        hasResearchBrief: true,
      }),
    ).toBe(false);
    expect(
      canGenerateConcept({
        placeMatchResolved: true,
        hasResearchBrief: false,
      }),
    ).toBe(false);
  });

  test("only the active generation request may save a completion", () => {
    const concept = {
      status: "generating",
      generationRequestId: "new-request",
    };

    expect(isCurrentGeneration(concept, "new-request")).toBe(true);
    expect(isCurrentGeneration(concept, "old-request")).toBe(false);
    expect(
      isCurrentGeneration({ ...concept, status: "draft" }, "new-request"),
    ).toBe(false);
  });

  test("input changes revoke a resolved page but preserve a pending match", () => {
    expect(
      statusAfterGenerationInputChange({
        placeMatchResolved: true,
        currentStatus: "published",
      }),
    ).toBe("draft");
    expect(
      statusAfterGenerationInputChange({
        placeMatchResolved: false,
        currentStatus: "matching",
      }),
    ).toBe("matching");
  });
});
