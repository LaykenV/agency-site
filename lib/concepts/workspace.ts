/**
 * Admin-workspace helpers for `/admin/marketing`.
 *
 * These are presentation rules, not server gates. Generation and publish still
 * go through `lifecycle.ts`. The queue uses these so a phone-sized list can
 * say the next move without opening the card.
 */

export type ConceptQueueFields = {
  status: string;
  placeMatchResolved: boolean;
  facebookPackState?: string;
  facebookPackItemCount: number;
  harvestReviewState?: string;
  hasGeneratedHtml: boolean;
  sentAt?: number;
  viewCount: number;
};

export type QueueBucket = "needs_you" | "working" | "published";

export type WorkspacePane = "now" | "preview" | "pack" | "more";

export type WorkspaceStepId = "match" | "sources" | "page" | "send";

export type WorkspaceStepState = "done" | "current" | "todo";

const WORKING_STATUSES = new Set(["enriching", "harvesting", "generating"]);

export function conceptQueueBucket(concept: ConceptQueueFields): QueueBucket {
  if (WORKING_STATUSES.has(concept.status)) return "working";
  if (concept.status === "published") return "published";
  return "needs_you";
}

/** One line for the queue. Name the next move, not the internal status. */
export function conceptNextAction(concept: ConceptQueueFields): string {
  switch (concept.status) {
    case "enriching":
      return "Looking up Google…";
    case "harvesting":
      return "Reading their website…";
    case "generating":
      return "Generating page…";
    case "matching":
      return "Confirm Google match";
    case "content_review":
      return "Review website content";
    case "failed":
      return "Fix and generate again";
    case "review":
      return "Review and publish";
    case "published":
      if (!concept.sentAt) return "Copy Messenger draft";
      if (concept.viewCount === 0) return "Sent · not opened";
      return concept.viewCount === 1
        ? "Sent · 1 open"
        : `Sent · ${concept.viewCount} opens`;
    default:
      break;
  }

  if (concept.facebookPackItemCount > 0) {
    if (concept.facebookPackState === "analyzing") return "Sorting the pack…";
    if (concept.facebookPackState === "failed") return "Re-analyze Facebook Pack";
    if (concept.facebookPackState !== "ready") return "Analyze Facebook Pack";
  }

  if (concept.facebookPackItemCount === 0) return "Add Facebook Pack";
  return "Generate concept";
}

export function defaultWorkspacePane(concept: {
  status: string;
  hasGeneratedHtml?: boolean;
  generatedHtml?: string;
}): WorkspacePane {
  const hasHtml = Boolean(concept.hasGeneratedHtml || concept.generatedHtml);

  if (
    concept.status === "matching" ||
    concept.status === "content_review" ||
    concept.status === "failed" ||
    WORKING_STATUSES.has(concept.status)
  ) {
    return "now";
  }

  if (hasHtml) return "preview";
  return "pack";
}

export function workspaceSteps(concept: ConceptQueueFields): Array<{
  id: WorkspaceStepId;
  label: string;
  state: WorkspaceStepState;
}> {
  const matchDone = concept.placeMatchResolved;
  const sourcesDone =
    concept.facebookPackState === "ready" ||
    (concept.facebookPackItemCount === 0 &&
      matchDone &&
      (concept.hasGeneratedHtml || concept.status === "draft"));
  const pageDone =
    concept.hasGeneratedHtml &&
    concept.status !== "failed" &&
    concept.status !== "generating";
  const sendDone = Boolean(concept.sentAt);

  const matchState: WorkspaceStepState = matchDone
    ? "done"
    : concept.status === "matching" || concept.status === "enriching"
      ? "current"
      : "todo";

  const sourcesState: WorkspaceStepState = !matchDone
    ? "todo"
    : sourcesDone
      ? "done"
      : concept.status === "content_review" ||
          concept.status === "harvesting" ||
          concept.status === "draft"
        ? "current"
        : "todo";

  const pageState: WorkspaceStepState = pageDone
    ? "done"
    : concept.status === "generating" || concept.status === "review"
      ? "current"
      : matchDone && sourcesDone
        ? "current"
        : "todo";

  const sendState: WorkspaceStepState = sendDone
    ? "done"
    : concept.status === "published"
      ? "current"
      : "todo";

  return [
    { id: "match", label: "Match", state: matchState },
    { id: "sources", label: "Sources", state: sourcesState },
    { id: "page", label: "Page", state: pageState },
    { id: "send", label: "Send", state: sendState },
  ];
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const deltaSec = Math.max(0, Math.round((now - timestamp) / 1000));
  if (deltaSec < 45) return "just now";
  const minutes = Math.round(deltaSec / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function matchesConceptSearch(
  concept: { businessName: string; token: string },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    concept.businessName.toLowerCase().includes(needle) ||
    concept.token.toLowerCase().includes(needle)
  );
}
