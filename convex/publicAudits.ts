import { v } from "convex/values";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { rateLimiter } from "./rateLimiter";
import {
  aiLeadAnalysisValidator,
  pageSpeedDataValidator,
  publicAuditDocValidator,
  websiteDataValidator,
} from "./validators";

const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2/scrape";
const PAGESPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const publicAuditSourceValidator = v.union(
  v.literal("business_card_qr"),
  v.literal("manual"),
  v.literal("unknown"),
);

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Please enter a valid website URL.");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error("Please enter a public business website URL.");
  }
  url.hash = "";
  return url.toString();
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  if (host.includes(":")) {
    const normalized = host.replace(/^0+/, "");
    const firstSegment = normalized.split(":")[0] ?? "";
    const firstWord = Number.parseInt(firstSegment || "0", 16);
    const isIpv4Mapped = normalized.startsWith("::ffff:");
    const mappedIpv4 = isIpv4Mapped ? normalized.slice("::ffff:".length) : "";

    return (
      host === "::" ||
      (firstWord >= 0xfc00 && firstWord <= 0xfdff) ||
      (firstWord >= 0xfe80 && firstWord <= 0xfebf) ||
      (firstWord >= 0xff00 && firstWord <= 0xffff) ||
      (isIpv4Mapped && isBlockedHostname(mappedIpv4))
    );
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) {
    return false;
  }

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function businessNameFromUrl(url: string): string {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const name = hostname.split(".")[0] ?? hostname;
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFirecrawlApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error("FIRECRAWL_API_KEY is required");
  }
  return key;
}

function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)
    ? trimmed
    : undefined;
}

function normalizeTechnology(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  const known = ["wix", "squarespace", "wordpress", "godaddy", "weebly", "custom"];
  return known.includes(normalized) ? normalized : "custom";
}

async function runFirecrawlScrape(url: string) {
  const response = await fetch(FIRECRAWL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getFirecrawlApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [
        { type: "markdown" },
        { type: "screenshot" },
        {
          type: "json",
          prompt:
            "Extract primaryColor (hex), heroImageUrl (url), technology (wix/squarespace/wordpress/godaddy/weebly/custom), meta title, and meta description.",
          schema: {
            type: "object",
            properties: {
              primaryColor: { type: "string" },
              heroImageUrl: { type: "string" },
              technology: { type: "string" },
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Firecrawl scrape failed: ${response.status} ${details}`);
  }

  const json = (await response.json()) as {
    data?: {
      metadata?: { title?: string; description?: string };
      screenshot?: string | { url?: string };
      json?: { primaryColor?: string; heroImageUrl?: string; technology?: string };
    };
  };
  const data = json.data ?? {};
  const screenshotUrl =
    typeof data.screenshot === "string"
      ? data.screenshot
      : typeof data.screenshot?.url === "string"
        ? data.screenshot.url
        : undefined;

  return {
    primaryColor: sanitizeColor(data.json?.primaryColor),
    heroImageUrl:
      typeof data.json?.heroImageUrl === "string" && data.json.heroImageUrl.trim()
        ? data.json.heroImageUrl.trim()
        : undefined,
    technology: normalizeTechnology(data.json?.technology),
    metaTitle: data.metadata?.title?.trim() || undefined,
    metaDescription: data.metadata?.description?.trim() || undefined,
    screenshotUrl,
    hasHttps: url.startsWith("https://"),
    scrapedAt: Date.now(),
  };
}

async function runPageSpeed(url: string) {
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) params.set("key", apiKey);

  const response = await fetch(`${PAGESPEED_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`PageSpeed failed: ${response.status} ${details}`);
  }

  const json = (await response.json()) as {
    lighthouseResult?: {
      categories?: { performance?: { score?: number } };
      audits?: {
        "first-contentful-paint"?: { numericValue?: number };
        "largest-contentful-paint"?: { numericValue?: number };
        "cumulative-layout-shift"?: { numericValue?: number };
      };
    };
  };
  const rawScore = json.lighthouseResult?.categories?.performance?.score;
  return {
    performanceScore:
      typeof rawScore === "number"
        ? Math.round(rawScore <= 1 ? rawScore * 100 : Math.max(0, Math.min(100, rawScore)))
        : 0,
    fcp: json.lighthouseResult?.audits?.["first-contentful-paint"]?.numericValue,
    lcp: json.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue,
    cls: json.lighthouseResult?.audits?.["cumulative-layout-shift"]?.numericValue,
    fetchedAt: Date.now(),
  };
}

function buildAnalysis(input: {
  normalizedUrl: string;
  websiteData?: Awaited<ReturnType<typeof runFirecrawlScrape>>;
  pageSpeedData?: Awaited<ReturnType<typeof runPageSpeed>>;
}) {
  const score = input.pageSpeedData?.performanceScore ?? 0;
  const technology = input.websiteData?.technology;
  const painPoints = [];
  if (score < 50) painPoints.push(`Mobile performance is critically low at ${score}/100.`);
  else if (score < 90) painPoints.push(`Mobile performance has room to improve at ${score}/100.`);
  if (technology && technology !== "custom") painPoints.push(`The site appears to run on ${technology}.`);
  if (input.websiteData?.hasHttps === false) painPoints.push("The site does not appear to use HTTPS.");
  if (!input.websiteData?.metaDescription) painPoints.push("The homepage is missing a clear meta description.");

  return {
    fitScore: Math.max(1, Math.min(10, Math.round((100 - score) / 12) + (technology && technology !== "custom" ? 2 : 0))),
    businessDescription: `${businessNameFromUrl(input.normalizedUrl)} may benefit from a faster, conversion-focused website refresh.`,
    painPoints: painPoints.length ? painPoints.slice(0, 5) : ["The site has a foundation worth reviewing for speed, trust, and lead capture."],
    sellingPoints: [
      "Custom mobile-first redesign",
      "Fast hosting and technical upkeep included",
      "Clear calls, forms, and service pages built to capture leads",
    ],
    outreachAngle: "Lead with a simple speed and lead-capture review, then offer a $0 down replacement path.",
    analyzedAt: Date.now(),
  };
}

export const submit = mutation({
  args: {
    url: v.string(),
    source: v.optional(publicAuditSourceValidator),
  },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const normalizedUrl = normalizeUrl(args.url);
    const [{ ok: hostOk }, { ok: globalOk }] = await Promise.all([
      rateLimiter.limit(ctx, "publicAuditSubmit", {
      key: new URL(normalizedUrl).hostname,
      }),
      rateLimiter.limit(ctx, "publicAuditSubmit", {
        key: "global",
      }),
    ]);
    if (!hostOk || !globalOk) {
      throw new Error("Too many audit requests. Please try again in a minute.");
    }

    const now = Date.now();
    const token = crypto.randomUUID();
    const prospectId = await ctx.db.insert("prospects", {
      sessionId: crypto.randomUUID(),
      resumeToken: crypto.randomUUID(),
      details: {
        contactName: "",
        contactEmail: "",
        companyName: businessNameFromUrl(normalizedUrl),
        phone: "",
        currentWebsite: normalizedUrl,
        businessDescription: "",
        prospectNotes: "Submitted from public QR audit page.",
        myNotes: `Source: ${args.source ?? "public_audit"}\nPublic audit token: ${token}`,
      },
      planGenerationInProgress: false,
      createdAt: now,
      updatedAt: now,
    });

    const auditId = await ctx.db.insert("public_audits", {
      token,
      submittedUrl: args.url.trim(),
      normalizedUrl,
      source: args.source,
      prospectId,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      prospectId,
      actor: "user",
      kind: "public_audit.submitted",
      payload: { auditId, token, normalizedUrl, source: args.source },
    });

    await ctx.scheduler.runAfter(0, internal.publicAudits.runAuditAction, { token });

    return { token };
  },
});

export const getByToken = query({
  args: { token: v.string() },
  returns: v.union(publicAuditDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("public_audits")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

export const recordView = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const audit = await ctx.db
      .query("public_audits")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!audit || audit.viewedAt) return null;

    await ctx.db.patch(audit._id, { viewedAt: Date.now(), updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      prospectId: audit.prospectId,
      actor: "user",
      kind: "public_audit.viewed",
      payload: { auditId: audit._id, token: args.token, normalizedUrl: audit.normalizedUrl },
    });
    return null;
  },
});

export const markRunning = internalMutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const audit = await ctx.db
      .query("public_audits")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!audit) return null;
    await ctx.db.patch(audit._id, { status: "running", updatedAt: Date.now() });
    return null;
  },
});

export const saveResult = internalMutation({
  args: {
    token: v.string(),
    websiteData: websiteDataValidator,
    pageSpeedData: pageSpeedDataValidator,
    aiAnalysis: aiLeadAnalysisValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const audit = await ctx.db
      .query("public_audits")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!audit) return null;
    await ctx.db.patch(audit._id, {
      status: "ready",
      websiteData: args.websiteData,
      pageSpeedData: args.pageSpeedData,
      aiAnalysis: args.aiAnalysis,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      prospectId: audit.prospectId,
      actor: "system",
      kind: "public_audit.ready",
      payload: { auditId: audit._id, token: args.token, score: args.pageSpeedData.performanceScore },
    });
    return null;
  },
});

export const saveFailure = internalMutation({
  args: { token: v.string(), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const audit = await ctx.db
      .query("public_audits")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!audit) return null;
    await ctx.db.patch(audit._id, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.activityLog.logActivity, {
      prospectId: audit.prospectId,
      actor: "system",
      kind: "public_audit.failed",
      payload: { auditId: audit._id, token: args.token, error: args.error },
    });
    return null;
  },
});

export const runAuditAction = internalAction({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const audit = await ctx.runQuery(api.publicAudits.getByToken, { token: args.token });
    if (!audit || audit.status === "ready" || audit.status === "running") return null;

    await ctx.runMutation(internal.publicAudits.markRunning, { token: args.token });
    try {
      const [websiteData, pageSpeedData] = await Promise.all([
        runFirecrawlScrape(audit.normalizedUrl),
        runPageSpeed(audit.normalizedUrl),
      ]);
      const aiAnalysis = buildAnalysis({ normalizedUrl: audit.normalizedUrl, websiteData, pageSpeedData });
      await ctx.runMutation(internal.publicAudits.saveResult, {
        token: args.token,
        websiteData,
        pageSpeedData,
        aiAnalysis,
      });
    } catch (error) {
      await ctx.runMutation(internal.publicAudits.saveFailure, {
        token: args.token,
        error: error instanceof Error ? error.message : "Audit failed",
      });
    }
    return null;
  },
});
