/**
 * Pure lifecycle predicates shared by Convex mutations/actions and tests.
 *
 * Keeping these rules out of UI state is important: publication and generation
 * are server decisions, and a delayed model completion must prove it is still
 * the active request before it can write.
 */

/**
 * A pending harvest review blocks generation.
 *
 * Not for safety — the deterministic validator and the brief handle that — but
 * because generating first would spend an OpenRouter call on a page that is
 * stale the moment Layken approves a service or a photo. Skipping the review is
 * an explicit action, so a blocked concept is never a dead end.
 */
export type ConceptGenerationGate = {
  placeMatchResolved: boolean;
  hasResearchBrief: boolean;
  harvestReviewState?: string;
  harvestInFlight?: boolean;
  /** Website image staging/classification is still running after fact review. */
  harvestImagesInFlight?: boolean;
  /** `collecting` | `analyzing` | `ready` | `failed`, absent when no pack. */
  facebookPackState?: string;
  packItemCount?: number;
};

export function canGenerateConcept(input: ConceptGenerationGate): boolean {
  return generationBlockedReason(input) === null;
}

/** Human-readable reason `canGenerateConcept` refused, for admin surfaces. */
export function generationBlockedReason(
  input: ConceptGenerationGate,
): string | null {
  if (input.harvestInFlight) {
    return "Wait for the website content harvest to finish.";
  }
  if (input.harvestReviewState === "pending") {
    return "Review the harvested website content first, or skip it.";
  }
  if (input.harvestImagesInFlight) {
    return "Wait for the website images to finish sorting.";
  }
  // A pack that has been collected but not analyzed is material Layken pasted
  // that no prompt can see. Generating now spends a paid call on a page built
  // as though the Page were empty, and the result would be stale the moment the
  // analysis he already intended finishes.
  if ((input.packItemCount ?? 0) > 0) {
    if (input.facebookPackState === "analyzing") {
      return "Wait for the Facebook Pack analysis to finish.";
    }
    if (input.facebookPackState === "failed") {
      return "Facebook Pack analysis failed. Re-analyze it, or remove the unreadable material.";
    }
    if (input.facebookPackState !== "ready") {
      return "Analyze the Facebook Pack first, or remove what you pasted.";
    }
  }
  if (!input.placeMatchResolved) {
    return "Confirm which Google business this is first.";
  }
  if (!input.hasResearchBrief) {
    return "This concept has no research brief yet.";
  }
  return null;
}

export function isCurrentGeneration(
  concept: { status: string; generationRequestId?: string },
  generationRequestId: string,
): boolean {
  return (
    concept.status === "generating" &&
    concept.generationRequestId === generationRequestId
  );
}

export function statusAfterGenerationInputChange(input: {
  placeMatchResolved: boolean;
  currentStatus: string;
  harvestReviewState?: string;
  harvestInFlight?: boolean;
}): "draft" | "matching" | "content_review" | "harvesting" {
  if (input.harvestInFlight) return "harvesting";
  if (input.harvestReviewState === "pending") return "content_review";
  if (input.placeMatchResolved) return "draft";
  return input.currentStatus === "matching" ? "matching" : "draft";
}
