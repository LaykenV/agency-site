# Plan: Convert Demo Page → Website Audit Report

## Context

The marketing pipeline's `/demo/[token]` page shows an auto-generated fake website preview. Prospects see it and think it's the actual $199/mo deliverable, creating a negative price anchor. The fix: replace the demo page with a **Website Audit Report** that shows what's *wrong* with their current site, displays real portfolio work, and drives them to schedule a call. All scraped data (PageSpeed, AI pain points, tech stack, screenshots) is already in the DB — we just need to present it differently.

## Changes Summary

| Area | What Changes |
|------|-------------|
| Route | `/demo/[token]` → `/audit/[token]` + redirect for old links |
| Components | Delete `components/demo/` (963-line DemoVariations + 2 helpers) → new `components/audit/` (AuditReport, AuditBanner, AuditViewTracker) |
| Backend query | `getDemoData` (slim) → `getAuditData` (returns pageSpeed, painPoints, tech, screenshot, etc.) |
| Backend email | `sendMockupEmail` → `sendAuditEmail` (new template), update `sendFollowUpEmail` copy |
| Backend search | `triggerMockupEmail` → `triggerAuditEmail`, update prospect summary text |
| Backend pipeline | Change screenshot URL from `/demo/` to `/audit/` |
| Admin UI | Relabel buttons/links (mockup→audit, demo→audit) |
| Global header | `"/demo"` path check → `"/audit"` |
| DB schema | **No changes** — keep `demoToken`, `demoScreenshotUrl`, `demoViewedAt` field names |

## Implementation Steps

### 1. `convex/marketing/public.ts` — New query + renamed mutation

- Add `getAuditData` query returning expanded data:
  - `businessName`, `description`, `phone`, `websiteUrl`, `address`, `rating`, `reviewCount`
  - `screenshotUrl`, `technology`, `isHttps` (from websiteData)
  - `performanceScore`, `fcp`, `lcp`, `cls` (from pageSpeedData)
  - `painPoints[]`, `sellingPoints[]`, `outreachAngle` (from aiAnalysis)
  - `review`, `demoViewedAt`
- Add `recordAuditView` mutation (same logic as `recordDemoView`)
- Delete old `getDemoData` and `recordDemoView`

### 2. `convex/marketing/emails.ts` — New audit email + updated follow-up

**Replace `sendMockupEmail` with `sendAuditEmail`:**
- Subject: `"{businessName}: we found issues with your website"`
- Header: `"Free Website Audit for {businessName}"`
- Body: Speed score callout → key issues list (painPoints) → tech callout → CTA "See Your Full Audit Report" → $199/mo plan info box
- Update `getDemoUrl` → `getAuditUrl` (path `/audit/`)

**Update `sendFollowUpEmail`:**
- Subject: `"{businessName}: your website audit is still available"`
- Body copy references "audit report" instead of "preview"
- CTA: "View Your Audit Report"

### 3. `convex/marketing/search.ts` — Rename trigger + update prospect summary

- Rename `triggerMockupEmail` → `triggerAuditEmail` (calls `sendAuditEmail`)
- Update `summarizeLeadForProspect()`: "Audit link: /audit/..." instead of "Demo link: /demo/..."

### 4. `convex/marketing/pipeline.ts` — Screenshot URL

- Line ~770: Change `/demo/${lead.demoToken}` → `/audit/${lead.demoToken}`

### 5. `components/audit/AuditReport.tsx` — New main component (~300-400 lines)

Sections top to bottom:
1. **Header** — Dark gradient with businessName, address, rating stars, review count
2. **Current Site Screenshot** — Their site screenshot + URL, or "No website" state
3. **Performance Scorecard** — SVG circular gauge for speed score + FCP/LCP/CLS metric cards with color-coded thresholds
4. **Issues Found** — AI pain points as list items + tech platform warning + HTTPS warning + speed warning
5. **Portfolio Section** — "What a Modern Site Looks Like" with 2-3 hardcoded portfolio examples (e.g., tbtreeservice.org)
6. **CTA Section** — "Ready to Fix These Issues?" + $199/mo pitch + Cal.com scheduling button
7. Bottom padding for fixed banner

### 6. `components/audit/AuditBanner.tsx` — Updated fixed banner

- Text: "Free audit by **Acadiana Web Design**"
- Button: "Schedule a Free Consultation"
- UTM params: `utm_source=audit`

### 7. `components/audit/AuditViewTracker.tsx` — Renamed tracker

- Same logic, calls `recordAuditView` instead of `recordDemoView`

### 8. `app/audit/[token]/page.tsx` — New route

- Server component calling `getAuditData`
- Renders AuditViewTracker + AuditReport + AuditBanner

### 9. `app/admin/marketing/page.tsx` — Relabel UI

- "Send Mockup Email" → "Send Audit Email"
- `/demo/{token}` links → `/audit/{token}`
- "Demo Viewed" → "Audit Viewed"
- "View Demo Page" → "View Audit Report"
- Handler rename: `handleSendMockupEmail` → `handleSendAuditEmail`

### 10. `app/admin/marketing/call/page.tsx` — Relabel

- `/demo/` → `/audit/`, "Open Demo" → "Open Audit"

### 11. `components/global-header.tsx` — Path check

- `pathname.startsWith("/demo")` → `pathname.startsWith("/audit")`
- Rename variable `isDemo` → `isAudit`

### 12. `next.config.ts` — Redirect old demo URLs

Add redirect: `/demo/:token` → `/audit/:token` (permanent) so existing emailed links still work.

### 13. Delete old files

- Delete `app/demo/[token]/page.tsx`
- Delete `components/demo/DemoVariations.tsx`
- Delete `components/demo/DemoBanner.tsx`
- Delete `components/demo/DemoViewTracker.tsx`
- Delete `components/demo/` directory

## Verification

1. `bun run build` — confirms no broken imports or type errors
2. Visit `/audit/{existing-token}` — should render the audit report with real data
3. Visit `/demo/{existing-token}` — should redirect to `/audit/{token}`
4. Admin UI: "Send Audit Email" button should queue the new email template
5. Admin UI: "View Audit Report" link should open `/audit/{token}`
6. Check email HTML renders correctly (speed score, pain points, CTA)
