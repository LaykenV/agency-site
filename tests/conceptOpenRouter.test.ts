import { describe, expect, test } from "bun:test";
import {
  extractOpenRouterText,
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

  test("extracts final text from string and text-part responses", () => {
    expect(extractOpenRouterText("  <html></html>  ")).toBe("<html></html>");
    expect(
      extractOpenRouterText([
        { type: "text", text: "<html>" },
        { type: "text", text: "</html>" },
      ]),
    ).toBe("<html></html>");
    expect(extractOpenRouterText(null)).toBe("");
  });
});
