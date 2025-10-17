# Onboarding, Auth & Checkout Architecture (Updated Oct 2025)

**Status**: ✅ Anonymous → Auth flow using onboarding sessions + projects tables
**Last Updated**: October 17, 2025

---

## Overview

Anonymous briefs now live in the `onboarding_sessions` table, while authenticated projects move to `projects`. The flow remains: anonymous brief → AI plan → sign in → checkout, but the persistence model matches the upgrade plan:

- `onboarding_sessions`: sessionId + resumeToken, brief fields, normalized plan proposal (`PlanProposal`), selected tier, recommended tier
- `projects`: tied to authenticated users (`authUserId`), references onboarding session, stores plan tier/proposal, project + payment status

AI plans are generated via `internal.onboarding_sessions.generatePlanRecommendation`, which calls `internal.agent.generateProjectPlans` (Groq) and stores normalized tiers with summaries, deliverable notes, and recommended tier. Actions + mutations follow Convex best practices (new function syntax, validators, index usage).

The onboarding UI consumes the new `PlanProposal` shape, renders "Included with every plan" and "After payment" constants, and shows a "Recommended for you" chip based on AI output.

---

## Database Schema

### `onboarding_sessions`

```ts
{
  sessionId: string;
  resumeToken: string;
  brief: OnboardingBrief;
  plan?: PlanProposal;        // normalized tiers, recommendedTier
  selectedTier: PlanTierOption | null;
  recommendedTier: PlanTierOption | null;
  createdAt: number;
  updatedAt: number;
}
```

Indexes:
- `by_sessionId` (sessionId)
- `by_resumeToken` (resumeToken)

### `projects`

```ts
{
  authUserId: string;         // Better Auth subject/token identifier
  projectId: string;          // slug-based unique id
  onboardingSessionId?: Id<"onboarding_sessions">;
  planTier: PlanTierOption | null;
  planProposal?: PlanProposal;
  projectStatus?: ProjectStatus;
  paymentStatus?: { status: string; providerIntentId: string | null };
  postPay?: PostPaymentDetails;
  deployment?: DeploymentDetails;
}
```

Indexes:
- `by_authUserId`
- `by_projectId`

---

## Convex Modules

### `convex/onboarding_sessions.ts`
- `initSession` mutation: creates onboarding session with default brief; idempotent when existing sessionId provided
- `getSession` query: fetches by sessionId via index, returns brief + plan proposal + tiers
- `updateBrief` mutation: merges partial updates, logs via `console.log`
- `setSelectedTier` mutation: patches selected tier for CTA interactions
- `savePlan` internal mutation: stores normalized `PlanProposal`
- `generatePlanRecommendation` internal action: loads session, calls Groq agent, normalizes tiers, persists via `savePlan`

### `convex/projects.ts`
- `linkAnonymousSession` mutation: links session to authenticated user, creates project with status `AWAITING_PAYMENT`
- `confirmCheckout` mutation: marks project as paid (`AWAITING_ASSETS`), ensures tier recorded, updates session selection
- `getProjectById` query: portal hydration, ensures authenticated ownership
- `getCurrentProject` query: returns current user project summary for portal landing

### `convex/plans.ts`
- `regeneratePlan` mutation: schedules plan generation through onboarding sessions action (no duplicate API)

### `convex/agent.ts`
- Prompt enforces plain language, banned term replacements, deliverable notes with timelines, recommended tier
- Returns normalized tiers with `headline`, `tierSummary`, `summary`, `pages`, `features`, `deliverableNotes`
- Fallback uses baselines matching the new contract

---

## Types & Constants

- `types/profile.ts`: defines `PlanProposal`, `PlanTierDetails`, `OnboardingSession`, `Project`, plus default brief and options
- `types/project.ts`: `Project` domain types (post-pay, deployment)
- `components/onboarding/constants.ts`: `ALL_TIERS_INCLUDED`, `AFTER_PAYMENT_COPY`

---

## UI Updates

- `useOnboardingSession` hook (replaces legacy profile hook) handles session init, autosave, plan regeneration, tier selection
- `BriefSummaryStep` renders:
  1. Included with every plan
  2. AI tier cards with `tierSummary` + "Recommended" chip when `PlanProposal.recommendedTier` matches
  3. After payment copy
- Portal `[projectId]` page loads project + associated session, shows brief, plan recommendation, next steps

---

## Flow Summary

1. Anonymous visitor hits onboarding → `initSession` stores default brief
2. Autosave updates via `updateBrief`
3. On "See my tailored plan", UI calls `plans.regeneratePlan` → action generates AI tiers → `savePlan`
4. Tier cards show recommended chip; user selects tier → `setSelectedTier`
5. Checkout triggers Google OAuth. After sign in, `projects.linkAnonymousSession` or existing project ensures handoff
6. `projects.confirmCheckout` marks project ready, updates statuses, reuses plan proposal
7. Portal fetches project + session to show plan + brief

---

## Logging & Observability

- `console.log` statements replace `events` table for key milestones: session init, brief updates, plan saved, plan generation start/complete
- Cron (future) can clean up unused sessions by age

---

## Next Steps

- Integrate Stripe checkout (replace simulated `confirmCheckout`)
- Add cron to prune stale onboarding sessions
- Extend portal to show post-pay fields once populated
- Analytics/log forwarding for console statements if needed
