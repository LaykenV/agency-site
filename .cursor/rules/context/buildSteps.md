# Agency Update Build Steps

**Purpose:** Step-by-step implementation guide for `agencyUpdate.md`  
**Prerequisite:** Read `agencyUpdate.md` for full context  
**Estimated Total Time:** 4-6 hours

---

## Overview

This document breaks down the implementation into 5 phases:

1. **Schema Updates** - Add new tables for client leads and analytics
2. **Rate Limiter Setup** - Install and configure rate limiting component
3. **HTTP Endpoints & Internal Functions** - Create lead ingestion and analytics APIs
4. **Email Notifications** - Add lead notification email template
5. **Portal UI Updates** - Display leads and analytics in client portal

---

## Phase 1: Schema Updates

**Files to modify:**
- `convex/schema.ts`

**Files to create:**
- None

### Step 1.1: Add `client_leads` Table

Add to `convex/schema.ts` after the `edit_requests` table:

```typescript
client_leads: defineTable({
  projectId: v.string(), // Human-readable slug, matches waas.projectId in template config
  status: v.union(
    v.literal("new"),
    v.literal("contacted"),
    v.literal("qualified"),
    v.literal("won"),
    v.literal("lost")
  ),
  source: v.string(), // "contact-form", "footer-form", "phone"
  data: v.object({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.optional(v.string()),
  }),
  createdAt: v.number(),
})
  .index("by_projectId", ["projectId"])
  .index("by_projectId_status", ["projectId", "status"])
  .index("by_createdAt", ["createdAt"]),
```

### Step 1.2: Add `client_analytics` Table

Add to `convex/schema.ts` after `client_leads`:

```typescript
client_analytics: defineTable({
  projectId: v.string(), // Human-readable slug
  date: v.string(), // YYYY-MM-DD
  pageViews: v.number(),
  topPages: v.array(v.object({ path: v.string(), views: v.number() })),
})
  .index("by_project_date", ["projectId", "date"]),
```

### Step 1.3: Deploy Schema

Run `npx convex dev` or push to deploy the schema changes.

**Checkpoint:** Both tables should appear in the Convex dashboard.

---

## Phase 2: Rate Limiter Setup

**Files to modify:**
- `convex/convex.config.ts`
- `package.json` (via bun add)

**Files to create:**
- `convex/rateLimiter.ts`

### Step 2.1: Install Rate Limiter Package

```bash
bun add @convex-dev/rate-limiter
```

### Step 2.2: Register Rate Limiter Component

Update `convex/convex.config.ts` to add the rate limiter:

**Current file:**
```typescript
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import betterAuth from "@convex-dev/better-auth/convex.config";
import resend from "@convex-dev/resend/convex.config";
import polar from "@convex-dev/polar/convex.config";

const app = defineApp();
app.use(agent);
app.use(betterAuth);
app.use(resend);
app.use(polar);
export default app;
```

**Add this import and usage:**
```typescript
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
// ... existing imports

app.use(rateLimiter);
```

### Step 2.3: Create Rate Limiter Definitions

Create `convex/rateLimiter.ts`:

```typescript
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Lead form submissions: 5 per minute per project+IP
  leadSubmission: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  // Analytics pixel: 60 per minute per project (high volume expected)
  analyticsPixel: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 60 },
});
```

**Checkpoint:** Run `npx convex dev` - rate limiter should initialize without errors.

---

## Phase 3: HTTP Endpoints & Internal Functions

**Files to modify:**
- `convex/http.ts`
- `convex/projects.ts`

**Files to create:**
- `convex/clientLeads.ts`
- `convex/clientAnalytics.ts`

### Step 3.1: Add Internal Query to Projects

Add to `convex/projects.ts`:

```typescript
// Add to imports at top
import { internalQuery } from "./_generated/server";

// Add this new internal query (used by HTTP actions)
export const getByProjectIdSlug = internalQuery({
  args: { projectId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("projects"),
      projectId: v.string(),
      projectStatus: v.optional(projectStatusValidator),
      authUserId: v.string(),
      prospectId: v.optional(v.id("prospects")),
      deployment: v.optional(deploymentValidator),
    }),
    v.null()
  ),
  handler: async (ctx, { projectId }) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    
    if (!project) return null;
    
    return {
      _id: project._id,
      projectId: project.projectId,
      projectStatus: project.projectStatus,
      authUserId: project.authUserId,
      prospectId: project.prospectId,
      deployment: project.deployment,
    };
  },
});
```

### Step 3.2: Create Client Leads Functions

Create `convex/clientLeads.ts`:

```typescript
import { v } from "convex/values";
import { internalMutation, query, mutation } from "./_generated/server";
import { authComponent } from "./auth";

// Lead status type for reuse
const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("won"),
  v.literal("lost")
);

// Internal: Create a new lead (called from HTTP action)
export const create = internalMutation({
  args: {
    projectId: v.string(),
    source: v.string(),
    data: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      message: v.optional(v.string()),
    }),
  },
  returns: v.id("client_leads"),
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert("client_leads", {
      projectId: args.projectId,
      status: "new",
      source: args.source,
      data: args.data,
      createdAt: Date.now(),
    });
    return leadId;
  },
});

// Query: List leads for a project (for client portal)
export const listByProject = query({
  args: {
    projectId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(leadStatusValidator),
  },
  returns: v.array(v.object({
    _id: v.id("client_leads"),
    projectId: v.string(),
    status: leadStatusValidator,
    source: v.string(),
    data: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      message: v.optional(v.string()),
    }),
    createdAt: v.number(),
  })),
  handler: async (ctx, { projectId, limit, status }) => {
    // Verify user owns this project
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) return [];

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    
    if (!project || project.authUserId !== user._id) {
      return [];
    }

    const leads = await ctx.db
      .query("client_leads")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc")
      .take(limit || 50);

    // Filter by status if provided
    const filtered = status ? leads.filter((l) => l.status === status) : leads;

    return filtered;
  },
});

// Query: Get lead counts by status (for dashboard stats)
export const getCountsByStatus = query({
  args: { projectId: v.string() },
  returns: v.object({
    new: v.number(),
    contacted: v.number(),
    qualified: v.number(),
    won: v.number(),
    lost: v.number(),
    total: v.number(),
  }),
  handler: async (ctx, { projectId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0, total: 0 };
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    
    if (!project || project.authUserId !== user._id) {
      return { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0, total: 0 };
    }

    const leads = await ctx.db
      .query("client_leads")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .collect();

    const counts = {
      new: 0,
      contacted: 0,
      qualified: 0,
      won: 0,
      lost: 0,
      total: leads.length,
    };

    for (const lead of leads) {
      counts[lead.status]++;
    }

    return counts;
  },
});
```

### Step 3.3: Create Client Analytics Functions

Create `convex/clientAnalytics.ts`:

```typescript
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Internal: Record a page view (called from HTTP action)
export const recordPageView = internalMutation({
  args: {
    projectId: v.string(),
    path: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { projectId, path }) => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Find or create today's record
    const existing = await ctx.db
      .query("client_analytics")
      .withIndex("by_project_date", (q) =>
        q.eq("projectId", projectId).eq("date", today)
      )
      .first();

    if (existing) {
      // Update existing record
      const topPages = [...existing.topPages];
      const pageIndex = topPages.findIndex((p) => p.path === path);

      if (pageIndex >= 0) {
        topPages[pageIndex].views++;
      } else {
        topPages.push({ path, views: 1 });
      }

      // Sort by views and keep top 10
      topPages.sort((a, b) => b.views - a.views);
      const trimmedTopPages = topPages.slice(0, 10);

      await ctx.db.patch(existing._id, {
        pageViews: existing.pageViews + 1,
        topPages: trimmedTopPages,
      });
    } else {
      // Create new record for today
      await ctx.db.insert("client_analytics", {
        projectId,
        date: today,
        pageViews: 1,
        topPages: [{ path, views: 1 }],
      });
    }

    return null;
  },
});

// Query: Get analytics summary for client portal
export const getSummary = query({
  args: { projectId: v.string() },
  returns: v.object({
    thisMonth: v.object({
      pageViews: v.number(),
      topPages: v.array(v.object({ path: v.string(), views: v.number() })),
    }),
    trend: v.number(),
  }),
  handler: async (ctx, { projectId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return { thisMonth: { pageViews: 0, topPages: [] }, trend: 0 };
    }

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    
    if (!project || project.authUserId !== user._id) {
      return { thisMonth: { pageViews: 0, topPages: [] }, trend: 0 };
    }

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7); // "2026-01"
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    // Get this month's data
    const thisMonthData = await ctx.db
      .query("client_analytics")
      .withIndex("by_project_date", (q) =>
        q.eq("projectId", projectId).gte("date", `${thisMonth}-01`)
      )
      .collect();

    // Get last month's data
    const lastMonthData = await ctx.db
      .query("client_analytics")
      .withIndex("by_project_date", (q) =>
        q
          .eq("projectId", projectId)
          .gte("date", `${lastMonth}-01`)
          .lt("date", `${thisMonth}-01`)
      )
      .collect();

    const thisMonthViews = thisMonthData.reduce((sum, d) => sum + d.pageViews, 0);
    const lastMonthViews = lastMonthData.reduce((sum, d) => sum + d.pageViews, 0);

    // Aggregate top pages across all days this month
    const pageViewMap = new Map<string, number>();
    for (const day of thisMonthData) {
      for (const page of day.topPages) {
        pageViewMap.set(page.path, (pageViewMap.get(page.path) || 0) + page.views);
      }
    }
    const topPages = Array.from(pageViewMap.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const trend =
      lastMonthViews > 0
        ? Math.round(((thisMonthViews - lastMonthViews) / lastMonthViews) * 100)
        : 0;

    return {
      thisMonth: { pageViews: thisMonthViews, topPages },
      trend,
    };
  },
});

// Query: Get daily analytics for chart display
export const getDailyStats = query({
  args: {
    projectId: v.string(),
    days: v.optional(v.number()),
  },
  returns: v.array(v.object({ date: v.string(), pageViews: v.number() })),
  handler: async (ctx, { projectId, days = 30 }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) return [];

    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    
    if (!project || project.authUserId !== user._id) {
      return [];
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().slice(0, 10);

    const data = await ctx.db
      .query("client_analytics")
      .withIndex("by_project_date", (q) =>
        q.eq("projectId", projectId).gte("date", startDateStr)
      )
      .collect();

    return data.map((d) => ({
      date: d.date,
      pageViews: d.pageViews,
    }));
  },
});
```

### Step 3.4: Update HTTP Router

Update `convex/http.ts` to add the new endpoints:

**Add these imports at the top:**
```typescript
import { rateLimiter } from "./rateLimiter";
```

**Add these helper and routes before `export default http;`:**

```typescript
// ============================================================================
// CORS HELPER FOR CLIENT SITES
// ============================================================================
// SECURITY: Validate against explicit liveUrl and stagingUrl only.
// Do NOT use wildcards like .vercel.app - that would allow any Vercel
// deployment to submit leads/analytics for any project.
// ============================================================================

function getCorsHeaders(
  liveUrl: string | null | undefined,
  stagingUrl: string | null | undefined,
  origin: string | null
) {
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }

  // Check if origin matches the project's liveUrl (with or without www)
  const matchesLive =
    liveUrl &&
    (origin === `https://${liveUrl}` || origin === `https://www.${liveUrl}`);

  // Check if origin matches the project's configured stagingUrl exactly
  const matchesStaging =
    stagingUrl &&
    (origin === `https://${stagingUrl}` || origin === stagingUrl);

  const allowedOrigin = matchesLive || matchesStaging ? origin : null;

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// ============================================================================
// LEAD INGESTION ENDPOINT
// ============================================================================

http.route({
  path: "/api/ingest-lead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    
    let body: { projectId?: string; source?: string; data?: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const projectId = body.projectId as string;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing projectId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Validate projectId exists and is LIVE or IN_REVIEW
    const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
      projectId,
    });

    if (!project) {
      return new Response(JSON.stringify({ error: "Invalid project" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Allow LIVE and IN_REVIEW for testing
    const allowedStatuses = ["LIVE", "IN_REVIEW"];
    if (!allowedStatuses.includes(project.projectStatus ?? "")) {
      return new Response(JSON.stringify({ error: "Project not accepting leads" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const corsHeaders = getCorsHeaders(
      project.deployment?.liveUrl,
      project.deployment?.stagingUrl,
      origin
    );

    // 2. Validate origin matches project's liveUrl or stagingUrl
    if (!corsHeaders["Access-Control-Allow-Origin"]) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Rate limit by IP (5 leads per minute per project per IP)
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown";

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "leadSubmission", {
      key: `${projectId}:${ip}`,
    });

    if (!ok) {
      return new Response(JSON.stringify({ error: "Rate limited", retryAfter }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Validate lead data structure
    const leadData = body.data as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    if (!leadData?.name || !leadData?.email) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Insert lead
    const leadId = await ctx.runMutation(internal.clientLeads.create, {
      projectId,
      source: (body.source as string) || "contact-form",
      data: {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        message: leadData.message,
      },
    });

    // 6. Trigger email notification (fire and forget)
    ctx.runAction(internal.emails.sendLeadNotification, {
      projectId,
      leadId,
      leadData: {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        message: leadData.message,
      },
    }).catch((err) => {
      console.error("[http] Failed to send lead notification email:", err);
    });

    return new Response(JSON.stringify({ success: true, leadId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// ============================================================================
// ANALYTICS PIXEL ENDPOINT
// ============================================================================

http.route({
  path: "/api/analytics/pixel",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    
    let body: { projectId?: string; path?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(null, { status: 400 });
    }

    const projectId = body.projectId as string;
    if (!projectId) {
      return new Response(null, { status: 400 });
    }

    // Validate projectId exists
    const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
      projectId,
    });

    if (!project) {
      return new Response(null, { status: 400 });
    }

    const corsHeaders = getCorsHeaders(
      project.deployment?.liveUrl,
      project.deployment?.stagingUrl,
      origin
    );

    // Validate origin
    if (!corsHeaders["Access-Control-Allow-Origin"]) {
      return new Response(null, { status: 403 });
    }

    // Rate limit analytics (higher limit, per project)
    const { ok } = await rateLimiter.limit(ctx, "analyticsPixel", {
      key: projectId,
    });

    if (!ok) {
      return new Response(null, { status: 429, headers: corsHeaders });
    }

    // Record page view
    await ctx.runMutation(internal.clientAnalytics.recordPageView, {
      projectId,
      path: body.path || "/",
    });

    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// ============================================================================
// CORS PREFLIGHT HANDLERS
// ============================================================================
// Note: Preflight handlers are intentionally permissive because we cannot
// validate the origin against project-specific URLs during OPTIONS requests
// (the projectId is in the POST body, not the URL). The actual POST handlers
// perform strict origin validation using getCorsHeaders() and return 403 +
// empty CORS headers for invalid origins. Browsers will block the response
// from JavaScript when CORS headers don't match, preventing data exfiltration.
// Non-browser clients bypass CORS anyway, so server-side validation in POST
// handlers is the real security boundary.
// ============================================================================

const handleClientApiPreflight = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("origin");
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  return new Response(null, { status: 204, headers });
});

http.route({ path: "/api/ingest-lead", method: "OPTIONS", handler: handleClientApiPreflight });
http.route({ path: "/api/analytics/pixel", method: "OPTIONS", handler: handleClientApiPreflight });
```

**Checkpoint:** Run `npx convex dev` and test endpoints via curl or Postman.

---

## Phase 4: Email Notifications ✅ COMPLETED

**Status:** Implemented on January 11, 2026

**Files modified:**
- `convex/emails.ts` - Added `sendLeadNotification` internal action
- `convex/http.ts` - Wired up email trigger in lead ingestion endpoint

### Implementation Summary

The `sendLeadNotification` action sends a beautiful HTML email to clients when new leads are submitted:

**Email Features:**
- Green gradient header with celebration emoji
- Personalized greeting using client's name
- Lead details in a clean card layout (Name, Email, Phone, Message)
- Quick action buttons: "Reply to [Name]" and "Call Now" (if phone provided)
- Dark "View All Leads in Portal" CTA button
- Pro tip callout about responding within 5 minutes for 9x conversion
- HTML escaping to prevent XSS attacks from malicious lead data

**Key Implementation Details:**

```typescript
export const sendLeadNotification = internalAction({
  args: {
    projectId: v.string(),
    leadId: v.id("client_leads"),
    leadData: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      message: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Get project to find prospectId
    const project = await ctx.runQuery(internal.projects.getByProjectIdSlug, {
      projectId: args.projectId,
    });

    // 2. Get prospect details using existing internalGetProspectById
    const prospect = await ctx.runQuery(internal.prospects.internalGetProspectById, {
      prospectId: project.prospectId,
    });

    // 3. Build beautiful HTML email with escaped lead data
    // 4. Send via resend.sendEmail()
  },
});
```

**HTTP Endpoint Integration (fire and forget):**

```typescript
// In lead ingestion endpoint, after inserting lead:
ctx.runAction(internal.emails.sendLeadNotification, {
  projectId,
  leadId,
  leadData: { name, email, phone, message },
}).catch((err) => {
  console.error("[http] Failed to send lead notification email:", err);
});
```

**Checkpoint:** Trigger a test lead via the HTTP endpoint and verify email is sent.

---

## Phase 5: Portal UI Updates

**Files to modify:**
- `app/portal/[projectId]/page.tsx`

**Files to create:**
- `components/portal/AnalyticsSummary.tsx`
- `components/portal/RecentLeads.tsx`

### Step 5.1: Create Analytics Summary Component

Create `components/portal/AnalyticsSummary.tsx`:

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AnalyticsSummaryProps {
  projectId: string;
}

export function AnalyticsSummary({ projectId }: AnalyticsSummaryProps) {
  const summary = useQuery(api.clientAnalytics.getSummary, { projectId });

  if (!summary) {
    return (
      <div className="surface p-6 rounded-2xl animate-pulse">
        <div className="h-5 w-24 rounded bg-[hsl(var(--secondary))]" />
        <div className="mt-4 h-8 w-32 rounded bg-[hsl(var(--secondary))]" />
      </div>
    );
  }

  const trendIcon = summary.trend > 0 ? "↑" : summary.trend < 0 ? "↓" : "→";
  const trendColor =
    summary.trend > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : summary.trend < 0
      ? "text-red-600 dark:text-red-400"
      : "text-[var(--secondary)]";

  return (
    <div className="surface p-6 rounded-2xl">
      <h3 className="text-lg font-semibold mb-4">Website Analytics</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">
          {summary.thisMonth.pageViews.toLocaleString()}
        </span>
        <span className="text-[var(--secondary)]">page views this month</span>
      </div>
      <div className={`mt-2 text-sm ${trendColor}`}>
        {trendIcon} {Math.abs(summary.trend)}% vs last month
      </div>
      {summary.thisMonth.topPages.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-[var(--secondary)] mb-3">
            Top Pages
          </h4>
          <ul className="space-y-2">
            {summary.thisMonth.topPages.slice(0, 5).map((page) => (
              <li
                key={page.path}
                className="flex justify-between text-sm items-center"
              >
                <span className="truncate text-[var(--foreground)]">
                  {page.path}
                </span>
                <span className="text-[var(--secondary)] tabular-nums ml-4">
                  {page.views.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Step 5.2: Create Recent Leads Component

Create `components/portal/RecentLeads.tsx`:

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface RecentLeadsProps {
  projectId: string;
  limit?: number;
}

const statusColors: Record<string, string> = {
  new: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  qualified: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export function RecentLeads({ projectId, limit = 5 }: RecentLeadsProps) {
  const leads = useQuery(api.clientLeads.listByProject, { projectId, limit });

  if (!leads) {
    return (
      <div className="surface p-6 rounded-2xl animate-pulse">
        <div className="h-5 w-32 rounded bg-[hsl(var(--secondary))]" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-[hsl(var(--secondary))]" />
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="surface p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4">Recent Leads</h3>
        <p className="text-sm text-[var(--secondary)]">
          No leads yet. They&apos;ll appear here when visitors submit your contact
          form.
        </p>
      </div>
    );
  }

  return (
    <div className="surface p-6 rounded-2xl">
      <h3 className="text-lg font-semibold mb-4">Recent Leads</h3>
      <ul className="divide-y divide-[var(--border)]">
        {leads.map((lead) => (
          <li key={lead._id} className="py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{lead.data.name}</p>
              <p className="text-sm text-[var(--secondary)] truncate">
                {lead.data.email}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span
                className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                  statusColors[lead.status] || statusColors.new
                }`}
              >
                {lead.status}
              </span>
              <span className="text-xs text-[var(--secondary)] whitespace-nowrap">
                {new Date(lead.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Step 5.3: Update Portal Page for LIVE Projects

Modify `app/portal/[projectId]/page.tsx`:

**Add imports at the top:**
```typescript
import { AnalyticsSummary } from "@/components/portal/AnalyticsSummary";
import { RecentLeads } from "@/components/portal/RecentLeads";
```

**Update the `LiveSupportPanel` component to include the new sections:**

Find the `LiveSupportPanel` function and add the analytics and leads components after the "Your Site is Live!" banner:

```typescript
function LiveSupportPanel({
  projectId,
  liveUrl,
  domainPreference,
  editRequests = [],
}: {
  projectId: Id<"projects">;
  liveUrl?: string;
  domainPreference?: string;
  editRequests?: EditRequest[];
}) {
  // Get the project's slug for analytics/leads queries
  const params = useParams();
  const projectSlug = params?.projectId as string;

  const absoluteLiveUrl = liveUrl
    ? liveUrl.startsWith('http://') || liveUrl.startsWith('https://')
      ? liveUrl
      : `https://${liveUrl}`
    : undefined;

  return (
    <div className="space-y-6">
      {/* Existing "Your Site is Live!" banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-600/20 p-6">
        {/* ... existing content ... */}
      </div>

      {/* NEW: Analytics and Leads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsSummary projectId={projectSlug} />
        <RecentLeads projectId={projectSlug} limit={5} />
      </div>

      {/* Existing support request form */}
      <div className="surface p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4">Request Edits or Support</h3>
        <SupportRequestForm projectId={projectId} />
      </div>

      <EditRequestsList projectId={projectId} editRequests={editRequests} />
    </div>
  );
}
```

**Checkpoint:** Navigate to a LIVE project in the portal and verify analytics and leads sections appear.

---

## Final Checklist

### Schema (Phase 1) ✅
- [x] Added `client_leads` table
- [x] Added `client_analytics` table
- [x] Deployed schema changes

### Rate Limiter (Phase 2) ✅
- [x] Installed `@convex-dev/rate-limiter`
- [x] Updated `convex.config.ts`
- [x] Created `rateLimiter.ts`

### HTTP Endpoints (Phase 3) ✅
- [x] Added `getByProjectIdSlug` to projects.ts
- [x] Created `clientLeads.ts` with CRUD functions
- [x] Created `clientAnalytics.ts` with recording and summary functions
- [x] Added `/api/ingest-lead` endpoint with CORS and rate limiting
- [x] Added `/api/analytics/pixel` endpoint with CORS and rate limiting
- [x] Added OPTIONS handlers for preflight requests
- [x] **Security fix:** CORS validates against explicit `stagingUrl` (no wildcards)

### Email Notifications (Phase 4) ✅
- [x] Added `sendLeadNotification` action to emails.ts
- [x] Beautiful HTML template with quick actions and pro tip
- [x] HTML escaping for XSS prevention
- [x] Fire-and-forget trigger from HTTP endpoint

### Portal UI (Phase 5)
- [ ] Created `AnalyticsSummary` component
- [ ] Created `RecentLeads` component
- [ ] Updated LIVE project portal to show analytics and leads

### Testing
- [ ] Test lead submission from client site (or curl)
- [ ] Test analytics pixel from client site (or curl)
- [ ] Verify lead notification email is sent
- [ ] Verify leads appear in portal
- [ ] Verify analytics appear in portal

---

## Post-Implementation Notes

1. **Client Site Configuration:** Each deployed client site needs `NEXT_PUBLIC_WAAS_API_URL` set to your Convex deployment URL.

2. **CORS Validation:** Leads will only be accepted from origins matching the project's `deployment.liveUrl` or `deployment.stagingUrl`. No wildcards are used for security.

3. **Rate Limiting:** Leads are limited to 5/minute per project+IP. Analytics are 60/minute per project.

4. **Email From Address:** Update `leads@acadianawebdesign.com` if using a different domain.

5. **Preflight Handlers:** CORS preflight (OPTIONS) is permissive by design since projectId is in POST body. Actual POST handlers perform strict validation.

---

**Document Version:** 1.1  
**Last Updated:** January 11, 2026  
**Status:** Phases 1-4 Complete, Phase 5 Pending
