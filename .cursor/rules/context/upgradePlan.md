## Onboarding Upgrade Plan — Architecture + UX Simplification (Oct 2025)

### Why
Prospects should glide from “tell us about your project” to “here’s your tailored plan” without wrestling with heavy persistence logic or duplicated state. Our current `profiles` table and events log keep the flow robust, but they also add friction when iterating on copy, AI prompts, and checkout. This plan keeps our Groq agent thread experience, removes unnecessary tables, clarifies the data model, and folds the upgrade copy/UX changes into a cleaner architecture.

### Goals
- Make the anonymous brief → AI plan → checkout path as simple as possible while complying with Convex best practices.
- Preserve the Agent wrapper + thread creation for AI generation.
- Replace the `events` table with lightweight `console.log` tracing.
- Split anonymous onboarding data from authenticated project data.
- Update copy, prompts, and UI to match the plain-language requirements from October 2025.
- Ship a plan that explicitly lists the files to touch and how to implement each change safely.

---

## Convex Best-Practice Checklist
- Use `defineSchema`, `defineTable`, and `v` validators for every column in `convex/schema.ts`; name indexes after every indexed field (e.g., `by_sessionId`, `by_authUserId`, `by_projectId`).
- Register public functions with `query`/`mutation` and internal helpers with `internalQuery`/`internalMutation`/`internalAction`. Always include `args` and `returns` validators—even for `v.null()`.
- Actions must not call `ctx.db`; they should leverage `ctx.runQuery`/`ctx.runMutation` with `api`/`internal` references from `_generated/api.ts`.
- When cross-calling Convex functions, specify the function reference (e.g., `internal.onboardingSessions.savePlan`) instead of importing the implementation directly.
- Keep all new/updated files ASCII-only and preserve existing TypeScript strictness.

---

## Architecture Updates

### 1. Schema Restructure
- **Remove tables:** `profiles`, `events`.
- **Add table:** `onboarding_sessions`
  - Fields: `sessionId` (`v.string()`), `resumeToken` (`v.string()`), `brief` (object matching `OnboardingBrief`), `plan` (object with normalized tiers + metadata), `createdAt`/`updatedAt` numbers if needed.
  - Indexes: `by_sessionId` on `sessionId` (and `by_resumeToken` if we keep magic links).
- **Add table:** `projects`
  - Fields: `authUserId` (`v.string()`), `projectId` (`v.string()`), `planTier` (`v.union(v.literal(...))`), `planProposal` (optional, same shape as `plan` above), `projectStatus`, `paymentStatus`, `postPay`, `deployment`.
  - Indexes: `by_authUserId`, `by_projectId`.
- Update `convex/schema.ts` accordingly using the new function syntax. (Actions remain unchanged.)

### 2. Types & Shared Constants
- Update `types/profile.ts` (or split into dedicated modules):
  - Define `OnboardingBrief`, `PlanTierOption`, `PlanRecommendation`, `PlanProposal`, `OnboardingSession`, and `Project` types to match the new schema.
  - Add `recommendedTier?: PlanTierOption` and `tierSummary: string` to `PlanRecommendation`.
  - Move portal-only fields (post-payment state) into `types/project.ts` to keep onboarding concerns lightweight.
- Create `types/plan.ts` (or `components/onboarding/constants.ts`) with:
  - `ALL_TIERS_INCLUDED` array (global bullet list rendered on Step 4, not provided by AI).
  - `AFTER_PAYMENT_COPY` block used both in onboarding Step 4 and portal welcome.
- Ensure TypeScript stays strict—use `as const` for tier literals and `PlanTierOption` unions.

### 3. Convex Modules

#### 3.1 `convex/onboarding_sessions.ts` (new file)
- `initSession` mutation: create session document if it doesn’t exist. Return `{ sessionId, resumeToken }`. Log actions with `console.log` instead of writing to `events`.
- `getSession` query: lookup by `sessionId` using `withIndex("by_sessionId", ...)` and return the brief + plan.
- `updateBrief` mutation: patch `brief` using `ctx.db.patch`, merging only provided keys. Console log updates.
- `savePlan` internal mutation: `args` include `PlanProposal`. Store normalized plan JSON (only the tiers we render plus `recommendedTier`, `recommendedOn`).
- Validators follow `convex_rules`—no `filter` scans, always use indexes.

#### 3.2 `convex/projects.ts` (new file)
- `linkAnonymousSession` mutation: convert an `onboarding_session` onto a `project` when the user authenticates.
- `confirmCheckout` mutation: ensure `ctx.auth.getUserIdentity()` returns a user, generate unique `projectId`, update `projects`, and `console.log` success.
- `getProjectById` query: confirm the caller owns the project via `authUserId` match.
- `getCurrentProject` query (optional): return the project tied to the authenticated user for quick hydration.

#### 3.3 `convex/plans.ts` (rename from `profiles` plan section)
- Public `regeneratePlan` mutation schedules the internal action.
- Internal action `generatePlanRecommendation`:
  - Load brief via `ctx.runQuery(internal.onboardingSessions.getSession, ...)`.
  - Call `internal.agent.generateProjectPlans` (Agent + thread preserved).
  - Normalize tiers and persist via `ctx.runMutation(internal.onboardingSessions.savePlan, ...)`.
  - Wrap with `console.log` statements for observability.
- Remove redundant normalization helpers if storing UI-ready data.

### 4. AI Prompt & Contract
- File: `convex/agent.ts`
  - Keep Agent wrapper and thread creation.
  - Add plain-language instructions, banned term replacements, delivery time requirements, and tier summaries.
  - Enforce new validator shape with `v.object({ recommendedTier: ... })` etc.
  - Ensure fallback (`fallbackPlanFromBaselines`) still returns tier summaries + deliverable notes.

### 5. Client Hook & Utilities
- Refactor `lib/convex/useOnboardingProfile.ts` into a smaller hook backed by new APIs.
  - Add `lib/onboarding/sessionStorage.ts` for localStorage helpers (`loadSession`, `saveSession`, `clearSession`).
  - Extract a shared `useDebouncedMutation` or inline 500 ms debounce with less state juggling.
  - Query `api.onboardingSessions.getSession` and mutate via `api.onboardingSessions.updateBrief`.
  - Plan generation triggers `api.plans.regeneratePlan`.
  - Authenticated users hydrate from `api.projects.getCurrentProject`.

### 6. UI Updates (Step 4)
- File: `components/onboarding/constants.ts` (new)
  - Export `ALL_TIERS_INCLUDED` and `AFTER_PAYMENT_COPY`.
- File: `components/onboarding/steps.tsx`
  - Render after-payment explainer above plan cards.
  - Add global inclusions box via constant.
  - Show `tierSummary`, delivery line under price, and “Planning call included” for Pro/Enterprise.
  - Add “Recommended for you” chip when `plan.recommendedTier === tierId`.
- File: `components/onboarding/PlanSummaryInline.tsx`
  - Accept normalized plan structure with `tierSummary`, `deliverableNotes`.
- File: `app/onboarding/page.tsx`
  - Keep redirect logic; ensure new queries/hook output match props.

### 7. Cleanup
- Remove `events` table references and replace calls with `console.log` (e.g., `console.log("[onboarding] plan generated", { sessionId })`).
- Delete unused helpers from `convex/profiles.ts` once responsibilities move.
- Update imports to point at new modules (`onboarding_sessions`, `projects`, `plans`).

### 8. Documentation
- Update `.cursor/rules/context/ONBOARDING-ARCHITECTURE.md` to reflect new tables, flow, and logging approach.
- Link back to this plan for copy/prompt expectations.

---

## Plain-Language Copy & Prompt Rules

### Avoid These Terms
- CMS → “Blog you can update yourself”
- Role-based access / RBAC → “Sign-in area for your team or clients”
- SEO → “Shows up well on Google”
- KPI → “Key goals” or omit entirely

### Tone
- Positive, outcome-focused, and concise.
- Plain English for non-technical business owners.
- Emphasize benefits and next steps.

---

## Plan Section Structure (Step 4)
Render three blocks in order:
1. Included with every plan (hardcoded).
2. AI-assisted tier cards.
3. After payment — what happens next (hardcoded).

### Included with Every Plan (constant)
- Custom domain (yourname.com) included.
- Looks great on phones and desktops.
- Shows up well on Google.
- Built-in writing assistant (AI editor access).
- Hosted and cared for (no setup on your side).

Implementation notes:
- Use `ALL_TIERS_INCLUDED` constant and render it once above tier cards.
- Remove these bullets from AI prompts and baseline features.

### Tier Baselines (fallback & prompt context)
- **Starter – “Basic info site” (48 hours)**
  - Headline: “Launch a confident website fast.”
- Summary: “A clean, professional site that clearly explains what you do.”
  - Pages: Home, About, Services, Contact, Legal.
  - Features: Contact form that emails you.
  - Delivery notes: `Delivery: 48 hours.`
- **Professional – “Info site + one custom feature” (~1 week)**
  - Headline: “Turn visitors into booked calls or inquiries.”
- Summary: “Everything in Starter plus one custom feature your business needs.”
  - Pages: Home, About, Services, Case Studies, Blog, Contact.
  - Features: Calendar booking or inquiry flow; Blog you can update yourself; Connect your mailing list; One custom feature (we help you choose).
  - Delivery notes: `Delivery: ~1 week. Planning call included.`
- **Enterprise – “Custom website & tools” (2–3 weeks+)**
  - Headline: “Custom website and tools tailored to your workflow.”
- Summary: “We design and build what you need, with room to grow.”
  - Pages: Home, Solutions, Pricing, Resources, Client Area, Contact.
  - Features: Sign-in area for your team or clients; Connect to the tools you already use; Ongoing hosting and care.
  - Delivery notes: `Delivery: 2–3 weeks+. Planning call included.`

### After Payment Copy (Step 4 + Portal)
- After checkout, we’ll ask for:
  - Your headline and what you want visitors to do.
  - Any must-have features or requirements.
  - Inspiration links (sites you like).
  - Brand details (logo, photos, style).
- “This keeps onboarding light now and lets you share details once you’re ready.”

---

## AI Generation Contract
- Prompt requirements:
  - Use plain language for non-technical owners.
  - Never output banned terms directly.
  - Omit global inclusions; emphasize tier-specific value.
  - Include delivery timeline inside `deliverableNotes`.
  - Return `recommendedTier` (enum) and `tierSummary` (1–2 sentences).
  - Professional tier must say “one custom feature.”
  - Enterprise tier should emphasize outcomes over implementation.
- Output JSON contract:

```json
{
  "promptVersion": "string",
  "recommendedTier": "starter" | "professional" | "enterprise",
  "tiers": {
    "starter": {
      "headline": "string",
      "tierSummary": "string",
      "summary": "string",
      "pages": ["Home", ...],
      "features": ["Contact form that emails you", ...],
      "deliverableNotes": "Delivery: 48 hours."
    },
    "professional": {
      "headline": "string",
      "tierSummary": "string",
      "summary": "string",
      "pages": [ ... ],
      "features": ["One custom feature", ...],
      "deliverableNotes": "Delivery: ~1 week. Planning call included."
    },
    "enterprise": {
      "headline": "string",
      "tierSummary": "string",
      "summary": "string",
      "pages": [ ... ],
      "features": ["Sign-in area for team or clients", ...],
      "deliverableNotes": "Delivery: 2–3 weeks+. Planning call included."
    }
  }
}
```

- Fallback heuristic (if `recommendedTier` missing):
  - `simple_site` + ASAP → `starter`.
  - `lead_generation` or `blog_cms` → `professional`.
  - `ecommerce` or `custom` → `enterprise`.
  - If timeline very short and scope simple → `starter`, otherwise `professional`.

---

## File-by-File Implementation Plan

- `convex/schema.ts`
  - Drop `profiles`/`events`; add `onboarding_sessions` and `projects` with validators and indexes (`by_sessionId`, `by_authUserId`, `by_projectId`).
- `convex/onboarding_sessions.ts`
  - Implement `initSession`, `getSession`, `updateBrief`, `savePlan` using new function syntax and index-backed lookups; replace event inserts with `console.log`.
- `convex/projects.ts`
  - Handle linking authenticated users, checkout confirmation, and authenticated queries for project data.
- `convex/plans.ts`
  - Expose public `regeneratePlan` mutation and internal action that uses Agent to generate + persist normalized plans.
- `convex/agent.ts`
  - Update instructions/validators to match new contract while keeping Agent threads.
- `types/profile.ts` / `types/project.ts`
  - Reflect new data shapes and optional `recommendedTier`.
- `components/onboarding/constants.ts`
  - Export `ALL_TIERS_INCLUDED`, `AFTER_PAYMENT_COPY`, timeline strings.
- `components/onboarding/steps.tsx`
  - Render inclusions, after-payment copy, tier summaries, delivery lines, and recommendation chip.
- `components/onboarding/PlanSummaryInline.tsx`
  - Consume normalized plan data (`tierSummary`, `deliverableNotes`).
- `lib/onboarding/sessionStorage.ts`
  - Local storage helpers for anonymous sessions.
- `lib/convex/useOnboardingProfile.ts`
  - Refactor to use new APIs, smaller state surface, and debounced updates.
- `app/onboarding/page.tsx`
  - Continue redirect logic using new queries/hook output.
- `.cursor/rules/context/ONBOARDING-ARCHITECTURE.md`
  - Document schema changes, removal of events, and simplified flow.

---

## Acceptance Criteria
- Step 4 renders “Included with every plan,” tier cards with summaries/delivery timelines, and the after-payment explainer in order.
- Exactly one tier shows the “Recommended for you” chip (AI or heuristic).
- Anonymous data lives in `onboarding_sessions`; authenticated data lives in `projects`.
- AI output and baselines avoid banned jargon; global inclusions appear once.
- All Convex functions use validators, indexes, and the new function syntax; actions interact with the DB via `ctx.runQuery`/`ctx.runMutation`.
- `events` table removed; console logs provide traceability.

---

## Test Plan
1. Anonymous onboarding: session initializes, autosave logs console messages, plan generates, Step 4 shows all new sections.
2. Authenticated handoff: anonymous brief links to authenticated user, project created with recommended tier persisting.
3. Recommendation logic: adjust brief inputs to confirm `recommendedTier` changes and UI chip updates.
4. Copy audit: verify Step 4 and plan data contain no banned terms and global inclusions appear only once.
5. Portal hydration: authenticated project loads from `projects`, after-payment copy visible.
6. Regression: autosave, redirects, and checkout still work with new APIs.

---

## Out of Scope
- Real Stripe or payment provider integration.
- Additional analytics for the removed `events` table (console logging only).
- Automated filtering of banned terms beyond prompts and baselines.

---

## Rollout Notes
- Apply schema changes first (Convex deployment) and update backend modules before removing legacy code paths.
- Update backend modules and regenerate `_generated/api.ts` (`npx convex dev` or similar).
- Refactor client hook and UI after backend stabilizes.
- Run manual tests; rely on console logs for verification post-events removal.


