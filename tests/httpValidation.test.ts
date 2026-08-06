import { describe, expect, test } from "bun:test";
import {
  MAX_BODY_BYTES,
  readJsonBodyWithLimit,
  validateClientEventPayload,
  validateLeadPayload,
} from "../convex/httpValidation";

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://hub.test/api/v2/leads", {
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
    const unicodeBody = JSON.stringify({
      value: "é".repeat(MAX_BODY_BYTES / 2),
    });
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

describe("validateClientEventPayload", () => {
  test("accepts a pageview with path and referrer", () => {
    const result = validateClientEventPayload({
      type: "pageview",
      path: "/services",
      referrer: "https://www.google.com/",
    });
    expect(result).toEqual({
      ok: true,
      type: "pageview",
      path: "/services",
      referrer: "https://www.google.com/",
    });
  });

  test("accepts a tel click with meta.target", () => {
    const result = validateClientEventPayload({
      type: "click",
      path: "/",
      meta: { target: "tel" },
    });
    expect(result).toEqual({
      ok: true,
      type: "click",
      path: "/",
      payload: { kind: "link", target: "tel" },
    });
  });

  test("rejects unknown event types and invalid click targets", () => {
    expect(validateClientEventPayload({ type: "bounce", path: "/" })).toEqual({
      ok: false,
      error: "Invalid event type",
    });
    expect(
      validateClientEventPayload({
        type: "click",
        path: "/",
        meta: { target: "sms" },
      }),
    ).toEqual({
      ok: false,
      error: "Invalid click target",
    });
  });
});
