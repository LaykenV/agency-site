# Magic Link Authentication (Better Auth + Convex)

**Last Updated:** January 2026  
**Status:** Production-ready ✅

## Overview

Magic link authentication allows users to sign in via email without passwords. Users receive a secure link that authenticates them when clicked.

### Key Features
- 24-hour link expiration
- Hashed token storage (server-side, not in browser)
- Cross-device support (links work on any device)
- Mobile-optimized with static HTML redirect pattern
- Rate limiting (3 sends/min, 10 verifications/min)

---

## Architecture

### Auth Flow

```
1. User enters email on /portal
2. Check if known email (api.prospects.isKnownEmail)
3. Send magic link (authClient.signIn.magicLink)
4. Redirect to /link-sent.html (STATIC HTML - critical for mobile)
5. User clicks email link → /portal/verify
6. Verify page queries getPortalDecision
7. Redirect to appropriate destination
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/auth-client.ts` | Client-side auth with magic link plugin |
| `lib/auth-server.ts` | Server-side auth utilities (getToken, handler) |
| `convex/auth.ts` | Better Auth server config, magic link sending |
| `convex/auth.config.ts` | Provider configuration |
| `app/api/auth/[...all]/route.ts` | Next.js auth proxy route |
| `app/portal/page.tsx` | Login form, magic link trigger |
| `app/portal/verify/page.tsx` | Magic link callback handler |
| `public/link-sent.html` | Static "check your inbox" page |
| `components/ConvexClientProvider.tsx` | Auth provider with initialToken |

---

## Implementation Details

### Client-Side Auth (`lib/auth-client.ts`)

```typescript
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    magicLinkClient(),
  ],
});
```

### Server-Side Auth (`lib/auth-server.ts`)

```typescript
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler,           // HTTP route handlers for /api/auth/[...all]
  getToken,          // Extract JWT token from cookies
  isAuthenticated,   // Check if user is authenticated
  fetchAuthQuery,    // Fetch authenticated queries
  fetchAuthMutation, // Execute authenticated mutations
  fetchAuthAction,   // Execute authenticated actions
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});
```

### Server Config (`convex/auth.ts`)

```typescript
export const createAuth = (ctx: GenericCtx<DataModel>, { optionsOnly } = { optionsOnly: false }) => {
  return betterAuth({
    baseURL: process.env.SITE_URL!,
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: false },
    onAPIError: {
      throw: false,
      onError: (error) => console.error("[auth] error", { error }),
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/magic-link": { window: 60, max: 3 },
        "/magic-link/verify": { window: 60, max: 10 },
      },
      storage: "memory",
    },
    session: {
      expiresIn: 60 * 60 * 24 * 365, // 1 year
      updateAge: 60 * 60 * 24,        // Refresh every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes - reduces DB calls
      },
    },
    plugins: [
      convex({ authConfig }),
      magicLink({
        expiresIn: 60 * 60 * 24, // 24 hours
        disableSignUp: false,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(requireActionCtx(ctx), { to: email, url });
        },
      }),
    ],
  });
};
```

### Sending Magic Links (`app/portal/page.tsx`)

```typescript
await authClient.signIn.magicLink({
  email: trimmed,
  callbackURL: "/portal/verify",
  newUserCallbackURL: "/portal/verify",
  errorCallbackURL: "/portal/autherror?error=magic_link",
});

// CRITICAL: Redirect to static HTML (not Next.js route)
window.location.replace(`/link-sent.html?email=${encodeURIComponent(trimmed)}`);
```

---

## Mobile Cross-Tab Fix (Critical)

### The Problem

On mobile browsers, when users clicked a magic link:
1. Tab 1 (showing "Check your inbox") had active Convex WebSocket + BroadcastChannel
2. Tab 2 (magic link) contended with Tab 1 for session state
3. Result: Tab 2 hung indefinitely until Tab 1 was manually closed

### Root Cause

Next.js route group layouts are **nested inside** the root layout, not replacing it. Even with an "auth-free" route group, the root layout's `ConvexClientProvider` still wrapped the page:

```
app/layout.tsx (ConvexClientProvider ACTIVE)
  └─ (auth-free)/layout.tsx (nested, Convex still active!)
      └─ link-sent/page.tsx (STILL has WebSocket!)
```

### The Solution

Redirect Tab 1 to a **completely static HTML file** in `/public/`:

```typescript
// app/portal/page.tsx
window.location.replace(`/link-sent.html?email=${encodeURIComponent(trimmed)}`);
```

**Why this works:**
1. Static files bypass Next.js entirely (no React, no Convex, no BroadcastChannel)
2. `window.location.replace()` completely destroys the JavaScript context
3. Tab 2 can authenticate without contention

### Static HTML Features (`public/link-sent.html`)

- Zero JavaScript frameworks
- Theme sync from `localStorage.theme` (next-themes compatible)
- Light/dark mode CSS variables
- Email displayed from `?email=` query parameter
- "Request new link" button back to `/portal`

---

## Server-Side Token Pre-fetch

To prevent client-side auth hydration delays (especially on mobile), the root layout pre-fetches the auth token server-side:

### Root Layout (`app/layout.tsx`)

```typescript
import { getToken } from "@/lib/auth-server";

export default async function RootLayout({ children }) {
  let initialToken: string | null | undefined = null;
  try {
    initialToken = await getToken();
  } catch (error) {
    console.error("[layout] Failed to get auth token:", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ConvexClientProvider initialToken={initialToken}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Provider (`components/ConvexClientProvider.tsx`)

```typescript
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  expectAuth: false, // Allow anonymous onboarding queries
});

export default function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider 
      client={convex} 
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
```

---

## Verify Page (`app/portal/verify/page.tsx`)

The dedicated verification page handles magic link callbacks:

1. **AuthLoading**: Shows spinner while verifying
2. **Unauthenticated**: Link expired/invalid → countdown → redirect to `/portal` with error
3. **Authenticated**: Query `getPortalDecision` → redirect to appropriate destination

```typescript
function VerifyAuthenticatedRedirect({ sid }: { sid: string | null }) {
  const decision = useQuery(api.auth.getPortalDecision);
  const router = useRouter();

  useEffect(() => {
    if (!decision) return;
    
    let target: string;
    if (sid) {
      target = `/portal/agreement?sid=${sid}`;
    } else {
      target = decision.redirect ?? "/portal";
    }
    
    localStorage.removeItem("portal_magic_link_sent");
    router.replace(target);
  }, [decision, router, sid]);

  return <VerifyLoadingView message="Signing you in..." />;
}
```

---

## Portal Decision Logic (`convex/auth.ts`)

The `getPortalDecision` query determines where to redirect authenticated users:

```typescript
export const getPortalDecision = query({
  handler: async (ctx): Promise<PortalDecisionReturn> => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) {
      return { authed: false, user: null, primaryProject: null, ... };
    }

    const [primaryProject, prospect, subscription] = await Promise.all([
      ctx.runQuery(internal.projects.internalGetLatestProjectByAuthUser, { authUserId }),
      user.email ? ctx.runQuery(api.prospects.findLatestByEmail, { email: user.email }) : null,
      ctx.runQuery(api.stripeHelpers.getMySubscription),
    ]);

    // Determine redirect based on project status
    if (primaryProject) {
      const status = primaryProject.projectStatus ?? "AWAITING_AGREEMENT";
      if (status === "AWAITING_AGREEMENT") redirect = `/portal/agreement?sid=${sessionId}`;
      else if (status === "AWAITING_PAYMENT") redirect = "/portal/subscribe";
      else redirect = `/portal/${primaryProject.projectId}`;
    }

    return { authed: true, user, primaryProject, prospectSessionId, subscription, redirect };
  },
});
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SITE_URL` | Better Auth baseURL (canonical HTTPS domain) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex site URL for server utilities |
| `CONVEX_SITE_URL` | Provider domain in auth.config.ts |

---

## Security Considerations

1. **Hashed token storage**: Tokens stored server-side with `storeToken: "hashed"`
2. **Rate limiting**: Prevents brute-force and spam
3. **24-hour expiration**: Links expire after one day
4. **Session cookie caching**: 5-minute cache reduces DB validation calls
5. **No manual URL construction**: Always use the provided `url` from Better Auth

---

## Testing Checklist

- [ ] Magic link email arrives with correct content
- [ ] Link works on desktop browsers
- [ ] Link works on mobile browsers (Safari, Chrome)
- [ ] Link works from in-app browsers (Gmail, Outlook)
- [ ] Expired link shows error and redirect option
- [ ] Rate limiting triggers after 3 rapid send attempts
- [ ] Session persists across page refreshes
- [ ] Portal redirect logic works for all project statuses

---

## Attempted Fixes That Failed (Historical)

These approaches did NOT solve the mobile cross-tab issue:

1. **Cookie cache for session validation** - Problem wasn't DB latency
2. **Dedicated verification page** - Problem persisted on different routes
3. **Page without auth components** - Still wrapped by root layout's provider
4. **Auth-free route group** - Route groups nest inside root layout, don't replace it
5. **`window.location.replace()` alone** - Destination was still a Next.js route

The only solution is a **completely static HTML file** that bypasses Next.js entirely.
