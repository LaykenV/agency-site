/**
 * Shared validation + visitor observation for Hub HTTP endpoints.
 * Stage 1A (WAAS containment): bound cost and payload size without retiring
 * the legacy no-Origin lead path.
 */

export const MAX_BODY_BYTES = 16 * 1024;

export const LEAD_FIELD_LIMITS = {
  name: 120,
  email: 200,
  phone: 40,
  message: 4000,
  source: 80,
  projectId: 120,
  path: 500,
  referrer: 500,
} as const;

/** Loose but practical email check — not a full RFC parser. */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export type TrustedVisitor = {
  /** SHA-256 bucket key for rate limiting; null when none is trusted. */
  key: string | null;
  /** Which header supplied the key, if any. */
  source: string | null;
  /** Header values used internally; logs expose presence/shape only. */
  observed: Record<string, string | null>;
};

type ObservedHeaderShape = {
  present: boolean;
  length?: number;
  format?: "ipv4" | "ipv6" | "chain" | "other";
};

/**
 * Headers that may be used as a rate-limit key, in priority order.
 *
 * Empty by default: a header is only safe to key on once production logs prove
 * the platform *overwrites* it rather than passing the client's value through.
 * An unproven header is worse than no header — an attacker rotates its value
 * and escapes the strict no-trusted-visitor bucket into a fresh per-visitor
 * bucket per request.
 *
 * To enable after `[hub.visitor]` logs confirm injection, set the Convex env
 * var `HUB_TRUSTED_IP_HEADER` to the header name (e.g. `cf-connecting-ip`).
 * No code change required.
 */
function trustedHeaderNames(): Array<string> {
  const configured = process.env.HUB_TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (!configured) return [];
  return configured
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name !== "x-forwarded-for" && name !== "x-real-ip");
}

/**
 * Observe hosting IP headers without trusting caller-controlled XFF.
 *
 * Stage 1A policy:
 * - Log only while `HUB_VISITOR_OBSERVATION_UNTIL` is a future timestamp.
 * - Log header presence/shape, never raw IP values.
 * - Never use `x-forwarded-for` or `x-real-ip` as a security key (spoofable).
 * - Trust a header as a key only when explicitly allowlisted via env, after
 *   production observation proves the edge injects it.
 * - Until then every caller uses the no-trusted-visitor project bucket.
 */
export async function observeTrustedVisitor(
  request: Request,
): Promise<TrustedVisitor> {
  const get = (name: string, max = 128): string | null => {
    const value = request.headers.get(name);
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
  };

  const observed: Record<string, string | null> = {
    "cf-connecting-ip": get("cf-connecting-ip"),
    "true-client-ip": get("true-client-ip"),
    "x-vercel-forwarded-for": get("x-vercel-forwarded-for"),
    "x-real-ip": get("x-real-ip"),
    // Log presence/shape only; never use as a rate-limit key.
    "x-forwarded-for": get("x-forwarded-for", 200),
  };

  // Observation-only until an operator allowlists a header via env. With none
  // configured, all traffic falls through to leadNoTrustedVisitor / the project
  // analytics fallback, which hold regardless of what the caller sends.
  for (const name of trustedHeaderNames()) {
    const value = observed[name] ?? get(name);
    if (value) {
      return { key: await sha256Hex(value), source: name, observed };
    }
  }

  return { key: null, source: null, observed };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function logVisitorObservation(
  surface: "lead" | "analytics",
  projectId: string,
  visitor: TrustedVisitor,
): void {
  const observationUntil = process.env.HUB_VISITOR_OBSERVATION_UNTIL?.trim();
  const observationDeadline = observationUntil
    ? Date.parse(observationUntil)
    : Number.NaN;
  if (!Number.isFinite(observationDeadline) || Date.now() > observationDeadline) {
    return;
  }

  const observed = Object.fromEntries(
    Object.entries(visitor.observed).map(([name, value]) => [
      name,
      describeObservedHeader(value),
    ]),
  );

  console.log("[hub.visitor]", {
    surface,
    projectId,
    trustedSource: visitor.source,
    hasTrustedVisitor: Boolean(visitor.key),
    observed,
    observationUntil,
  });
}

function describeObservedHeader(value: string | null): ObservedHeaderShape {
  if (!value) return { present: false };

  const format = value.includes(",")
    ? "chain"
    : /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)
      ? "ipv4"
      : value.includes(":")
        ? "ipv6"
        : "other";

  return { present: true, length: value.length, format };
}

/**
 * Read the request body with a hard byte ceiling. Prefer Content-Length when
 * present, but always enforce against the actual payload size.
 */
export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; status: number; error: string }
> {
  const contentType = request.headers.get("content-type") ?? "";
  const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, status: 415, error: "Unsupported Media Type" };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      return { ok: false, status: 413, error: "Payload too large" };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let raw = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel("Payload too large");
        return { ok: false, status: 413, error: "Payload too large" };
      }

      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }

  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}

/** Strip C0/C1 control characters except newline and tab. */
export function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
}

function asBoundedString(
  value: unknown,
  max: number,
): string | null {
  if (typeof value !== "string") return null;
  const cleaned = stripControlChars(value).trim();
  if (!cleaned) return null;
  if (cleaned.length > max) return null;
  return cleaned;
}

export type NormalizedLeadData = {
  name: string;
  email: string;
  phone?: string;
  message?: string;
};

export type LeadValidationResult =
  | {
      ok: true;
      data: NormalizedLeadData;
      source: string;
    }
  | { ok: false; error: string };

/**
 * Validate and normalize lead fields. Generic errors only — never echo input.
 *
 * All over-limit fields are rejected. A message may only be truncated when the
 * originating client form has disclosed the same limit; legacy v1 does not
 * carry enough trusted metadata to prove that, so accepting a truncated message
 * here would silently lose part of a real inquiry.
 */
export function validateLeadPayload(body: unknown): LeadValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request" };
  }

  const record = body as Record<string, unknown>;
  const dataRaw = record.data;
  if (!dataRaw || typeof dataRaw !== "object") {
    return { ok: false, error: "Missing required fields" };
  }
  const data = dataRaw as Record<string, unknown>;

  const name = asBoundedString(data.name, LEAD_FIELD_LIMITS.name);
  const emailRaw = asBoundedString(data.email, LEAD_FIELD_LIMITS.email);
  if (!name || !emailRaw) {
    return { ok: false, error: "Missing required fields" };
  }

  const email = emailRaw.toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > LEAD_FIELD_LIMITS.email) {
    return { ok: false, error: "Invalid email" };
  }

  let phone: string | undefined;
  if (data.phone !== undefined && data.phone !== null && data.phone !== "") {
    const p = asBoundedString(data.phone, LEAD_FIELD_LIMITS.phone);
    if (!p) {
      return { ok: false, error: "Invalid phone" };
    }
    phone = p;
  }

  let message: string | undefined;
  if (
    data.message !== undefined &&
    data.message !== null &&
    data.message !== ""
  ) {
    if (typeof data.message !== "string") {
      return { ok: false, error: "Invalid message" };
    }
    const cleaned = stripControlChars(data.message).trim();
    if (cleaned.length > LEAD_FIELD_LIMITS.message) {
      return { ok: false, error: "Invalid message" };
    } else if (cleaned) {
      message = cleaned;
    }
  }

  let source = "contact-form";
  if (record.source !== undefined && record.source !== null && record.source !== "") {
    const s = asBoundedString(record.source, LEAD_FIELD_LIMITS.source);
    if (!s) {
      return { ok: false, error: "Invalid source" };
    }
    source = s;
  }

  return {
    ok: true,
    data: {
      name,
      email,
      ...(phone ? { phone } : {}),
      ...(message ? { message } : {}),
    },
    source,
  };
}

export function normalizeAnalyticsPath(path: unknown): string {
  if (typeof path !== "string" || !path.trim()) return "/";
  const cleaned = stripControlChars(path).trim();
  if (!cleaned) return "/";
  return cleaned.slice(0, LEAD_FIELD_LIMITS.path);
}

export function normalizeReferrer(referrer: unknown): string | undefined {
  if (typeof referrer !== "string") return undefined;
  const cleaned = stripControlChars(referrer).trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, LEAD_FIELD_LIMITS.referrer);
}

export function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
