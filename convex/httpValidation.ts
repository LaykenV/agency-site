/**
 * Shared validation + visitor observation for Hub HTTP endpoints.
 * Shared payload ceilings and analytics visitor observation for Hub HTTP
 * endpoints. Lead ingestion is authenticated at `/api/v2/leads`.
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

/*
 * There is deliberately no trusted-visitor / client-IP helper here.
 *
 * The Hub cannot obtain a client IP it is able to trust: `x-forwarded-for` and
 * friends are caller-supplied, and keying a rate limit on a spoofable header is
 * worse than keying on nothing — a caller rotates the value and mints a fresh
 * bucket per request. Per-visitor limiting lives in each spoke's own Vercel
 * Function, where the platform overwrites the header with the real client IP.
 * The Hub keeps project-scoped ceilings, which hold regardless of what any
 * caller sends. Decided 2026-08-05; see UPGRADE_PLAN.md § 5.
 *
 * Leads still get a per-visitor tier, but from `meta.visitorHash` computed by
 * the spoke's Function — a value the Hub can attribute because the request is
 * already authenticated by a secret bearer.
 */

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

/** Stage 3 typed event validation — no free-form type names or v.any() meta. */
export type ValidatedClientEvent =
  | {
      ok: true;
      type: "pageview";
      path: string;
      referrer?: string;
    }
  | {
      ok: true;
      type: "click";
      path: string;
      referrer?: string;
      payload: {
        kind: "link";
        target: "tel" | "email" | "directions";
      };
    }
  | { ok: false; error: string };

const CLICK_TARGETS = new Set(["tel", "email", "directions"]);

/**
 * Validate `/api/v2/events` body fields (after publishable key auth).
 * Enforces type/payload pairings and path/referrer bounds.
 */
export function validateClientEventPayload(
  body: Record<string, unknown>,
): ValidatedClientEvent {
  const typeRaw = body.type;
  if (typeRaw !== "pageview" && typeRaw !== "click") {
    return { ok: false, error: "Invalid event type" };
  }

  const path = normalizeAnalyticsPath(body.path);
  const referrer = normalizeReferrer(body.referrer);

  if (typeRaw === "pageview") {
    return {
      ok: true,
      type: "pageview",
      path,
      ...(referrer ? { referrer } : {}),
    };
  }

  // click — require meta.target (or payload.target) as one of the allowed values
  const meta =
    body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : undefined;
  const payloadObj =
    body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? (body.payload as Record<string, unknown>)
      : undefined;

  const targetRaw =
    (typeof meta?.target === "string" ? meta.target : undefined) ??
    (typeof payloadObj?.target === "string" ? payloadObj.target : undefined);

  if (!targetRaw || !CLICK_TARGETS.has(targetRaw)) {
    return { ok: false, error: "Invalid click target" };
  }

  return {
    ok: true,
    type: "click",
    path,
    ...(referrer ? { referrer } : {}),
    payload: {
      kind: "link",
      target: targetRaw as "tel" | "email" | "directions",
    },
  };
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
