import { describe, expect, test } from "bun:test";
import { buildMessengerDraft } from "../lib/concepts/messengerDraft";

describe("buildMessengerDraft", () => {
  const draft = buildMessengerDraft({
    businessName: "Shay's Cleaning Services",
    token: "preview-token",
  });

  test("names the business and includes the preview URL", () => {
    expect(draft).toContain("Shay's Cleaning Services");
    expect(draft).toContain("/preview/preview-token");
  });

  test("frames the page as a sketch, not the finished site", () => {
    expect(draft.toLowerCase()).toContain("sketch");
    expect(draft.toLowerCase()).toContain("not the finished");
    expect(draft.toLowerCase()).toContain("buttons");
  });
});
