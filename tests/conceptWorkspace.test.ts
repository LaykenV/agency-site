import { describe, expect, test } from "bun:test";
import {
  conceptNextAction,
  conceptQueueBucket,
  defaultWorkspacePane,
  matchesConceptSearch,
  relativeTime,
  workspaceSteps,
  type ConceptQueueFields,
} from "../lib/concepts/workspace";

function concept(
  overrides: Partial<ConceptQueueFields> = {},
): ConceptQueueFields {
  return {
    status: "draft",
    placeMatchResolved: true,
    facebookPackState: "collecting",
    facebookPackItemCount: 0,
    hasGeneratedHtml: false,
    viewCount: 0,
    ...overrides,
  };
}

describe("concept queue", () => {
  test("buckets working, published, and everything else that needs a human", () => {
    expect(conceptQueueBucket(concept({ status: "matching" }))).toBe(
      "needs_you",
    );
    expect(conceptQueueBucket(concept({ status: "failed" }))).toBe("needs_you");
    expect(conceptQueueBucket(concept({ status: "review" }))).toBe("needs_you");
    expect(conceptQueueBucket(concept({ status: "generating" }))).toBe(
      "working",
    );
    expect(conceptQueueBucket(concept({ status: "published" }))).toBe(
      "published",
    );
  });

  test("names the next move from list fields", () => {
    expect(conceptNextAction(concept({ status: "matching" }))).toBe(
      "Confirm Google match",
    );
    expect(
      conceptNextAction(
        concept({ facebookPackItemCount: 3, facebookPackState: "collecting" }),
      ),
    ).toBe("Analyze Facebook Pack");
    expect(conceptNextAction(concept({ facebookPackItemCount: 0 }))).toBe(
      "Add Facebook Pack",
    );
    expect(
      conceptNextAction(
        concept({
          facebookPackItemCount: 2,
          facebookPackState: "ready",
        }),
      ),
    ).toBe("Generate concept");
    expect(
      conceptNextAction(concept({ status: "published", viewCount: 0 })),
    ).toBe("Copy Messenger draft");
    expect(
      conceptNextAction(
        concept({ status: "published", sentAt: 1, viewCount: 3 }),
      ),
    ).toBe("Sent · 3 opens");
  });
});

describe("workspace panes and steps", () => {
  test("opens on the pane that needs work", () => {
    expect(defaultWorkspacePane({ status: "matching" })).toBe("now");
    expect(defaultWorkspacePane({ status: "draft" })).toBe("pack");
    expect(
      defaultWorkspacePane({ status: "review", hasGeneratedHtml: true }),
    ).toBe("preview");
    expect(
      defaultWorkspacePane({ status: "published", generatedHtml: "<html>" }),
    ).toBe("preview");
    expect(defaultWorkspacePane({ status: "failed" })).toBe("now");
  });

  test("marks match current until the listing is confirmed", () => {
    const steps = workspaceSteps(
      concept({ status: "matching", placeMatchResolved: false }),
    );
    expect(steps.map((step) => [step.id, step.state])).toEqual([
      ["match", "current"],
      ["sources", "todo"],
      ["page", "todo"],
      ["send", "todo"],
    ]);
  });

  test("marks send current once the page is published and unsent", () => {
    const steps = workspaceSteps(
      concept({
        status: "published",
        placeMatchResolved: true,
        facebookPackState: "ready",
        facebookPackItemCount: 2,
        hasGeneratedHtml: true,
      }),
    );
    expect(steps.find((step) => step.id === "page")?.state).toBe("done");
    expect(steps.find((step) => step.id === "send")?.state).toBe("current");
  });
});

describe("queue search and relative time", () => {
  test("matches business name or token", () => {
    const row = { businessName: "Shay's Cleaning", token: "abc123" };
    expect(matchesConceptSearch(row, "shay")).toBe(true);
    expect(matchesConceptSearch(row, "ABC")).toBe(true);
    expect(matchesConceptSearch(row, "bordelon")).toBe(false);
    expect(matchesConceptSearch(row, "  ")).toBe(true);
  });

  test("formats recent times without a clock read in the helper", () => {
    const now = Date.parse("2026-08-12T12:00:00.000Z");
    expect(relativeTime(now - 10_000, now)).toBe("just now");
    expect(relativeTime(now - 5 * 60_000, now)).toBe("5m ago");
    expect(relativeTime(now - 3 * 60 * 60_000, now)).toBe("3h ago");
    expect(relativeTime(now - 2 * 24 * 60 * 60_000, now)).toBe("2d ago");
  });
});
