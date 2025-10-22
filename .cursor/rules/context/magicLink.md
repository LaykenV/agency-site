## Magic Link Plan (Better Auth + Convex)

### Objectives
- **Magic link email works**: Send Better Auth magic link via Resend with correct content and expiry.
- **Auth and redirect work**: Clicking the link authenticates the user and redirects to `/portal/agreement?sid=<sessionId>`.

### Current State (as of repo snapshot)
- Next auth proxy present at `app/api/auth/[...all]/route.ts` using `nextJsHandler()`.
- Convex app registers components: Better Auth and Resend in `convex/convex.config.ts`.
- `convex/auth.ts` creates Better Auth with `magicLink` plugin but `sendMagicLink` is a stub (console log only).
- `convex/emails.ts` defines a `Resend` component instance and an internal mutation `sendWelcomeEmail` that currently sends a simple welcome email (not a magic link).
- `convex/admin.ts` has `triggerWelcomeEmail` action calling `internal.emails.sendWelcomeEmail`.
- `lib/auth-client.ts` initializes Better Auth client with `convexClient()` plugin only (no magic link client yet).

### Decision: Use magic link as the welcome email
- The welcome email that Admin triggers should be the Better Auth magic link email.
- We will send it through the magic link plugin’s `sendMagicLink` callback to ensure URL correctness and built-in verification flow.
- Redirect target for both existing users and new users: `/portal/agreement?sid=<sessionId>`.

### Redirect Strategy: `/portal/agreement?sid=<sessionId>`
- On landing, the user is authenticated via Better Auth (session cookie set by verification endpoint).
- The agreement page should idempotently find-or-create a `projects` row linked to:
  - `authUserId` (Better Auth user identifier)
  - `prospectId` (from the `prospects` row identified by `sessionId`)
  - `projectStatus = "AWAITING_AGREEMENT"`
- Keep this logic idempotent to handle multiple visits/clicks.
- Treat `sid` as non-secret; always enforce auth for portal routes.

### Implementation Plan

1) Client: enable magic link plugin and Admin trigger
- Add the magic link client plugin to `lib/auth-client.ts`:
  ```ts
  import { createAuthClient } from "better-auth/react";
  import { convexClient } from "@convex-dev/better-auth/client/plugins";
  import { magicLinkClient } from "better-auth/client/plugins";

  export const authClient = createAuthClient({
    plugins: [convexClient(), magicLinkClient()],
  });
  ```
- Update the Admin UI (e.g., `app/admin/page.tsx`) to call:
  ```ts
  await authClient.signIn.magicLink({
    email: prospect.details.contactEmail,
    name: prospect.details.contactName,
    callbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
    newUserCallbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
    errorCallbackURL: `/portal/welcome?sid=${prospect.sessionId}&error=magic_link`,
  });
  ```
- Rationale: Calling from the client ensures Better Auth endpoints receive/issue session cookies correctly. No custom server proxy needed.

2) Server: implement `sendMagicLink` with Resend in `convex/auth.ts`
- Implement Better Auth magic link plugin options:
  - `sendMagicLink`: send via Resend using the provided `url`.
  - `expiresIn`: 600–900 seconds.
  - `disableSignUp`: false (allow first-time signups via the link).
  - `storeToken`: "hashed" (security best practice).
- Example implementation sketch:
  ```ts
  import { resend } from "./emails"; // reuse Resend component

  export const createAuth = (ctx: GenericCtx<DataModel>, { optionsOnly } = { optionsOnly: false }) => {
    return betterAuth({
      baseURL: process.env.SITE_URL!,
      database: authComponent.adapter(ctx),
      logger: { disabled: optionsOnly },
      emailAndPassword: { enabled: false },
      plugins: [
        convex(),
        magicLink({
          expiresIn: 900,
          disableSignUp: false,
          storeToken: "hashed",
          sendMagicLink: async ({ email, url }, request) => {
            await resend.sendEmail(ctx, {
              from: "Acadiana Web Design <welcome@notifications.acadianawebdesign.com>",
              to: email,
              subject: "Your secure sign-in link",
              html: `
                <h2>Welcome to Acadiana Web Design</h2>
                <p>Click the button below to sign in. This link expires in 15 minutes.</p>
                <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">Sign in</a></p>
                <p>If you didn’t request this, you can safely ignore this email.</p>
              `,
            });
          },
        }),
      ],
    });
  };
  ```
- Note: Use the `url` provided by Better Auth; don’t construct your own tokenized URL.
- Ensure `SITE_URL` is the canonical Next domain (https) that hosts `/api/auth/*`.

3) Admin server action (`convex/admin.ts`)
- Keep `triggerWelcomeEmail` if useful for logging/validation, but stop sending the email from Convex mutations.
- Preferred flow: Admin UI calls `authClient.signIn.magicLink(...)` directly (see step 1).
- If you keep `triggerWelcomeEmail`, change it to return necessary prospect fields so the client can call `signIn.magicLink` with the right parameters.

4) Email module (`convex/emails.ts`)
- Keep `Resend` component instance export for general-purpose emails.
- Deprecate the current `sendWelcomeEmail` as the magic link email will be sent via `sendMagicLink`.
- Optionally, keep utility methods/templates for non-auth emails (kickoff reminder, dunning, etc.).

5) Agreement page behavior (`/portal/agreement`)
- On load (SSR/route handler):
  - Read session with Better Auth (you have `lib/auth-server.ts:getToken` and `authComponent.getAuthUser`).
  - Validate `sid` param; load the `prospects` row by `sessionId`.
  - Idempotently find-or-create `projects` row:
    - Link `authUserId` (Better Auth user identity)
    - Link `prospectId`
    - Set `projectStatus = AWAITING_AGREEMENT` if creating
  - Proceed to show the clickwrap agreement UI.

### Environment & Config Checklist
- `SITE_URL` env var set to canonical prod domain (no trailing slash) used by Better Auth.
- Resend domain verified; sending from `welcome@notifications.acadianawebdesign.com` is allowed.
- Convex components already registered (`betterAuth`, `resend`).
- Client includes `magicLinkClient()` plugin.

### Error Handling & Edge Cases
- Expired link: Better Auth will redirect to `errorCallbackURL` (or `callbackURL?error=...`). Show a banner with “Link expired. Resend link.” CTA.
- Multiple sends: Acceptable. Optionally throttle resends in Admin UI.
- Existing user vs new user: Use same callback URLs; Better Auth handles signup unless `disableSignUp` is true.
- Security: Treat `sid` as a locator only; gate all portal routes by auth.

### Testing Plan
1. Local send test:
   - Trigger magic link in Admin.
   - Verify email arrives; link opens `/api/auth/magic-link/verify?token=...` and redirects to `/portal/agreement?sid=...`.
2. Session verification:
   - On `/portal/agreement`, confirm session is readable server-side and client-side.
3. Idempotent project creation:
   - First visit creates and links project; subsequent visits do nothing.
4. Error path:
   - Expired token → redirected to error URL; test UI affordance.

### Best Practices Referenced
- Better Auth Magic Link docs: server plugin (`sendMagicLink`), client plugin (`magicLinkClient()`), `signIn.magicLink` parameters, and `magic-link/verify` route.
- Convex + Better Auth component: use the component adapter (`authComponent.adapter(ctx)`), keep auth logic centralized in `convex/auth.ts`.
- Email sending: use the Convex Resend component from within `sendMagicLink` to standardize sending and logging.

### Minimal Code Changes Summary (when implementing)
- `lib/auth-client.ts`: add `magicLinkClient()` plugin.
- `convex/auth.ts`: implement `sendMagicLink` with Resend; set plugin options (`expiresIn`, `storeToken: "hashed"`, `disableSignUp: false`). Ensure `baseURL = SITE_URL`.
- `app/admin/page.tsx`: call `authClient.signIn.magicLink(...)` with `sid` in all callback URLs.
- `convex/emails.ts`: deprecate `sendWelcomeEmail` for auth, keep for non-auth emails.
- `/portal/agreement`: ensure idempotent project linking to user + prospect.

### Open Questions
- Do we also include `resumeToken` in the callback for extra correlation? e.g., `/portal/agreement?sid=...&rt=...` (optional; security still enforced via session).
- Should we log an `activity_log` entry when a magic link is sent and/or verified? (Recommended for Ops audit.)

---

Appendix: Example Admin trigger (client)
```ts
await authClient.signIn.magicLink({
  email: prospect.details.contactEmail,
  name: prospect.details.contactName,
  callbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
  newUserCallbackURL: `/portal/agreement?sid=${prospect.sessionId}`,
  errorCallbackURL: `/portal/welcome?sid=${prospect.sessionId}&error=magic_link`,
});
```

Appendix: Magic Link plugin options (server)
```ts
magicLink({
  expiresIn: 900,
  disableSignUp: false,
  storeToken: "hashed",
  sendMagicLink: async ({ email, url }, request) => { /* send via Resend */ },
})
```


