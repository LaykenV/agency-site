import { describe, expect, test } from "bun:test";
import { parseImageDimensions } from "../lib/concepts/imageDimensions";

describe("parseImageDimensions", () => {
  test("reads PNG IHDR width and height", () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x08, 0x00,
    ]);
    expect(parseImageDimensions(bytes)).toEqual({ width: 1536, height: 2048 });
  });

  test("reads a JPEG SOF0 frame size", () => {
    const bytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x04, 0x00, 0x03, 0x00, 0x01,
      0x01, 0x11, 0x00,
    ]);
    expect(parseImageDimensions(bytes)).toEqual({ width: 768, height: 1024 });
  });

  test("reads a WebP VP8X canvas size", () => {
    const bytes = new Uint8Array(30);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0);
    bytes.set([0x57, 0x45, 0x42, 0x50], 8);
    bytes.set([0x56, 0x50, 0x38, 0x58], 12);
    // width-1 = 1054, height-1 = 789
    bytes[24] = 0x1e;
    bytes[25] = 0x04;
    bytes[26] = 0x00;
    bytes[27] = 0x15;
    bytes[28] = 0x03;
    bytes[29] = 0x00;
    expect(parseImageDimensions(bytes)).toEqual({ width: 1055, height: 790 });
  });

  test("returns null for unrecognized bytes", () => {
    expect(parseImageDimensions(new Uint8Array([0x00, 0x01, 0x02]))).toBe(
      null,
    );
  });
});
