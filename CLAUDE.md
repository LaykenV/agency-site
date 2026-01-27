# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Website-as-a-Service (WaaS) agency site for Acadiana Web Design. A Next.js 15 frontend with Convex backend providing:
- Marketing site with onboarding flow for prospects
- Client portal for project management
- Admin dashboard for agency operations
- Remotion-based promotional video generation

## Commands

```bash
# Development (runs Next.js + Convex in parallel)
bun run dev

# Individual services
bun run dev:frontend    # Next.js only
bun run dev:backend     # Convex only

# Build & lint
bun run build
bun run lint

# Video (Remotion)
bun run video:preview      # Preview in browser
bun run video:render:all   # Render all 5 formats
```

## Architecture

### Frontend (Next.js 15 App Router)
- `app/` - Pages using App Router with server components
- `app/portal/` - Authenticated client portal (project dashboard, agreements, subscriptions)
- `app/admin/` - Agency admin dashboard
- `app/onboarding/` - Prospect intake flow
- `components/` - React components (UI primitives in `components/ui/`)
- `lib/` - Client utilities, auth helpers, hooks

### Backend (Convex)
- `convex/schema.ts` - Database schema with tables: prospects, projects, agreements, activity_log, scheduled_calls, billingCustomers, subscriptions, edit_requests, client_leads, client_analytics
- `convex/http.ts` - HTTP endpoints for webhooks (Cal.com, Stripe) and client site APIs (lead ingestion, analytics pixel)
- `convex/auth.ts` - Better Auth integration with magic link authentication
- `convex/onboarding/agent.ts` - AI agent (Groq) for generating prospect onboarding plans

### Convex Components (via convex.config.ts)
- `@convex-dev/agent` - AI agent framework
- `@convex-dev/better-auth` - Authentication
- `@convex-dev/resend` - Email sending
- `@convex-dev/polar` - Payments (unused currently, Stripe preferred)
- `@convex-dev/rate-limiter` - Rate limiting for HTTP endpoints

### Video Generation (Remotion)
- `video/src/` - Remotion compositions for 5 promo video formats
- Videos render to `out/` directory

## Key Patterns

### Convex Functions
Always use the new function syntax with validators:
```typescript
export const myQuery = query({
  args: { id: v.id("projects") },
  returns: v.object({ ... }),
  handler: async (ctx, args) => { ... },
});
```

Use `internalQuery/internalMutation/internalAction` for private functions.

### Authentication
- Magic link auth via Better Auth (no password/Google OAuth currently)
- Client: `lib/auth-client.ts` exports `authClient`
- Server: `lib/auth-server.ts` exports `getToken()`
- Convex: `authComponent.getAuthUser(ctx)` in queries

### Path Aliases
`@/*` maps to project root (e.g., `@/components/ui/button`)

## Cursor Rules

The `.cursor/rules/convex_rules.mdc` file contains detailed Convex guidelines including:
- Always include argument and return validators for all functions
- Use `withIndex` instead of `filter` for queries
- Use `v.null()` when returning null
- Index names should include all field names (e.g., `by_projectId_and_status`)
