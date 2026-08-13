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

  test("HTML repair is one bounded, charged retry", () => {
    expect(source).toContain("const MAX_GENERATION_ATTEMPTS = 2;");
    expect(source).toContain("attempt <= MAX_GENERATION_ATTEMPTS");
    expect(source).toContain("reserveGenerationRetry");
    expect(source).toContain("buildConceptRepairUserPrompt");
    expect(source).toContain("previousHtml: html");
    expect(source).toContain("buildHtmlRepairInstruction");

    const reservations = source.match(/reserveRepair\(ctx, args\.conceptId\)/g);
    expect(reservations?.length).toBe(1);
  });

  test("shares a nine-minute run budget across seven-minute provider attempts", () => {
    expect(source).toContain("const PROVIDER_ATTEMPT_TIMEOUT_MS = 420_000;");
    expect(source).toContain("const GENERATION_RUN_BUDGET_MS = 540_000;");
    expect(source).toContain(
      "const generationDeadline = Date.now() + GENERATION_RUN_BUDGET_MS;",
    );
    expect(source).toContain("generationDeadline - Date.now()");
    expect(source).toContain(
      "activeAttemptTimeoutMs = Math.min(\n          PROVIDER_ATTEMPT_TIMEOUT_MS,\n          remainingRunMs,",
    );
    expect(source).toContain("model,\n            activeAttemptTimeoutMs,");
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
