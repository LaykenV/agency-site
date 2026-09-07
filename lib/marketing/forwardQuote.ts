import { createHmac } from "node:crypto";
import { parseQuote, type QuoteState } from "./quote";

const failure: QuoteState = {
  success: false,
  message:
    "We couldn't confirm your request was received. Please try again or call (337) 306-3705.",
};

/** All destinations and credentials come from server configuration, never form input. */
export async function forwardQuote(
  formData: FormData,
  options: {
    apiUrl?: string;
    secretKey?: string;
    requestHeaders: Headers;
    trustedVercel: boolean;
    fetcher?: typeof fetch;
    now?: number;
  },
): Promise<QuoteState> {
  const now = options.now ?? Date.now();
  const parsed = parseQuote(formData, now);
  if (!parsed.ok) return parsed.state;
  if (!options.apiUrl || !options.secretKey?.startsWith("sk_live_"))
    return failure;
  try {
    const endpoint = new URL("/api/v2/leads", options.apiUrl);
    if (
      endpoint.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        endpoint.hostname === "localhost"
      )
    )
      return failure;
    const ip = options.trustedVercel
      ? options.requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
      : undefined;
    const visitorHash = ip
      ? createHmac("sha256", options.secretKey)
          .update(`${ip}\n${new Date(now).toISOString().slice(0, 10)}`)
          .digest("hex")
      : undefined;
    const response = await (options.fetcher ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.secretKey}`,
      },
      body: JSON.stringify({
        source: "agency-quote-form",
        requestId: parsed.value.requestId,
        data: {
          name: parsed.value.name,
          email: parsed.value.email.toLowerCase(),
          phone: parsed.value.phone || undefined,
          message: parsed.message,
        },
        meta: {
          hp: "",
          renderedAt: Number(formData.get("renderedAt")),
          ...(visitorHash ? { visitorHash } : {}),
        },
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return failure;
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== "object" ||
      !("success" in result) ||
      result.success !== true ||
      !("leadId" in result) ||
      typeof result.leadId !== "string" ||
      !/^[a-zA-Z0-9]{16,64}$/.test(result.leadId)
    )
      return failure;
    return {
      success: true,
      message:
        "Got it. Your request has been received. Layken will review it and contact you directly.",
      leadId: result.leadId,
    };
  } catch {
    return failure;
  }
}
