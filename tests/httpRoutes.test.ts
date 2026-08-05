import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const httpSource = readFileSync(join(process.cwd(), "convex/http.ts"), "utf8");

describe("Hub public HTTP routes", () => {
  test("exposes authenticated v2 as the only lead-ingestion route", () => {
    expect(httpSource).toContain('path: "/api/v2/leads"');
    expect(httpSource).not.toContain('path: "/api/v1/ingest-lead"');
    expect(httpSource).not.toContain('path: "/api/ingest-lead"');
  });

  test("keeps v1 and unversioned analytics during the events migration", () => {
    expect(httpSource).toContain('path: "/api/v1/analytics/pixel"');
    expect(httpSource).toContain('path: "/api/analytics/pixel"');
  });
});
