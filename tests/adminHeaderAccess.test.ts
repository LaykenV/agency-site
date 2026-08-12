import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("admin header access", () => {
  test("checks admin visibility only after authentication", () => {
    const header = readFileSync("components/global-header.tsx", "utf8");

    expect(header).toContain("useConvexAuth()");
    expect(header).toContain('isAuthenticated ? {} : "skip"');
    expect(header).toContain('href="/admin"');
  });

  test("uses the same Convex admin rule without weakening authorization", () => {
    const accessQuery = readFileSync("convex/adminAccess.ts", "utf8");
    const adminGuard = readFileSync("convex/adminGuard.ts", "utf8");

    expect(accessQuery).toContain("isCurrentUserAdmin(ctx)");
    expect(adminGuard).toContain("matchesConfiguredAdmin(user.email)");
    expect(adminGuard).toContain('throw new Error("Admin access required")');
  });
});
