# Onboarding, Auth & Checkout Architecture (Updated Oct 18, 2025)

**Status**: ✅ Anonymous brief → AI plan → Authenticated checkout → Project portal is live
**Last Updated**: October 18, 2025

---

## Overview

The onboarding experience bridges anonymous visitors and authenticated customers without losing their brief. An anonymous visitor can draft a project brief, receive AI-generated recommendations, then authenticate and complete checkout. Once they sign in, we link the anonymous work to their account and hydrate the portal with the same plan data.

At a high level the flow works like this:

1. **Anonymous session is created** – We generate a session + resume token and persist initial brief data in `onboarding_sessions`.
2. **Client collects brief inputs** – The browser autosaves changes to Convex and can regenerate AI plans on demand.
3. **AI plan generation** – A scheduler kicks off `generatePlanRecommendation`, which calls our Groq-backed agent, normalizes the response, and stores the plan.
4. **Checkout handoff** – When the visitor wants to buy, we mark their chosen tier, trigger Google OAuth, and either link the anonymous session or reuse their existing project record.
5. **Authenticated project management** – `projects` holds the canonical record for logged-in users, including selected tier, plan proposal, and status. Portal pages read directly from this table while still being able to reference the originating session.

This document captures the moving pieces, why they exist, and how they interact so you can confidently change any part of the pipeline.

---

## Flow Walkthrough

1. **Entry (`app/onboarding/page.tsx`)**
   - Server-side route checks for an authenticated profile. If the user already owns a project, it immediately redirects them to `/portal/[projectId]`. Otherwise it renders the client onboarding flow.

2. **Client experience (`OnboardingClient`)**
   - The client component orchestrates steps, error states, checkout, and tier selection. It relies on `useOnboardingSession` for data hydration, autosave, and plan regeneration. Authenticated users are redirected to the portal as soon as a project exists.

3. **Session setup (`useOnboardingSession`)**
   - On first load, the hook calls `onboarding_sessions.initSession` (or rehydrates from localStorage) to obtain a session/resume token pair. Brief edits debounce into `updateBrief`, and plan regeneration invokes `plans.regeneratePlan`.

4. **Autosave & UI feedback**
   - `AutosaveStatus` reflects whether the current brief is dirty, being saved, or generating a plan so the user understands what’s happening under the hood.

5. **Plan presentation (`BriefSummaryStep`)**
   - Pulls the plan tiers from state, displays baseline constants, highlights the recommended tier, and routes checkout requests through `handleCheckout`. If the visitor is anonymous, the client stores the intended tier in the URL so the post-login redirect can finish checkout automatically.

6. **AI plan pipeline (`convex/plans.ts` + `convex/onboarding_sessions.ts`)**
   - `plans.regeneratePlan` schedules `internal.onboarding_sessions.generatePlanRecommendation`. The action reloads the latest brief, calls the Groq agent, normalizes tier data, and persists it via `savePlan`. Failures fall back to curated baselines so the UI always has a plan to show.

7. **Checkout & project creation (`convex/projects.ts`)**
   - `linkAnonymousSession` runs immediately after OAuth to bind the anonymous session to the authenticated user (if they don’t already have a project). `confirmCheckout` records the selected tier, creates or updates the project document, patches the session, and returns the slug so the UI can redirect.

8. **Portal hydration**
   - Portal pages hit `projects.getProjectById` or `projects.getCurrentProject`, and if they need the original brief they can use `onboarding_sessions.getSessionByDocId`. This keeps the onboarding and portal data consistent without duplicating copies of the brief.

---

## Data Model Snapshot

- **`onboarding_sessions`**
  - Stores the anonymous lifecycle: session identifiers, full brief, optional plan proposal, selected/recommended tiers, timestamps.
  - Indexed by `sessionId` and `resumeToken` for fast lookup during autosave and resume flows.

- **`projects`**
  - Represents authenticated ownership: user identifier, slugified `projectId`, link back to the session, chosen plan tier, stored plan proposal, project/payment status, plus placeholders for post-payment details and deployment metadata.
  - Indexed by `authUserId` (unique project per user) and `projectId` (portal routing).

`types/profile.ts` and `types/project.ts` mirror these shapes on the client so React components and hooks stay type-safe.

---

## File Reference

### `app/onboarding/page.tsx`
- Server component that gates access to the onboarding flow. Fetches the current user profile using a Convex query and redirects authenticated users with existing projects to the portal. Ensures anonymous visitors always see the onboarding client.

### `app/onboarding/OnboardingClient.tsx`
- Client composition root for onboarding. Manages step navigation, error states, and checkout logic.
- Calls `useOnboardingSession` to hydrate brief/plan data and to handle autosave/regeneration.
- Triggers `plans.regeneratePlan` after the notes step, handles Google OAuth sign-in via `authClient`, and coordinates the final checkout call chain (`setSelectedTier` → `confirmCheckout`).

### `components/onboarding/ui/autosave-status.tsx`
- Pure presentational component that reflects autosave/regeneration state. It uses simple conditions to show "Generating", "Saving", "Unsaved changes", or "Saved", helping users trust the autosave pipeline.

### `components/onboarding/constants.ts`
- Shared copy blocks for plan marketing sections. Keeps the "Included with every plan" and "After payment" lists centralized so they remain consistent across the experience.

### `components/onboarding/steps.tsx`
- Contains the step-specific UI building blocks:
  - `BriefContactStep`, `BriefNeedsStep`, `BriefNotesStep` collect brief fields and call back to `onChange` for autosave.
  - `BriefSummaryStep` composes recap cards, plan presentation (`PlanSummaryInline`), and checkout buttons.
  - Utility components (`PlanSummary`, `PlanLoadingState`, etc.) render tier cards with recommended chip highlighting.
- Imports tier copy constants and profile types so the UI stays aligned with server expectations.

### `convex/onboarding_sessions.ts`
- Convex entry point for anonymous session lifecycle:
  - `initSession`, `getSession`, `getSessionByDocId` manage creation and hydration.
  - `updateBrief`, `setSelectedTier` handle autosave and selection writes with validators.
  - `savePlan`, `generatePlanRecommendation` orchestrate AI plan creation, normalization, and persistence (fallback included).
  - Internal validators ensure the stored data matches the shape consumed by the client-side types.

### `convex/plans.ts`
- Public mutation `regeneratePlan` that queues AI plan generation via the scheduler. Keeps the client API surface minimal while leveraging Convex background work.

### `convex/projects.ts`
- Handles the authenticated half of the flow:
  - `linkAnonymousSession` binds the session to the authenticated user once they log in.
  - `confirmCheckout` finalizes or updates a project, records payment status, ensures the onboarding session reflects the chosen tier, and returns the slug for navigation.
  - `getProjectById` and `getCurrentProject` power the portal and dashboard, enforcing ownership checks with `ctx.auth`.
  - `generateUniqueProjectId` consistently slugs company names while avoiding collisions.

### `convex/schema.ts`
- Defines both tables and all validators. Mirrors the runtime validators used inside the Convex functions, guaranteeing consistent data shapes across the stack.
- Includes optional structures for post-payment forms and deployment metadata even if they are not populated yet.

### `lib/auth/session-handoff.ts`
- Browser + server helpers that move anonymous sessions across the auth boundary. Reads/writes localStorage (`SESSION_STORAGE_KEY`), invokes `linkAnonymousSession`, and exposes a server-action-friendly variant for future usage.
- Provides clear logging and error surfaces so onboarding can retry if linking fails.

### `lib/convex/useOnboardingSession.ts`
- Core client hook that everything else leans on:
  - Initializes anonymous sessions (or rehydrates from the authenticated profile).
  - Tracks `isHydrated`, `isSaving`, `isGeneratingPlan`, and `dirtyFields` to drive UI state.
  - Debounces updates into `onboarding_sessions.updateBrief` and exposes helpers (`write`, `regeneratePlan`, `selectTier`) consumed by the onboarding steps.
  - Manages localStorage for resume tokens and clears it once the user becomes authenticated.

### `types/project.ts`
- Defines the portal-facing `Project` domain object, plus `PaymentStatus`, `PostPaymentDetails`, and `DeploymentDetails`. Keeps Convex data aligned with Next.js render expectations.

### `types/profile.ts`
- Central source of truth for onboarding domain types:
  - Enumerations (`PlanTierOption`, `NeedOption`, etc.).
  - `PlanTierDetails`, `PlanProposal`, and `OnboardingBrief` shapes used both client and server side.
  - Default brief values and step metadata (`BRIEF_STEPS`, `orderedSteps`) that drive the onboarding UI sequencing.
  - Baseline tier copy (`PLAN_TIER_BASELINES`) used for AI fallbacks and to fill any missing agent fields.

---

## Key Integration Notes

- The AI agent lives in `convex/agent.ts` (not listed above) and is invoked via `generatePlanRecommendation`. Any changes here should keep the normalized tier shape consistent with `PlanProposal`.
- Checkout currently assumes success (`paymentStatus.status = "succeeded"`). Replace that stub once the Stripe integration lands.
- Autosave relies on debouncing in `useOnboardingSession`; if you change debounce settings or brief shape, update both the validator and hook.
- Logging is intentionally minimal (`console.log`). If we adopt structured logging or analytics, add it in the Convex mutations/actions to maintain a single source of truth for lifecycle events.

---

## Future Enhancements

- Stripe (or other provider) integration to replace the optimistic payment flow.
- Cron job to expire stale anonymous sessions using Convex `cronJobs` once metrics confirm volume.
- Portal surfaces for `postPay` and `deployment` data once those flows are implemented.
- Optional analytics/log forwarding to centralize onboarding funnel metrics.
