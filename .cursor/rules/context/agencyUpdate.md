# Agency Backend Updates (WaaS Hub)

**Document Version:** 1.0  
**Last Updated:** January 3, 2026  
**Related:** `agency.md` (core blueprint), `updatedTemplatePlan.md` (client template)

---

## Overview

This document outlines the backend updates required to support the client template system. These changes are made to the **agency Convex backend** (the Hub), not the individual client template sites (the Spokes).

---

## I. New Schema Tables

Add these tables to the existing `convex/schema.ts`:

### 1. Client Leads Table

Centralized storage for leads submitted from all client sites.

```typescript
// convex/schema.ts - Add to existing schema

client_leads: defineTable({
  projectId: v.string(), // Public project identifier (currently a generated UUID string), matches waas.projectId in template config
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

### 2. Client Analytics Table

Daily aggregates for page views from client sites.

```typescript
// convex/schema.ts - Add to existing schema

client_analytics: defineTable({
  projectId: v.string(), // Public project identifier (currently a generated UUID string)
  date: v.string(), // YYYY-MM-DD
  pageViews: v.number(),
  topPages: v.array(v.object({ path: v.string(), views: v.number() })),
})
  .index("by_project_date", ["projectId", "date"]),
```

---

## II. Rate Limiter Setup

We use the `@convex-dev/rate-limiter` component for efficient, transactional rate limiting.

### Installation

```bash
bun add @convex-dev/rate-limiter
```

### Convex Config (`convex/convex.config.ts`)

```typescript
import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(rateLimiter);

export default app;
```

### Rate Limiter Definitions (`convex/rateLimiter.ts`)

```typescript
import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Lead form submissions: 5 per minute per project+IP
  leadSubmission: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  // Analytics pixel: 60 per minute per project (high volume expected)
  analyticsPixel: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 60 },
});
```

---

## III. HTTP Actions (Public Endpoints)

These endpoints receive data from client template sites.

### HTTP Router (`convex/http.ts`)

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { rateLimiter } from "./rateLimiter";

const http = httpRouter();

// Helper to build CORS headers using project's liveUrl and stagingUrl
// SECURITY: We validate against explicit URLs only - no wildcards
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

// Lead Ingestion Endpoint
http.route({
  path: "/api/ingest-lead",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const body = await request.json();
    const projectId = body.projectId as string;
    
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
    const ip = request.headers.get("cf-connecting-ip") || 
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

    // 4. Insert lead
    const leadId = await ctx.runMutation(internal.clientLeads.create, {
      projectId,
      source: body.source || "contact-form",
      data: body.data,
    });

    // 5. Trigger email notification (fire and forget)
    ctx.runAction(internal.emails.sendLeadNotification, {
      projectId,
      leadId,
      leadData: body.data,
    }).catch((err) => {
      console.error("[http] Failed to send lead notification email:", err);
    });

    return new Response(JSON.stringify({ success: true, leadId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }),
});

// Analytics Pixel Endpoint
http.route({
  path: "/api/analytics/pixel",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    const body = await request.json();
    const projectId = body.projectId as string;
    
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

// CORS Preflight handler (shared for both endpoints)
// Note: Preflight is intentionally permissive since projectId is in POST body.
// The actual POST handlers perform strict origin validation.
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

export default http;
```

---

## IV. Internal Functions

### Client Leads Functions (`convex/clientLeads.ts`)

```typescript
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

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
  handler: async (ctx, args) => {
    await ctx.db.insert("client_leads", {
      projectId: args.projectId,
      status: "new",
      source: args.source,
      data: args.data,
      createdAt: Date.now(),
    });
  },
});

// Query: List leads for a project (for client portal)
export const listByProject = query({
  args: { 
    projectId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, limit, status }) => {
    // Verify user owns this project
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    if (!project || project.authUserId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    
    let query = ctx.db
      .query("client_leads")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .order("desc");
    
    const leads = await query.take(limit || 50);
    
    if (status) {
      return leads.filter(l => l.status === status);
    }
    return leads;
  },
});

// Query: Get lead counts by status
export const getCountsByStatus = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    // Verify ownership...
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    if (!project || project.authUserId !== identity.subject) {
      throw new Error("Unauthorized");
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

### Client Analytics Functions (`convex/clientAnalytics.ts`)

```typescript
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

// Internal: Record a page view (called from HTTP action)
export const recordPageView = internalMutation({
  args: {
    projectId: v.string(),
    path: v.string(),
  },
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
      const pageIndex = topPages.findIndex(p => p.path === path);
      
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
  },
});

// Query: Get analytics summary for client portal
export const getSummary = query({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    // Verify ownership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    if (!project || project.authUserId !== identity.subject) {
      throw new Error("Unauthorized");
    }
    
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7); // "2026-01"
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString().slice(0, 7);
    
    const thisMonthData = await ctx.db
      .query("client_analytics")
      .withIndex("by_project_date", (q) => 
        q.eq("projectId", projectId).gte("date", `${thisMonth}-01`)
      )
      .collect();
    
    const lastMonthData = await ctx.db
      .query("client_analytics")
      .withIndex("by_project_date", (q) => 
        q.eq("projectId", projectId)
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
    
    return {
      thisMonth: {
        pageViews: thisMonthViews,
        topPages,
      },
      trend: lastMonthViews > 0 
        ? Math.round(((thisMonthViews - lastMonthViews) / lastMonthViews) * 100)
        : 0,
    };
  },
});

// Query: Get daily analytics for chart display
export const getDailyStats = query({
  args: { 
    projectId: v.string(),
    days: v.optional(v.number()), // Default 30
  },
  handler: async (ctx, { projectId, days = 30 }) => {
    // Verify ownership...
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
    if (!project || project.authUserId !== identity.subject) {
      throw new Error("Unauthorized");
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

    return data.map(d => ({
      date: d.date,
      pageViews: d.pageViews,
    }));
  },
});
```

### Project Query Update (`convex/projects.ts`)

Add this internal query to support the HTTP actions:

```typescript
// Internal: Get project by projectId slug (for HTTP actions)
export const getByProjectId = internalQuery({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", projectId))
      .first();
  },
});
```

---

## V. Email Notifications

### Lead Notification Email (`convex/emails.ts`)

Add this internal action to send email notifications when a new lead is received:

```typescript
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendLeadNotification = internalAction({
  args: {
    projectId: v.string(),
    lead: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      message: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { projectId, lead }) => {
    // Get project details to find client email
    const project = await ctx.runQuery(internal.projects.getByProjectId, { projectId });
    if (!project) return;

    // Get the prospect/client email
    const prospect = project.prospectId 
      ? await ctx.runQuery(internal.prospects.get, { id: project.prospectId })
      : null;

    const clientEmail = prospect?.details.contactEmail;
    if (!clientEmail) return;

    // Send notification email
    await resend.emails.send({
      from: "leads@youragency.com",
      to: clientEmail,
      subject: `New Lead: ${lead.name}`,
      html: `
        <h2>New Lead from Your Website</h2>
        <p><strong>Name:</strong> ${lead.name}</p>
        <p><strong>Email:</strong> ${lead.email}</p>
        ${lead.phone ? `<p><strong>Phone:</strong> ${lead.phone}</p>` : ""}
        ${lead.message ? `<p><strong>Message:</strong> ${lead.message}</p>` : ""}
        <hr>
        <p><a href="https://youragency.com/portal">View in Portal</a></p>
      `,
    });
  },
});
```

---

## VI. Client Portal Updates

### Portal Features for LIVE Projects

When a project status is `LIVE`, add these sections to the client portal:

```typescript
// In /portal/[projectId]/page.tsx - add these sections for LIVE projects:

// 1. Analytics Summary Card
<AnalyticsSummary projectId={project.projectId} />
// Shows: This month page views, trend vs last month

// 2. Recent Leads Card  
<RecentLeads projectId={project.projectId} limit={5} />
// Shows: Last 5 leads with name, email, date (no lead status UI initially)

// 3. Leads List (expandable)
<LeadsList projectId={project.projectId} />
// Full list with search, filter by status, pagination
```

### Analytics Summary Component

```typescript
// components/portal/AnalyticsSummary.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AnalyticsSummaryProps {
  projectId: string;
}

export function AnalyticsSummary({ projectId }: AnalyticsSummaryProps) {
  const summary = useQuery(api.clientAnalytics.getSummary, { projectId });

  if (!summary) return <div>Loading analytics...</div>;

  const trendIcon = summary.trend > 0 ? "↑" : summary.trend < 0 ? "↓" : "→";
  const trendColor = summary.trend > 0 ? "text-green-600" : summary.trend < 0 ? "text-red-600" : "text-gray-600";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Analytics</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{summary.thisMonth.pageViews.toLocaleString()}</span>
        <span className="text-gray-500">page views this month</span>
      </div>
      <div className={`mt-2 ${trendColor}`}>
        {trendIcon} {Math.abs(summary.trend)}% vs last month
      </div>
      {summary.thisMonth.topPages.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Top Pages</h4>
          <ul className="space-y-1">
            {summary.thisMonth.topPages.slice(0, 5).map((page) => (
              <li key={page.path} className="flex justify-between text-sm">
                <span className="truncate">{page.path}</span>
                <span className="text-gray-500">{page.views}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Recent Leads Component

```typescript
// components/portal/RecentLeads.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface RecentLeadsProps {
  projectId: string;
  limit?: number;
}

export function RecentLeads({ projectId, limit = 5 }: RecentLeadsProps) {
  const leads = useQuery(api.clientLeads.listByProject, { projectId, limit });

  if (!leads) return <div>Loading leads...</div>;

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Leads</h3>
        <p className="text-gray-500">No leads yet. They'll appear here when visitors submit your contact form.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Leads</h3>
      <ul className="divide-y">
        {leads.map((lead) => (
          <li key={lead._id} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium">{lead.data.name}</p>
              <p className="text-sm text-gray-500">{lead.data.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {new Date(lead.createdAt).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## VII. Admin Portal Updates

### Admin Leads Management

Add to the admin portal for managing leads across all projects:

```typescript
// convex/admin.ts - Add these functions

export const listAllLeads = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    // requireAdmin(ctx) - verify admin access
    
    let query = ctx.db
      .query("client_leads")
      .order("desc");
    
    const leads = await query.take(limit || 100);
    
    if (status) {
      return leads.filter(l => l.status === status);
    }
    return leads;
  },
});

export const updateLeadStatus = mutation({
  args: {
    leadId: v.id("client_leads"),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("won"),
      v.literal("lost")
    ),
  },
  handler: async (ctx, { leadId, status }) => {
    // requireAdmin(ctx) - verify admin access
    
    await ctx.db.patch(leadId, { status });
    
    // Log activity
    const lead = await ctx.db.get(leadId);
    if (lead) {
      await ctx.db.insert("activity_log", {
        projectId: undefined, // Could look up project by projectId slug
        prospectId: undefined,
        actor: "admin",
        kind: "lead.status_updated",
        payload: { leadId, newStatus: status },
        createdAt: Date.now(),
      });
    }
  },
});
```

---

## VIII. Environment Variables

### Agency Backend (Convex)

```env
# Already existing
RESEND_API_KEY=re_...

# No new env vars required for these updates
```

---

## IX. Execution Checklist

### Schema Updates ✅
- [x] Add `client_leads` table to `convex/schema.ts`
- [x] Add `client_analytics` table to `convex/schema.ts`
- [x] Run `npx convex dev` to deploy schema changes

### Rate Limiter ✅
- [x] Install: `bun add @convex-dev/rate-limiter`
- [x] Create `convex/convex.config.ts` with rate limiter component
- [x] Create `convex/rateLimiter.ts` with rate limit definitions

### HTTP Actions ✅
- [x] Create/update `convex/http.ts` with lead and analytics endpoints
- [x] Add CORS validation using project's `liveUrl` and `stagingUrl` (no wildcards)

### Internal Functions ✅
- [x] Create `convex/clientLeads.ts` with create, list, and count functions
- [x] Create `convex/clientAnalytics.ts` with recordPageView and getSummary
- [x] Add `getByProjectIdSlug` internal query to `convex/projects.ts`

### Email Notifications ✅
- [x] Add `sendLeadNotification` action to `convex/emails.ts`
- [x] Beautiful HTML template with quick actions and pro tip
- [x] Fire-and-forget trigger from HTTP endpoint

### Portal Components
- [ ] Create `AnalyticsSummary` component
- [ ] Create `RecentLeads` component
- [ ] Create `LeadsList` component
- [ ] Update LIVE project portal page to include new components

### Admin Updates
- [ ] Add `listAllLeads` query to admin functions
- [ ] Add `updateLeadStatus` mutation to admin functions
- [ ] Update admin UI to show leads management

---

## X. Future Enhancements

1. **Unique Visitor Tracking:** Add fingerprinting for accurate unique visitor counts
2. **Lead Scoring:** Automatic lead quality scoring based on message content
3. **Advanced Analytics:** Conversion tracking, referrer analysis, geographic data
4. **Automated Follow-ups:** Email sequences for new leads
5. **Google Reviews Caching:** Centralized cron job that fetches reviews daily and stores in `project_reviews` table; client sites fetch cached reviews from WaaS API instead of calling Google directly

---

**Document Version:** 1.1  
**Last Updated:** January 11, 2026  
**Status:** Backend Complete (Phases 1-4), Portal UI Pending (Phase 5)

