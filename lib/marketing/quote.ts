import { z } from "zod";

import { QUOTE_NEEDS } from "./quoteShared";
export type { QuoteState } from "./quoteShared";

export const quoteSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  business: z.string().trim().min(1, "Enter your business name.").max(160),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (v) =>
        !v || (/^[+\d().\s-]+$/.test(v) && v.replace(/\D/g, "").length >= 10),
      "Enter a valid phone number or leave it blank.",
    ),
  currentWebsite: z
    .string()
    .trim()
    .max(300)
    .refine((v) => {
      if (!v) return true;
      try {
        const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          url.hostname.includes(".") &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    }, "Enter your website address or leave it blank."),
  need: z.enum(QUOTE_NEEDS, { error: "Choose what you need." }),
  details: z.string().trim().max(2000, "Keep details under 2,000 characters."),
  landingPath: z
    .string()
    .max(500)
    .regex(/^\/(?!\/)[^?#\r\n]*$/)
    .default("/quote"),
  requestId: z.string().uuid(),
});

export function parseQuote(formData: FormData, now = Date.now()) {
  if (String(formData.get("company_url") ?? "").trim())
    return {
      ok: false as const,
      state: {
        success: false,
        message: "Unable to send this request. Please call us instead.",
      },
    };
  const renderedAt = Number(formData.get("renderedAt"));
  if (
    !Number.isFinite(renderedAt) ||
    now - renderedAt < 3000 ||
    now - renderedAt > 86_400_000
  )
    return {
      ok: false as const,
      state: {
        success: false,
        message:
          "Please wait a few seconds and try again. If this page has been open all day, refresh it first.",
      },
    };
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      errors[String(issue.path[0])] ??= issue.message;
    return {
      ok: false as const,
      state: {
        success: false,
        message: "Check the highlighted fields and try again.",
        errors,
      },
    };
  }
  const { business, currentWebsite, need, details, landingPath } = parsed.data;
  return {
    ok: true as const,
    value: parsed.data,
    message: [
      `Business: ${business}`,
      `Need: ${need}`,
      currentWebsite && `Current website: ${currentWebsite}`,
      details && `Details: ${details}`,
      `Submitted from: ${landingPath}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
