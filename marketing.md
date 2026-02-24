# Marketing Pipeline — System Documentation

**Last Updated:** February 16, 2026

---

## Overview

The Marketing Pipeline automates lead generation for Acadiana Web Design. It replaces the manual process of searching Google Maps, assessing businesses one by one, and creating prospects by hand. The system searches a city + industry combo, scrapes Google listings and business websites in bulk, uses AI to score and qualify leads, generates live demo preview pages, sends personalized outreach emails, and tracks the full sales pipeline — all from `/admin/marketing`.

### End-to-End Flow

1. **Search** — Admin enters city + industry on `/admin/marketing`. Google Places API finds businesses.
2. **Scrape** — Firecrawl analyzes each business's website. PageSpeed Insights scores their mobile speed.
3. **Analyze** — Groq AI scores each lead's fit (1-10) and generates personalized pain points, selling points, and outreach angles.
4. **Demo Page** — `/demo/{token}` (for example, `/demo/token`) renders a tokenized public preview page with lead data and a built-in style picker (6 visual variations).
5. **Screenshot** — Firecrawl screenshots the default demo variation for embedding in outreach emails.
6. **Email** — Personalized mockup email with the demo screenshot and "See Your Website Preview" CTA.
7. **Track** — When the prospect visits the demo page, `demoViewedAt` is recorded as a follow-up signal.
8. **Convert** — One-click "Convert to Prospect" creates a prospect pre-filled with all scraped data, entering the normal sales workflow.

---

## Architecture

### Three-Table Sales Funnel

```
scraped_leads (marketing / top of funnel)
  | Hundreds/thousands — automated discovery, unqualified
  |
  v [Admin clicks "Convert to Prospect"]
prospects (sales / middle of funnel)
  | Tens — human-vetted, actively being pursued
  |
  v [Agreement + Payment]
projects (delivery / bottom of funnel)
    Single digits — paying clients with auth accounts
```

The "Convert to Prospect" action bridges marketing into sales by copying relevant scraped data into a new prospect row and marking the lead as `converted`. The `prospects` table stays clean (only real prospects), and scraped data is preserved for analytics.

### File Structure

```
convex/marketing/
  workflow.ts     — WorkflowManager instance + marketingSearchWorkflow
  pipeline.ts     — "use node" actions: executeSearch, scrapeOneLead, analyzeOneLead, screenshotDemoPage
  search.ts       — Admin-gated mutations, queries, internal mutations
  emails.ts       — "use node" actions: sendMockupEmail, sendFollowUpEmail
  public.ts       — Public queries/mutations for the demo page (no auth)

app/admin/marketing/
  page.tsx        — Admin UI: Searches, Leads, Follow-ups tabs

app/demo/[token]/
  page.tsx        — Public demo preview page (server component)

components/demo/
  DemoVariations.tsx  — Client style picker + 6 standalone business website variants with image orientation detection
  DemoBanner.tsx      — Fixed bottom attribution bar with Cal.com booking link
  DemoViewTracker.tsx — Client component that fires recordDemoView on mount
```

### Modified Files

| File | Changes |
|------|---------|
| `convex/schema.ts` | Added `marketing_searches` and `scraped_leads` tables |
| `convex/validators.ts` | Added marketing validators and document validators |
| `convex/convex.config.ts` | Added `@convex-dev/workflow` component |
| `convex/rateLimiter.ts` | Added `marketingDemoView` rate limit (10/min per token) |
| `app/admin/page.tsx` | Added "Marketing Pipeline" navigation link |

### Dependencies

- `@convex-dev/workflow` — Durable workflow orchestration (installed via `npx convex component install workflow`)

---

## Pipeline Orchestration

The pipeline uses `@convex-dev/workflow` for durable execution. The `WorkflowManager` is configured with `maxParallelism: 2`, meaning only 2 external API calls run concurrently to protect vendor API quotas.

### Workflow Steps

| Step | Function | Type | Retry | Purpose |
|------|----------|------|-------|---------|
| 1 | `executeSearch` | Action | Unlimited | Google Places search, creates lead records |
| - | `updateSearchStatus("scraping")` | Mutation | - | Status transition |
| 2 | `scrapeOneLead` (parallel per lead) | Action | 2 attempts, 3s backoff | Firecrawl + PageSpeed per lead |
| - | `updateSearchStatus("analyzing")` | Mutation | - | Status transition |
| 3 | `analyzeOneLead` (parallel per successfully scraped lead) | Action | Unlimited | Groq AI scoring per lead |
| 4 | `screenshotDemoPage` (parallel per qualified lead) | Action | 2 attempts, 3s backoff | Firecrawl screenshot of demo page |
| 5 | `completeSearch` | Mutation | - | Final status + counter recalculation |

### Workflow Lifecycle

- **Start:** `createSearch` mutation calls `workflow.start()`, stores the `workflowId`, and registers an `onComplete` callback.
- **Cancel:** `cancelSearch` mutation calls `workflow.cancel()` using the stored `workflowId`.
- **Completion:** The `onWorkflowComplete` callback handles three outcomes:
  - **Success:** Recalculates counters, sets status to `"completed"` (safety net if `completeSearch` step was skipped).
  - **Failed:** Sets status to `"failed"` with truncated error message (max 1000 chars).
  - **Canceled:** Sets status to `"canceled"`.

### Error Handling

Each pipeline action catches its own errors and writes `status: "error"` to the individual lead, then returns normally. The workflow continues processing other leads. One failed Firecrawl call does not kill the entire pipeline.

### Status Transitions

**Search statuses:** `searching` -> `scraping` -> `analyzing` -> `completed` | `failed` | `canceled`

**Lead statuses:**
| Status | Meaning |
|--------|---------|
| `new` | Google Places found it, not yet scraped |
| `scraping` | Firecrawl/PageSpeed in progress |
| `scraped` | Website data collected, awaiting AI |
| `analyzing` | AI analysis in progress |
| `qualified` | Fit score >= 6, demo page generated |
| `disqualified` | Fit score < 6 or manually disqualified |
| `contacted` | Called or emailed |
| `follow_up` | Scheduled for follow-up |
| `responded` | They replied |
| `converted` | Became a prospect |
| `not_interested` | Declined |
| `error` | Processing failed |

### Journal Size

Workflow journals store inputs and return values of every step. Each action returns minimal data (`{ leadId, status }`) to keep journal size small. All scraped data is written to the database via mutations inside each action, not returned through the journal.

---

## Database Schema

### `marketing_searches`

Tracks each search batch initiated by the admin.

| Field | Type | Description |
|-------|------|-------------|
| `city` | string | Target city |
| `state` | string | Target state |
| `industry` | string | Target industry |
| `searchQuery` | string | Formatted as `"{industry} in {city}, {state}"` |
| `status` | union | `searching \| scraping \| analyzing \| completed \| failed \| canceled` |
| `totalFound` | number | Count of leads discovered |
| `totalScraped` | number | Count of leads with website data |
| `totalQualified` | number | Count of leads with fitScore >= 6 |
| `workflowId` | string? | Workflow component ID for cancellation |
| `error` | string? | Error message if failed |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

**Indexes:** `by_createdAt`, `by_city_and_industry`

### `scraped_leads`

Individual business leads with all collected data.

| Field | Type | Description |
|-------|------|-------------|
| `searchId` | id | Reference to parent search |
| `placeId` | string | Google Places ID (top-level for indexing) |
| `googleData` | object | Business name, address, phone, website, rating, review count, Maps URL, type, photo URL, top review |
| `websiteData` | object? | Primary color, hero image, technology, meta title/description, screenshot, HTTPS status, scrape timestamp |
| `pageSpeedData` | object? | Performance score (0-100), FCP, LCP, CLS, fetch timestamp |
| `aiAnalysis` | object? | Fit score (1-10), description, pain points, selling points, outreach angle, analysis timestamp |
| `status` | union | See lead status table above |
| `demoToken` | string? | UUID for `/demo/{token}` route (only for qualified leads) |
| `demoScreenshotUrl` | string? | Firecrawl screenshot of the demo page |
| `demoViewedAt` | number? | Timestamp when prospect visited demo link |
| `contactEmail` | string? | Discovered from website or manually entered |
| `emailSentAt` | number? | Timestamp of last email sent |
| `calledAt` | number? | Timestamp of last call |
| `followUpAt` | number? | Next follow-up date |
| `convertedToProspectId` | id? | Reference to prospect if converted |
| `adminNotes` | string? | Free-text notes |
| `contactAttempts` | number | Incremented with each email/call |
| `error` | string? | Error message (max 1000 chars) |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

**Indexes:** `by_searchId`, `by_status`, `by_searchId_and_status`, `by_searchId_and_placeId`, `by_placeId`, `by_demoToken`, `by_followUpAt`, `by_createdAt`

### Deduplication

Within a single search, leads are deduplicated by the `by_searchId_and_placeId` composite index. Across searches, duplicates are allowed — different searches may run weeks apart and data freshness matters.

---

## External APIs

### Google Places API

**Env var:** `GOOGLE_PLACES_API_KEY`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://places.googleapis.com/v1/places:searchText` | POST | Business discovery by city + industry |
| `https://places.googleapis.com/v1/places/{placeId}` | GET | Fetch reviews (field mask: `reviews`) |
| `https://places.googleapis.com/v1/{photoName}/media` | GET | Resolve photo references to URLs |

**Text Search details:**
- Auth via `X-Goog-Api-Key` and `X-Goog-FieldMask` headers
- Field mask: `places.id, places.displayName, places.formattedAddress, places.nationalPhoneNumber, places.websiteUri, places.rating, places.userRatingCount, places.googleMapsUri, places.primaryType, places.photos, places.reviews, nextPageToken`
- Pagination: Up to 3 pages via `pageToken` in POST body, max 60 results total
- Photo resolution: `maxHeightPx=400`, `skipHttpRedirect=true`

**Review selection:** Reviews are sorted by rating descending, then by text length descending. The highest-rated review with the longest text is selected as `topReview`. Inline reviews from the search response are preferred; a separate Place Details call is made as fallback.

### Firecrawl REST API

**Env var:** `FIRECRAWL_API_KEY`

**Endpoint:** `POST https://api.firecrawl.dev/v2/scrape`

Used directly via `fetch()` (not the Convex Firecrawl component, which is designed for interactive client-side scraping).

**Validation note (confirmed February 16, 2026):** We verified against Firecrawl v2 docs and local response testing that our request/response handling is correct: `formats` accepts typed entries (`markdown`, `screenshot`, `json` with prompt/schema), and `data.screenshot` may be either a URL string or an object containing `url`. No pipeline shape change is required.

**Two use cases:**

1. **Website scraping** — Extracts markdown, screenshot, and JSON (`primaryColor`, `heroImageUrl`, `technology`, `contactEmail`) from the lead's website.
2. **Demo page screenshots** — Screenshots our own `/demo/{token}` pages for email embedding. Requires demo pages to be publicly accessible (production URL, not localhost).

**Data sanitization:**
- `primaryColor` validated as hex format (`#XXXXXX` or `#XXX`)
- `technology` normalized to: `wix`, `squarespace`, `wordpress`, `godaddy`, `weebly`, or `custom`
- `contactEmail` validated with email regex; AI-extracted email preferred, regex fallback on markdown content

### PageSpeed Insights API

**Env var:** `GOOGLE_PAGESPEED_API_KEY` (falls back to `GOOGLE_PLACES_API_KEY`)

**Endpoint:** `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed`

**Params:** `url`, `strategy=mobile`, `category=performance`, `key`

**Note:** This API must be enabled in the Google Cloud Console. A 403 `API_KEY_SERVICE_BLOCKED` error means the PageSpeed Insights API has not been activated for your project.

**Extracts:** `performanceScore` (0-100), `fcp` (First Contentful Paint in ms), `lcp` (Largest Contentful Paint in ms), `cls` (Cumulative Layout Shift).

### Groq AI

**Env var:** Already configured via `@convex-dev/agent`

Uses the `leadScoringAgent` via the existing `@ai-sdk/groq` + `@convex-dev/agent` pattern.

**AI scoring criteria:**
| Scenario | Fit Score Range |
|----------|-----------------|
| No website | 8-10 (high fit) |
| Wix/Squarespace/GoDaddy | 6-8 (medium-high) |
| Slow speed < 50 | 7-9 (high fit) |
| Good reviews + bad site | 9-10 (very high) |
| Professional custom site + good speed | 1-3 (low fit) |

Leads with `fitScore >= 6` are marked `qualified` and receive a `demoToken` (UUID). Below 6 are `disqualified`.

**Output shape:** `{ fitScore, businessDescription, painPoints[], sellingPoints[], outreachAngle }`

---

## Convex Functions

### `convex/marketing/search.ts`

All public mutations and queries are admin-gated via `requireAdmin(ctx)`.

#### Mutations

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `createSearch` | `city, state, industry` | `id("marketing_searches")` | Creates search, starts workflow, logs activity |
| `cancelSearch` | `searchId` | `null` | Cancels workflow, sets status to `"canceled"` |
| `updateLeadStatus` | `leadId, status` | `null` | Manual status change |
| `updateLeadNotes` | `leadId, adminNotes?` | `null` | Save admin notes (auto-save on blur) |
| `updateLeadContactEmail` | `leadId, contactEmail` | `null` | Set email (normalized to lowercase) |
| `setFollowUp` | `leadId, followUpAt` | `null` | Schedule follow-up, sets status to `"follow_up"` |
| `markCalled` | `leadId` | `null` | Sets `calledAt`, increments `contactAttempts`, status `"contacted"` |
| `triggerMockupEmail` | `leadId, recipientEmail, recipientName?` | `null` | Schedules `sendMockupEmail` via `ctx.scheduler.runAfter(0, ...)` |
| `triggerFollowUpEmail` | `leadId, recipientEmail` | `null` | Schedules `sendFollowUpEmail` via `ctx.scheduler.runAfter(0, ...)` |
| `convertToProspect` | `leadId` | `id("prospects")` | Creates prospect from lead data, marks lead as `"converted"` |

#### Queries

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `listSearches` | `limit?` (default 25, max 100) | Array | Recent searches by `createdAt` desc |
| `getSearchById` | `searchId` | Doc or null | Single search with counts |
| `getLeadsBySearch` | `searchId, status?, limit?` | Array | Leads for a search, filterable by status |
| `listLeads` | `status?, limit?` | Array | All leads across searches |
| `listQualifiedLeads` | `limit?` | Array | Qualified leads only |
| `listFollowUps` | (none) | Array | Leads with `followUpAt` within 7 days, max 500 |
| `getLeadById` | `leadId` | Doc or null | Single lead with all data |
| `getQualifiedLeadIds` | `searchId` | Array of IDs | Used by workflow for screenshot step |

#### Internal Mutations

| Function | Purpose |
|----------|---------|
| `internalInsertLead` | Deduplicates by `searchId + placeId`, inserts with `status: "new"` |
| `internalUpdateLeadStatus` | Status transition |
| `internalUpdateLeadWebsiteData` | Writes `websiteData`, `pageSpeedData`, and optionally `contactEmail` (only if not already set) |
| `internalUpdateLeadAiAnalysis` | Writes `aiAnalysis`, status, and optional `demoToken` |
| `internalUpdateLeadDemoScreenshot` | Writes `demoScreenshotUrl` |
| `internalUpdateSearchCounters` | Manual counter updates |
| `internalRecalculateSearchCounters` | Recalculates `totalFound`, `totalScraped`, `totalQualified` from actual lead data |
| `markLeadError` | Sets status to `"error"`, writes error message (truncated to 1000 chars) |
| `updateSearchStatus` | Transitions search status between workflow stages |
| `completeSearch` | Sets `"completed"` + recalculates counters |
| `onWorkflowComplete` | Workflow callback handling success/failed/canceled |
| `internalMarkEmailSent` | Updates `emailSentAt`, sets 7-day `followUpAt`, increments `contactAttempts` |

### `convex/marketing/pipeline.ts`

All functions are `internalAction` (Node.js runtime).

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `executeSearch` | `searchId` | `id[]` | Google Places search, creates leads, returns lead IDs |
| `scrapeOneLead` | `leadId` | `{leadId, status}` | Firecrawl scrape + PageSpeed + email extraction |
| `analyzeOneLead` | `leadId` | `{leadId, status}` | Groq AI scoring and qualification |
| `screenshotDemoPage` | `leadId` | `{leadId, status}` | Firecrawl screenshot of the demo page |

### `convex/marketing/emails.ts`

All functions are `internalAction` (Node.js runtime). Sends via `@convex-dev/resend`.

| Function | Args | Description |
|----------|------|-------------|
| `sendMockupEmail` | `leadId, recipientEmail, recipientName?` | Full outreach email with screenshot, speed callout, tech callout |
| `sendFollowUpEmail` | `leadId, recipientEmail` | Shorter follow-up referencing the demo link |

**Sender:** `Acadiana Web Design <outreach@acadianawebdesign.com>`

**After sending:** Updates `emailSentAt`, sets `followUpAt` to 7 days later, sets status to `"contacted"` (or `"follow_up"` for follow-ups), increments `contactAttempts`, logs activity.

**Security:** All user-controlled values (`businessName`, `recipientName`, `technology`, `primaryColor`, `demoUrl`, `demoScreenshotUrl`) are escaped via `escapeHtml()` to prevent XSS in email HTML.

### `convex/marketing/public.ts`

No admin guard — these are public endpoints for the demo page.

| Function | Type | Args | Returns | Description |
|----------|------|------|---------|-------------|
| `getDemoData` | Query | `token` | Object or null | Returns rendering data for the demo page |
| `recordDemoView` | Mutation | `token` | null | Records `demoViewedAt` (first view only, rate limited) |

**`getDemoData` returns:** `{ businessName, description, phone, primaryColor, imageUrl, review?, demoViewedAt? }`

**Image priority:** Website hero image (`websiteData.heroImageUrl`) takes priority over Google photo (`googleData.photoUrl`).

**Rate limiting:** `recordDemoView` is rate-limited to 10 requests per minute per token via `@convex-dev/rate-limiter`. The mutation also checks `demoViewedAt` before writing to prevent duplicate timestamps.

---

## Demo Page

**Route:** `/demo/[token]` (public, no auth required)

**Rendering:** Next.js server component using `fetchQuery` from `convex/nextjs` for SSR. Returns 404 via `notFound()` for invalid tokens.

**SEO:** `robots: { index: false, follow: false }` — demo pages are not indexed by search engines.

### How `/demo/{token}` Works

1. **Token creation** — During `analyzeOneLead`, qualified leads (`fitScore >= 6`) get a UUID `demoToken` via `crypto.randomUUID()`. This token is stored on the lead and used in URLs like `/demo/{token}`.

2. **Server fetch by token** — `app/demo/[token]/page.tsx` reads the route param and calls `api.marketing.public.getDemoData`. The query resolves the lead through the `by_demoToken` index and returns a slim render payload (`businessName`, `description`, `phone`, `primaryColor`, `imageUrl`, optional review).

3. **404 on invalid token** — If no lead matches the token, the page calls `notFound()`.

4. **Client-side style system** — `DemoVariations` renders all content internally (no server-built `originalContent`). It detects image orientation via a hidden `<img>` `onLoad` handler and adapts each variant's layout for portrait vs landscape. A floating picker lets prospects switch between six styles:
   - `Classic` — clean full-page site with hero, services hint, testimonial, phone CTA
   - `Modern` — minimal geometric grid with thin borders and structured sections
   - `Bold` — full-viewport dramatic hero with dark overlay and massive typography
   - `Elegant` — serif editorial with masthead, fine dividers, grayscale image hover
   - `Warm` — soft rounded shapes, warm earth tones, blob shadows
   - `Premium` — dark cinematic with gold accents, split content grid

   All variants use the business phone as the primary CTA (click-to-call). No agency branding, pricing copy, or Cal.com links appear in the main content — those live only in the banner.

   The selected style is local UI state only (not persisted to Convex).

5. **View tracking** — `DemoViewTracker` runs on mount and calls `recordDemoView({ token })`. Backend protection includes:
   - token-bucket rate limit: 10 requests/minute per token
   - first-view-only write: `demoViewedAt` is set once and ignored on repeat visits

6. **Persistent attribution bar** — `DemoBanner` is always fixed at the bottom with "Preview by Acadiana Web Design" text and a Cal.com "Schedule a Call" booking link.

---

## Outreach Emails

### Mockup Email

Personalized teaser driving the prospect to the live demo page.

**Sections:**
1. Gradient header using their `primaryColor` with headline: "We built a preview of your new website"
2. Demo screenshot as clickable image linking to `/demo/{token}` (if available)
3. Speed score callout (if score < 80): shows their score vs. target 90+
4. Technology callout (if Wix/Squarespace/etc.): "We can outperform your current {tech} setup"
5. Primary CTA button: "See Your Website Preview"
6. Value prop box: $199/mo plan details (custom design, unlimited edits, fast hosting, conversion-focused layout)
7. Reply CTA: "Reply here and we can schedule a quick 15-minute call"
8. Footer with company address (CAN-SPAM compliance)

**Subject line:** `{businessName}: your website preview is ready`

### Follow-Up Email

Shorter follow-up sent 7 days after the initial mockup.

**Content:** "Wanted to bump this in case it got buried" + demo link + offer for a walkthrough call.

**Subject line:** `{businessName}: quick follow-up on your website preview`

### Email Headers

Both emails include:
- `Reply-To` pointing to the support email
- `List-Unsubscribe` headers for CAN-SPAM compliance
- Plain text alternative for email clients that don't render HTML

---

## Convert to Prospect

The `convertToProspect` mutation bridges the marketing funnel into the sales funnel.

**Data mapping:**

| Prospect Field | Source |
|---------------|--------|
| `companyName` | `googleData.businessName` |
| `contactEmail` | `lead.contactEmail` (if entered) |
| `contactName` | Empty string (admin fills in) |
| `phone` | `googleData.phone` |
| `currentWebsite` | `googleData.websiteUrl` |
| `businessDescription` | `aiAnalysis.businessDescription` or `googleData.primaryType` |
| `prospectNotes` | Formatted summary: fit score, pain points, outreach angle, demo link |
| `myNotes` | `lead.adminNotes` |

The lead's status is set to `"converted"` and `convertedToProspectId` links back to the new prospect. Activity is logged as `marketing.lead_converted`.

---

## Admin UI

**Route:** `/admin/marketing` (gated by existing admin layout auth)

### Tab 1: Searches (default)

- **New Search form:** City input, state dropdown, industry dropdown (plumber, roofer, landscaper, HVAC, electrician, painter, pest control, cleaning, tree service, pressure washing, fencing, towing, general contractor, other)
- **Search history table:** Date, query, status badge (color-coded with pulse animation for in-progress), found count, qualified count, actions (View Leads, Cancel)
- Real-time progress updates via Convex reactive queries

### Tab 2: Leads

- **Pipeline summary bar:** Clickable status badges with counts (New, Qualified, Contacted, Follow-up, Converted)
- **Expandable lead cards** with two-column layout:
  - **Left column:** Website hero image + Google photo (side by side), current site screenshot, demo/Maps links, phone (click-to-call), website URL (or "No website" in red), business type, HTTPS status, demo viewed timestamp, email sent timestamp, last called timestamp, contact attempts, errors, site metadata (title/description), PageSpeed breakdown (score, FCP, LCP, CLS), brand color swatch with hex, top review with stars
  - **Right column:** AI description (blue), outreach angle (green), pain points (red), selling points (green), contact email input, admin notes textarea (auto-saves on blur), follow-up date picker, action buttons
- **Collapsed row badges:** Business name, Google rating + review count, speed score (color-coded: green >= 70, yellow >= 40, red < 40), technology badge, address
- **Action buttons:** Send Mockup Email, Mark Called, Schedule Follow-up, Convert to Prospect, Disqualify

### Tab 3: Follow-ups

- Table showing leads with `followUpAt` within 7 days
- Overdue dates highlighted in red
- Actions: Call Now, Send Follow-up Email, Convert, Snooze 1 Week, Mark Not Interested

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API authentication |
| `GOOGLE_PAGESPEED_API_KEY` | No | Falls back to `GOOGLE_PLACES_API_KEY` |
| `FIRECRAWL_API_KEY` | Yes | Firecrawl scraping and screenshots |
| `SITE_URL` or `NEXT_PUBLIC_APP_URL` | Yes (production) | Base URL for demo page links and screenshots. Falls back to `http://localhost:3000`. Must be a publicly accessible URL for Firecrawl screenshots. |

**Google Cloud Console setup:** The PageSpeed Insights API must be enabled in the Google Cloud project associated with your API key. Navigate to the API Library and enable "PageSpeed Insights API".

---

## Key Design Decisions

### Direct Firecrawl API, Not the Convex Component
The `convex-firecrawl-scrape` component is designed for interactive client-side scraping with reactive polling. Our backend batch pipeline uses direct `fetch()` calls, which are simpler and integrate cleanly with the Workflow component.

### Workflow Component for Orchestration
Using `@convex-dev/workflow` instead of manual action chaining provides durable execution, per-step retry, `maxParallelism` throttling, reactive status tracking, and one-click cancellation. Each step is its own invocation, avoiding Convex's 10-minute action timeout.

### `workflow.define()` Returns a Mutation
The workflow file (`workflow.ts`) does NOT have a `"use node"` directive because `workflow.define()` returns a mutation, which cannot run in the Node.js runtime. Pipeline actions that call external APIs live in `pipeline.ts` with `"use node"`.

### Allow Duplicate placeIds Across Searches
Each search is self-contained. A business disqualified in January might have a worse website in March. Deduplication happens within a single search only (via `by_searchId_and_placeId` composite index).

### Status Set BEFORE API Calls
When scraping, the lead status is set to `"scraping"` before the API call. If the action crashes mid-scrape, the lead shows as in-progress rather than `"new"` (which would suggest it was never attempted).

### Per-Step Error Handling
Each pipeline action catches its own errors, writes `status: "error"` to the individual lead, and returns normally so the workflow continues processing other leads.

### UI Cannot Call internalActions Directly
Email sending is an `internalAction`. The admin UI calls `triggerMockupEmail` / `triggerFollowUpEmail` mutations, which schedule the internal actions via `ctx.scheduler.runAfter(0, ...)`.

### Email Security
All user-controlled values in email HTML are escaped via `escapeHtml()` to prevent XSS. Plain text bodies and subject lines use raw business/person names so recipients do not see HTML entities (for example, `&amp;`). The `contactEmail` field from automated scraping only writes if no admin-set email exists (admin manual entry takes priority).

### Bounded Queries
`listFollowUps` is bounded with an upper time window (7 days ahead) and `.take(500)` to prevent unbounded table scans. All list queries use indexed queries with explicit limits.

---

## Cost Estimates (Per Search Batch)

| Service | Usage per 30-lead batch | Notes |
|---------|------------------------|-------|
| Google Places (Text Search / Details / Photos) | ~1 search + up to 60 places + detail/photo calls | Check current SKU pricing (changed March 2025) |
| Firecrawl (website + demo screenshots) | ~20 website scrapes + ~15 demo screenshots | Plan-dependent credits |
| PageSpeed Insights | ~20 calls | Generally free, quota-limited |
| Groq AI (analysis) | ~30 calls | Model/plan-dependent token pricing |

---

## Future Enhancements

- Kanban board view for pipeline management
- Bulk email sending to multiple qualified leads
- Automated follow-up emails via Convex cron job
- Email open/click tracking
- Market research dashboard (industry web presence stats)
- Call recording + transcription with AI grading
- Domain scoring (age, SSL, mobile-friendliness beyond PageSpeed)
