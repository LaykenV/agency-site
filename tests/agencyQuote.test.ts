import { describe, expect, test } from "bun:test";
import { parseQuote } from "../lib/marketing/quote";
import { forwardQuote } from "../lib/marketing/forwardQuote";

const now = 1_800_000_000_000;
function form(overrides: Record<string, string | undefined> = {}) {
  const data = new FormData();
  const fields = {
    name: "Test Owner",
    business: "Local Service",
    email: "owner@example.com",
    phone: "",
    currentWebsite: "",
    need: "New website",
    details: "A new site for my service business",
    requestId: "6fdf5a63-7c52-4c9d-9976-8a2abfe1d19a",
    landingPath: "/lafayette",
    renderedAt: String(now - 5000),
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields))
    if (value !== undefined) data.set(key, value);
  return data;
}
const options = {
  apiUrl: "https://example.convex.site",
  secretKey: "sk_live_test",
  requestHeaders: new Headers(),
  trustedVercel: false,
  now,
};

describe("agency quote intake", () => {
  test("formats bounded business context and keeps optional phone empty", () => {
    const parsed = parseQuote(form(), now);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.message).toContain("Business: Local Service");
      expect(parsed.message).toContain("Submitted from: /lafayette");
      expect(parsed.value.phone).toBe("");
    }
  });
  test.each([
    { company_url: "spam" },
    { renderedAt: "NaN" },
    { renderedAt: String(now + 100) },
    { renderedAt: String(now - 100) },
    { renderedAt: String(now - 86_400_001) },
    { email: "bad" },
    { phone: "letters" },
    { need: "anything" },
    { details: "x".repeat(2001) },
    { landingPath: "//evil.example" },
    { currentWebsite: "javascript:alert(1)" },
  ])(
    "rejects invalid or automated submissions without forwarding",
    async (overrides) => {
      let calls = 0;
      const result = await forwardQuote(form(overrides), {
        ...options,
        fetcher: (async () => {
          calls++;
          return Response.json({ success: true });
        }) as typeof fetch,
      });
      expect(result.success).toBe(false);
      expect(calls).toBe(0);
    },
  );
  test("reports success only for a confirmed stored lead and keeps the secret server-side", async () => {
    let sent: Record<string, unknown> = {};
    const result = await forwardQuote(
      form({ phone: "337-555-0123", currentWebsite: "example.com" }),
      {
        ...options,
        requestHeaders: new Headers({ "x-forwarded-for": "forged" }),
        fetcher: (async (url, init) => {
          expect(String(url)).toBe("https://example.convex.site/api/v2/leads");
          sent = JSON.parse(String(init?.body));
          expect((init?.headers as Record<string, string>).Authorization).toBe(
            "Bearer sk_live_test",
          );
          return Response.json({
            success: true,
            leadId: "jd7teststoredlead123456789",
          });
        }) as typeof fetch,
      },
    );
    expect(result.success).toBe(true);
    expect(result.leadId).toBe("jd7teststoredlead123456789");
    expect(JSON.stringify(result)).not.toContain("sk_live_");
    expect(sent.source).toBe("agency-quote-form");
    expect(sent.requestId).toBe("6fdf5a63-7c52-4c9d-9976-8a2abfe1d19a");
    expect(JSON.stringify(sent.meta)).not.toContain("visitorHash");
  });
  test.each([400, 401, 403, 429, 500])(
    "handles backend rejection %s without a conversion ID",
    async (status) => {
      const result = await forwardQuote(form(), {
        ...options,
        fetcher: (async () =>
          Response.json(
            { error: "private diagnostic" },
            { status },
          )) as typeof fetch,
      });
      expect(result.success).toBe(false);
      expect(result.leadId).toBeUndefined();
      expect(result.message).not.toContain("private diagnostic");
    },
  );
  test("rejects a malformed success body and handles a network failure", async () => {
    for (const fetcher of [
      async () => Response.json({ success: true }),
      async () => {
        throw new Error("timeout");
      },
    ]) {
      expect(
        (
          await forwardQuote(form(), {
            ...options,
            fetcher: fetcher as typeof fetch,
          })
        ).success,
      ).toBe(false);
    }
  });
  test("fails safely when credentials are missing", async () => {
    expect(
      (await forwardQuote(form(), { ...options, secretKey: undefined }))
        .success,
    ).toBe(false);
  });
});
