"use server";

import { headers } from "next/headers";
import { forwardQuote } from "@/lib/marketing/forwardQuote";
import type { QuoteState } from "@/lib/marketing/quote";

export async function submitAgencyQuote(
  _previous: QuoteState,
  formData: FormData,
): Promise<QuoteState> {
  return forwardQuote(formData, {
    apiUrl: process.env.AWD_WAAS_API_URL,
    secretKey: process.env.AWD_LEAD_SECRET_KEY,
    requestHeaders: new Headers(await headers()),
    trustedVercel: process.env.VERCEL === "1",
  });
}
