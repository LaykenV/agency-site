import { describe, expect, test } from "bun:test";
import { WebpackSha256 } from "../lib/webpackSha256";

describe("WebpackSha256", () => {
  test("an undefined write does not throw", () => {
    const hash = new WebpackSha256();
    expect(() => hash.update(undefined)).not.toThrow();
    expect(() => hash.update(null)).not.toThrow();
    expect(typeof hash.digest("hex")).toBe("string");
  });

  test("hashes the same string the same way twice", () => {
    const first = new WebpackSha256();
    first.update("concept");
    const second = new WebpackSha256();
    second.update("concept");
    expect(first.digest("hex")).toBe(second.digest("hex"));
  });
});
