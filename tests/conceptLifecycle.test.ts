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

  test("unanalyzed pack material blocks generation", () => {
    const base = { placeMatchResolved: true, hasResearchBrief: true };

    expect(
      generationBlockedReason({
        ...base,
        facebookPackState: "collecting",
        packItemCount: 3,
      }),
    ).toContain("Analyze the Facebook Pack");
    expect(
      generationBlockedReason({
        ...base,
        facebookPackState: "analyzing",
        packItemCount: 3,
      }),
    ).toContain("Wait for the Facebook Pack");

    // Only a complete analysis may reach generation. A failed pass can contain
    // unread screenshots or text, so allowing it would silently omit material.
    expect(
      canGenerateConcept({
        ...base,
        facebookPackState: "ready",
        packItemCount: 3,
      }),
    ).toBe(true);
    expect(
      canGenerateConcept({
        ...base,
        facebookPackState: "failed",
        packItemCount: 3,
      }),
    ).toBe(false);
    expect(
      generationBlockedReason({
        ...base,
        facebookPackState: "failed",
        packItemCount: 3,
      }),
    ).toContain("Re-analyze");
    expect(
      canGenerateConcept({
        ...base,
        packItemCount: 3,
      }),
    ).toBe(false);
    // An empty pack is not a gate.
    expect(
      canGenerateConcept({
        ...base,
        facebookPackState: "collecting",
        packItemCount: 0,
      }),
    ).toBe(true);
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

  test("website image sorting blocks generation after fact review finishes", () => {
    expect(
      generationBlockedReason({
        placeMatchResolved: true,
        hasResearchBrief: true,
        harvestReviewState: "approved",
        harvestImagesInFlight: true,
      }),
    ).toContain("images");
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
