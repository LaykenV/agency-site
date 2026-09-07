export const QUOTE_NEEDS = [
  "New website",
  "Redesign",
  "Website help",
  "Not sure yet",
] as const;
export type QuoteState = {
  success: boolean;
  message: string;
  leadId?: string;
  errors?: Record<string, string>;
};
export const initialQuoteState: QuoteState = { success: false, message: "" };
