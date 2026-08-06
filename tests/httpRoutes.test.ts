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

  test("retires the unauthenticated analytics pixel aliases", () => {
    expect(httpSource).not.toContain('path: "/api/v1/analytics/pixel"');
    expect(httpSource).not.toContain('path: "/api/analytics/pixel"');
  });

  test("exposes Stage 3 typed events endpoint", () => {
    expect(httpSource).toContain('path: "/api/v2/events"');
    expect(httpSource).toContain("getActivePublishableByKeyId");
    expect(httpSource).toContain("validateClientEventPayload");
  });

  test("keys no rate limit on a caller-supplied IP header", () => {
    expect(httpSource).not.toContain("x-forwarded-for");
    expect(httpSource).not.toContain("observeTrustedVisitor");
  });
});
