## Magic Link (Better Auth + Convex): Current Setup and Update Plan

### Objectives
- **Magic link email works**: Send Better Auth magic link via Resend with correct content and expiry.
- **Auth and redirect work**: Clicking the link authenticates the user and redirects to `/portal/agreement?sid=<sessionId>`.

## 1) Current Implementation

- **Next.js auth proxy**: All Better Auth routes are proxied via `handler` from `lib/auth-server.ts` at `/api/auth/*`.

```1:6:app/api/auth/[...all]/route.ts
import { handler } from "@/lib/auth-server";

// HTTP Handlers & Next Proxy
// This route handler proxies all auth requests from /api/auth/* to Convex
// Handles GET and POST requests for sign-in, sign-out, callbacks, etc.
export const { GET, POST } = handler;
```

- **Server-side auth utilities (`lib/auth-server.ts`)**: Uses `convexBetterAuthNextJs()` factory to create all server utilities.

```1:30:lib/auth-server.ts
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler,           // HTTP route handlers (GET, POST) for /api/auth/[...all]
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

- **Better Auth server config (`convex/auth.ts`)**:
  - `baseURL` reads from `SITE_URL`.
  - `magicLink` plugin configured with `expiresIn: 900`, `disableSignUp: false`, `storeToken: "hashed"`.
  - `sendMagicLink` implemented via Resend using the provided `url` (no token construction).

```10:13:convex/auth.ts
const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);
```

```47:55:convex/auth.ts
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
```

```66:79:convex/auth.ts
      convex(),
      magicLink({
        expiresIn: 900, // 15 minutes
        disableSignUp: false,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          console.log("[auth] sending magic link", { email, url });
          await sendMagicLinkEmail(requireActionCtx(ctx), {
            to: email,
            url,
          });
        },
      }),
```

- **Auth client is enabled with magic link**:

```1:6:lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";
```

```20:27:lib/auth-client.ts
export const authClient = createAuthClient({
  plugins: [
    // Convex integration plugin (required)
    convexClient(),
    // Magic link plugin for passwordless authentication
    magicLinkClient(),
  ],
});
```

- **Admin UI sends magic link** (no `errorCallbackURL`, no name, no client-side throttle yet):

```82:90:app/admin/page.tsx
const handleSendMagicLink = async (prospect: Doc<"prospects">) => {
  try {
    // Call the authClient magic link method
    await authClient.signIn.magicLink({
      email: prospect.details.contactEmail,
      callbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
      newUserCallbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
    });
```

- **Agreement page**:
  - Reads `sid` from query.
  - Waits for session; if present, idempotently links project to `authUserId` and `prospectId`.
  - No dedicated error UI for expired/invalid links yet.

```13:37:app/portal/agreement/AgreementContent.tsx
const session = authClient.useSession();
const findOrCreateProject = useMutation(api.projects.findOrCreateProjectForProspect);

// Get prospect by sessionId
const prospect = useQuery(
  api.prospects.getProspectBySessionId,
  sid ? { sessionId: sid } : "skip"
);

useEffect(() => {
  if (session.data && prospect && !isInitialized) {
    // Idempotent project creation
    findOrCreateProject({
      authUserId: session.data.user.id,
      prospectId: prospect._id,
    })
      .then(() => {
        console.log("[agreement] project initialized");
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error("[agreement] failed to initialize project:", error);
      });
  }
}, [session.data, prospect, isInitialized, findOrCreateProject]);
```

```50:56:app/portal/agreement/AgreementContent.tsx
if (!session.data) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Authenticating...</p>
```

- **Email**: Uses Convex `Resend` component for magic link email delivery.

### Redirects (current behavior)
- We pass `callbackURL` and `newUserCallbackURL` → both point to `/portal/agreement?sid=<sid>`.
- We do not pass `errorCallbackURL` → Better Auth will redirect errors to `callbackURL` with `?error=...`.

### Known gaps
- No `errorCallbackURL` in Admin send call; no `name` passed for first-time signups.
- No client-side throttling or 429 handling in Admin UI.
- No Better Auth `rateLimit` config on server; no `onAPIError` logging hook.
- Agreement page lacks an error banner and a "Resend link" CTA when verification fails.

## 2) Update Plan: Error handling, throttling, and resilience

High-level:
- Always provide all three redirect URLs.
- Keep `disableSignUp: false` for admin-initiated magic link onboarding.
- Throttle sends on client and rate-limit on server; surface retry timing.
- Add user-facing error UI and a safe Resend flow.

### Admin UI (`app/admin/page.tsx`)
- Call `signIn.magicLink` with:
  - `email`, `name` (for new signups),
  - `callbackURL` and `newUserCallbackURL`: `/portal/agreement?sid=<sid>`,
  - `errorCallbackURL`: `/portal/welcome?sid=<sid>&error=magic_link`.
- Throttle the "Send Magic Link" button for 30–60s after a send; show a countdown.
- Handle 429 using `fetchOptions.onError`; read `X-Retry-After` and message the user.
- Keep logging via `logMagicLinkSent`.

Proposed call (illustrative):

```ts
await authClient.signIn.magicLink({
  email: prospect.details.contactEmail,
  name: prospect.details.contactName,
  callbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
  newUserCallbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
  errorCallbackURL: `/portal/welcome?sid=${prospect.sessionId}&error=magic_link`,
  fetchOptions: {
    onError: async ({ response }) => {
      if (response.status === 429) {
        const retryAfter = response.headers.get("X-Retry-After");
        // Surface: "Too many requests. Try again in ${retryAfter}s."
      }
    },
  },
});
```

Optional client cooldown pattern:

```ts
const [cooldownSec, setCooldownSec] = useState(0);
// After successful send, setCooldownSec(60); start an interval to decrement.
// Disable button when cooldownSec > 0 or while request is in-flight.
```

### Server (`convex/auth.ts`)
- Keep magic link options as-is: `expiresIn: 900`, `storeToken: "hashed"`, `disableSignUp: false`.
- Add Better Auth rate limiting:
  - Global: window 60s, max ~100.
  - Custom rules:
    - `/sign-in/magic-link`: window 60s, max 3 (send attempts).
    - `/magic-link/verify`: window 60s, max 10 (verification retries).
- Add centralized logging with `onAPIError.onError`.

Illustrative configuration (not applied yet):

```ts
export const createAuth = (ctx: GenericCtx<DataModel>, { optionsOnly } = { optionsOnly: false }) =>
  betterAuth({
    baseURL: process.env.SITE_URL!,
    database: authComponent.adapter(ctx),
    onAPIError: {
      throw: false,
      onError: (error, context) => {
        console.error("[auth] error", { path: context?.path, error });
      },
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
    plugins: [
      convex(),
      magicLink({
        expiresIn: 900,
        disableSignUp: false,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(requireActionCtx(ctx), { to: email, url });
        },
      }),
    ],
  });
```

### Agreement page (`/portal/agreement`)
- On load:
  - If session present and `sid` valid → run idempotent linking (current behavior).
  - If session missing and redirected via `errorCallbackURL` or `?error=...` → show error banner and a "Resend link" CTA.
- Resend CTA should call `signIn.magicLink` with the same 3 URLs and respect cooldown.

Illustrative logic:

```ts
const error = searchParams.get("error");
if (!session.data && (error || likelyExpired)) {
  // Render: banner + Resend button that calls signIn.magicLink(...)
}
```

### Auth client (global)
- Optional: add global `fetchOptions.onError` to standardize 429 handling across the app.

```ts
export const authClient = createAuthClient({
  fetchOptions: {
    onError: async ({ response }) => {
      if (response.status === 429) {
        const retryAfter = response.headers.get("X-Retry-After");
        // Handle globally (toast/banner)
      }
    },
  },
  plugins: [convexClient(), magicLinkClient()],
});
```

### Logging and audit
- Keep `logMagicLinkSent` on success.
- Optionally log verification success (e.g., when agreement page initializes a project with a valid session + `sid`).

### Security & config
- Ensure `SITE_URL` is the canonical HTTPS domain hosting `/api/auth/*`.
- Continue using `storeToken: "hashed"` and never construct tokenized URLs manually—use the provided `url`.
- Treat `sid` as a locator; always enforce auth for portal routes.

### Testing checklist
- Success path: email arrives → verify → redirect to `/portal/agreement?sid=...` → project linking runs once.
- Expired/invalid link: redirect to error destination; error banner shows; Resend works and throttles.
- Rate limited: simulate 429; UI shows retry timing and disables send.
- Multiple sends: cooldown prevents spamming; activity logs updated.

### Best practices referenced
- Better Auth magic link plugin: server `sendMagicLink`, client `magicLinkClient()`, `signIn.magicLink` params, `/magic-link/verify` route.
- Rate limiting: global + custom rules for sensitive endpoints; client `onError` with `X-Retry-After`.
- Keep auth logic centralized in `convex/auth.ts`; use Convex Resend component for sending and logging.

## 3) Mobile Session Hydration Fix (Implemented Jan 2026)

### Problem
When users clicked magic links on mobile devices (especially from in-app browsers like Outlook), they would land on `/portal/agreement?sid=xxx` but see an infinite loading skeleton. The session was actually created successfully, but the Convex client was stuck waiting for session validation.

### Root Cause
- `ConvexBetterAuthProvider` needed to validate the session via a network call after mount
- On mobile/in-app browsers, this async validation could stall or be slow
- Result: `<AuthLoading>` component rendered indefinitely

### Solution
Pre-fetch the auth token server-side and pass it to `ConvexBetterAuthProvider` via `initialToken` prop. This eliminates the client-side race condition.

### Implementation

**`components/ConvexClientProvider.tsx`**:
```tsx
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

**`app/layout.tsx`**:
```tsx
import { getToken } from "@/lib/auth-server";

export default async function RootLayout({ children }) {
  const initialToken = await getToken();
  
  return (
    <html>
      <body>
        <ConvexClientProvider initialToken={initialToken}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Key Insight
Magic link tokens are stored **server-side in the database** (hashed), not in the browser. Cross-device magic links work by design. The issue was purely about client-side session hydration timing, not the magic link verification itself.

