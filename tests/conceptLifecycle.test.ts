import { describe, expect, test } from "bun:test";
import {
  canGenerateConcept,
  generationBlockedReason,
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

  test("a pending harvest review blocks generation", () => {
    expect(
      canGenerateConcept({
        placeMatchResolved: true,
        hasResearchBrief: true,
        harvestReviewState: "pending",
      }),
    ).toBe(false);
  });

  test("an in-flight harvest blocks generation before candidates exist", () => {
    expect(
      canGenerateConcept({
        placeMatchResolved: true,
        hasResearchBrief: true,
        harvestInFlight: true,
      }),
    ).toBe(false);
    expect(
      generationBlockedReason({
        placeMatchResolved: true,
        hasResearchBrief: true,
        harvestInFlight: true,
      }),
    ).toContain("finish");
  });

  test("editing inputs preserves the content-review state", () => {
    expect(
      statusAfterGenerationInputChange({
        placeMatchResolved: true,
        currentStatus: "content_review",
        harvestReviewState: "pending",
      }),
    ).toBe("content_review");

    expect(
      statusAfterGenerationInputChange({
        placeMatchResolved: true,
        currentStatus: "harvesting",
        harvestInFlight: true,
      }),
    ).toBe("harvesting");
  });

  test("an approved or skipped harvest does not block generation", () => {
    for (const harvestReviewState of ["approved", "skipped", undefined]) {
      expect(
        canGenerateConcept({
          placeMatchResolved: true,
          hasResearchBrief: true,
          harvestReviewState,
        }),
      ).toBe(true);
    }
  });

  test("the pending review outranks the other blocked reasons", () => {
    expect(
      generationBlockedReason({
        placeMatchResolved: false,
        hasResearchBrief: false,
        harvestReviewState: "pending",
      }),
    ).toContain("harvested website content");
    expect(
      generationBlockedReason({
        placeMatchResolved: true,
        hasResearchBrief: true,
      }),
    ).toBeNull();
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
