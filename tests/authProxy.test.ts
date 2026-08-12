import { describe, expect, test } from "bun:test";
import {
  getConvexAuthProxyHeaders,
  getConvexAuthProxyTarget,
} from "../lib/auth-proxy";

describe("Better Auth proxy", () => {
  test("forwards the original auth path and query to the Convex site", () => {
    const target = getConvexAuthProxyTarget(
      "https://acadianawebdesign.com/api/auth/magic-link/verify?token=abc",
      "https://energetic-buffalo-511.convex.site",
    );

    expect(target.toString()).toBe(
      "https://energetic-buffalo-511.convex.site/api/auth/magic-link/verify?token=abc",
    );
  });

  test("does not forward transport headers from the Vercel request", () => {
    const headers = getConvexAuthProxyHeaders(
      new Headers({
        connection: "keep-alive",
        "content-length": "123",
        cookie: "session=abc",
        host: "acadianawebdesign.com",
        origin: "https://acadianawebdesign.com",
        "transfer-encoding": "chunked",
        "x-forwarded-host": "acadianawebdesign.com",
      }),
    );

    expect(headers.has("connection")).toBe(false);
    expect(headers.has("content-length")).toBe(false);
    expect(headers.has("host")).toBe(false);
    expect(headers.has("transfer-encoding")).toBe(false);
    expect(headers.has("x-forwarded-host")).toBe(false);
    expect(headers.get("cookie")).toBe("session=abc");
    expect(headers.get("origin")).toBe("https://acadianawebdesign.com");
    expect(headers.get("accept-encoding")).toBe("identity");
  });
});
