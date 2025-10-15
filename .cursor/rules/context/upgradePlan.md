### Auth & Onboarding Flow Upgrade Plan

**Status**: ✅ IMPLEMENTED - October 15, 2025

This upgrade plan has been fully implemented. See `ONBOARDING-ARCHITECTURE.md` for complete documentation of the implemented features.

#### Goals
- Minimize friction pre-payment; authenticate only at high-intent moments.
- Make signed-in and returning experiences predictable and fast.
- Allow simulation of a successful payment by creating a project and redirecting to the portal.

---

### Current Direction (kept, refined)
- Anonymous-first onboarding on `/onboarding` using `useOnboardingProfile` with localStorage-backed `sessionId`.
- Save tier selection; at Checkout attempt Google One Tap; fallback to OAuth; link anonymous session; then proceed to payment.
- Keep `expectAuth: false` in `components/ConvexClientProvider.tsx` to permit anonymous queries/mutations.

Key refinements in this plan:
- Add global explicit “Sign in” (OAuth) CTA in header; use One Tap only contextually (after Checkout click).
- If user is already authenticated on onboarding, skip One Tap and linking; go straight to simulated payment.
- Replace Stripe placeholder logging with a simulated success path: persist `projectId` and status then redirect to portal.

---

### One Tap vs OAuth Policy
- Use OAuth for explicit CTAs (header "Sign in", fallback button on Checkout).
- Use One Tap only post-Checkout click (high-intent, opportunistic).
- Both One Tap and OAuth map to the same Google identity in Better Auth; treat them interchangeably for sign-in and linking.

---

### User Journeys (updated)

1) New, anonymous visitor → Get started → Onboarding
- Initialize anon session via `api.profiles.initSession` (stored in localStorage).
- Autosave brief on change via `api.profiles.updateProfileBySession`.
- On Checkout click:
  - Save tier via `api.profiles.setPlanSelection`.
  - Try `authClient.oneTap(...)`.
    - On success: `handoffAnonymousSession(api.auth.linkAnonymousSession)`.
    - If blocked/dismissed: show OAuth fallback and link after callback.
  - Then simulate payment (see Simulated Payment) → redirect to portal.

2) Signed-in user hits Get started → Onboarding
- Load/edit by `authUserId` (prefer profile by auth over session).
- If a stray anon session exists in localStorage, link/merge once and clear it.
- Checkout → simulate payment immediately (no One Tap/linking needed).

3) Returning signed-in user
- Header “Portal” nav goes to `/portal` which redirects to `/portal/[projectId]` if one project exists.
- If no project yet, route to `/onboarding` to resume in-progress brief.

4) Returning anonymous user on same device
- Resumes via localStorage `sessionId` into `/onboarding`.
- Optional inline CTA: “Sign in to sync progress across devices” (OAuth). On success, link and continue.

---

### Routing & Redirect Rules
- Header "Sign in" (OAuth):
  - If user has a `projectId` → go to `/portal/[projectId]`.
  - Else → go to `/onboarding` to resume.
- `/onboarding` while authenticated:
  - If `projectId` present → redirect to `/portal/[projectId]`.
  - Else continue editing the onboarding profile keyed by `authUserId`.
- Preserve `postAuthRedirect` for OAuth callbacks and One Tap success to finish pending actions (e.g., Checkout).

---

### Simulated Payment (replace Stripe placeholder)
Objective: On Checkout, instead of logging, persist a project and redirect to the portal as if payment succeeded.

Proposed server additions in `convex/profiles.ts`:
- `confirmCheckoutForSession` (mutation)
  - Args: `{ sessionId?: string, tierId?: string }` (either session-bound or pull current `plan.tierId`).
  - Behavior:
    - Resolve the active profile: if authenticated, prefer `authUserId`; otherwise use `sessionId`.
    - Require `plan.tierId` to be set; if not, throw a friendly error.
    - If user is not authenticated, require linking to be completed first (One Tap/OAuth).
    - Generate a human-friendly `projectId` (slug from `companyName` + year). Ensure uniqueness (index `by_projectId`).
    - Update profile:
      - `projectId`
      - `projectStatus = "AWAITING_ASSETS"`
      - `paymentStatus = { status: "succeeded", providerIntentId: null }`
    - Log events: `payment.succeeded`, `project.created`.
    - Return `{ projectId }`.

Client flow on Checkout (in `app/onboarding/page.tsx`):
1. `setPlanSelection({ sessionId, tierId })`.
2. Attempt One Tap → on success link; on failure show OAuth button.
3. Call `confirmCheckoutForSession`.
4. `router.push("/portal/" + projectId)`.

Note: When user is already authenticated on onboarding, skip One Tap & linking; go straight to step 3.

---

### Portal MVP (simple)
Create minimal but polished pages:
- `app/portal/page.tsx`
  - Auth gate using `Authenticated`/`Unauthenticated`/`AuthLoading`.
  - If the authenticated profile has `projectId`, redirect to `/portal/[projectId]`.
  - Otherwise, show a helpful message with a CTA to `/onboarding`.

- `app/portal/[projectId]/page.tsx`
  - Authenticated only. Load profile via a new query (see below) or by `authUserId` and match `projectId`.
  - Show: greeting with `brief.contactName`, company, selected tier, `projectStatus`, and simple next steps list (placeholder for post-pay assets).

Convex queries:
- Add `getProfileByProjectId({ projectId })` to `convex/profiles.ts` to support direct portal hydration.
- Keep existing `api.auth.getProfileByAuthUserId` for default portal redirect logic.

Navigation:
- Global header shows "Sign in" (OAuth) when signed out; shows "Portal" when signed in.

---

### Data Model & Indexes (confirm/extend)
- `profiles` (existing): ensure indexes `by_projectId`, `by_sessionId`, `by_authUserId` exist as planned.
- `events`: continue logging `auth.session_linked`, `payment.succeeded`, `project.created`.

---

### Edge Cases to Handle
- Stale localStorage: If `sessionId` exists but profile is null and user is authenticated, clear localStorage and continue by `authUserId`.
- Double linking: `linkAnonymousSession` remains idempotent.
- Returning signed-in user clicking "Get started": Route to onboarding if no `projectId`, else to portal.

---

### Acceptance Criteria
- Anonymous onboarding works with autosave and no auth errors.
- Checkout flow:
  - One Tap success → links session → `confirmCheckoutForSession` → redirects to `/portal/[projectId]`.
  - One Tap unavailable → OAuth fallback → links → confirms → redirects.
  - Already signed-in on onboarding → confirms → redirects (no One Tap shown).
- Header "Sign in" (OAuth) sends users to portal if `projectId` exists, else onboarding.
- Portal MVP renders key profile details and `projectStatus` for authenticated users; unauthenticated users see a sign-in prompt.
- Events are recorded for plan selection, session linking, and simulated payment.

---

### Testing Checklist
- Anonymous onboarding persistence and duplicate prevention in React StrictMode.
- One Tap prompt on Checkout; OAuth fallback path.
- Linking sets `authUserId` and clears localStorage.
- `confirmCheckoutForSession` sets `projectId`, status, events, and returns `projectId`.
- Authenticated onboarding skips One Tap and linking.
- Header sign-in/out and Portal navigation behave as specified.

---

### Rollout Plan
1) ✅ Implement `confirmCheckoutForSession` + `getProfileByProjectId` in `convex/profiles.ts`.
2) ✅ Update Checkout handler in `app/onboarding/page.tsx` to invoke confirmation and redirect.
3) ✅ Add header auth controls (OAuth sign-in, Portal link when signed in).
4) ✅ Create Portal MVP pages under `app/portal`.
5) ⏳ QA per checklist across One Tap, OAuth, and already-signed-in scenarios.

---

### Notes
- Keep One Tap scoped to Checkout for best UX and lower surprise factor.
- Always prefer authenticated profile when available (source of truth) and clean up stale anon session state.


