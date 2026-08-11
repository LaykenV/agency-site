/**
 * Pure lifecycle predicates shared by Convex mutations/actions and tests.
 *
 * Keeping these rules out of UI state is important: publication and generation
 * are server decisions, and a delayed model completion must prove it is still
 * the active request before it can write.
 */

export function canGenerateConcept(input: {
  placeMatchResolved: boolean;
  hasResearchBrief: boolean;
}): boolean {
  return input.placeMatchResolved && input.hasResearchBrief;
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
}): "draft" | "matching" {
  if (input.placeMatchResolved) return "draft";
  return input.currentStatus === "matching" ? "matching" : "draft";
}
