import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { conceptDraftPassedValidation } from "../lib/concepts/lifecycle";

describe("generation wiring", () => {
  const source = readFileSync(
    resolve(process.cwd(), "convex/concepts/generate.ts"),
    "utf8",
  );

  test("generation still runs the deterministic HTML validator", () => {
    expect(source).toContain("validateConceptHtml(html, brief)");
  });

  test("there is no post-generation Luna claim audit", () => {
    expect(source).not.toContain("auditGeneratedClaims");
    expect(source).not.toContain("claimAudit");
    expect(source).not.toContain("claims_unsupported");
    expect(source).not.toContain("audit_unreadable");
  });

  test("makes one provider call and surfaces validator failures", () => {
    expect(source).not.toContain("MAX_GENERATION_ATTEMPTS");
    expect(source).not.toContain("reserveGenerationRetry");
    expect(source).not.toContain("buildConceptRepairUserPrompt");
    expect(source).not.toContain("buildHtmlRepairInstruction");
    expect(source.match(/await callOpenRouter\(/g)).toHaveLength(1);
    expect(source).toContain("validateConceptHtml(html, brief).violations");
    expect(source).toContain(
      'violations.length > 0 ? "html_invalid" : undefined',
    );
  });

  test("uses low reasoning with one nine-minute provider budget", () => {
    expect(source).toContain('const REASONING_EFFORT = "low" as const;');
    expect(source).toContain("const PROVIDER_REQUEST_TIMEOUT_MS = 540_000;");
    expect(source).toContain("const GENERATION_RUN_BUDGET_MS = 570_000;");
    expect(source).toContain(
      "const generationDeadline = Date.now() + GENERATION_RUN_BUDGET_MS;",
    );
    expect(source).toContain("generationDeadline - Date.now()");
    expect(source).toContain(
      "providerTimeoutMs = Math.min(PROVIDER_REQUEST_TIMEOUT_MS, remainingRunMs)",
    );
    expect(source).toMatch(/model,\s+providerTimeoutMs,/);
  });
});

describe("conceptDraftPassedValidation", () => {
  test("a stored draft with no failure is ready to review", () => {
    expect(
      conceptDraftPassedValidation({
        generatedHtml: "<html></html>",
        status: "review",
      }),
    ).toBe(true);
  });

  test("a failed or missing draft is not treated as ready", () => {
    expect(
      conceptDraftPassedValidation({
        generatedHtml: "<html></html>",
        status: "failed",
        generationFailure: "html_invalid",
      }),
    ).toBe(false);
    expect(
      conceptDraftPassedValidation({
        status: "review",
      }),
    ).toBe(false);
  });
});
