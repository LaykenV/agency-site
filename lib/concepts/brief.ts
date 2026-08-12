/**
 * The verified generation brief for one website concept.
 *
 * This is the only thing the model is allowed to build a page from. Everything
 * in here is either a signal scraped from the business's own existing website
 * or something Layken typed or uploaded during a supervised research session.
 *
 * Google Places is an identity provider here, not a content library. It tells
 * us *which* business this is and where its current site lives; it does not
 * supply facts the page may state. Rating, review count, review text, opening
 * hours, and street address were all removed from this type deliberately —
 * Google's Places policy restricts retaining that content, and the review text
 * in particular was written by customers who never agreed to appear on a
 * mock-up. A separate approved source may reintroduce any of those facts; a
 * Places response may not. See `docs/plans/outreach-preview-engine.md`
 * § Google Places is identity matching, not the content library.
 *
 * `approvedQuotes` is the only source of testimonial text the page may show,
 * and it is populated by hand. When it is empty the deterministic validator
 * rejects any testimonial-shaped markup outright, because a model asked to
 * design a trustworthy local-business homepage will invent five-star reviews
 * unless something stops it.
 *
 * `lib/concepts/validateConceptHtml.ts` enforces the factual half of this
 * contract; `convex/validators.ts` mirrors the shape as a Convex validator and
 * proves the two stay aligned at `tsc --noEmit`.
 */

export type ConceptApprovedQuote = {
  author: string;
  text: string;
  rating?: number;
  /** Present when the quote was approved from the business's own website. */
  sourceUrl?: string;
  /**
   * Absent for a quote Layken typed himself. `website` and `facebook` mark a
   * quote the evidence reviewer admitted, and are what lets a re-analysis
   * replace that source's quotes without touching the hand-entered ones.
   */
  sourceKind?: "website" | "facebook";
};

export type ConceptApprovedContent = {
  tagline?: string;
  about?: string;
  services: Array<{ name: string; description?: string }>;
  serviceAreas: Array<string>;
  differentiators: Array<string>;
  sensitiveClaims: Array<string>;
  hours: Array<string>;
};

export type ConceptBrief = {
  /** Exact business name as it should appear on the page. */
  businessName: string;

  // --- Verified public identity (human-confirmed) ---
  /** Humanized category, e.g. "cleaning service", "general contractor". */
  category?: string;
  /** City/parish/region line safe to show, e.g. "Youngsville, LA". */
  locality?: string;
  /** Free-text service area supplied by Layken, e.g. "Lafayette Parish". */
  serviceArea?: string;
  /**
   * The single phone number the page may render. The validator rejects any
   * other phone-shaped string in the output, so this is a whitelist of one.
   */
  phone?: string;
  /**
   * Directions CTA target. Allowlisted as the one permitted external href.
   *
   * Built from the confirmed place ID — the one Places field Google's policy
   * exempts from its retention limits — not from a stored `googleMapsUri`.
   */
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

  /** Website facts explicitly approved from the source-backed harvest. */
  approvedWebsiteContent?: ConceptApprovedContent;

  /**
   * Facts the evidence reviewer admitted from the supervised Facebook Pack.
   *
   * This is the primary content source. Where it and `approvedWebsiteContent`
   * disagree, the prompt tells the model to follow this one: the pack is
   * material Layken chose from the Page the owner actually maintains, and the
   * website may be years stale. Genuine contradictions are resolved by the
   * reviewer before either reaches here.
   */
  approvedFacebookContent?: ConceptApprovedContent;

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

  /**
   * What the evidence reviewer said each selected photo shows, and where it
   * belongs on the page.
   *
   * Advisory only, and deliberately separate from `photoUrls`: the allowlist is
   * built from `photoUrls` alone, so a note about a URL can never widen what the
   * page may reference. It exists because a model given "hero: crew removing an
   * oak limb" writes a better page than one given a bare storage URL.
   */
  imageNotes?: Array<{
    url: string;
    role?: "hero" | "gallery" | "background" | "supporting";
    alt?: string;
    width?: number;
    height?: number;
    /**
     * Whether the generator sent this file to the model as pixels. False for a
     * format the model cannot read, an unreadable file, or one the request
     * budget cut off. The URL is still usable either way; the prompt just says
     * which photos the model is placing blind.
     */
    seen?: boolean;
  }>;

  /** The only testimonial text the page may render. Usually empty. */
  approvedQuotes: Array<ConceptApprovedQuote>;
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
  imageNotes?: Array<{
    url: string;
    role?: "hero" | "gallery" | "background" | "supporting";
    alt?: string;
    width?: number;
    height?: number;
    seen?: boolean;
  }>;
  approvedQuotes: Array<ConceptApprovedQuote>;
  approvedWebsiteContent?: ConceptApprovedContent;
  approvedFacebookContent?: ConceptApprovedContent;
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
    imageNotes:
      input.imageNotes && input.imageNotes.length > 0
        ? input.imageNotes
        : undefined,
    approvedQuotes: input.approvedQuotes,
    approvedWebsiteContent: input.approvedWebsiteContent,
    approvedFacebookContent: input.approvedFacebookContent,
  };
}
