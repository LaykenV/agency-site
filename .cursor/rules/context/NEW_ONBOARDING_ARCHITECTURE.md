# Onboarding Platform Architecture

## Status
- **Target launch:** Single-plan onboarding handoff
- **Last updated:** October 20, 2025 (post-prospects refactor)

## Product Goal
Capture qualified leads through a frictionless flow: prospect intake → AI-generated single-plan proposal → scheduled strategy call. The onboarding experience collects just enough context to craft a tailored version of our All-Inclusive Plan, then routes every prospect to Cal.com for human follow-up. Authentication, payment, and portal access remain outside this flow.

## End-to-End Experience
1. **Entry** – Anonymous visitor loads `/onboarding`. If the visitor is already authenticated as a paying client, the page should redirect them to the client portal (future enhancement).
2. **Session Bootstrap** – Client calls `onboarding.sessions.initSession`. We return a `sessionId` and `resumeToken`, persist them to localStorage, and seed an empty prospect record.
3. **Prospect Intake Form** – The single-page form captures contact and business details. Edits stay local until saved; the UI tracks dirty fields.
4. **Autosave** – On blur / explicit triggers we call `onboarding.sessions.updateDetails` with the full details payload and `resumeToken`, keeping the server copy in sync.
5. **Generate Plan CTA** – Primary button (“See tailored plan”) calls `onboarding.sessions.generatePlan`. The mutation persists the latest details, throttles repeat clicks, and schedules AI plan generation.
6. **AI Plan Generation** – `generatePlanAction` runs server-side, asks `internal.onboarding.agent.generateOnboardingPlan` for copy, validates + sanitizes the payload, and saves it via `savePlan`.
7. **Plan Display** – Once `aiGeneratedPlan` exists, the UI renders `PlanPreview` with headline, summary, highlights, and next steps.
8. **Schedule Call CTA** – When a plan exists we reveal the Cal.com button (`ONBOARDING_CAL_LINK`). The user books a consult to move forward.
9. **Lifecycle** – Future steps (outside scope): Cal.com webhooks enrich prospect, “Send contract” triggers, conversion to project, Stripe paywall, portal onboarding, etc.

## Data Model
### Convex Schema (`convex/schema.ts`)
- **`prospects`**
  - `sessionId: string` – client-facing identifier stored in localStorage.
  - `resumeToken: string` – secret shared with client for authenticated updates.
  - `details: prospectDetailsValidator` – contact + business intake fields.
  - `aiGeneratedPlan?: aiGeneratedPlanValidator` – the current AI proposal.
  - `contractSignedTimestamp?: number` – placeholder for DocuSign integration.
  - `calProspectBooking?: calBookingValidator` – optional Cal.com booking metadata.
  - `lastPlanRequestedAt?: number` – used for throttling plan generation.
  - `planGenerationInProgress: boolean` – guards against duplicate jobs.
  - `createdAt: number`, `updatedAt: number` – client-managed timestamps.
  - **Indexes**: `by_sessionId`, `by_resumeToken`, `by_contactEmail` (derived from `details.contactEmail`), `by_updatedAt`.
- **`projects`**
  - `authUserId: string`
  - `projectId: string`
  - `prospectId?: Id<"prospects">` – ties projects back to the originating prospect.
  - `projectStatus?: projectStatusValidator` – lifecycle enum.
  - `stripeCustomerId?: string`
  - `buildDetails?: buildDetailsValidator` – renamed from previous `postPay` block.
  - `deployment?: deploymentValidator`
  - `calKickoffBooking?: calBookingValidator`
  - `calReviewBooking?: calBookingValidator`
  - **Indexes**: `by_authUserId`, `by_projectId`.

## Validators & Constants (`convex/validators.ts`)
- `prospectDetailsValidator`: contact name/email, company, phone, current site, business description, goals, notes.
- `aiGeneratedPlanValidator`: `generatedAt`, `promptVersion`, `headline`, `summary`, `highlights[]`, `nextSteps[]`.
- `projectStatusValidator`: `AWAITING_PAYMENT` | `AWAITING_ASSETS` | `IN_PROGRESS` | `IN_REVIEW` | `LIVE` | `ARCHIVED`.
- `buildDetailsValidator`: intake for post-pay requirements (domain preference, assets, etc.).
- `deploymentValidator`: live/staging URLs + Vercel project id.
- `calBookingValidator`: placeholder shape (`scheduledAt`, optional `meetingUrl`, `notes`).
- `PLAN_GENERATION_THROTTLE_MS`: 15 seconds between plan requests.
- `PLAN_TEXT_MAX_LENGTH`: max length for AI strings.
- `SESSION_EXPIRY_DAYS`: availability window for resuming sessions (future use).

## Convex Functions (`convex/onboarding/sessions.ts`)
- `initSession` *(public mutation)* – creates the prospect row, returns session/resume tokens.
- `getSession` *(public query)* – fetches `details` and `aiGeneratedPlan` by `sessionId`.
- `updateDetails` *(public mutation)* – validates `resumeToken`, normalizes email to lowercase, and patches `details` + `updatedAt`.
- `generatePlan` *(public mutation)* – saves latest details, throttles repeated requests, marks `planGenerationInProgress`, and schedules `generatePlanAction` via the Convex scheduler.
- `generatePlanAction` *(internal action)* – fetches session, calls the agent, and writes the resulting plan through `savePlan`. On error it logs, resets state via `resetPlanGenerationState`, and rethrows.
- `savePlan` *(internal mutation)* – stores `aiGeneratedPlan`, clears `planGenerationInProgress`, and updates timestamps.
- `resetPlanGenerationState` *(internal mutation)* – safety valve to flip `planGenerationInProgress` off after failures.
- Shared helper `saveDetailsInternal` encapsulates token verification, email normalization, and patching.

## AI Agent (`convex/onboarding/agent.ts`)
- Uses `@convex-dev/agent` + Groq (`openai/gpt-oss-120b`).
- `generateOnboardingPlan` *(internalAction)* accepts `prospectDetailsValidator`, calls `generatePlanWithAgent`.
- `generatePlanWithAgent` builds a prompt from prospect details, creates a Convex agent thread, requests GROQ text, parses JSON, and sanitizes fallback strings via shared constants.
- `fallbackPlan` provides a deterministic plan when the LLM response fails validation.

## Client Hooks & Utilities (under `lib/onboarding/`)
- `useSessionInit` – manages anonymous session creation and localStorage persistence.
- `useSessionData` – hydrates remote `details`/`plan`, falls back to local state until data arrives.
- `usePlanGenerator` – wraps the `generatePlan` mutation, tracks spinner state, and resets when a new plan timestamp arrives.
- `useOnboardingSession` – orchestrates the above hooks, keeps local details + dirty fields, exposes `write`, `generatePlan`, and `details`/`plan` to the UI.
- Types derive from `Doc<"prospects">` (`ProspectDetails`, `ProspectPlan`, `ProspectSession`, `defaultProspectDetails`).

## UI Flow (`app/onboarding/OnboardingClient.tsx`)
- Suspense wrapper renders loading states.
- Accesses `useOnboardingSession` to read/write details, check hydration, track plan generation, and compute CTA states.
- Disables “See tailored plan” unless required fields are present and no generation is in progress.
- Displays `PlanPreview` once an AI plan exists.
- Reveals scheduling CTA with `ONBOARDING_CAL_LINK` only after plan generation succeeds.

## External Integrations & Future Work
- **Cal.com** – front-end CTA only; future work includes ingesting booking webhooks and persisting them to `calProspectBooking` / project kickoff fields.
- **DocuSign** – placeholder fields (`contractSignedTimestamp`) for automated contract flows.
- **Stripe / Portal** – prospects become projects after contract and payment flows (outside current scope).
- **Auth** – onboarding remains anonymous; portal auth handled separately via Better Auth.

## Operational Notes
- Regenerate Convex `_generated` artifacts after schema changes (`npx convex dev --once`).
- Keep validators in sync when expanding prospect fields or plan structure.
- Throttle constants live in validators to avoid drift between client and server.
- LocalStorage key: `onboarding_session`. Clear carefully if we change session semantics.

## Future Enhancements
- Redirect authenticated users away from `/onboarding`.
- Add success confirmation after Cal booking.
- Implement Cal.com webhook ingestion to enrich `prospects` and schedule project kickoff/review calls.
- Automate contract sending and integrate DocuSign webhook to create projects.
- Add Stripe paywall to gate client portal access and manage subscriptions.
- Provide download/email options for generated plans.
- Build admin interface for manual prospect creation and status tracking.
