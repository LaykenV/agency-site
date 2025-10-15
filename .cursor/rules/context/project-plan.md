### **The Agency Build Blueprint (Upgrade Version)**

**I. Core Principles**

1. **Frictionless Conversion** – The pre-pay journey removes every non-essential question so prospects reach checkout without resistance.
2. **Client Confidence** – The moment payment clears, the client lands inside a polished portal that clarifies next steps and asset needs.
3. **Future Scalability** – The data model anticipates the AI Editor, subscription lifecycle, and ongoing project operations.

---

**II. End-to-End Journey**

**1. Onboarding (`/onboarding`)**
- Anonymous session starts instantly (`profiles.initSession`).
- Four streamlined screens capture only:
  1. Contact basics (name, email, company).
  2. Core business snapshot + primary need/action + timeline.
  3. Optional notes (brand readiness questions move post-pay).
  4. Terms agreement + CTA to generate AI plan.
- Completing step 4 triggers `generatePlanRecommendation` (internal action) to produce AI-tailored tiers stored at `profiles.plan.aiProposal`.

**2. Plan Reveal & Checkout**
- The plan page draws from `plan.aiProposal.tiers` to hydrate tier cards.
- Selecting a tier sets `plan.tierId`; checkout is stubbed for now.
- Payment success updates profile with subscription/payment status and flips the state machine to `AWAITING_ASSETS`.

**3. Stripe Webhook (`/api/stripe/webhook`)**
- Verifies signature, loads profile via metadata (`resumeToken`/`sessionId`).
- Generates a human-friendly `projectId` (e.g., `acme-widgets-2025`).
- Updates payment/subscription fields, sets `projectStatus`, logs events, and dispatches Resend notifications.

**4. Payment Success Redirect**
- `/payment/success` subscribes to the profile. Once `projectId` + `paymentStatus.status === "succeeded"`, redirect to `/portal/[projectId]`.

**5. Client Portal (`/portal/[projectId]`)**
- Tabbed interface with persistent project context.
- **Kickoff Tab:** Post-pay asset form (logo, photos, headline, domain, inspiration, functional requirements). Submission updates `postPay` data, toggles `brandAssetsUploaded`, and advances status to `IN_PROGRESS`.
- **Project Hub:** Status tracker, staging/live links, communication log.
- **AI Editor (Coming Soon):** Placeholder gating future functionality.
- **Account & Billing:** Button to Stripe Customer Portal.

---

**III. Data Model (Convex)**

See `convex/schema.ts`.

- `profiles`
  - Identifiers: `projectId`, `sessionId`, `resumeToken`, optional `authUserId`.
  - `projectStatus`: `AWAITING_PAYMENT | AWAITING_ASSETS | IN_PROGRESS | IN_REVIEW | LIVE | ARCHIVED`.
  - `brief`: trimmed pre-pay fields (contact, email, company, business description, industry, need, action, timeline, additional notes, terms).
  - `plan`: `tierId`, `recommendedOn`, optional `aiProposal` (Starter/Professional/Enterprise recommendations).
  - `paymentStatus`: status + provider intent ID.
  - `subscription`: Stripe subscription metadata.
  - `postPay`: headline, domain preference, inspiration links, functional requirements, brand object (logo/image URLs, status, style vibe), `brandAssetsUploaded` flag.
  - `deployment`: staging/live URLs, Vercel project id.
  - Indexes: `by_projectId`, `by_sessionId`, `by_resumeToken`, `by_authUserId`.

- `events`
  - Tracks lifecycle events (`plan.generated`, `profile.updated`, etc.).
  - Indexed by `projectId` and `kind`.

---

**IV. AI Plan Generation**

- Internal action `generatePlanRecommendation` composes a prompt from the brief.
- Calls provider (OpenAI/Anthropic) for JSON output matching `PlanRecommendation` structure.
- Stores results in `plan.aiProposal`, sets `plan.recommendedOn`, and logs `events` (`plan.ai_generated`).
- Future support for regeneration with prompt versioning.

---

**V. Application Architecture**

- **Frontend**
  - Onboarding page uses `useOnboardingProfile` hook for autosave.
  - Autosave updates `profiles.brief` via `updateProfileBySession` mutation.
  - Plan step reads AI proposal state and renders tier cards.
  - Portal pages hydrate from `profiles` and `events` queries.

- **Convex Functions**
  - Public: `initSession`, `getProfileBySession`, `updateProfileBySession`.
  - Internal: `generatePlanRecommendation`, `writePaymentStatus`, `updatePostPay`, etc.
  - Scheduler/action stubs for Stripe/Resend integration.

- **Events Logging**
  - Every major transition logs an event for analytics and auditing.
  - Use structured payloads for future dashboards.

---

**VI. UX Notes**

- Autosave remains 500ms debounce with status indicator; copy updated to reflect AI generation delay.
- Buttons and flows emphasize "You can edit this later.".
- Plan cards fall back to default copy if AI proposal missing.
- Portal surfaces accepted tier and upcoming milestones.

---

**VII. Stubbed Integrations (MVP)**

- AI plan generation: call provider in dev mode with placeholder response if env missing.
- Payments: record Stripe session ID but allow bypass for testing.
- Domain availability: always `available: true`; actual checks happen post-pay.

---

**VIII. Email Strategy (Resend)**

- **Client Welcome:** Sent on payment success with portal link and next steps.
- **Agency Alert:** Summarizes brief, tier, timeline.
- Optional future triggers: milestones, launch, payment failures, AI editor onboarding.

---

**IX. Authentication & Identity**

- Pre-pay remains anonymous; session cookie handles resume on same device.
- Checkout requires Google sign-in via Better Auth; merges anonymous profile using `authUserId`.
- Portal requires authenticated session; JWT used for Convex calls.
- Track providers, verification status, and subscription entitlements.

---

**X. Next Steps**

- Implement schema, types, and Convex functions per upgrade spec.
- Build new onboarding flow & portal components aligned with this plan.
- Layer real Stripe, Better Auth, and Resend integrations.
- Prepare analytics dashboards based on `events` table.