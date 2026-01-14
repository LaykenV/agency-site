# Mobile Magic Link Authentication Issue - RESOLVED

## Problem Description

When users clicked a magic link on mobile devices, the new tab would hang indefinitely on the loading spinner. **As soon as the original tab (the one showing "Check your inbox") was closed, the new tab would immediately work and authenticate correctly.**

This issue was specific to mobile browsers and related to cross-tab session synchronization via WebSocket connections and BroadcastChannel.

---

## Root Cause

The issue was caused by **Next.js route group layouts being nested inside the root layout, not replacing it**.

Even when creating an "auth-free" route group with its own layout that excluded `ConvexBetterAuthProvider`, the root layout's `ConvexClientProvider` still wrapped the page:

```
app/layout.tsx (ConvexClientProvider ACTIVE)
  └─ (auth-free)/layout.tsx (nested, Convex still active above!)
      └─ link-sent/page.tsx (STILL has WebSocket connection!)
```

This meant:
- Tab 1's Convex WebSocket connection remained active
- Better Auth's BroadcastChannel cross-tab sync listeners remained active
- Tab 2 (magic link) contended with Tab 1 for session state, causing the hang

---

## Solution: Static HTML Page

The fix was to redirect Tab 1 to a **completely static HTML file** in `/public/` instead of a Next.js route. This ensures the entire React/Next.js app is destroyed, closing all WebSocket connections and clearing BroadcastChannel listeners.

### Key Files

1. **`/public/link-sent.html`** - Static HTML page with:
   - Zero JavaScript frameworks (no React, no Convex, no Better Auth)
   - Theme sync from `localStorage` (reads `theme` key set by next-themes)
   - Light/dark mode support
   - Reads email from `?email=` URL parameter

2. **`/app/portal/page.tsx`** - Changed redirect from Next.js route to static file:
   ```typescript
   // CRITICAL: Redirect to static HTML page (not a Next.js route)
   window.location.replace(`/link-sent.html?email=${encodeURIComponent(trimmed)}`);
   ```

### Why This Works

```
Before (Next.js route - BROKEN):
Tab 1: /portal → /link-sent (Next.js route)
        └─ Root layout's ConvexClientProvider still wrapping page
        └─ WebSocket and BroadcastChannel ACTIVE
        └─ Tab 2 hangs waiting for session sync

After (Static HTML - FIXED):
Tab 1: /portal → /link-sent.html (static file)
        └─ Complete destruction of React/Next.js app
        └─ WebSocket CLOSED
        └─ BroadcastChannel listeners REMOVED
        └─ Tab 2 authenticates immediately without contention
```

---

## Attempted Fixes That Failed

### Attempt 1: Cookie Cache for Session Validation
Added `cookieCache` to Better Auth session config. Did not fix - problem was not database latency.

### Attempt 2: Dedicated Verification Page
Created `/portal/verify` as magic link callback target. Did not fix - problem persisted even on different routes.

### Attempt 3: Separate Link-Sent Page Without Auth Components
Created page without `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` components. Did not fix - page was still wrapped in provider.

### Attempt 4: Auth-Free Route Group
Created `(auth-free)` route group with layout excluding `ConvexBetterAuthProvider`. Did not fix - **route group layouts are nested inside root layout, not replacing it**.

### Attempt 5: `window.location.replace()` Instead of Router
Changed from `router.replace()` to `window.location.replace()`. Did not fix alone - the destination was still a Next.js route.

---

## Key Learnings

1. **Next.js Route Groups Don't Replace Root Layout**: Route groups like `(auth-free)` with their own `layout.tsx` are **nested inside** the root `app/layout.tsx`, not independent of it.

2. **Static Files Bypass Next.js Entirely**: Files in `/public/` are served directly without going through Next.js routing or React rendering.

3. **Full Page Navigation Destroys JS Context**: Using `window.location.replace()` to a static file completely tears down the JavaScript context, including:
   - WebSocket connections
   - BroadcastChannel listeners
   - React state
   - All module-level singletons

4. **Theme Sync Requires Inline Script**: To prevent flash of wrong theme, the static HTML includes an inline script in `<head>` that reads the `theme` key from localStorage before the page renders.

---

## Tech Stack Context

- **Auth**: Better Auth with Convex integration (`@convex-dev/better-auth`)
- **Database/Backend**: Convex (uses WebSocket connections)
- **Framework**: Next.js App Router
- **Theme**: next-themes (stores preference in localStorage as `theme`)
