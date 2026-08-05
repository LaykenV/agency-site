import { describe, expect, test } from "bun:test";
import {
  MAX_BODY_BYTES,
  observeTrustedVisitor,
  readJsonBodyWithLimit,
  validateLeadPayload,
} from "../convex/httpValidation";

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://hub.test/api/v1/ingest-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("readJsonBodyWithLimit", () => {
  test("parses a valid bounded JSON request", async () => {
    const result = await readJsonBodyWithLimit(jsonRequest('{"ok":true}'));

    expect(result).toEqual({ ok: true, value: { ok: true } });
  });

  test("rejects an oversized declared content length before reading", async () => {
    const result = await readJsonBodyWithLimit(
      jsonRequest("{}", { "Content-Length": String(MAX_BODY_BYTES + 1) }),
    );

    expect(result).toEqual({
      ok: false,
      status: 413,
      error: "Payload too large",
    });
  });

  test("rejects lookalike JSON media types", async () => {
    const result = await readJsonBodyWithLimit(
      jsonRequest("{}", { "Content-Type": "application/jsonp" }),
    );

    expect(result).toEqual({
      ok: false,
      status: 415,
      error: "Unsupported Media Type",
    });
  });

  test("enforces actual UTF-8 bytes when content length is absent", async () => {
    const unicodeBody = JSON.stringify({ value: "é".repeat(MAX_BODY_BYTES / 2) });
    const request = jsonRequest(unicodeBody);
    request.headers.delete("content-length");

    const result = await readJsonBodyWithLimit(request);

    expect(result).toEqual({
      ok: false,
      status: 413,
      error: "Payload too large",
    });
  });
});

describe("validateLeadPayload", () => {
  test("rejects an over-limit message instead of silently truncating", () => {
    const result = validateLeadPayload({
      projectId: "project",
      data: {
        name: "Test Lead",
        email: "test@example.com",
        message: "x".repeat(4001),
      },
    });

    expect(result).toEqual({ ok: false, error: "Invalid message" });
  });
});

describe("observeTrustedVisitor", () => {
  test("digests an explicitly trusted header before using it as a key", async () => {
    const previous = process.env.HUB_TRUSTED_IP_HEADER;
    process.env.HUB_TRUSTED_IP_HEADER = "cf-connecting-ip";

    try {
      const visitor = await observeTrustedVisitor(
        new Request("https://hub.test", {
          headers: { "cf-connecting-ip": "203.0.113.42" },
        }),
      );

      expect(visitor.source).toEqual("cf-connecting-ip");
      expect(visitor.key === "203.0.113.42").toEqual(false);
      expect(visitor.key?.length).toEqual(64);
    } finally {
      if (previous === undefined) {
        delete process.env.HUB_TRUSTED_IP_HEADER;
      } else {
        process.env.HUB_TRUSTED_IP_HEADER = previous;
      }
    }
  });
});
