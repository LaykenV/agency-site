# Marketing Mini CMS — Implementation Plan

**Version:** 1.1
**Last Updated:** February 14, 2026
**Status:** Ready to build

---

## Overview

Automate lead generation for Acadiana Web Design. Today, you search Google Maps by hand, assess businesses one by one, and manually create prospects in the admin panel. This plan automates that workflow: search a city+industry combo, scrape Google listings and business websites in bulk, use AI to score and qualify leads, track the outreach pipeline, generate live demo preview pages, and send personalized mockup emails — all from a new `/admin/marketing` page.

### The Full Flow

1. **Search** — Admin enters city + industry on `/admin/marketing`. Google Places API finds businesses.
2. **Scrape** — Firecrawl analyzes each business's website. PageSpeed Insights API scores their speed.
3. **Analyze** — Groq AI scores each lead's fit and generates personalized pain points.
4. **Demo page** — `/demo/{token}` renders their data in a live preview (hero + review + CTA).
5. **Screenshot** — Firecrawl screenshots the demo page for email embedding.
6. **Email** — Teaser email with the demo screenshot + "See Your Website Preview" CTA linking to the demo page.
7. **Track** — When they visit the demo page, `demoViewedAt` is recorded — strong follow-up signal.
8. **Convert** — One-click "Promote to Prospect" creates a prospect pre-filled with scraped data, entering the normal happy path.

---

## Architecture: The Three-Table Sales Funnel

```
scraped_leads (marketing / top of funnel)
  │ Hundreds/thousands — automated discovery, unqualified
  │
  ▼ [Admin clicks "Convert to Prospect"]
prospects (sales / middle of funnel)
  │ Tens — human-vetted, actively being pursued
  │
  ▼ [Agreement + Payment]
projects (delivery / bottom of funnel)
    Single digits — paying clients with auth accounts
```

The "Convert to Prospect" action bridges marketing → sales by copying relevant scraped data into a new prospect row and marking the scraped lead as `converted`. This keeps the `prospects` table clean (only real prospects) and preserves scraped data for analytics.

---

## Pipeline Orchestration: Convex Workflow Component

The scraping pipeline uses the [`@convex-dev/workflow`](https://www.convex.dev/components/workflow) component for durable execution. Each lead's scrape/analyze/screenshot is its own workflow step, and the engine handles scheduling, retry, parallelism, and cancellation automatically.

**Why Workflow instead of manual action chaining:**
- **Avoids single-function timeout risk** — each step is its own invocation (Convex actions still have a 10-minute per-invocation limit)
- **`maxParallelism: 2`** — built-in, one config line, only 2 API calls in flight at once
- **Retry per step** — if Firecrawl fails for one lead, it retries just that call
- **Reactive status** — admin UI can query workflow progress in real-time
- **Cancellation** — admin can abort a running search with one click
- **Durable** — survives server restarts, can span days for follow-up emails

**Docs:** https://www.convex.dev/components/workflow
**GitHub:** https://github.com/get-convex/workflow

### Workflow Shape

```typescript
const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: 2, // Only 2 external API calls in flight at once
  },
});

export const marketingSearchWorkflow = workflow.define({
  args: { searchId: v.id("marketing_searches") },
  handler: async (step, { searchId }): Promise<void> => {
    // Step 1: Google Places search → writes leads to DB, returns IDs
    // createSearch already sets status to "searching" when it starts the workflow
    const leadIds = await step.runAction(
      internal.marketing.pipeline.executeSearch,
      { searchId },
      { retry: true },
    );

    // Step 2: Transition search status to "scraping"
    await step.runMutation(
      internal.marketing.search.updateSearchStatus,
      { searchId, status: "scraping" },
    );

    // Step 2b: Scrape each lead's website (Firecrawl + PageSpeed)
    // Fires off all leads, but maxParallelism: 2 queues them
    await Promise.all(
      leadIds.map((leadId) =>
        step.runAction(
          internal.marketing.pipeline.scrapeOneLead,
          { leadId },
          { retry: { maxAttempts: 2, initialBackoffMs: 3000 } },
        )
      )
    );

    // Step 3: Transition search status to "analyzing"
    await step.runMutation(
      internal.marketing.search.updateSearchStatus,
      { searchId, status: "analyzing" },
    );

    // Step 3b: AI analyze each lead (Groq)
    await Promise.all(
      leadIds.map((leadId) =>
        step.runAction(
          internal.marketing.pipeline.analyzeOneLead,
          { leadId },
          { retry: true },
        )
      )
    );

    // Step 4: Get qualified leads, screenshot their demo pages
    const qualifiedIds = await step.runQuery(
      internal.marketing.search.getQualifiedLeadIds,
      { searchId },
    );

    await Promise.all(
      qualifiedIds.map((leadId) =>
        step.runAction(
          internal.marketing.pipeline.screenshotDemoPage,
          { leadId },
          { retry: { maxAttempts: 2, initialBackoffMs: 3000 } },
        )
      )
    );

    // Step 5: Mark search complete (sets status to "completed")
    await step.runMutation(
      internal.marketing.search.completeSearch,
      { searchId },
    );
  },
});
```

### Journal Size Considerations

Workflow journals store inputs and return values of every step. For a search with 30 leads x 4 steps = 120 step results, return values must be kept small. Each step action returns minimal data (`"ok"` or `{ leadId, status: "error" }`). All real scraped data goes into the DB via mutations inside each action.

---

### Convex Best-Practice Guardrails

- Workflow steps call `internal.*` functions only (`step.runAction`, `step.runMutation`, `step.runQuery`) and client code never calls internals directly.
- Keep workflow step args/returns tiny: workflow journals are capped (1 MiB per function execution, 8 MiB per workflow execution), so store payloads in tables and pass IDs between steps.
- Keep concurrency explicit with `maxParallelism: 2` to protect vendor API quotas and avoid noisy retries.
- Every async call is awaited; no fire-and-forget calls inside queries, mutations, actions, or workflow handlers.
- Avoid unbounded scans in hot paths (`collect` on big tables); use indexed queries + pagination for lead lists and follow-ups.
- Add cleanup for completed/canceled workflow runs (`workflow.cleanup`) on a retention schedule.

Reference docs: [Convex Best Practices](https://docs.convex.dev/understanding/best-practices), [Convex Limits](https://docs.convex.dev/production/state/limits), [Workflow Component](https://github.com/get-convex/workflow), [Agents in Convex](https://docs.convex.dev/agents).

---

## External APIs (Doc-verified February 14, 2026)

### Google Places API (already have the key)

**Purpose:** Business discovery — find businesses by city + industry.

**Endpoints used:**
- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search): `POST https://places.googleapis.com/v1/places:searchText`
  - Required headers: `X-Goog-Api-Key` and `X-Goog-FieldMask`
  - Pagination rules: `pageSize` max is `20`, API returns up to `60` results total, use `pageToken` in the POST body, and keep all params identical when using a next-page token.
  - Field mask must include `nextPageToken` if you want pagination to continue.
- [Place Details](https://developers.google.com/maps/documentation/places/web-service/place-details): `GET https://places.googleapis.com/v1/places/{placeId}`
  - Used for reviews if not returned by text search
  - Field mask: `reviews`
- [Place Photos](https://developers.google.com/maps/documentation/places/web-service/place-photos): `GET https://places.googleapis.com/v1/{photoName}/media?maxHeightPx=400&key=API_KEY`
  - Resolves photo references to actual image URLs

**Pricing note:** Google Maps Platform pricing changed in March 2025. Do not hardcode unit prices or "monthly free credit" assumptions; calculate against current SKUs before rollout. See [Maps billing and pricing](https://developers.google.com/maps/billing-and-pricing/overview) and [Places usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing).

**Env var:** `GOOGLE_PLACES_API_KEY` (already exists)

### Firecrawl REST API (new)

**Purpose:** Website scraping — analyze each business's current website.

**Endpoint:** `POST https://api.firecrawl.dev/v2/scrape`

We use the Firecrawl REST API directly via `fetch()` inside Convex actions. We are NOT using the `convex-firecrawl-scrape` Convex component — that component is designed for interactive client-side scraping with reactive polling. Our use case is a backend batch pipeline where direct API calls are simpler.

**Request format:**
```json
{
  "url": "https://example.com",
  "formats": [
    { "type": "markdown" },
    { "type": "screenshot" },
    {
      "type": "json",
      "prompt": "Extract primaryColor, heroImageUrl, and technology.",
      "schema": {
        "type": "object",
        "properties": {
          "primaryColor": { "type": "string" },
          "heroImageUrl": { "type": "string" },
          "technology": { "type": "string" }
        }
      }
    }
  ]
}
```

**Headers:**
```
Authorization: Bearer FIRECRAWL_API_KEY
Content-Type: application/json
```

**Response includes:** typed format outputs (including screenshot + extracted JSON) and metadata.

**Also used for:** Screenshotting our own `/demo/{token}` pages with `formats: [{ "type": "screenshot" }]`.

**Docs:** https://docs.firecrawl.dev/api-reference/endpoint/scrape
**Cost:** Each scrape counts against your plan. 30 website scrapes + 30 demo screenshots = 60 scrapes per batch.

**Env var to add:** `FIRECRAWL_API_KEY` (from https://firecrawl.dev dashboard)

### PageSpeed Insights API (free)

**Purpose:** Score the speed of each business's current website.

**Endpoint:** `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={URL}&strategy=mobile&category=performance`

Can be called without an API key, but using `key={GOOGLE_API_KEY}` is recommended for stable quota. `strategy` defaults to desktop; set `strategy=mobile` explicitly for your use case.

**Docs:** https://developers.google.com/speed/docs/insights/v5/get-started

**Cost:** Generally free to call, but still quota-limited by Google API usage settings.

### Groq AI (already installed)

**Purpose:** Score lead fit, generate pain points, create business descriptions, determine outreach angles.

Uses the existing `@ai-sdk/groq` + `@convex-dev/agent` pattern from `convex/leadTriage.ts`.

**Docs:** https://docs.convex.dev/agents

**Env var:** Already configured.

### Convex AI Agent Notes

- Keep all agent inference calls in `internalAction`s (not queries/mutations) and orchestrate fanout/retries via workflow steps.
- Keep prompt versions explicit (`promptVersion`) and persist model metadata + raw output slice for debugging and replay.
- Reuse the existing configured component in `convex/convex.config.ts` (`app.use(agent)`), rather than introducing a second agent stack.
- For tasks that may exceed one invocation, use Agent + Workflow together (agent call per step, DB writes between steps).

---

## Phase 1: Schema & Data Layer

### New Tables in `convex/schema.ts`

#### `marketing_searches` — Tracks each search batch

```typescript
marketing_searches: defineTable({
  city: v.string(),
  state: v.string(),
  industry: v.string(),
  searchQuery: v.string(),           // "plumbers in Lafayette, LA"
  status: marketingSearchStatusValidator,
  totalFound: v.number(),
  totalScraped: v.number(),
  totalQualified: v.number(),
  workflowId: v.optional(v.string()), // Workflow component ID for status tracking
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_createdAt", ["createdAt"])
  .index("by_city_and_industry", ["city", "industry"]),
```

#### `scraped_leads` — Individual business leads with all scraped data

```typescript
scraped_leads: defineTable({
  searchId: v.id("marketing_searches"),
  placeId: v.string(),               // Top-level for indexing (Convex can't index nested fields)

  // Google Places data
  googleData: v.object({
    businessName: v.string(),
    formattedAddress: v.string(),
    phone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    googleMapsUrl: v.optional(v.string()),
    primaryType: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    topReview: v.optional(v.object({
      author: v.string(),
      text: v.string(),
      rating: v.number(),
    })),
  }),

  // Firecrawl website scrape data
  websiteData: v.optional(v.object({
    primaryColor: v.optional(v.string()),
    heroImageUrl: v.optional(v.string()),
    technology: v.optional(v.string()),      // "wix", "squarespace", "wordpress", "godaddy", "custom"
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    screenshotUrl: v.optional(v.string()),   // Firecrawl-hosted screenshot of THEIR current site
    hasHttps: v.optional(v.boolean()),
    scrapedAt: v.number(),
  })),

  // PageSpeed Insights data
  pageSpeedData: v.optional(v.object({
    performanceScore: v.number(),             // 0-100
    fcp: v.optional(v.number()),              // First Contentful Paint (ms)
    lcp: v.optional(v.number()),              // Largest Contentful Paint (ms)
    cls: v.optional(v.number()),              // Cumulative Layout Shift
    fetchedAt: v.number(),
  })),

  // AI analysis (Groq)
  aiAnalysis: v.optional(v.object({
    fitScore: v.number(),                     // 1-10
    businessDescription: v.string(),
    painPoints: v.array(v.string()),
    sellingPoints: v.array(v.string()),
    outreachAngle: v.string(),                // Personalized pitch angle
    analyzedAt: v.number(),
  })),

  // Pipeline status
  status: scrapedLeadStatusValidator,

  // Demo page (only generated for qualified leads)
  demoToken: v.optional(v.string()),            // UUID for public /demo/[token] route
  demoScreenshotUrl: v.optional(v.string()),    // Firecrawl screenshot of OUR demo page
  demoViewedAt: v.optional(v.number()),         // Tracked when prospect visits demo link

  // Outreach tracking
  contactEmail: v.optional(v.string()),         // Discovered or manually entered
  emailSentAt: v.optional(v.number()),
  calledAt: v.optional(v.number()),
  followUpAt: v.optional(v.number()),           // Next follow-up date
  convertedToProspectId: v.optional(v.id("prospects")),
  adminNotes: v.optional(v.string()),
  contactAttempts: v.number(),
  error: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_searchId", ["searchId"])
  .index("by_status", ["status"])
  .index("by_searchId_and_status", ["searchId", "status"])
  .index("by_searchId_and_placeId", ["searchId", "placeId"])  // Composite index for within-search deduplication
  .index("by_placeId", ["placeId"])
  .index("by_demoToken", ["demoToken"])
  .index("by_followUpAt", ["followUpAt"])
  .index("by_createdAt", ["createdAt"]),
```

### New Validators in `convex/validators.ts`

```typescript
export const marketingSearchStatusValidator = v.union(
  v.literal("searching"),
  v.literal("scraping"),
  v.literal("analyzing"),
  v.literal("completed"),
  v.literal("failed"),
);

export const scrapedLeadStatusValidator = v.union(
  v.literal("new"),              // Google Places found it, not yet scraped
  v.literal("scraping"),         // Firecrawl/PageSpeed in progress
  v.literal("scraped"),          // Website data collected, awaiting AI
  v.literal("analyzing"),        // AI analysis in progress
  v.literal("qualified"),        // Fit score >= 6
  v.literal("disqualified"),     // Fit score < 6 or manual disqualification
  v.literal("contacted"),        // Called or emailed
  v.literal("follow_up"),        // Scheduled for follow-up
  v.literal("responded"),        // They replied
  v.literal("converted"),        // Became a prospect
  v.literal("not_interested"),   // Declined
  v.literal("error"),            // Processing failed
);

export const googleDataValidator = v.object({
  businessName: v.string(),
  formattedAddress: v.string(),
  phone: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  googleMapsUrl: v.optional(v.string()),
  primaryType: v.optional(v.string()),
  photoUrl: v.optional(v.string()),
  topReview: v.optional(v.object({
    author: v.string(),
    text: v.string(),
    rating: v.number(),
  })),
});

export const websiteDataValidator = v.object({
  primaryColor: v.optional(v.string()),
  heroImageUrl: v.optional(v.string()),
  technology: v.optional(v.string()),
  metaTitle: v.optional(v.string()),
  metaDescription: v.optional(v.string()),
  screenshotUrl: v.optional(v.string()),
  hasHttps: v.optional(v.boolean()),
  scrapedAt: v.number(),
});

export const pageSpeedDataValidator = v.object({
  performanceScore: v.number(),
  fcp: v.optional(v.number()),
  lcp: v.optional(v.number()),
  cls: v.optional(v.number()),
  fetchedAt: v.number(),
});

export const aiLeadAnalysisValidator = v.object({
  fitScore: v.number(),
  businessDescription: v.string(),
  painPoints: v.array(v.string()),
  sellingPoints: v.array(v.string()),
  outreachAngle: v.string(),
  analyzedAt: v.number(),
});
```

---

## Phase 2: Pipeline Actions

### New file: `convex/marketing/workflow.ts`

Defines the `WorkflowManager` instance and the `marketingSearchWorkflow`.

- Imports `WorkflowManager` from `@convex-dev/workflow`
- Sets `maxParallelism: 2`
- Defines the workflow as shown in the Workflow Shape section above
- Exports a `startSearch` mutation that creates a `marketing_searches` row and starts the workflow

### New file: `convex/marketing/pipeline.ts` (`"use node"`)

Individual step actions. Each handles ONE lead and catches its own errors internally (writes `status: "error"` to the lead, returns normally so the workflow continues).

#### `executeSearch({ searchId })` — internalAction
1. Reads search params (city, state, industry) from `marketing_searches`
2. Calls Google Places Text Search API (`POST places:searchText`)
3. Follows pagination via `pageToken` in POST body (max 3 pages, 60 results). All params except `pageSize`/`pageToken` must stay identical across pages. No delay needed between pages.
4. For each result:
   - Fetches top review via Place Details API (field mask: `reviews`)
   - Resolves first photo URL via Place Photos API
   - Calls `internalInsertLead` mutation (deduplicates by `placeId` within this search)
5. Updates search `totalFound` counter
6. Returns array of lead IDs
7. **Deduplication:** Within a search, query `by_searchId_and_placeId` composite index to skip if this `searchId` + `placeId` combo already exists. Across searches, allow duplicates (different searches may run weeks apart; data freshness matters).

#### `scrapeOneLead({ leadId })` — internalAction
1. Sets lead status to `"scraping"` BEFORE API calls (crash safety)
2. Reads lead's `websiteUrl` from DB
3. If no website: marks as `"scraped"` immediately (no website = high fit indicator)
4. If has website:
   - Calls Firecrawl REST API with `formats` objects (`markdown`, `screenshot`, and `json` extraction with schema) for `primaryColor`, `heroImageUrl`, `technology`
   - Calls PageSpeed Insights API for mobile performance score
   - Writes `websiteData` and `pageSpeedData` to lead via internal mutation
5. Sets lead status to `"scraped"`
6. On error: writes error message to lead, sets status to `"error"`, returns normally

#### `analyzeOneLead({ leadId })` — internalAction
1. Sets lead status to `"analyzing"`
2. Reads all lead data from DB (Google data + website data + PageSpeed data)
3. Builds prompt with all collected data and scoring criteria:
   - No website = high fit (8-10)
   - Wix/Squarespace/GoDaddy = medium-high (6-8)
   - Slow speed < 50 = high fit (7-9)
   - Good reviews + bad site = very high (9-10)
   - Professional custom site with good speed = low fit (1-3)
4. Calls Groq via Agent component (same pattern as `convex/leadTriage.ts`)
5. Parses JSON response: `fitScore`, `businessDescription`, `painPoints[]`, `sellingPoints[]`, `outreachAngle`
6. Writes `aiAnalysis` to lead
7. Sets status: `"qualified"` if fitScore >= 6, `"disqualified"` if < 6
8. For qualified leads: generates `demoToken` (UUID) and writes it to the lead
9. On error: sets status to `"error"`, returns normally

#### `screenshotDemoPage({ leadId })` — internalAction
1. Reads lead's `demoToken` from DB
2. Constructs demo page URL: `{SITE_URL}/demo/{demoToken}`
3. Calls Firecrawl with `formats: ["screenshot"]` on the demo page URL
4. Stores screenshot URL on `scraped_leads.demoScreenshotUrl`
5. On error: logs warning, returns normally (email can still link to demo without screenshot)

**Deployment note:** Firecrawl screenshots require the demo page to be publicly accessible. `SITE_URL` must point to the deployed production URL (not `localhost`). Demo pages must be deployed before the screenshot step runs. During local development, skip this step or use a tunnel.

---

## Phase 3: Queries & Mutations

### New file: `convex/marketing/search.ts`

All admin-gated via `requireAdmin(ctx)` from `convex/adminGuard.ts`.

#### Mutations
- `createSearch({ city, state, industry })` — inserts `marketing_searches` row, starts workflow via `workflow.start()`, stores `workflowId`, logs activity
- `updateLeadStatus({ leadId, status })` — manual status change (e.g., mark as called, not_interested)
- `updateLeadNotes({ leadId, adminNotes })` — save admin notes (auto-save on blur)
- `updateLeadContactEmail({ leadId, contactEmail })` — set email for outreach
- `setFollowUp({ leadId, followUpAt })` — schedule follow-up date, set status to `"follow_up"`
- `markCalled({ leadId })` — sets `calledAt`, increments `contactAttempts`, sets status to `"contacted"`
- `cancelSearch({ searchId })` — calls `workflow.cancel()` on the workflow, updates search status
- `triggerMockupEmail({ leadId, recipientEmail, recipientName? })` — validates inputs, schedules `internal.marketing.emails.sendMockupEmail` via `ctx.scheduler.runAfter(0, ...)`. This is the admin-callable bridge since UI can't call internalActions directly.
- `triggerFollowUpEmail({ leadId, recipientEmail })` — same pattern, schedules `internal.marketing.emails.sendFollowUpEmail`
- `convertToProspect({ leadId })` — see Phase 6

#### Queries
- `listSearches({ limit? })` — recent searches ordered by `createdAt` desc, with status
- `getSearchById({ searchId })` — single search with counts
- `getLeadsBySearch({ searchId, status?, limit? })` — leads for a batch, filterable by status
- `listQualifiedLeads({ limit? })` — all qualified leads across searches
- `listFollowUps()` — leads with `followUpAt <= now + 7 days`, sorted by date (overdue first)
- `getLeadById({ leadId })` — single lead with all data
- `getQualifiedLeadIds({ searchId })` — returns IDs of qualified leads (used by workflow)

#### Internal Mutations (called from pipeline actions)
- `internalInsertLead({ searchId, placeId, googleData })` — deduplicate via `by_searchId_and_placeId` composite index, insert with `status: "new"`, `contactAttempts: 0`
- `internalUpdateLeadStatus({ leadId, status })` — status transition
- `internalUpdateLeadWebsiteData({ leadId, websiteData, pageSpeedData? })`
- `internalUpdateLeadAiAnalysis({ leadId, aiAnalysis, status, demoToken? })`
- `internalUpdateLeadDemoScreenshot({ leadId, demoScreenshotUrl })`
- `internalUpdateSearchCounters({ searchId, totalFound?, totalScraped?, totalQualified? })`
- `markLeadError({ leadId, error })` — sets status to `"error"`, writes error message
- `updateSearchStatus({ searchId, status })` — transitions search status (called by workflow between stages: `"searching"` → `"scraping"` → `"analyzing"`)
- `completeSearch({ searchId })` — sets search status to `"completed"`, updates `updatedAt`

---

## Phase 4: Demo Preview Page

### New file: `app/demo/[token]/page.tsx` (public, server component)

A public route that renders scraped lead data into a real, fast-loading preview page. No auth required. The URL uses the lead's `demoToken` (UUID) so it's unguessable but shareable.

**Data source:** A public Convex query `marketing.public.getDemoData({ token })` that looks up the lead by `demoToken` index and returns only rendering data. Since this is a server component, use `fetchQuery` from `convex/nextjs` (NOT `useQuery`) to preload data at render time.

**What it renders (4 sections):**

1. **Hero Section** — Full-width section using their `primaryColor` as gradient background (falls back to our blue `#2B7FE0`), their Google photo or hero image, business name as large heading, AI-generated `businessDescription` as subtitle. Styled to look like our template output (the "trustworthy-trade" archetype as default).

2. **Review Section** — Their top Google review displayed in a card: reviewer name, star rating (rendered as stars), review text. Skipped if no review available.

3. **CTA Section** — "Ready to get started?" with phone number (click-to-call link) and "Schedule a Call" button linking to our Cal.com or onboarding page.

4. **Floating Banner** (fixed bottom) — "This is a preview by Acadiana Web Design" with "Get Your Website →" CTA button. Subtle but always visible.

**Important:** These are NEW components built specifically for this route. The template section components (`HeroSplitTrust`, `ReviewsCarousel`, etc.) live in the client template repo, not this agency hub repo. The demo page components should *look like* template output but are self-contained:
- `components/demo/DemoHero.tsx` — hero with dynamic color, image, name, description
- `components/demo/DemoReview.tsx` — single review card with stars
- `components/demo/DemoCTA.tsx` — call-to-action with phone and scheduling link
- `components/demo/DemoBanner.tsx` — fixed bottom attribution bar

**SEO:** Add `<meta name="robots" content="noindex, nofollow" />` to the demo page head. These are temporary preview pages for individual businesses — they should not be indexed by search engines.

**View tracking:** A small client component fires a mutation on mount to record `demoViewedAt`. This provides a strong follow-up signal visible in the admin UI.

### New file: `convex/marketing/public.ts`

Public queries and mutations for the demo page (NO admin guard).

- `getDemoData({ token })` — query, returns `{ businessName, primaryColor, photoUrl, topReview, description, phone } | null`. Returns null for invalid tokens (page shows 404).
- `recordDemoView({ token })` — mutation, sets `demoViewedAt` if not already set (check before write to deduplicate). Rate-limited via `@convex-dev/rate-limiter` as a secondary abuse guard. Note: the rate limiter component is already installed and configured in `convex/convex.config.ts` — reuse the existing instance (imported from wherever it's currently instantiated, likely `convex/http.ts` or a shared module).

---

## Phase 5: Outreach Email

### New file: `convex/marketing/emails.ts` (`"use node"`)

Uses existing email helpers from `convex/emails.ts` (`getEmailWrapper`, `getCtaButton`, `getInfoBox`, `escapeHtml`, `getListUnsubscribeHeaders`, `EMAIL_STYLES`, etc.)

#### `sendMockupEmail({ leadId, recipientEmail, recipientName? })` — internalAction

**UI trigger:** The admin UI cannot call `internalAction` directly. Instead, the admin-gated `triggerMockupEmail` mutation in `convex/marketing/search.ts` validates inputs, checks admin auth, and uses `ctx.scheduler.runAfter(0, internal.marketing.emails.sendMockupEmail, { ... })` to schedule the internal action. The UI calls the mutation; the mutation schedules the action.

The email is a teaser that drives them to the live demo page:

1. **Header:** Gradient using their `primaryColor` (falls back to our blue) with headline: "We built a preview of your new website"
2. **Demo Screenshot:** The `demoScreenshotUrl` rendered as a large clickable image — shows exactly what they'll see. Wrapped in a link to `/demo/{demoToken}`.
3. **Speed Score Callout** (if available and < 80): Red/yellow box showing their mobile speed score — "Your current site scores X/100 on Google PageSpeed. Our sites score 95+."
4. **Technology Callout** (if Wix/Squarespace/GoDaddy): "Our custom-built sites load 3-5x faster than {technology}"
5. **Primary CTA Button:** "See Your Website Preview" → links to `/demo/{demoToken}`
6. **Value Prop Box** (using `getInfoBox`): What you get for $199/mo — custom website, unlimited edits, 95+ PageSpeed, hosting, $0 down
7. **Secondary CTA:** "Or schedule a free 15-min call" → links to Cal.com / onboarding
8. **Footer:** Physical address + opt-out notice + copyright (CAN-SPAM compliance)

**After sending:**
- Updates `emailSentAt` on the lead
- Sets `followUpAt` to 7 days later
- Sets status to `"contacted"`
- Increments `contactAttempts`
- Logs activity: `marketing.outreach_sent`

#### `sendFollowUpEmail({ leadId, recipientEmail })` — simpler follow-up email

References the demo link again, shorter copy. "Did you get a chance to look at your website preview?"

**Email domain note:** Consider using a separate sending subdomain for cold outreach (e.g., `outreach@marketing.acadianawebdesign.com`) to protect the main domain's reputation used for transactional emails (magic links, welcome emails). Configure this in Resend.

---

## Phase 6: Convert to Prospect

In `convex/marketing/search.ts`:

### `convertToProspect({ leadId })` — mutation

1. Validates lead exists and isn't already converted
2. Creates a new `prospects` row mapping scraped data:
   - `companyName` ← `googleData.businessName`
   - `contactEmail` ← `lead.contactEmail` (pre-filled if admin entered it for outreach)
   - `contactName` ← empty string (admin fills in manually, or from conversation)
   - `phone` ← `googleData.phone`
   - `currentWebsite` ← `googleData.websiteUrl`
   - `businessDescription` ← `aiAnalysis.businessDescription`
   - `prospectNotes` ← formatted summary: fit score, pain points, outreach angle, demo link
   - `myNotes` ← `lead.adminNotes`
3. Generates `sessionId` + `resumeToken` (same UUID pattern as `admin.createProspect`)
4. Sets `planGenerationInProgress: false`
5. Marks scraped lead `status: "converted"`, sets `convertedToProspectId`
6. Logs activity: `marketing.lead_converted`
7. Returns the new prospect `_id` (UI shows link to prospect in admin)

From here, the admin follows the normal workflow: fill in contact details, send magic link, etc.

---

## Phase 7: Admin UI

### New file: `app/admin/marketing/page.tsx`

Separate page from the existing admin (which is already ~88KB). The existing `app/admin/layout.tsx` already gates all `/admin/*` routes — no new layout needed.

**Navigation:** Add a link from the main admin page (`app/admin/page.tsx`) to `/admin/marketing`.

### Page Structure: Three Tabs

#### Tab 1: "Searches" (default)

- **"New Search" button** (top right) opens a modal:
  - City input (text field)
  - State dropdown (US states)
  - Industry dropdown: plumber, roofer, landscaper, HVAC, electrician, painter, pest control, cleaning, tree service, pressure washing, fencing, towing, general contractor, other
  - Submit → calls `createSearch` mutation → starts workflow
- **Search history table:**
  - Columns: Date | Query | Status (badge) | Found | Qualified | Actions
  - Status badges with colors: searching (blue pulse), scraping (yellow), analyzing (purple), completed (green), failed (red)
  - "View Leads" button → switches to Leads tab filtered to that search
  - "Cancel" button (for in-progress searches) → calls `cancelSearch`
  - Real-time updates via Convex reactive queries (progress visible as pipeline runs)

#### Tab 2: "Leads"

- **Pipeline stats bar** (top): `| 12 New | 8 Qualified | 5 Contacted | 3 Follow-up | 2 Converted |` — clickable to filter
- **Filter bar:** Search batch dropdown | Status filter (All/Qualified/Contacted/Follow-up/Converted) | Sort (Fit Score/Date/Rating)
- **Lead cards** (expandable, same surface pattern as admin projects tab):
  - **Collapsed row:** Business Name | Rating + review count | City | Fit score badge (green ≥7 / yellow 5-6 / red <5) | Status badge | Speed score badge | Tech badge (Wix/etc)
  - **Expanded panel:**
    - Screenshot of their current site + demo page link side by side
    - Full address, phone (click-to-call `tel:` link), website URL (opens new tab)
    - AI description, pain points list, selling points list, outreach angle
    - PageSpeed details: score gauge, FCP, LCP
    - Primary color swatch (rendered div with hex value)
    - Top Google review (author + stars + text)
    - Admin notes textarea (auto-saves on blur via `updateLeadNotes`)
    - Contact email input (auto-saves via `updateLeadContactEmail`)
    - Demo viewed indicator (timestamp if they visited the demo page)
    - **Actions row:**
      - "Send Mockup Email" → opens email preview modal (requires `contactEmail`)
      - "Mark Called" → sets `calledAt` via `markCalled`
      - "Schedule Follow-up" → date picker, calls `setFollowUp`
      - "Convert to Prospect" → one-click, shows link to prospects tab on success
      - "Disqualify" → calls `updateLeadStatus` with `"disqualified"`

#### Tab 3: "Follow-ups"

- Shows leads with `followUpAt` set, sorted by date (overdue first in red)
- Columns: Business Name | Follow-up Date (overdue highlighted red) | Last Contact | Status | Actions
- Actions: "Call Now" (mark called), "Send Follow-up Email", "Convert", "Snooze 1 Week", "Not Interested"

### Email Preview Modal

- Shows rendered HTML email preview in an iframe
- Recipient email field (pre-filled from `lead.contactEmail`)
- Recipient name field (optional, used in greeting)
- "Send" button → calls `triggerMockupEmail` mutation (which schedules the `sendMockupEmail` internalAction)
- Success toast via `sonner` on completion

---

## File Summary

### New Files (8)

| File | Purpose |
|------|---------|
| `convex/marketing/workflow.ts` | WorkflowManager instance + `marketingSearchWorkflow` definition |
| `convex/marketing/pipeline.ts` | `"use node"` actions: `executeSearch`, `scrapeOneLead`, `analyzeOneLead`, `screenshotDemoPage` |
| `convex/marketing/search.ts` | Queries, mutations, internal mutations for searches and leads |
| `convex/marketing/emails.ts` | `"use node"` actions: outreach email template and sending |
| `convex/marketing/public.ts` | Public queries/mutations for demo page (no auth) |
| `app/admin/marketing/page.tsx` | Admin UI: searches, leads pipeline, follow-ups |
| `app/demo/[token]/page.tsx` | Public demo preview page (hero + review + CTA) |
| `components/demo/DemoHero.tsx` (+ DemoReview, DemoCTA, DemoBanner) | Demo page components |

### Modified Files (4)

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add `marketing_searches` and `scraped_leads` tables |
| `convex/validators.ts` | Add marketing validators (`marketingSearchStatusValidator`, `scrapedLeadStatusValidator`, `googleDataValidator`, `websiteDataValidator`, `pageSpeedDataValidator`, `aiLeadAnalysisValidator`) |
| `convex/convex.config.ts` | Add: `import workflow from "@convex-dev/workflow/convex.config.js"; app.use(workflow);` |
| `app/admin/page.tsx` | Add navigation link to `/admin/marketing` |

### No Changes Needed

| File | Reason |
|------|--------|
| `convex/adminGuard.ts` | Reused as-is (`requireAdmin`) |
| `convex/activityLog.ts` | Reused as-is (`logActivity`) |
| `convex/emails.ts` | Imported for helpers, not modified |
| `convex/leadTriage.ts` | Reference pattern for Groq Agent usage, not modified |
| `app/admin/layout.tsx` | Already gates all `/admin/*` routes |

### New Dependencies

```bash
npx convex component install workflow
```

### Environment Variables to Add

```
FIRECRAWL_API_KEY=...    # From https://firecrawl.dev dashboard
# GOOGLE_PLACES_API_KEY — should already exist
```

---

## Build Order

Each phase is independently testable. Steps within a phase are sequential.

### Phase 1: Data Layer
1. Add validators to `convex/validators.ts`
2. Add tables to `convex/schema.ts`
3. Add `@convex-dev/workflow` to `convex/convex.config.ts`
4. Run `npx convex component install workflow` and `bun run dev:backend` — verify tables appear in Convex dashboard

### Phase 2: Pipeline Backend
5. Create `convex/marketing/search.ts` — mutations, queries, internal mutations
6. Create `convex/marketing/pipeline.ts` — `executeSearch` action (Google Places only first)
7. Create `convex/marketing/workflow.ts` — workflow definition (start with just `executeSearch` step)
8. **Test:** Create a search via Convex dashboard, verify leads populate from Google Places

9. Add `scrapeOneLead` action to pipeline (Firecrawl + PageSpeed)
10. Wire into workflow as Step 2
11. Set `FIRECRAWL_API_KEY` env var
12. **Test:** Run a search, verify website data and speed scores populate on leads

13. Add `analyzeOneLead` action to pipeline (Groq AI)
14. Wire into workflow as Step 3
15. **Test:** Run a search, verify AI scores and pain points generate, leads auto-qualify

### Phase 3: Demo Page
16. Create `convex/marketing/public.ts` — `getDemoData` query, `recordDemoView` mutation
17. Create demo page components (`components/demo/DemoHero.tsx`, etc.)
18. Create `app/demo/[token]/page.tsx` — server component that fetches and renders
19. **Test:** Manually create a test lead with a demoToken in dashboard, visit `/demo/{token}`, verify rendering

20. Add `screenshotDemoPage` action to pipeline
21. Wire into workflow as Step 4
22. **Test:** Run a full search, verify demo pages render and screenshots appear on qualified leads

### Phase 4: Admin UI
23. Create `app/admin/marketing/page.tsx` — Searches tab first
24. Add "Marketing" link to `app/admin/page.tsx`
25. **Test:** Navigate to `/admin/marketing`, create a search from UI, watch real-time progress

26. Build Leads tab — list, filters, expandable cards, action buttons
27. **Test:** Browse leads, expand details, add notes, view demo links

28. Build Follow-ups tab
29. **Test:** Set follow-up dates, verify they appear in Follow-ups tab

### Phase 5: Email & Outreach
30. Create `convex/marketing/emails.ts` — `sendMockupEmail` action
31. Build email preview modal in admin UI
32. **Test:** Send test email, verify demo screenshot shows, demo link works, follow-up auto-scheduled

### Phase 6: Convert to Prospect
33. Add `convertToProspect` mutation to `convex/marketing/search.ts`
34. Wire "Convert to Prospect" button in admin UI
35. **Test:** Convert a lead, verify prospect appears in admin Prospects tab with pre-filled data

---

## Verification Checklist

- [ ] Run `bun run dev` and navigate to `/admin/marketing`
- [ ] Create a test search (e.g., "plumbers in Lafayette, LA")
- [ ] Watch search progress update in real-time (searching → scraping → analyzing → completed)
- [ ] Expand a qualified lead — verify all data fields populated
- [ ] Click "View Demo" link — verify `/demo/{token}` renders with their colors, photo, and review
- [ ] Send a mockup email to a test address — verify demo screenshot shows and link works
- [ ] Convert a lead to prospect — verify it appears in the admin Prospects tab
- [ ] Set a follow-up date — verify it appears in the Follow-ups tab
- [ ] Visit demo link as the prospect would — verify `demoViewedAt` gets tracked in admin
- [ ] Cancel an in-progress search — verify it stops cleanly

---

## Review Findings (v1.1)

Issues identified during plan review, all resolved inline above:

1. **[P1] UI can't call internalActions directly** — `sendMockupEmail` is an `internalAction`, but the email modal button tried to call it from client code. **Fix:** Added `triggerMockupEmail` and `triggerFollowUpEmail` admin-gated mutations that use `ctx.scheduler.runAfter(0, ...)` to schedule the internal actions. UI calls the mutation.

2. **[P2] Search status transitions not operationalized** — UI expected `searching → scraping → analyzing → completed` badges, but the workflow only set status at creation and completion. **Fix:** Added explicit `updateSearchStatus` internal mutation calls between workflow stages so the reactive UI reflects real-time progress.

3. **[P2] Dedupe needs composite index** — Plan said "deduplicate by searchId + placeId" but schema only had separate `by_searchId` and `by_placeId` indexes. Convex can't do multi-field lookups without a composite index. **Fix:** Hoisted `placeId` to a top-level field (Convex can't index nested `googleData.placeId`), added `by_searchId_and_placeId` composite index, updated `internalInsertLead` args.

4. **[P2] Nested field index not supported** — `by_placeId` indexed `googleData.placeId` but Convex doesn't support indexing nested object fields. **Fix:** `placeId` moved to top-level on `scraped_leads`, indexes updated.

5. **[P3] Demo page server component data fetching** — Page is a server component but didn't specify the data fetching method. `useQuery` only works in client components. **Fix:** Noted to use `fetchQuery` from `convex/nextjs`.

6. **[P3] Firecrawl can't screenshot localhost** — `screenshotDemoPage` constructs a URL from `SITE_URL`, but during local dev Firecrawl can't reach `localhost`. **Fix:** Added deployment note — `SITE_URL` must be production URL; skip screenshot step or use tunnel during local dev.

7. **[P3] `recordDemoView` deduplication** — Rate limiter alone doesn't prevent duplicate writes on re-renders. **Fix:** Check `demoViewedAt` before writing (primary guard), rate limiter as secondary abuse protection.

---

## Key Design Decisions & Rationale

### Direct Firecrawl API, Not the Convex Component
The [`convex-firecrawl-scrape`](https://www.convex.dev/components/firecrawl-scrape) component is designed for interactive client-side scraping with reactive status polling. Our use case is a backend batch pipeline running inside Convex workflow actions. Direct `fetch()` calls are simpler, don't add another Convex component, and integrate cleanly with the Workflow component.

### Allow Duplicate placeIds Across Searches
Different searches run at different times (weeks/months apart). A business that was disqualified in January might have a worse website in March. Each search is self-contained with its own data. We deduplicate within a single search (same `searchId` + `placeId`) but allow duplicates across searches.

### Status Set BEFORE API Calls
When starting a Firecrawl scrape, set the lead status to `"scraping"` before the API call. If the action crashes mid-scrape, the lead is in `"scraping"` state (so you know it was in progress), not `"new"` (which would cause re-processing on retry).

### Per-Step Error Handling
Each pipeline action catches its own errors and writes `status: "error"` to the lead, then returns normally. The workflow continues processing other leads. This prevents one failed Firecrawl call from killing the entire pipeline.

### demoToken is Optional
Only generated for qualified leads during the `analyzeOneLead` step. No point generating UUID tokens for disqualified businesses that will never get a demo page.

### Separate Email Domain for Cold Outreach
Recommended (not required for Phase 1): Use `outreach@marketing.acadianawebdesign.com` for cold emails. If recipients mark them as spam, it won't affect deliverability of transactional emails (magic links, welcome emails) sent from `welcome@acadianawebdesign.com`.

---

## Cost Estimates (Per Search Batch)

| Service | Usage per 30-lead batch | Cost guidance |
|---------|------------------------|---------------|
| Google Places Text Search / Details / Photos | ~1 search + up to 60 places + details/photos as needed | Pull live SKU pricing from Maps Platform docs before launch (pricing changed in March 2025). |
| Firecrawl (website + demo screenshots) | ~20 website scrapes + ~15 demo screenshots | Plan-dependent; verify per-credit usage in Firecrawl dashboard. |
| PageSpeed Insights | ~20 calls | Usually no direct charge, but watch API quota and key limits. |
| Groq AI (analysis) | 30 calls | Model/plan-dependent; verify current token pricing and limits. |

Keep a small `marketing_cost_snapshots` table (date + per-provider assumptions) so cost math is auditable when pricing changes.

---

## Future Enhancements (Not in Scope)

- **Kanban board view** — toggle between table and board view for pipeline management
- **Bulk email sending** — select multiple qualified leads, send mockup emails in batch
- **Call recording + transcription** — record calls, transcribe with Whisper/Deepgram, feed to AI for grading
- **Automated follow-up emails** — Convex cron job checks `followUpAt` daily, auto-sends follow-up emails
- **Market research dashboard** — "How many landscapers in Lafayette have a professional website vs. none?" stats view across searches
- **Email open/click tracking** — track when mockup emails are opened and links clicked
- **Domain scoring** — automatically check domain age, SSL status, mobile-friendliness beyond PageSpeed
