/**
 * The verified generation brief for one website concept.
 *
 * This is the only thing the model is allowed to build a page from. Everything
 * in here is either a public fact confirmed against Google Places, a signal
 * scraped from the business's own existing website, or something Layken typed
 * or uploaded during a supervised research session.
 *
 * Two fields carry a deliberate asymmetry worth understanding before editing:
 *
 * - `googleReviewSummary` is research context. Google review text is licensed
 *   to Google, not to us, so it informs tone and service inference but must
 *   never be reproduced on the concept page.
 * - `approvedQuotes` is the only source of testimonial text the page may show,
 *   and it is populated by hand. When it is empty the deterministic validator
 *   rejects any testimonial-shaped markup outright, because a model asked to
 *   design a trustworthy local-business homepage will invent five-star reviews
 *   unless something stops it.
 *
 * `lib/concepts/validateConceptHtml.ts` enforces the factual half of this
 * contract; `convex/validators.ts` mirrors the shape as a Convex validator and
 * proves the two stay aligned at `tsc --noEmit`.
 */

export type ConceptApprovedQuote = {
  author: string;
  text: string;
  rating?: number;
};

export type ConceptBrief = {
  /** Exact business name as it should appear on the page. */
  businessName: string;

  // --- Verified public identity (Google Places, human-confirmed) ---
  /** Humanized category, e.g. "cleaning service", "general contractor". */
  category?: string;
  /** Formatted street address, only when the business publishes one. */
  address?: string;
  /** City/parish/region line safe to show, e.g. "Youngsville, LA". */
  locality?: string;
  /** Free-text service area supplied by Layken, e.g. "Lafayette Parish". */
  serviceArea?: string;
  /**
   * The single phone number the page may render. The validator rejects any
   * other phone-shaped string in the output, so this is a whitelist of one.
   */
  phone?: string;
  /** Google star rating, shown only as a rating, never as invented review text. */
  googleRating?: number;
  googleReviewCount?: number;
  /** Google's `weekdayDescriptions`, already human-readable. */
  hours?: Array<string>;
  /** Directions CTA target. Allowlisted as the one permitted external href. */
  googleMapsUrl?: string;

  // --- Existing website signals (research only, never quoted verbatim) ---
  existingWebsiteUrl?: string;
  /** wix | squarespace | wordpress | godaddy | weebly | custom */
  existingTechnology?: string;
  /** Mobile Lighthouse performance score of the current site, 0-100. */
  existingPerformanceScore?: number;
  /** Brand color sampled from the current site, `#rrggbb`. */
  existingPrimaryColor?: string;
  /** Condensed copy from the current site: what they actually say they do. */
  existingSiteSummary?: string;

  // --- Human-supplied context ---
  /** Services, slogan, differentiators, desired CTA — typed by Layken. */
  notes?: string;
  /** Facebook Page URL, for provenance in the admin card. Never rendered. */
  facebookPageUrl?: string;

  // --- Approved assets (the image allowlist) ---
  /** Convex storage URL for the owner's logo. */
  logoUrl?: string;
  /** Convex storage URLs for owner/business photos approved for the concept. */
  photoUrls: Array<string>;

  /** The only testimonial text the page may render. Usually empty. */
  approvedQuotes: Array<ConceptApprovedQuote>;

  /**
   * Google review text, condensed. Research signal for tone and service
   * inference. Must not appear on the page — see the module comment.
   */
  googleReviewSummary?: string;
};

/**
 * Every http(s) URL the generated document is permitted to reference.
 *
 * Built from the brief rather than passed alongside it so the allowlist can
 * never drift from what the model was actually shown.
 */
export function conceptAssetAllowlist(brief: ConceptBrief): Array<string> {
  const urls = [brief.logoUrl, ...brief.photoUrls, brief.googleMapsUrl];
  return [...new Set(urls.filter((url): url is string => Boolean(url)))];
}

/** True when the concept has no photography and must carry itself on design. */
export function conceptHasImagery(brief: ConceptBrief): boolean {
  return Boolean(brief.logoUrl) || brief.photoUrls.length > 0;
}

/**
 * Lay the human-controlled half of a brief back over the enrichment findings.
 *
 * Enrichment runs once and its output is stored; assets, notes, and approved
 * quotes keep changing afterwards as Layken uploads photos and adds context. So
 * generation never reuses a stored brief verbatim — it takes the research fields
 * from the last enrichment and refreshes everything a human owns on top, which
 * is also exactly what gets validated and shown in the admin card.
 */
export function refreshConceptBrief(input: {
  research: ConceptBrief;
  businessName: string;
  phone?: string;
  serviceArea?: string;
  notes?: string;
  facebookPageUrl?: string;
  logoUrl?: string;
  photoUrls: Array<string>;
  approvedQuotes: Array<ConceptApprovedQuote>;
}): ConceptBrief {
  return {
    ...input.research,
    businessName: input.businessName,
    // A phone typed by hand outranks whatever Google listed: Layken has often
    // just spoken to the owner, and Google listings go stale.
    phone: input.phone ?? input.research.phone,
    serviceArea: input.serviceArea ?? input.research.serviceArea,
    notes: input.notes,
    facebookPageUrl: input.facebookPageUrl,
    logoUrl: input.logoUrl,
    photoUrls: input.photoUrls,
    approvedQuotes: input.approvedQuotes,
  };
}
