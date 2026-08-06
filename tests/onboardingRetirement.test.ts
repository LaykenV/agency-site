import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

describe("admin-only project intake", () => {
  test("retires the public onboarding application and preserves old URLs as redirects", () => {
    expect(existsSync("app/onboarding/page.tsx")).toBe(false);
    expect(existsSync("convex/onboarding/sessions.ts")).toBe(false);

    const nextConfig = readFileSync("next.config.ts", "utf8");
    const sitemap = readFileSync("app/sitemap.ts", "utf8");
    expect(nextConfig).toContain('source: "/onboarding"');
    expect(nextConfig).toContain("retired_onboarding");
    expect(sitemap).not.toContain("/onboarding");
  });

  test("only admin creates projects and the agreement page only claims one", () => {
    const admin = readFileSync("convex/admin.ts", "utf8");
    const projects = readFileSync("convex/projects.ts", "utf8");
    const agreementPage = readFileSync("app/portal/agreement/page.tsx", "utf8");

    expect(admin).toContain("export const createProjectForProspect");
    expect(admin).toContain("createDefaultOrderFormDraft");
    expect(projects).toContain("export const claimProjectForProspect");
    expect(projects).not.toContain("findOrCreateProjectForProspect");
    expect(agreementPage).toContain("api.projects.claimProjectForProspect");
    expect(agreementPage).not.toContain("findOrCreateProjectForProspect");
  });
});
