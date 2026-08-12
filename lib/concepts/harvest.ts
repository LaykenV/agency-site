/**
 * Structured harvesting of a prospect's existing website.
 *
 * Everything here is pure. The Convex action in `convex/concepts/harvest.ts`
 * does the network work; this module decides which pages are worth asking for,
 * what a model's structured answer is allowed to become, and what a human is
 * shown before any of it reaches a generation prompt.
 *
 * Three rules shape the whole file:
 *
 * 1. **Bounded.** Map at most 40 URLs, scrape at most six pages, keep at most
 *    60 factual and 12 image candidates. The snapshot lives inside one concept
 *    document, so it has to stay far below Convex's 1 MiB limit.
 * 2. **Source-backed.** A factual candidate without an evidence excerpt is
 *    discarded rather than shown. Asking Layken to approve a claim he cannot
 *    check against the page it came from would make the review theatre.
 * 3. **Candidates, not conclusions.** Nothing here approves anything. A public
 *    website is evidence that a business says something, not proof it may be
 *    reused, so every item is labelled found-on-website and waits for a human.
 *
 * See `docs/plans/outreach-preview-engine.md` § Structured content harvesting
 * plan for the research this implements.
 */

import type { ConceptApprovedQuote, ConceptApprovedContent } from "./brief";
import { stableHash } from "./stableHash";

// --- Bounds ---------------------------------------------------------------

export const HARVEST_MAX_MAP_URLS = 40;
/** Homepage plus at most five supporting pages. */
export const HARVEST_MAX_PAGES = 6;
export const HARVEST_MAX_CANDIDATES = 60;
export const HARVEST_MAX_IMAGE_CANDIDATES = 12;
export const HARVEST_VALUE_MAX = 500;
export const HARVEST_EVIDENCE_MAX = 400;
export const HARVEST_ABOUT_MAX = 1200;

// --- Types ----------------------------------------------------------------

export type HarvestPageType =
  | "home"
  | "services"
  | "about"
  | "gallery"
  | "contact"
  | "faq"
  | "other";

export type HarvestCandidateKind =
  | "tagline"
  | "about"
  | "service"
  | "serviceArea"
  | "differentiator"
  | "sensitiveClaim"
  | "phone"
  | "hours"
  | "quote";

/**
 * `sensitive` means the item asserts something a business can be held to —
 * a licence, a guarantee, a price, a span of years — or reproduces a customer's
 * words. Those are approved one at a time and are never swept up by a bulk
 * action.
 */
export type HarvestRisk = "standard" | "sensitive";

export type HarvestCandidate = {
  id: string;
  kind: HarvestCandidateKind;
  value: string;
  /** Secondary text: a service's description, or a quote's attribution. */
  detail?: string;
  evidence: string;
  sourceUrl: string;
  risk: HarvestRisk;
};

export type HarvestImageCandidate = {
  id: string;
  remoteUrl: string;
  sourceUrl: string;
  roleHint: "logo" | "photo";
  alt?: string;
};

export type MapResult = { url: string; title?: string; description?: string };

export type SelectedPage = {
  url: string;
  title?: string;
  pageType: HarvestPageType;
};

/**
 * One page's structured answer, as returned by the extraction schema.
 *
 * Every field is optional and untrusted. `rawImageUrls` and `brandingLogoUrl`
 * are the exception: they come from Firecrawl's own image and branding results
 * rather than from the model, which is what makes them usable as the allowlist
 * that stops a structured extractor from inventing a remote asset.
 */
export type PageExtraction = {
  sourceUrl: string;
  pageType: HarvestPageType;
  /**
   * The page text Firecrawl actually returned.
   *
   * This is transient verification material, not persisted on the concept. A
   * structured extraction is still model output; candidates only survive when
   * their value and evidence can be found in this source text.
   */
  sourceText?: string;
  taglines?: Array<string>;
  aboutSections?: Array<string>;
  services?: Array<{ name?: string; description?: string; evidence?: string }>;
  serviceAreas?: Array<{ value?: string; evidence?: string }>;
  differentiators?: Array<{ value?: string; evidence?: string }>;
  sensitiveClaims?: Array<{
    value?: string;
    type?: string;
    evidence?: string;
  }>;
  phones?: Array<{ value?: string; evidence?: string }>;
  hours?: Array<{ value?: string; evidence?: string }>;
  socialLinks?: Array<{ platform?: string; url?: string }>;
  quotes?: Array<{
    text?: string;
    author?: string;
    rating?: number;
    evidence?: string;
  }>;
  imageSelections?: Array<{ url?: string; roleHint?: string; alt?: string }>;
  /** Firecrawl's raw `images` result for this page. */
  rawImageUrls?: Array<string>;
  /** Firecrawl's homepage `branding` logo, if it found one. */
  brandingLogoUrl?: string;
};

export type HarvestSnapshot = {
  candidates: Array<HarvestCandidate>;
  imageCandidates: Array<HarvestImageCandidate>;
  warnings: Array<string>;
};

export type ApprovedHarvestSelection = {
  candidateIds: Array<string>;
  content: ConceptApprovedContent;
  websiteQuotes: Array<ConceptApprovedQuote>;
};

/** Phone candidates change the CTA and therefore stay in the editable brief. */
export function isHarvestCandidateApprovable(
  candidate: Pick<HarvestCandidate, "kind" | "detail">,
): boolean {
  if (candidate.kind === "phone") return false;
  // A testimonial without visible attribution cannot become an approved quote.
  if (candidate.kind === "quote" && !candidate.detail?.trim()) return false;
  return true;
}

/**
 * Convert an explicitly selected subset into the only website content the
 * generation prompt may see. Unknown IDs and non-approvable candidates are
 * ignored here and rejected at the Convex mutation boundary.
 */
export function buildApprovedHarvestSelection(input: {
  candidates: Array<HarvestCandidate>;
  selectedIds: Array<string>;
}): ApprovedHarvestSelection {
  const requested = new Set(input.selectedIds);
  const selected = input.candidates.filter(
    (candidate) =>
      requested.has(candidate.id) && isHarvestCandidateApprovable(candidate),
  );

  const first = (kind: HarvestCandidateKind) =>
    selected.find((candidate) => candidate.kind === kind)?.value;
  const values = (kind: HarvestCandidateKind) =>
    selected
      .filter((candidate) => candidate.kind === kind)
      .map((candidate) => candidate.value);

  return {
    candidateIds: selected.map((candidate) => candidate.id),
    content: {
      tagline: first("tagline"),
      about:
        values("about").join("\n\n").slice(0, HARVEST_ABOUT_MAX) || undefined,
      services: selected
        .filter((candidate) => candidate.kind === "service")
        .map((candidate) => ({
          name: candidate.value,
          description: candidate.detail,
        })),
      serviceAreas: values("serviceArea"),
      differentiators: values("differentiator"),
      sensitiveClaims: values("sensitiveClaim"),
      hours: values("hours"),
    },
    websiteQuotes: selected
      .filter(
        (candidate) => candidate.kind === "quote" && candidate.detail?.trim(),
      )
      .map((candidate) => ({
        text: candidate.value,
        author: candidate.detail!.trim(),
        sourceUrl: candidate.sourceUrl,
        sourceKind: "website" as const,
      })),
  };
}

const HARVEST_MAX_ITEMS_PER_EXTRACTED_FIELD = HARVEST_MAX_CANDIDATES;

function recordOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractedStrings(value: unknown): Array<string> {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, HARVEST_MAX_ITEMS_PER_EXTRACTED_FIELD)
    .filter((entry): entry is string => typeof entry === "string");
}

function extractedObjects(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, HARVEST_MAX_ITEMS_PER_EXTRACTED_FIELD)
    .map(recordOf)
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function extractedString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

/**
 * Runtime boundary for Firecrawl's model-produced JSON.
 *
 * A TypeScript assertion does not validate a remote response. This parser
 * admits only the arrays, objects, strings, and number the normalizer expects,
 * and caps every array before any downstream loop sees it.
 */
export function parsePageExtraction(input: {
  sourceUrl: string;
  pageType: HarvestPageType;
  json: unknown;
  sourceText?: string;
  rawImageUrls?: Array<string>;
  brandingLogoUrl?: string;
}): PageExtraction {
  const json = recordOf(input.json) ?? {};
  const pairArray = (key: string) =>
    extractedObjects(json[key]).map((record) => ({
      value: extractedString(record, "value"),
      evidence: extractedString(record, "evidence"),
    }));

  return {
    sourceUrl: input.sourceUrl,
    pageType: input.pageType,
    sourceText:
      typeof input.sourceText === "string"
        ? input.sourceText.slice(0, 250_000)
        : undefined,
    taglines: extractedStrings(json.taglines),
    aboutSections: extractedStrings(json.aboutSections),
    services: extractedObjects(json.services).map((record) => ({
      name: extractedString(record, "name"),
      description: extractedString(record, "description"),
      evidence: extractedString(record, "evidence"),
    })),
    serviceAreas: pairArray("serviceAreas"),
    differentiators: pairArray("differentiators"),
    sensitiveClaims: extractedObjects(json.sensitiveClaims).map((record) => ({
      value: extractedString(record, "value"),
      type: extractedString(record, "type"),
      evidence: extractedString(record, "evidence"),
    })),
    phones: pairArray("phones"),
    hours: pairArray("hours"),
    socialLinks: extractedObjects(json.socialLinks).map((record) => ({
      platform: extractedString(record, "platform"),
      url: extractedString(record, "url"),
    })),
    quotes: extractedObjects(json.quotes).map((record) => ({
      text: extractedString(record, "text"),
      author: extractedString(record, "author"),
      rating: typeof record.rating === "number" ? record.rating : undefined,
      evidence: extractedString(record, "evidence"),
    })),
    imageSelections: extractedObjects(json.imageSelections).map((record) => ({
      url: extractedString(record, "url"),
      roleHint: extractedString(record, "roleHint"),
      alt: extractedString(record, "alt"),
    })),
    rawImageUrls: (input.rawImageUrls ?? []).slice(0, 200),
    brandingLogoUrl: input.brandingLogoUrl,
  };
}

// --- Text normalization ---------------------------------------------------

/** Collapse whitespace and strip the markdown a scrape leaves behind. */
export function normalizeHarvestText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_`#>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The comparison form used for deduplication and conflict detection. */
export function normalizeForMatch(value: string): string {
  return normalizeHarvestText(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case-insensitive exact copy check after removing scrape markup/spacing. */
export function sourceTextContains(sourceText: string, value: string): boolean {
  const source = normalizeHarvestText(sourceText).toLocaleLowerCase();
  const needle = normalizeHarvestText(value).toLocaleLowerCase();
  return Boolean(needle) && source.includes(needle);
}

/** Digits only, so `(337) 384-2911` and `+1 337 384 2911` compare equal. */
export function normalizePhoneForMatch(value: string): string {
  const digits = value.replace(/\D+/g, "");
  return digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
}

/** Deterministic across reruns of the same site: kind, value, and page. */
export function harvestCandidateId(input: {
  kind: string;
  value: string;
  sourceUrl: string;
}): string {
  return stableHash(
    `${input.kind} ${normalizeForMatch(input.value)} ${input.sourceUrl}`,
  );
}

// --- Sensitive-claim classification ---------------------------------------

/**
 * Claims a business can be held to, and that Layken therefore approves one at
 * a time.
 *
 * Applied to every candidate regardless of which bucket the extractor put it
 * in. A model that files "Licensed and insured since 1998" under `services`
 * must not be able to launder it past the individual-approval rule.
 */
const SENSITIVE_PATTERNS: Array<RegExp> = [
  /\b(licen[sc]ed|licen[sc]e|bonded|insured|insurance|certified|certification|accredited|registered)\b/i,
  /\b(award|awarded|winner|winning|best of|top rated|#\s?1|number one)\b/i,
  /\b(guarantee|guaranteed|warranty|warrantied|satisfaction guaranteed)\b/i,
  /\b(\d+\+?\s*(years?|yrs?)\b|since\s+(18|19|20)\d{2}\b)/i,
  /(\$\s?\d|\b\d+\s*(dollars|usd)\b|\bfinancing\b|\bpayment plans?\b|\bno interest\b)/i,
  /\b\d+(\.\d+)?\s*%/,
  /\b(24\s*\/\s*7|24-7|24 hours a day|round[- ]the[- ]clock|emergency service|emergency availability)\b/i,
  /\b(\d[\d,]{2,}\+?\s*(customers|clients|homes|jobs|projects|installs))\b/i,
];

export function classifyHarvestRisk(
  kind: HarvestCandidateKind,
  value: string,
  detail?: string,
): HarvestRisk {
  if (kind === "quote" || kind === "sensitiveClaim") return "sensitive";
  const haystack = `${value} ${detail ?? ""}`;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(haystack))
    ? "sensitive"
    : "standard";
}

// --- URL selection --------------------------------------------------------

/**
 * Paths that cost a scrape and return nothing a homepage concept can use.
 *
 * Blog posts are excluded as a class rather than individually: a business with
 * 200 posts would otherwise fill all six slots with the six Firecrawl happened
 * to return first.
 */
const EXCLUDED_PATH_PATTERNS: Array<RegExp> = [
  /\/(login|signin|sign-in|register|account|my-account|dashboard|admin)(\/|$)/i,
  /\/(cart|checkout|basket|order|payment)(\/|$)/i,
  /\/(search|tag|tags|category|categories|author|archive|archives)(\/|$)/i,
  /\/(privacy|terms|tos|legal|accessibility|sitemap|disclaimer|cookie)/i,
  /\/(feed|rss|atom|amp|wp-json|wp-admin|wp-content)(\/|$)/i,
  /\/(events?|calendar|book(ing)?-online)(\/|$)/i,
  /\/(blog|news|posts?|articles?)\/[^/]+/i,
  /\/\d{4}\/\d{2}\//,
];

const PAGE_TYPE_RULES: Array<{ type: HarvestPageType; pattern: RegExp }> = [
  { type: "services", pattern: /(service|product|what-we-do|offerings|menu)/i },
  {
    type: "about",
    pattern: /(about|our-story|story|team|staff|company|who-we-are)/i,
  },
  {
    type: "gallery",
    pattern: /(gallery|portfolio|project|work|photos|showcase)/i,
  },
  {
    type: "contact",
    pattern: /(contact|location|areas?-served|service-area|coverage)/i,
  },
  { type: "faq", pattern: /(faq|questions|process|how-it-works)/i },
];

/** Selection order. Lower sorts first; the homepage bypasses this entirely. */
const PAGE_TYPE_PRIORITY: Record<HarvestPageType, number> = {
  home: 0,
  services: 1,
  about: 2,
  gallery: 3,
  contact: 4,
  faq: 5,
  other: 6,
};

/**
 * Drop the query string and fragment, normalize the host, and strip a trailing
 * slash so `/services`, `/services/`, and `/services?ref=nav` are one page.
 */
export function canonicalizeHarvestUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  url.hash = "";
  url.search = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
}

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/** `www` and the bare hostname are the only cross-host equivalence allowed. */
export function isSameHarvestHost(left: string, right: string): boolean {
  const leftUrl = canonicalizeHarvestUrl(left);
  const rightUrl = canonicalizeHarvestUrl(right);
  if (!leftUrl || !rightUrl) return false;
  return (
    bareHost(new URL(leftUrl).hostname) === bareHost(new URL(rightUrl).hostname)
  );
}

function pageTypeFor(url: string, title?: string): HarvestPageType {
  const path = new URL(url).pathname;
  if (path === "/" || path === "") return "home";

  const haystack = `${path} ${title ?? ""}`;
  for (const rule of PAGE_TYPE_RULES) {
    if (rule.pattern.test(haystack)) return rule.type;
  }
  return "other";
}

/**
 * Choose the pages a human would have opened.
 *
 * The verified homepage is always included, then at most five supporting pages
 * ordered by what they are likely to contain. Ties break on path depth and then
 * on whether the business name appears in the title, so the choice is
 * deterministic and a rerun selects the same set.
 */
export function selectHarvestPages(input: {
  siteUrl: string;
  mapResults: Array<MapResult>;
  businessName: string;
}): { pages: Array<SelectedPage>; warnings: Array<string> } {
  const warnings: Array<string> = [];

  const home = canonicalizeHarvestUrl(input.siteUrl);
  if (!home) {
    return { pages: [], warnings: ["The verified website URL is not usable."] };
  }

  const siteHost = bareHost(new URL(home).hostname);
  const nameNeedle = normalizeForMatch(input.businessName);

  const seen = new Set<string>([home]);
  const scored: Array<SelectedPage & { depth: number; named: boolean }> = [];
  let offSite = 0;
  let excluded = 0;

  for (const result of input.mapResults.slice(0, HARVEST_MAX_MAP_URLS)) {
    const url = canonicalizeHarvestUrl(result.url);
    if (!url || seen.has(url)) continue;

    const parsed = new URL(url);
    // `includeSubdomains: false` is requested of Firecrawl, but a map response
    // is still input we did not write. Never leave the verified host.
    if (bareHost(parsed.hostname) !== siteHost) {
      offSite += 1;
      continue;
    }
    if (
      /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|mp4|mp3)$/i.test(
        parsed.pathname,
      )
    ) {
      excluded += 1;
      continue;
    }
    if (
      EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(parsed.pathname))
    ) {
      excluded += 1;
      continue;
    }

    seen.add(url);
    const title = normalizeHarvestText(result.title) || undefined;
    scored.push({
      url,
      title,
      pageType: pageTypeFor(url, `${title ?? ""} ${result.description ?? ""}`),
      depth: parsed.pathname.split("/").filter(Boolean).length,
      named:
        nameNeedle.length > 0 &&
        normalizeForMatch(
          `${title ?? ""} ${result.description ?? ""}`,
        ).includes(nameNeedle),
    });
  }

  scored.sort((a, b) => {
    const byType =
      PAGE_TYPE_PRIORITY[a.pageType] - PAGE_TYPE_PRIORITY[b.pageType];
    if (byType !== 0) return byType;
    if (a.depth !== b.depth) return a.depth - b.depth;
    if (a.named !== b.named) return a.named ? -1 : 1;
    return a.url.localeCompare(b.url);
  });

  const pages: Array<SelectedPage> = [
    { url: home, pageType: "home" },
    ...scored
      .slice(0, HARVEST_MAX_PAGES - 1)
      .map(({ url, title, pageType }) => ({
        url,
        title,
        pageType,
      })),
  ];

  if (offSite > 0) {
    warnings.push(`Ignored ${offSite} URL(s) outside ${siteHost}.`);
  }
  if (excluded > 0) {
    warnings.push(
      `Skipped ${excluded} URL(s) with no useful business content.`,
    );
  }
  if (pages.length === 1) {
    warnings.push(
      "Only the homepage was usable. Services and about copy may be missing.",
    );
  }

  return { pages, warnings };
}

// --- Snapshot assembly ----------------------------------------------------

/**
 * Kind order for the candidate cap.
 *
 * When a site produces more than 60 candidates, what survives should be what
 * builds a page: services and about copy first, trivia last.
 */
const KIND_PRIORITY: Record<HarvestCandidateKind, number> = {
  service: 0,
  about: 1,
  tagline: 2,
  serviceArea: 3,
  differentiator: 4,
  phone: 5,
  hours: 6,
  sensitiveClaim: 7,
  quote: 8,
};

type DraftCandidate = {
  kind: HarvestCandidateKind;
  value: string;
  detail?: string;
  evidence?: string;
  sourceUrl: string;
  /** Copy that is its own evidence: a tagline, an about paragraph, a quote. */
  selfEvident?: boolean;
};

function capValue(kind: HarvestCandidateKind, value: string): string {
  const limit = kind === "about" ? HARVEST_ABOUT_MAX : HARVEST_VALUE_MAX;
  return value.slice(0, limit);
}

function draftsFor(page: PageExtraction): Array<DraftCandidate> {
  const drafts: Array<DraftCandidate> = [];
  const at = page.sourceUrl;

  for (const tagline of page.taglines ?? []) {
    drafts.push({
      kind: "tagline",
      value: tagline,
      sourceUrl: at,
      selfEvident: true,
    });
  }
  for (const about of page.aboutSections ?? []) {
    drafts.push({
      kind: "about",
      value: about,
      sourceUrl: at,
      selfEvident: true,
    });
  }
  for (const service of page.services ?? []) {
    drafts.push({
      kind: "service",
      value: service.name ?? "",
      detail: service.description,
      evidence: service.evidence,
      sourceUrl: at,
    });
  }
  for (const area of page.serviceAreas ?? []) {
    drafts.push({
      kind: "serviceArea",
      value: area.value ?? "",
      evidence: area.evidence,
      sourceUrl: at,
    });
  }
  for (const item of page.differentiators ?? []) {
    drafts.push({
      kind: "differentiator",
      value: item.value ?? "",
      evidence: item.evidence,
      sourceUrl: at,
    });
  }
  for (const claim of page.sensitiveClaims ?? []) {
    drafts.push({
      kind: "sensitiveClaim",
      value: claim.value ?? "",
      detail: claim.type,
      evidence: claim.evidence,
      sourceUrl: at,
    });
  }
  for (const phone of page.phones ?? []) {
    drafts.push({
      kind: "phone",
      value: phone.value ?? "",
      evidence: phone.evidence,
      sourceUrl: at,
    });
  }
  for (const hours of page.hours ?? []) {
    drafts.push({
      kind: "hours",
      value: hours.value ?? "",
      evidence: hours.evidence,
      sourceUrl: at,
    });
  }
  for (const quote of page.quotes ?? []) {
    drafts.push({
      kind: "quote",
      value: quote.text ?? "",
      detail: quote.author,
      evidence: quote.evidence,
      sourceUrl: at,
      selfEvident: true,
    });
  }

  return drafts;
}

/**
 * Turn per-page extraction output into the reviewable snapshot.
 *
 * The caller supplies the scraped page URL on each `PageExtraction`; a model's
 * own claim about where something came from is never trusted, because the whole
 * value of the evidence column is that it points at a page Layken can open.
 */
export function buildHarvestSnapshot(input: {
  businessName: string;
  submittedPhone?: string;
  pages: Array<PageExtraction>;
}): HarvestSnapshot {
  const warnings: Array<string> = [];
  const byKey = new Map<string, HarvestCandidate>();
  let discardedForEvidence = 0;
  let discardedOutsideSource = 0;

  for (const page of input.pages) {
    const sourceText = page.sourceText ?? "";
    for (const draft of draftsFor(page)) {
      const value = capValue(draft.kind, normalizeHarvestText(draft.value));
      if (!value) continue;

      // Firecrawl's structured JSON is model-produced. Requiring the extracted
      // value to occur in the Markdown from the same response turns the model
      // into a selector, not an authority that can create a business claim.
      if (!sourceTextContains(sourceText, value)) {
        discardedOutsideSource += 1;
        continue;
      }

      const evidence = normalizeHarvestText(draft.evidence).slice(
        0,
        HARVEST_EVIDENCE_MAX,
      );
      const resolvedEvidence = evidence
        ? sourceTextContains(sourceText, evidence)
          ? evidence
          : ""
        : draft.selfEvident
          ? value.slice(0, HARVEST_EVIDENCE_MAX)
          : "";

      // A claim Layken cannot check against its own page is worse than a
      // missing one: approving it would be a guess wearing a checkbox.
      if (!resolvedEvidence) {
        discardedForEvidence += 1;
        continue;
      }

      let detail = draft.detail
        ? capValue(draft.kind, normalizeHarvestText(draft.detail)) || undefined
        : undefined;
      // Service descriptions and testimonial attributions reach the page too.
      // If the source does not contain them, omit them; an unattributed quote is
      // then rejected by the common evidence gate.
      if (
        detail &&
        (draft.kind === "service" || draft.kind === "quote") &&
        !sourceTextContains(sourceText, detail)
      ) {
        detail = undefined;
      }
      const risk = classifyHarvestRisk(draft.kind, value, detail);

      // Sensitive text filed under a standard kind is re-filed, not trusted.
      const kind: HarvestCandidateKind =
        risk === "sensitive" &&
        draft.kind !== "quote" &&
        draft.kind !== "phone" &&
        draft.kind !== "hours"
          ? "sensitiveClaim"
          : draft.kind;

      const key = `${kind} ${normalizeForMatch(value)}`;
      const existing = byKey.get(key);
      if (existing) {
        // Evidence and source are one provenance record. If the later page has
        // the better excerpt, move its URL and deterministic ID with it.
        if (resolvedEvidence.length > existing.evidence.length) {
          existing.evidence = resolvedEvidence;
          existing.sourceUrl = draft.sourceUrl;
          existing.detail = detail;
          existing.id = harvestCandidateId({
            kind,
            value: existing.value,
            sourceUrl: draft.sourceUrl,
          });
        } else if (existing.sourceUrl === draft.sourceUrl && !existing.detail) {
          existing.detail = detail;
        }
        continue;
      }

      byKey.set(key, {
        id: harvestCandidateId({ kind, value, sourceUrl: draft.sourceUrl }),
        kind,
        value,
        detail,
        evidence: resolvedEvidence,
        sourceUrl: draft.sourceUrl,
        risk,
      });
    }
  }

  const candidates = [...byKey.values()].sort(
    (a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind],
  );

  if (candidates.length > HARVEST_MAX_CANDIDATES) {
    warnings.push(
      `Kept the ${HARVEST_MAX_CANDIDATES} most useful of ${candidates.length} candidates.`,
    );
  }
  if (discardedForEvidence > 0) {
    warnings.push(
      `Discarded ${discardedForEvidence} candidate(s) with no source excerpt.`,
    );
  }
  if (discardedOutsideSource > 0) {
    warnings.push(
      `Discarded ${discardedOutsideSource} extracted candidate(s) that could not be found in the page text.`,
    );
  }

  const kept = candidates.slice(0, HARVEST_MAX_CANDIDATES);
  warnings.push(
    ...detectHarvestConflicts({
      candidates: kept,
      submittedPhone: input.submittedPhone,
    }),
  );

  return {
    candidates: kept,
    imageCandidates: collectImageCandidates(input.pages),
    warnings,
  };
}

/**
 * Only images Firecrawl actually saw on the page become candidates.
 *
 * The model selects from the raw image list; it does not get to name a URL.
 * Without this an extractor could point the import action at any host it liked.
 */
function collectImageCandidates(
  pages: Array<PageExtraction>,
): Array<HarvestImageCandidate> {
  const byAsset = new Map<string, HarvestImageCandidate>();

  const parsedImage = (value: string): URL | null => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") return null;
      let visible = `${url.pathname}${url.search}`;
      try {
        visible = decodeURIComponent(visible);
      } catch {
        // A malformed escape is still a valid URL, but there is no reason to
        // decode it for the extension filter.
      }
      if (/\.(?:svg|gif|ico|avif)(?:$|[?&#])/i.test(visible)) return null;
      return url;
    } catch {
      return null;
    }
  };

  const assetKey = (url: URL): string => {
    let path = url.pathname.replace(/\/opt\//g, "/");
    path = path.replace(/-\d+w(?=\.(?:jpe?g|png|webp)$)/i, "");
    // Builder transformation parameters identify a rendition, not a different
    // photograph. Keep parameters that may identify the underlying source.
    const params = new URLSearchParams(url.search);
    for (const key of ["w", "width", "h", "height", "q", "quality", "fit"]) {
      params.delete(key);
    }
    return `${url.hostname.toLowerCase()}${path}?${params.toString()}`;
  };

  const rawScore = (url: URL, page: PageExtraction): number => {
    const value = `${url.pathname}${url.search}`.toLowerCase();
    let score =
      page.pageType === "gallery" ? 80 : page.pageType === "home" ? 40 : 0;
    if (/logo|brand|wordmark/.test(value)) score += 60;
    if (/1920w|1600w|1280w|original|full/.test(value)) score += 20;
    if (
      /favicon|sprite|icon|badge|pixel|tracking|placeholder|404|template|pexels|unsplash|shutterstock/.test(
        value,
      )
    )
      score -= 200;
    return score;
  };

  const add = (input: {
    url?: string;
    page: PageExtraction;
    roleHint?: string;
    alt?: string;
  }) => {
    const remoteUrl = input.url?.trim();
    if (!remoteUrl) return;
    const parsed = parsedImage(remoteUrl);
    if (!parsed) return;
    const key = assetKey(parsed);
    if (byAsset.has(key) || byAsset.size >= HARVEST_MAX_IMAGE_CANDIDATES) {
      return;
    }
    const looksLikeLogo = /logo|brand|wordmark/i.test(parsed.pathname);
    byAsset.set(key, {
      id: harvestCandidateId({
        kind: "image",
        value: remoteUrl,
        sourceUrl: input.page.sourceUrl,
      }),
      remoteUrl,
      sourceUrl: input.page.sourceUrl,
      roleHint: input.roleHint === "logo" || looksLikeLogo ? "logo" : "photo",
      alt: normalizeHarvestText(input.alt).slice(0, 200) || undefined,
    });
  };

  for (const page of pages) {
    const allowed = new Set<string>(page.rawImageUrls ?? []);
    if (page.brandingLogoUrl) allowed.add(page.brandingLogoUrl);

    const selections = [
      ...(page.brandingLogoUrl
        ? [{ url: page.brandingLogoUrl, roleHint: "logo", alt: undefined }]
        : []),
      ...(page.imageSelections ?? []),
    ];

    for (const selection of selections) {
      const remoteUrl = selection.url?.trim();
      if (!remoteUrl || !allowed.has(remoteUrl)) continue;
      add({
        url: remoteUrl,
        page,
        roleHint: selection.roleHint,
        alt: selection.alt,
      });
    }
  }

  // Structured extraction is useful for labels, but it is not a reliable image
  // shortlist. Firecrawl's images format already returns the full observed URL
  // set, so fill the remaining bounded slots from that source-owned list and
  // let the downstream vision classifier reject stock art, icons, and junk.
  const fallbacks = pages
    .flatMap((page) =>
      (page.rawImageUrls ?? []).map((value, index) => ({
        value,
        page,
        index,
        parsed: parsedImage(value),
      })),
    )
    .filter(
      (item): item is typeof item & { parsed: URL } => item.parsed !== null,
    )
    .sort((left, right) => {
      const score =
        rawScore(right.parsed, right.page) - rawScore(left.parsed, left.page);
      if (score !== 0) return score;
      return left.index - right.index;
    });

  for (const fallback of fallbacks) {
    add({ url: fallback.value, page: fallback.page });
  }

  return [...byAsset.values()];
}

/**
 * Disagreements worth showing rather than silently resolving.
 *
 * A website phone that differs from the one Layken typed usually means he has
 * the owner's mobile and the site has the old office line — useful to know, and
 * not something an automatic rule should pick a winner for.
 */
export function detectHarvestConflicts(input: {
  candidates: Array<HarvestCandidate>;
  submittedPhone?: string;
}): Array<string> {
  const warnings: Array<string> = [];
  const submitted = input.submittedPhone
    ? normalizePhoneForMatch(input.submittedPhone)
    : "";

  const sitePhones = new Set(
    input.candidates
      .filter((candidate) => candidate.kind === "phone")
      .map((candidate) => normalizePhoneForMatch(candidate.value))
      .filter((digits) => digits.length >= 10),
  );

  if (submitted && sitePhones.size > 0 && !sitePhones.has(submitted)) {
    warnings.push(
      `The website lists ${[...sitePhones].length > 1 ? "phone numbers" : "a phone number"} that differ from the one on this concept. The concept phone wins unless you change it.`,
    );
  }
  if (sitePhones.size > 1) {
    warnings.push(
      "The website shows more than one phone number. Confirm which one the concept should use.",
    );
  }

  return warnings;
}

// --- Completeness ---------------------------------------------------------

export type CompletenessRequirement = "required" | "recommended" | "optional";

export type CompletenessRow = {
  key: string;
  label: string;
  requirement: CompletenessRequirement;
  met: boolean;
};

/**
 * What the concept still lacks.
 *
 * Advisory except for identity. A sparse honest page is a valid outcome — the
 * typographic structures exist precisely for businesses with three facts and no
 * photography — so nothing here blocks generation.
 */
export function harvestCompleteness(input: {
  placeMatchResolved: boolean;
  hasPhone: boolean;
  serviceCount: number;
  hasAbout: boolean;
  hasLogo: boolean;
  photoCount: number;
  approvedQuoteCount: number;
}): Array<CompletenessRow> {
  return [
    {
      key: "identity",
      label: "Identity",
      requirement: "required",
      met: input.placeMatchResolved,
    },
    {
      key: "phone",
      label: "Phone / CTA",
      requirement: "recommended",
      met: input.hasPhone,
    },
    {
      key: "services",
      label: "Services",
      requirement: "recommended",
      met: input.serviceCount > 0,
    },
    {
      key: "about",
      label: "About",
      requirement: "recommended",
      met: input.hasAbout,
    },
    { key: "logo", label: "Logo", requirement: "optional", met: input.hasLogo },
    {
      key: "photos",
      label: "Photos",
      requirement: "recommended",
      met: input.photoCount >= 3,
    },
    {
      key: "proof",
      label: "Proof",
      requirement: "optional",
      met: input.approvedQuoteCount > 0,
    },
  ];
}
