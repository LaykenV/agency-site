import { describe, expect, test } from "bun:test";
import { classifyReferrer } from "../convex/lib/referrerClass";

describe("classifyReferrer", () => {
  test("treats empty and direct as direct", () => {
    expect(classifyReferrer(undefined)).toBe("direct");
    expect(classifyReferrer(null)).toBe("direct");
    expect(classifyReferrer("")).toBe("direct");
    expect(classifyReferrer("direct")).toBe("direct");
    expect(classifyReferrer("Direct")).toBe("direct");
  });

  test("classifies organic search hosts", () => {
    expect(classifyReferrer("https://www.google.com/search?q=towing")).toBe(
      "organic",
    );
    expect(classifyReferrer("https://www.bing.com/search?q=x")).toBe("organic");
    expect(classifyReferrer("duckduckgo.com")).toBe("organic");
  });

  test("classifies social hosts", () => {
    expect(classifyReferrer("https://www.facebook.com/")).toBe("social");
    expect(classifyReferrer("https://t.co/abc")).toBe("social");
    expect(classifyReferrer("https://www.instagram.com/p/1")).toBe("social");
  });

  test("classifies unknown hosts as other", () => {
    expect(classifyReferrer("https://example.com/blog")).toBe("other");
    expect(classifyReferrer("newsletter.client.com")).toBe("other");
  });
});
