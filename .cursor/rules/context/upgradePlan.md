Portal Architecture, Routing, and Gating – Upgrade Plan
Last Updated: 2025-10-24

## Goals
- Keep marketing pages open and unchanged.
- Gate admin to you only.
- Make `/portal` a single decision point driven by auth + project status.
- Provide a clean unauthenticated login flow with email check + magic link.
- Implement robust gating for Agreement, Payment, and Payment Success.
- Improve header behavior inside the portal (show user avatar, not the link).

## Non‑Goals
- No visual redesign of public pages.
- No major database redesign; build on today’s schema and helpers.
- No Stripe price changes.

## Current State (relevant)
- Public pages: `app/page.tsx`, `app/onboarding/page.tsx`, `app/legal/terms/page.tsx`.
- Admin UI (no gating yet): `app/admin/page.tsx`, backed by `convex/admin.ts`.
- Auth: Better Auth via Convex plugin in `convex/auth.ts` with magic link and rate limits.
- Prospects: `convex/prospects.ts` + `prospects` table (has `by_contactEmail` index).
- Projects: `convex/projects.ts` (find-or-create on agreement landing).
- Stripe: `convex/stripeActions.ts`, `convex/stripeHelpers.ts`, schema includes `billingCustomers`, `subscriptions`.
- Portal routes:
  - `app/portal/page.tsx` (Auth wrappers but no single decision function yet).
  - `app/portal/agreement/page.tsx` (idempotent project init exists).
  - `app/portal/subscribe/page.tsx` (checkout + auth required).
  - `app/portal/paymentSuccess/page.tsx` (post-success sync).
  - `app/portal/[projectId]/page.tsx` (exists; use for the actual portal view).

## Target Architecture Overview
- Public stays public: `/`, `/onboarding`, `/legal/terms`.
- Admin gated to you only: `/admin` (UI redirect + server-side authorization in every admin function).
- Client Portal routing becomes a state machine:
  - Unauthed on `/portal`: show “Already a client?” email input → only send magic link if email is known.
  - Authed on `/portal`: run one query to decide where to send the user:
    - No project but known prospect → `/portal/agreement?sid=<sessionId>`
    - `AWAITING_AGREEMENT` → `/portal/agreement?sid=<sessionId>`
    - `AWAITING_PAYMENT` → `/portal/subscribe`
    - `AWAITING_ASSETS | IN_PROGRESS | IN_REVIEW | LIVE` → render portal (ideally at `/portal/[projectId]`)
    - `ARCHIVED` → show read-only/closed view with support CTA
- Agreement gating: authenticated and `sid` must belong to the authed user’s email.
- Payment gating: authenticated and project must be `AWAITING_PAYMENT` both in UI and server action.
- Payment success: authenticated; perform sync; then route to `/portal`.
- In-portal header: show user avatar/menu instead of “Client Portal →” link.

## Routing Matrix
- Public
  - `/` (landing): public
  - `/onboarding`: public
  - `/legal/terms`: public
- Admin
  - `/admin`: admin-only
- Portal
  - `/portal`:
    - Unauthed: email input → check known email → send magic link → callback to `/portal`.
    - Authed: call single “decision” query; redirect based on project status; else render portal root when appropriate.
  - `/portal/agreement?sid=...`: authed + `sid` ownership required
  - `/portal/subscribe`: authed + `AWAITING_PAYMENT` required
  - `/portal/paymentSuccess`: authed; sync; then redirect to `/portal`
  - `/portal/[projectId]`: authed + project ownership required; render portal

## Single Decision Query
Create a Convex query (e.g., `auth.getPortalDecision`) that returns:
- `authed`: boolean
- `user`: minimal user fields `{ _id, email, name? }`
- `primaryProject`: `{ _id, projectId, projectStatus } | null`
- `prospectSessionId`: `string | null` (latest by email if available)
- `subscription`: minimal cached subscription (from `stripeHelpers.getMySubscription`)
- `redirect`: one of `null | "/portal/agreement?sid=..." | "/portal/subscribe" | "/portal/[projectId]"`

Logic:
- If not authed → `{ authed: false, redirect: null }`
- If authed and no project:
  - If `prospectSessionId` can be found via `prospects.by_contactEmail`, set `redirect` to agreement with that `sid`.
- If authed and project exists: set `redirect` by `projectStatus`:
  - `AWAITING_AGREEMENT` → `/portal/agreement?sid=...`
  - `AWAITING_PAYMENT` → `/portal/subscribe`
  - `AWAITING_ASSETS+` → `/portal/[projectId]`
  - `ARCHIVED` → `/portal/[projectId]` with read-only notice

Note: If multiple projects later, define “primary” as most recent non-archived or most recent by `createdAt`.

## Unauthenticated Portal Login Flow (/portal)
- UI: “Already a client?” email input.
- On submit:
  - Call `prospects.isKnownEmail({ email })`:
    - Check `prospects.by_contactEmail` for latest.
    - Optionally check `billingCustomers` by email (add `by_email` index for convenience).
  - If known → call Better Auth magic link with `callbackURL: "/portal"`.
  - If unknown → message “We couldn’t find your email” with CTAs (Start Onboarding | Schedule Call).
- Rate limit: rely on Better Auth’s existing rules and add a mild UI cooldown.

## Agreement Page (/portal/agreement?sid=...)
- Gating:
  - Must be authed.
  - Validate `sid` belongs to authed user:
    - Load prospect by `sid` and ensure `user.email === prospect.details.contactEmail`.
    - If mismatch → `/portal/autherror?sid=...&error=ownership`.
- Initialization:
  - Use existing `projects.findOrCreateProjectForProspect` (idempotent).
- Clickwrap:
  - On accept: insert into `agreements`, append `activity_log`, update project → `AWAITING_PAYMENT`, then redirect to `/portal/subscribe`.

## Payment Page (/portal/subscribe)
- Gating:
  - Must be authed and user’s project must be `AWAITING_PAYMENT`.
  - Enforce precondition server-side in `stripeActions.createCheckoutSession`:
    - Load the user’s project; if not `AWAITING_PAYMENT`, throw an error.
- Create Checkout:
  - Use existing action; ensure `success_url` → `/portal/paymentSuccess`.

## Payment Success (/portal/paymentSuccess)
- Gating:
  - Must be authed.
- Behavior:
  - Call `stripeActions.syncAfterSuccessForSelf`.
  - Optional small delay; then `router.push("/portal")`.
- Webhook (ensure correctness):
  - When subscription goes active or first invoice paid, set project → `AWAITING_ASSETS` if still in a pre-asset state; append `activity_log`.

## Portal Page (/portal and /portal/[projectId])
- `/portal`:
  - Unauthed: email input flow above.
  - Authed: call decision query; if `redirect` is set, push to it; else render primary portal view.
- `/portal/[projectId]`:
  - Fetch project by `projectId`.
  - Verify `authUserId === currentUser._id`.
  - Render full portal when `AWAITING_ASSETS+`; show a read-only/closed view for `ARCHIVED`.

## Admin Gating (/admin)
- Use account-based gating (recommended) rather than a password wall:
  - Env: `ADMIN_EMAILS="you@example.com,alt@example.com"`
  - UI: If not admin, redirect away from `/admin`.
  - Server: Every function in `convex/admin.ts` verifies admin (authoritative).
- Optional defense-in-depth:
  - Add Next middleware basic auth only for `/admin` in production.

## Global Header
- Outside portal:
  - Keep “Client Portal →” link (as today).
- Inside portal (`pathname.startsWith("/portal")`):
  - If authed: show user avatar + menu (profile, sign out).
  - If not authed: still show portal link or a subtle “Sign in” button.
- Load minimal user info only when in portal to avoid global auth coupling.

## Convex Additions/Changes
- Queries/Mutations/Actions
  - `auth.getPortalDecision` (query): returns the decision object above.
  - `projects.getMyPrimaryProject` (query): by `by_authUserId`, order by `createdAt` desc; filter `ARCHIVED` last.
  - `prospects.findLatestByEmail` (query): uses `by_contactEmail`; returns latest.
  - `prospects.isKnownEmail` (query): boolean; checks `prospects` (and optionally `billingCustomers` by email).
  - `agreements.createFromClickwrap` (mutation): inserts agreement + `activity_log`; sets project → `AWAITING_PAYMENT`.
  - `admin.requireAdmin` (helper) or inline check in each `convex/admin.ts` function using `authComponent.getAuthUser`.
- Stripe actions
  - `stripeActions.createCheckoutSession`: assert user project is `AWAITING_PAYMENT`.
  - Webhook handler (Next API route or `convex/http.ts`): on activation/first invoice paid → project → `AWAITING_ASSETS`; log activity.

## Schema Updates (optional but recommended)
- `billingCustomers`: add index `by_email` to support login checks by email.
- No other schema changes required for MVP of this plan.

## Environment Variables
- `SITE_URL` (Better Auth base URL)
- `NEXT_PUBLIC_BASE_URL` (public site origin; used in Stripe redirects)
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`
- `ADMIN_EMAILS` (comma-separated)
- Email sending: configured already for Resend via Better Auth plugin

## Security Considerations
- Agreement ownership: enforce `sid` belongs to authed user before allowing acceptance.
- Admin authorization: enforce in every admin Convex function; UI checks are not enough.
- Payment preconditions: assert project status server-side before creating checkout.
- Magic link abuse: keep Better Auth rate limits; add UI cooldown and a server-side “known email” check.
- Project access: always scope queries to `authUserId`; never leak other users’ projects.

## UX Notes
- `/portal` should show clear state messages during redirects: “Taking you to your agreement…”, “Taking you to checkout…”.
- Unauthed `/portal`: friendly copy if email not found, with two CTAs (Onboarding | Schedule a Call).
- After payment success: short success feedback before redirect.

## Implementation Steps
1) Back end (Convex)
- Add `auth.getPortalDecision`, `projects.getMyPrimaryProject`, `prospects.findLatestByEmail`, `prospects.isKnownEmail`.
- Add `agreements.createFromClickwrap` mutation; patch project → `AWAITING_PAYMENT`; append `activity_log`.
- Update `stripeActions.createCheckoutSession` to assert `AWAITING_PAYMENT`.
- Ensure webhook updates project → `AWAITING_ASSETS` when subscription is active or first invoice paid.

2) Front end (Next.js)
- `/portal/page.tsx`:
  - Unauthed email input → check known email → send magic link with `callbackURL: "/portal"`.
  - Authed: call decision query once; push to `redirect`.
- `/portal/agreement/page.tsx`:
  - Verify `sid` ownership; initialize project; render clickwrap; on accept call `agreements.createFromClickwrap`; then push `/portal/subscribe`.
- `/portal/subscribe/page.tsx`:
  - Optionally pre-check project status (UI); action enforces it anyway; on error, push to `/portal`.
- `/portal/paymentSuccess/page.tsx`:
  - Keep existing sync + redirect.
- `/portal/[projectId]/page.tsx`:
  - Verify ownership; render portal or archived-readonly.

3) Header
- In `components/global-header.tsx`, if inside portal and authed, show avatar + menu; otherwise keep “Client Portal →”.

4) Admin
- UI: redirect away if not admin.
- Server: enforce admin in `convex/admin.ts`.

5) Optional Middleware (production)
- Basic auth for `/admin` as secondary protection.

## Testing Checklist
- Unauthed `/portal`:
  - Known email → receives magic link; callback to `/portal` → decision redirects correctly.
  - Unknown email → shows helpful message and CTAs; no link sent.
- Authenticated:
  - No project; known prospect → `/portal/agreement?sid=...`.
  - Agreement accept → project → `AWAITING_PAYMENT` → `/portal/subscribe`.
  - Checkout success → `/portal/paymentSuccess` → sync → `/portal`.
  - Webhook flips project to `AWAITING_ASSETS`; next `/portal` load renders portal.
  - Archived project → read-only view.
- Admin:
  - Non-admin blocked in UI and server functions.
- Header:
  - In-portal shows avatar; elsewhere shows portal link.

## Rollout Plan
- Implement Convex queries/mutations.
- Implement portal decision and gating UI.
- Add admin server checks.
- Add Stripe preconditions and verify webhook promotion to `AWAITING_ASSETS`.
- Ship behind a short-lived feature flag if desired; test with a dummy account; then remove flag.

## Future Enhancements
- Multiple projects per user: enhance decision to choose active primary project or show project switcher.
- Portal ticketing and asset library.
- Subscription management surfacing from `subscriptions` cache with next renewal date.
- Dunning states: restrict some features at read-time based on subscription status.

### To-dos

- [x] Implement Convex queries/mutations and schema/index updates per plan
- [x] Harden Stripe actions and webhook status promotion
- [ ] Refactor portal routes for auth gating and decision redirects
- [ ] Adjust portal header/avatar behavior
- [ ] Enforce admin-only access in UI and Convex admin functions
- [ ] Run end-to-end portal and admin QA
