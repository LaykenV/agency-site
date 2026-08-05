/**
 * Credential generation and verification helpers for Stage 2 Hub auth.
 *
 * Key format: `{sk|pk}_live_<keyId>_<secret>`
 * - keyId: public lookup id (96 random bits as 24 hex chars — no `_`, so
 *   the underscore separators stay unambiguous)
 * - secret: 256 random bits as 64 hex chars
 * - credentialHash at rest: SHA-256 hex of the *full* raw key string
 *
 * Pure module — no Convex imports so unit tests can import it directly.
 */

export type CredentialKind = "publishable" | "secret";

const KEY_ID_BYTES = 12; // 96 bits → 24 hex chars
const SECRET_BYTES = 32; // 256 bits → 64 hex chars
const KEY_ID_HEX_LEN = KEY_ID_BYTES * 2;
const SECRET_HEX_LEN = SECRET_BYTES * 2;

/** Fixed shape: sk_live_<24hex>_<64hex> */
const CREDENTIAL_RE = new RegExp(
  `^(sk_live|pk_live)_([0-9a-f]{${KEY_ID_HEX_LEN}})_([0-9a-f]{${SECRET_HEX_LEN}})$`,
  "i",
);

export function kindToPrefix(kind: CredentialKind): "sk_live" | "pk_live" {
  return kind === "secret" ? "sk_live" : "pk_live";
}

export function prefixToKind(prefix: string): CredentialKind | null {
  if (prefix === "sk_live") return "secret";
  if (prefix === "pk_live") return "publishable";
  return null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Constant-time equality for equal-length hex digests.
 * Length mismatch returns false immediately (digest length is public).
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  let result = 0;
  for (let i = 0; i < left.length; i++) {
    result |= left.charCodeAt(i)! ^ right.charCodeAt(i)!;
  }
  return result === 0;
}

export type ParsedCredential = {
  kind: CredentialKind;
  keyId: string;
  prefix: "sk_live" | "pk_live";
};

/**
 * Parse a presented credential without verifying it.
 * Returns null for any malformed value.
 * keyId is normalized to lowercase hex for index lookups.
 */
export function parseCredential(raw: string): ParsedCredential | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(CREDENTIAL_RE);
  if (!match) return null;

  const prefix = match[1]!.toLowerCase() as "sk_live" | "pk_live";
  const keyId = match[2]!.toLowerCase();
  const kind = prefixToKind(prefix);
  if (!kind) return null;

  return { kind, keyId, prefix };
}

export type GeneratedCredential = {
  rawKey: string;
  keyId: string;
  credentialHash: string;
  kind: CredentialKind;
};

/** Generate a high-entropy key; hash the full string for at-rest storage. */
export async function generateCredential(
  kind: CredentialKind,
): Promise<GeneratedCredential> {
  const keyIdBytes = new Uint8Array(KEY_ID_BYTES);
  const secretBytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(keyIdBytes);
  crypto.getRandomValues(secretBytes);

  const keyId = bytesToHex(keyIdBytes);
  const secret = bytesToHex(secretBytes);
  // Canonical form is lowercase hex so hash matches regardless of client casing
  // on the secret portion only if they re-type; we always issue lowercase.
  const rawKey = `${kindToPrefix(kind)}_${keyId}_${secret}`;
  const credentialHash = await sha256Hex(rawKey);

  return { rawKey, keyId, credentialHash, kind };
}

/** Hash the full presented credential and compare to the stored digest. */
export async function verifyPresentedCredential(
  presentedRaw: string,
  storedHash: string,
): Promise<boolean> {
  const presentedHash = await sha256Hex(presentedRaw);
  return timingSafeEqualHex(presentedHash, storedHash);
}

/**
 * Extract a Bearer token from Authorization.
 * Callers must never log the header or the returned token.
 */
export function extractBearerToken(
  authorization: string | null | undefined,
): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(\S+)\s*$/i);
  if (!match?.[1]) return null;
  // Reject empty or absurdly long tokens early
  if (match[1].length < 20 || match[1].length > 200) return null;
  return match[1];
}
