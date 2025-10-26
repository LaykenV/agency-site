Portal Architecture & Routing Guardrails
=======================================

Purpose
-------
Document the full frontend flow of the client portal and list the Convex backend calls each page performs. Every route follows a consistent gating pattern to keep authentication, project state, and billing stages in sync.

Global Building Blocks
----------------------
- **Auth wrappers** (`AuthLoading`, `Unauthenticated`, `Authenticated`) from `convex/react` ensure we never render sensitive UI without a confirmed session.
- **Decision source of truth**: `api.auth.getPortalDecision` returns `{ authed, primaryProject, prospectSessionId, subscription, redirect }` and drives every authenticated portal redirect.
- **Status alignment**: Project status constants (`AWAITING_AGREEMENT`, `AWAITING_PAYMENT`, etc.) determine which page the client should see next.

Route Reference
---------------
The table below summarizes which Convex functions each route hits:

| Route | Component responsibilities | Convex functions invoked |
| ----- | -------------------------- | ------------------------ |
| `/portal` | Entry gate, login capture, redirect orchestration | `api.prospects.isKnownEmail` (query), `api.auth.getPortalDecision` (query) |
| `/portal/agreement?sid=...` | Agreement review + project bootstrap | `api.prospects.getProspectBySessionId` (query), `api.auth.getCurrentUser` (query), `api.auth.getPortalDecision` (query), `api.projects.findOrCreateProjectForProspect` (mutation), `api.agreement.createFromClickwrap` (mutation) |
| `/portal/subscribe` | Checkout handoff | `api.auth.getPortalDecision` (query), `api.stripeActions.createCheckoutSession` (action) |
| `/portal/[projectId]` | Project workspace dashboard | `api.auth.getPortalDecision` (query), `api.projects.getPortalProject` (query) |
| `/portal/paymentSuccess` | Post-checkout sync | `api.auth.getPortalDecision` (query), `api.stripeActions.syncAfterSuccessForSelf` (action) |

Detailed Flow Per Route
-----------------------

`/portal`
^^^^^^^^^
- **Unauthenticated view**
  - Collects an email and checks if we know the prospect via `api.prospects.isKnownEmail` (query).
  - If known, calls `authClient.signIn.magicLink` (Better Auth client action) which hits the Better Auth API.
- **Authenticated redirect**
  - Fetches `api.auth.getPortalDecision` to decide where to send the user.
  - If `decision.redirect` exists, we `router.replace` to it.
  - When no redirect is available, we display a CTA panel (start onboarding / schedule a call) instead of leaving the spinner.

`/portal/agreement`
^^^^^^^^^^^^^^^^^^^^
- Requires a `sid` query param. Guard logic:
  - `api.prospects.getProspectBySessionId` loads the prospect document.
  - `api.auth.getCurrentUser` returns the signed-in account details.
  - Client compares the normalized prospect email to the authed user; mismatches redirect to `/portal/autherror`.
- Project initialization:
  - `api.projects.findOrCreateProjectForProspect` (mutation) re-checks ownership server-side and returns the project ID.
  - ID is cached locally until `api.auth.getPortalDecision` refetches with the new `primaryProject`.
- Agreement acceptance:
  - Calls `api.agreement.createFromClickwrap` (mutation) with the project ID, terms version, and hash.
  - On success, `router.replace("/portal/subscribe")`.
- Page also keeps polling `api.auth.getPortalDecision` to react if project status changes externally.

`/portal/subscribe`
^^^^^^^^^^^^^^^^^^^^
- Always runs `api.auth.getPortalDecision` (query) to ensure the user is allowed to be here.
- If still awaiting agreement → redirect back using the decision data.
- Primary CTA triggers `api.stripeActions.createCheckoutSession` (action) which returns a Checkout URL; we set `window.location.href` to hand off to Stripe.

`/portal/[projectId]`
^^^^^^^^^^^^^^^^^^^^^^
- Uses the dynamic segment to call `api.projects.getPortalProject` (query). Backend verifies the project belongs to the authed user; non-owners get `null` and the client redirects home.
- Also runs `api.auth.getPortalDecision` to stay aligned with the canonical project status. If status downgrades (e.g., payment lapsed), we forward users to the appropriate route.

`/portal/paymentSuccess`
^^^^^^^^^^^^^^^^^^^^^^^^^
- After Stripe redirects back, we request `api.stripeActions.syncAfterSuccessForSelf` (action) to refresh the Stripe subscription cache for the user.
- Once syncing completes (or times out), we push back to `/portal` where the regular decision logic kicks in.

Supporting Convex Functions
---------------------------
- `api.auth.getPortalDecision`
  - Calls `internal.projects.internalGetLatestProjectByAuthUser` to find the latest project that isn’t archived.
  - Optionally fetches the latest prospect record by email via `api.prospects.findLatestByEmail`.
  - Pulls subscription details with `api.stripeHelpers.getMySubscription`.
  - Returns the next redirect path based on project status progression.
- `api.projects.findOrCreateProjectForProspect`
  - Uses `authComponent.getAuthUser` to guarantee a logged-in user.
  - Confirms the prospect email matches the authed email before inserting a project stub.
  - Inserts an `activity_log` entry (`project_created`) when a new project row is created.

Guardrails & UX Notes
---------------------
- All navigation changes use `router.replace` to avoid stacking history during onboarding steps.
- Email ownership is checked both client-side and server-side to block spoofed agreement access.
- Fallback CTA on `/portal` is essential for authenticated users without a project/prospect path.
- Each page reuses shared queries instead of duplicating state machines, keeping the portal flow deterministic.
