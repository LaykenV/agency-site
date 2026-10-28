import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import nextConfig, { RETIRED_SALES_ROUTES } from "../next.config";

function redirectsHome(path: string) {
  return RETIRED_SALES_ROUTES.some((source) =>
    pathToRegexp(source, [], { strict: true, sensitive: false, delimiter: "/" }).test(path),
  );
}

describe("retired website sales", () => {
  test("old sales routes redirect to the transition homepage", async () => {
    for (const path of [
      "/onboarding",
      "/quote",
      "/fb-cover",
      "/services",
      "/services/plumbers",
      "/websites-for-plumbers",
      "/lafayette",
      "/new-iberia/roofers",
      "/blog",
      "/blog/google-reviews-guide-local-businesses",
      "/audit",
      "/audit/request/abc123",
    ]) {
      expect(redirectsHome(path)).toBe(true);
    }

    const redirects = await nextConfig.redirects!();
    expect(redirects.every((r) => r.destination === "/" && r.permanent)).toBe(true);
  });

  test("client, legal, and API routes are not redirected", () => {
    for (const path of [
      "/",
      "/portal",
      "/portal/subscribe",
      "/portal/agreement",
      "/admin",
      "/api/auth/session",
      "/legal/terms",
      "/legal/privacy",
      "/sms-consent",
      "/sms-consent/screenshot",
      "/preview/abc123",
      "/scottsdale",
    ]) {
      expect(redirectsHome(path)).toBe(false);
    }
  });

  test("retired pages are gone and unlisted", () => {
    for (const file of [
      "app/onboarding/page.tsx",
      "app/quote/page.tsx",
      "app/[city]/page.tsx",
      "app/services/[industry]/page.tsx",
      "app/blog/page.tsx",
      "app/audit/page.tsx",
      "app/fb-cover/page.tsx",
    ]) {
      expect(existsSync(file)).toBe(false);
    }
    expect(existsSync("convex/onboarding/sessions.ts")).toBe(false);

    const sitemap = readFileSync("app/sitemap.ts", "utf8");
    for (const path of ["/onboarding", "/quote", "/blog", "websites-for", "/audit"]) {
      expect(sitemap).not.toContain(path);
    }
  });

  test("the homepage points new work to Varholdt and clients to the portal", () => {
    const home = readFileSync("app/page.tsx", "utf8");
    expect(home).toContain("VARHOLDT_URL");
    expect(home).toContain('href="/portal"');
    expect(home).not.toMatch(/\$199|\$0 down|\/quote/i);
  });
});

describe("admin-only project intake", () => {
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
