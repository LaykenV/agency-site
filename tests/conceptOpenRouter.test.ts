import { describe, expect, test } from "bun:test";
import {
  hasOnlyAsciiHeaderValues,
  OPENROUTER_ATTRIBUTION_HEADERS,
} from "../lib/concepts/openRouter";

describe("OpenRouter request headers", () => {
  test("attribution values contain printable ASCII only", () => {
    expect(hasOnlyAsciiHeaderValues(OPENROUTER_ATTRIBUTION_HEADERS)).toBe(true);
  });

  test("rejects typographic punctuation that fetch cannot encode", () => {
    expect(hasOnlyAsciiHeaderValues({ "X-Title": "Agency — concepts" })).toBe(
      false,
    );
  });
});
