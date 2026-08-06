import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sessionsSource = readFileSync(
  join(process.cwd(), "convex/onboarding/sessions.ts"),
  "utf8",
);
const prospectsSource = readFileSync(
  join(process.cwd(), "convex/prospects.ts"),
  "utf8",
);

describe("public onboarding session authorization", () => {
  test("never recovers a stored resume token from a session id", () => {
    expect(sessionsSource).not.toContain("existingSessionId");
    expect(sessionsSource).not.toContain("resumeToken: existing.resumeToken");
    expect(sessionsSource).not.toContain("resumeToken: session.resumeToken");
  });

  test("requires the resume token to hydrate an existing session", () => {
    expect(sessionsSource).toContain("resumeToken: v.string()");
    expect(sessionsSource).toContain(
      "session.resumeToken !== args.resumeToken",
    );
    expect(sessionsSource).toContain(
      "getSessionForPlanGeneration = internalQuery",
    );
  });

  test("requires matching signed-in email before returning prospect PII", () => {
    expect(prospectsSource).toContain("authComponent.getAuthUser(ctx)");
    expect(prospectsSource).toContain(
      "prospect.details.contactEmail.trim().toLowerCase() !== userEmail",
    );
  });
});
