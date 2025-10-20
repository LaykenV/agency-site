# Simplified Onboarding Architecture

## Status
- **Target launch:** Single-plan onboarding handoff
- **Last updated:** October 19, 2025 (post-upgrade refactor)

## Product Goal
Capture qualified leads through a frictionless intake → AI plan → schedule call loop. The onboarding form gathers enough context to craft a tailored version of our single "All-Inclusive Plan" and funnels every prospect to a Cal.com booking, without handling auth, payments, or checkout inside this flow.

## Experience Overview
1. **Entry:** Anonymous visitor lands on `/onboarding`.
2. **Autosave Brief:** A single form captures contact + business context. Autosave persists changes via `onboarding_sessions.updateBrief` so partial entries are never lost.
3. **Generate Plan:** The primary CTA (“See tailored plan”) triggers the AI generator to produce a single-plan summary stored on the session.
4. **Schedule Call:** Once a plan exists, the UI reveals a prominent “Schedule call” button that links directly to our Cal.com calendar. No additional checkout/authentication is required.
5. **Authenticated Return Visit:** If an authenticated client hits `/onboarding`, we immediately (or via TODO placeholder) redirect them to the client portal route.

## Data Model Snapshot
- **`onboarding_sessions`** (Convex)
  - Identifiers: `sessionId`, `resumeToken`, timestamps.
  - `brief`: lean shape (contact name/email, company, phone, business description, current site, optional notes).
  - `plan`: single AI plan object (`generatedAt`, `promptVersion`, `headline`, `summary`, `highlights`, `nextSteps`).
  - `contactEmail`: normalized lowercase copy of the brief email for lookups.
  - `lastPlanRequestedAt`: optional timestamp for throttling plan generation.
  - `planGenerationInProgress`: boolean flag to guard concurrent generations.
  - Indexes: `by_sessionId`, `by_resumeToken`, `by_contactEmail`, `by_updatedAt`.
- **`projects`**
  - Remains unchanged for the portal experience; onboarding no longer writes to it but downstream features still rely on the schema.

## Convex Functions & Validators
- All onboarding functions live under `convex/onboarding/sessions.ts` and use the modern Convex registration syntax.
- Shared validators and onboarding constants are defined once in `convex/onboarding/validators.ts` and imported everywhere (schema, functions, agent). No more duplicated `v.object` definitions.
- `initSession` (public mutation): generates anonymous session/resume tokens, seeds the brief, and defaults `planGenerationInProgress` to `false` with an empty `contactEmail`.
- `getSession` (public query): hydrates the client with the current brief/plan; unchanged return shape.
- `updateBrief` (public mutation): accepts the full brief payload plus `resumeToken`, enforces token checks, normalizes `contactEmail`, and patches timestamps.
- `generatePlan` (public mutation): enforces `resumeToken`, throttles requests using the shared `PLAN_GENERATION_THROTTLE_MS`, persists the submitted brief, flips `planGenerationInProgress`, and schedules the internal action.
- `generatePlanAction` (internal action): loads the brief server-side, calls `internal.onboarding.agent.generateOnboardingPlan`, saves the plan, and resets the in-flight flag when errors occur.
- `savePlan` / `resetPlanGenerationState` (internal mutations): write the generated plan and manage the in-flight state.
- Legacy helpers like `getSessionForPlanGeneration` have been removed to reduce surface area.

## Frontend Architecture
- `app/onboarding/page.tsx`
  - Maintains auth guard before rendering the client component.
- `app/onboarding/OnboardingClient.tsx`
  - Renders the single-form layout backed by the updated hook.
  - Gates the “Schedule call” CTA (Cal link sourced from `lib/config.ts`) on plan existence to avoid premature bookings.
- `components/onboarding/*`
  - Inline form UI and plan preview moved to `components/onboarding/form/Field.tsx`, `components/onboarding/form/TextArea.tsx`, and `components/onboarding/PlanPreview.tsx` for reuse and clarity.

## Hook & Utilities
- `lib/convex/onboarding/hooks/*`
  - `useSessionInit` bootstraps/resumes anonymous sessions and persists tokens to localStorage.
  - `useSessionData` hydrates the client with server brief/plan and keeps remote plan authoritative.
  - `useAutosave` manages debounced brief saves with a force-save escape hatch.
  - `usePlanGenerator` orchestrates plan generation, spinner state, and throttled retries.
- `lib/convex/onboarding/useOnboardingSession.ts`
  - Composes the four focused hooks into the existing API surface consumed by the UI.
  - Maintains local optimistic brief state, dirty tracking, and delegates network concerns to the sub-hooks.
- `lib/config.ts`
  - Centralizes `ONBOARDING_CAL_LINK` and related constants for client and server usage.

## AI Plan Generation
- `convex/onboarding/agent.ts` exposes `generateOnboardingPlan`, the single entry point for AI copy generation.
- Uses shared validators, Convex-derived types, and centralized constants (e.g., `PLAN_TEXT_MAX_LENGTH`) for sanitization.
- Still uses the Convex Agent kit with GROQ; adjust prompt tuning here when messaging changes.
- `generatePlanAction` handles success/error paths and safeguards the in-flight flag.

## External Integrations
- **Cal.com:** CTA uses `ONBOARDING_CAL_LINK`; once plans exist we reveal booking. Webhook ingestion remains optional for future backfill into `calBooking`.
- **Auth:** Onboarding flow remains anonymous; portal auth stays decoupled.

## Types & Data Flow
- `types/onboarding.ts` derives all client types from Convex-generated `Doc<"onboarding_sessions">`, keeping the schema as the single source of truth while still exporting `defaultBrief` for UI initialization.

## Future Enhancements
- Add success state after Cal booking (e.g., allow users to confirm they scheduled the call).
- Sync Cal.com webhooks into `calBooking` for richer portal context.
- Offer optional download/email of the generated plan.
- Reintroduce checkout logic only when payments move back into the onboarding funnel.
