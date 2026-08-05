import { describe, expect, test } from "bun:test";
import {
  extractBearerToken,
  generateCredential,
  parseCredential,
  sha256Hex,
  timingSafeEqualHex,
  verifyPresentedCredential,
} from "../convex/credentialCrypto";

describe("generateCredential", () => {
  test("produces sk_live_ keyId_secret with 256-bit secret portion", async () => {
    const cred = await generateCredential("secret");

    expect(cred.kind).toBe("secret");
    expect(cred.rawKey.startsWith("sk_live_")).toBe(true);
    expect(cred.keyId).toMatch(/^[0-9a-f]{24}$/);
    expect(cred.rawKey).toMatch(/^sk_live_[0-9a-f]{24}_[0-9a-f]{64}$/);
    expect(cred.credentialHash).toMatch(/^[0-9a-f]{64}$/);

    const parsed = parseCredential(cred.rawKey);
    expect(parsed).toEqual({
      kind: "secret",
      keyId: cred.keyId,
      prefix: "sk_live",
    });
  });

  test("produces pk_live_ for publishable keys", async () => {
    const cred = await generateCredential("publishable");
    expect(cred.rawKey.startsWith("pk_live_")).toBe(true);
    expect(parseCredential(cred.rawKey)?.kind).toBe("publishable");
  });

  test("each generation yields a unique keyId and hash", async () => {
    const a = await generateCredential("secret");
    const b = await generateCredential("secret");
    expect(a.keyId).not.toBe(b.keyId);
    expect(a.credentialHash).not.toBe(b.credentialHash);
    expect(a.rawKey).not.toBe(b.rawKey);
  });
});

describe("parseCredential", () => {
  test("rejects malformed strings", () => {
    expect(parseCredential("")).toBeNull();
    expect(parseCredential("sk_live_onlyonepart")).toBeNull();
    expect(parseCredential("Bearer sk_live_x_y")).toBeNull();
    expect(parseCredential("sk_test_abc_defghijklmnopqrstuvwxyz0123456789012")).toBeNull();
    // Secret too short
    expect(parseCredential("sk_live_abcdefgh_short")).toBeNull();
  });
});

describe("verifyPresentedCredential", () => {
  test("accepts the exact generated key against its hash", async () => {
    const cred = await generateCredential("secret");
    expect(await verifyPresentedCredential(cred.rawKey, cred.credentialHash)).toBe(
      true,
    );
  });

  test("rejects a wrong secret with the same keyId prefix shape", async () => {
    const cred = await generateCredential("secret");
    const wrong = cred.rawKey.slice(0, -4) + "XXXX";
    expect(await verifyPresentedCredential(wrong, cred.credentialHash)).toBe(false);
  });

  test("hash is of the full key string, not keyId alone", async () => {
    const cred = await generateCredential("secret");
    const keyIdOnlyHash = await sha256Hex(cred.keyId);
    expect(keyIdOnlyHash).not.toBe(cred.credentialHash);
  });
});

describe("timingSafeEqualHex", () => {
  test("equal digests match case-insensitively", () => {
    expect(timingSafeEqualHex("aabbcc", "AABBCC")).toBe(true);
    expect(timingSafeEqualHex("aabbcc", "aabbcd")).toBe(false);
    expect(timingSafeEqualHex("aa", "aabb")).toBe(false);
  });
});

describe("extractBearerToken", () => {
  test("extracts Bearer token and rejects empty / non-bearer", () => {
    const longEnough =
      "sk_live_" + "a".repeat(24) + "_" + "b".repeat(64);
    expect(extractBearerToken(`Bearer ${longEnough}`)).toBe(longEnough);
    expect(extractBearerToken(`bearer ${longEnough}`)).toBe(longEnough);
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken("Bearer short")).toBeNull();
  });
});
