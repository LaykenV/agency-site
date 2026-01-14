# Mobile Magic Link Authentication Hanging Issue

## Problem Description

When users click a magic link on mobile devices, the new tab hangs indefinitely on the loading spinner. **As soon as the original tab (the one showing "Check your inbox") is closed, the new tab immediately works and authenticates correctly.**

This issue is specific to mobile browsers and is likely related to cross-tab session synchronization or WebSocket connection limits.

### Reproduction Steps
1. Go to `/portal` on mobile
2. Enter email and request a magic link
3. Check email and click the magic link (opens in new tab)
4. New tab shows loading spinner and hangs indefinitely
5. Close the original tab
6. New tab immediately authenticates and redirects correctly

### Key Insight
The fact that closing Tab 1 immediately fixes Tab 2 suggests:
- Tab 1 is holding some resource that blocks Tab 2
- This could be: WebSocket connections, session locks, cross-tab sync mechanisms, or browser resource limits

---

## Tech Stack Context
- **Auth**: Better Auth with Convex integration (`@convex-dev/better-auth`)
- **Database/Backend**: Convex (uses WebSocket connections)
- **Framework**: Next.js App Router
- **Auth Flow**: Magic link via Better Auth → redirects to callback URL

### Key Files
- `app/layout.tsx` - Root layout with `ConvexBetterAuthProvider`
- `components/ConvexClientProvider.tsx` - Wraps app in `ConvexBetterAuthProvider`
- `lib/auth-client.ts` - Better Auth client configuration
- `convex/auth.ts` - Better Auth server configuration
- `app/portal/page.tsx` - Portal login page
- `app/portal/verify/page.tsx` - Magic link verification landing page

---

## Attempted Fixes (All Failed)

### Attempt 1: Cookie Cache for Session Validation
**Theory**: Session validation hitting the database on every request is slow.

**Change**: Added `cookieCache` to Better Auth session config in `convex/auth.ts`:
```typescript
session: {
  expiresIn: 60 * 60 * 24 * 365,
  updateAge: 60 * 60 * 24,
  cookieCache: {
    enabled: true,
    maxAge: 60 * 5, // 5 minutes
  },
},
```

**Result**: Did not fix the issue. The problem is not database latency.

---

### Attempt 2: Dedicated Verification Page
**Theory**: Both tabs on `/portal` are competing for auth state through the same `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` components.

**Change**: Created `/portal/verify` page as magic link callback target instead of `/portal`:
- Magic links now redirect to `/portal/verify`
- Verify page handles auth and redirects to final destination
- Original tab stays on `/portal` showing "Check your inbox"

**Result**: Did not fix the issue. Even on different routes, the problem persists.

---

### Attempt 3: Separate Link-Sent Page Without Auth Components
**Theory**: The `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` components from `convex/react` are causing cross-tab contention.

**Change**: Created `/portal/link-sent` page that does NOT use any auth components:
- After sending magic link, redirect to `/portal/link-sent`
- This page only shows static "Check your inbox" UI
- No `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` components

**Result**: Did not fix the issue. The problem is not the auth components directly.

---

### Attempt 4: Auth-Free Route Group
**Theory**: Even without auth components, the page is still wrapped in `ConvexBetterAuthProvider` from the root layout. The provider maintains WebSocket connections and session listeners that compete across tabs.

**Change**: Created a Route Group `(auth-free)` with its own layout that excludes `ConvexBetterAuthProvider`:
```
app/
  (auth-free)/
    layout.tsx      # Only AppThemeProvider, NO ConvexBetterAuthProvider
    link-sent/
      page.tsx      # Completely isolated from auth/Convex
  layout.tsx        # Root layout with ConvexBetterAuthProvider
  portal/
    ...
```

- `/link-sent` page is at URL `/link-sent` (route groups don't affect URL)
- This page has NO Convex client, NO auth client, NO WebSocket connections
- Just static React with theme support

**Result**: Still did not fix the issue.

---

## Current State

The issue persists despite:
1. Tab 1 (`/link-sent`) having NO Convex/auth anything - completely isolated
2. Tab 2 (`/portal/verify`) being the only tab with Convex/auth active

### What This Tells Us

The problem is likely NOT in our application code. Possible root causes:

1. **Mobile Browser WebSocket Limits**: Mobile browsers may limit concurrent WebSocket connections. Even though Tab 1 is on an auth-free page, the browser may still be holding the WebSocket connection from before the redirect.

2. **Better Auth Cross-Tab Session Sync**: Better Auth uses `BroadcastChannel` or similar for cross-tab session sync. This might be locking or blocking in mobile browsers.

3. **Convex WebSocket Connection Pool**: The Convex client might be using a shared connection pool that persists across navigation.

4. **Service Worker or Browser Cache**: Something might be caching the Convex connection state.

5. **In-App Browser Issues**: If users click magic links from email apps (Outlook, Gmail), the in-app browser might have additional restrictions.

---

## Potential Next Steps

### 1. Investigate WebSocket Connection Lifecycle
- Check if Convex WebSocket persists after navigation to auth-free route
- Consider explicitly disconnecting Convex client before redirect

### 2. Disable Better Auth Cross-Tab Sync
- Check if Better Auth client has options to disable BroadcastChannel
- May need to configure `authClient` differently

### 3. Use Window Replace Instead of Router
- Instead of `router.replace('/link-sent')`, try `window.location.replace('/link-sent')`
- This might force a full page reload, clearing WebSocket connections

### 4. Force Full Page Reload
- Add `<meta>` tags to prevent caching
- Use `window.location.href` instead of Next.js router

### 5. Check Convex Client Singleton
- The `ConvexReactClient` is created at module level in `ConvexClientProvider.tsx`
- This singleton might persist across navigations
- Consider if there's a way to dispose/recreate it

### 6. Mobile-Specific Detection
- Detect if user is on mobile
- Show different UI: "Click link in new tab, then return here" or auto-close tab

### 7. Contact Convex/Better Auth Support
- This might be a known issue with the `@convex-dev/better-auth` integration
- Check GitHub issues or Discord for similar reports

---

## Related Files Changed During Debugging

- `convex/auth.ts` - Added cookieCache
- `app/portal/verify/page.tsx` - Created
- `app/portal/page.tsx` - Modified to redirect to link-sent
- `app/(auth-free)/layout.tsx` - Created auth-free layout
- `app/(auth-free)/link-sent/page.tsx` - Created isolated link-sent page
- `app/admin/page.tsx` - Updated callbackURL to use verify
- `app/portal/autherror/AuthErrorContent.tsx` - Updated callbackURL to use verify
