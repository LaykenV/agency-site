import { describe, expect, test } from "bun:test";
import {
  REMOTE_IMAGE_MAX_BYTES,
  detectSupportedImageMime,
  isBlockedImageAddress,
  validateRemoteImageUrl,
} from "../lib/concepts/remoteImage";

describe("website image URL guard", () => {
  const source = "https://example.com/services";

  test("allows the exact business host and its bare/www equivalent", () => {
    expect(
      validateRemoteImageUrl(
        "https://www.example.com/_next/image?url=%2Flogo.webp&w=384",
        source,
      ).hostname,
    ).toBe("www.example.com");
  });

  test("allows source-observed images on arbitrary public CDN hostnames", () => {
    expect(
      validateRemoteImageUrl(
        "https://static.wixstatic.com/media/photo.webp",
        source,
      ).hostname,
    ).toBe("static.wixstatic.com");
    expect(
      validateRemoteImageUrl(
        "https://irp.cdn-website.com/site/photo.webp",
        source,
      ).hostname,
    ).toBe("irp.cdn-website.com");
    expect(
      validateRemoteImageUrl("https://generic-cdn.example/photo.webp", source)
        .hostname,
    ).toBe("generic-cdn.example");
  });

  test("rejects unsafe schemes, destinations, credentials, and ports", () => {
    for (const url of [
      "http://example.com/photo.jpg",
      "https://user:pass@example.com/photo.jpg",
      "https://example.com:8443/photo.jpg",
      "https://localhost/photo.jpg",
      "https://127.0.0.1/photo.jpg",
      "https://[::1]/photo.jpg",
    ]) {
      expect(() => validateRemoteImageUrl(url, source)).toThrow();
    }
  });
});

describe("website image DNS guard", () => {
  test("blocks private, link-local, documentation, and reserved IPv4", () => {
    for (const address of [
      "0.0.0.0",
      "10.0.0.1",
      "100.64.0.1",
      "127.0.0.1",
      "169.254.1.2",
      "172.16.0.1",
      "192.0.2.10",
      "192.168.1.1",
      "198.18.0.1",
      "198.51.100.4",
      "203.0.113.5",
      "224.0.0.1",
    ]) {
      expect(isBlockedImageAddress(address)).toBe(true);
    }
    expect(isBlockedImageAddress("8.8.8.8")).toBe(false);
    expect(isBlockedImageAddress("203.1.113.5")).toBe(false);
  });

  test("allows global IPv6 and blocks local, mapped-private, and documentation", () => {
    expect(isBlockedImageAddress("2606:4700:4700::1111")).toBe(false);
    expect(isBlockedImageAddress("::1")).toBe(true);
    expect(isBlockedImageAddress("fc00::1")).toBe(true);
    expect(isBlockedImageAddress("fe80::1")).toBe(true);
    expect(isBlockedImageAddress("2001:db8::1")).toBe(true);
    expect(isBlockedImageAddress("::ffff:192.168.1.1")).toBe(true);
  });
});

describe("website image file guard", () => {
  test("detects only JPEG, PNG, and WebP from magic bytes", () => {
    expect(
      detectSupportedImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00])),
    ).toBe("image/jpeg");
    expect(
      detectSupportedImageMime(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(
      detectSupportedImageMime(new TextEncoder().encode("RIFF0000WEBPpayload")),
    ).toBe("image/webp");
    expect(
      detectSupportedImageMime(new TextEncoder().encode("<svg></svg>")),
    ).toBe(null);
    expect(detectSupportedImageMime(new TextEncoder().encode("GIF89a"))).toBe(
      null,
    );
    expect(REMOTE_IMAGE_MAX_BYTES).toBe(8 * 1024 * 1024);
  });
});
