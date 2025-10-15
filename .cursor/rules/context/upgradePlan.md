Of course. This is the master blueprint.

This plan consolidates all of our strategic decisions into a single, actionable document. It covers the final data schema, the end-to-end architectural flow, and a detailed blueprint for the client portal. This is your roadmap to building and launching the agency.

---

### **The Full Plan: Architecture, Schema, and Client Portal**

#### **Part I: The Core Architectural Principles**

Our architecture is designed for three things:

1.  **Frictionless Conversion:** The pre-pay journey is ruthlessly optimized to get a prospect from landing page to checkout with zero mandatory sign-ins or unnecessary questions.
2.  **Client Confidence:** The post-pay experience immediately provides the client with a professional, persistent "home" for their project, building trust and clarifying the next steps.
3.  **Future Scalability:** The entire system is built on a data model that will seamlessly accommodate future features, most importantly the AI Editor and ongoing project management.

---

#### **Part II: The Data Foundation (Final Convex Schema)**

This is the single source of truth for your entire application. The following schema is production-ready and includes all necessary fields for the full client lifecycle.

**`convex/schema.ts`**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Define reusable types for project status and AI proposal outputs
const projectStatus = v.union(
  v.literal("AWAITING_PAYMENT"),
  v.literal("AWAITING_ASSETS"),
  v.literal("IN_PROGRESS"),
  v.literal("IN_REVIEW"),
  v.literal("LIVE"),
  v.literal("ARCHIVED")
);

const planRecommendation = v.object({
  headline: v.string(),
  summary: v.string(),
  pages: v.array(v.string()),
  features: v.array(v.string()),
  aiEditorAccess: v.boolean(),
  deliverableNotes: v.optional(v.string()),
});

export default defineSchema({
  profiles: defineTable({
    // --- Core Identifiers ---
    projectId: v.optional(v.string()), // The unique, human-readable project ID for URLs. Generated post-payment.
    sessionId: v.string(),
    resumeToken: v.string(),
    authUserId: v.optional(v.string()),

    // --- Project State Machine ---
    projectStatus: v.optional(projectStatus), // Explicit status for clean UI logic. The driver for the portal UI.

    // --- Onboarding Data (Pre-Pay) ---
    brief: v.object({
      contactName: v.string(),
      contactEmail: v.string(),
      companyName: v.string(),
      businessDescription: v.string(),
      industry: v.string(),
      primaryNeed: v.string(),
      primaryAction: v.string(),
      timeline: v.object({
        option: v.string(),
        date: v.union(v.string(), v.null()),
      }),
      additionalNotes: v.string(),
      termsAccepted: v.boolean(),
    }),

    // --- Plan & Payment ---
    plan: v.optional(v.object({
      tierId: v.union(v.string(), v.null()),
      recommendedOn: v.union(v.number(), v.null()),
      aiProposal: v.optional(v.object({
        generatedAt: v.number(),
        promptVersion: v.string(),
        tiers: v.object({
          starter: planRecommendation,
          professional: planRecommendation,
          enterprise: planRecommendation,
        }),
      })),
    })),
    paymentStatus: v.optional(v.object({
      status: v.string(), // e.g., 'pending', 'succeeded', 'failed'
      providerIntentId: v.union(v.string(), v.null()),
    })),

    // --- Subscription Management (Synced from Stripe Webhooks) ---
    subscription: v.optional(v.object({
      stripeSubscriptionId: v.string(),
      status: v.string(), // e.g., 'active', 'canceled', 'past_due'
      currentPeriodEnd: v.number(), // Unix timestamp for renewal date
    })),

    // --- Post-Pay & Project Delivery Data ---
    postPay: v.optional(v.object({
      headline: v.union(v.string(), v.null()),
      domainPreference: v.union(v.string(), v.null()),
      inspirationLinks: v.array(v.string()),
      functionalRequirements: v.union(v.string(), v.null()),
      brand: v.object({
        logoStatus: v.union(v.literal("ready"), v.literal("not_yet")),
        photoStatus: v.union(v.literal("ready"), v.literal("not_yet")),
        styleVibe: v.union(v.string(), v.null()),
        logoUrl: v.optional(v.string()), // URL to the uploaded logo in Convex storage
        imageUrls: v.optional(v.array(v.string())), // URLs to uploaded images
      }),
      brandAssetsUploaded: v.boolean(),
    })),
    
    // --- Deployment Details ---
    deployment: v.optional(v.object({
      liveUrl: v.optional(v.string()),
      stagingUrl: v.optional(v.string()),
      vercelProjectId: v.optional(v.string()),
    })),
  })
    .index("by_projectId", ["projectId"]) // CRITICAL: For fast portal lookups
    .index("by_sessionId", ["sessionId"])
    .index("by_resumeToken", ["resumeToken"])
    .index("by_authUserId", ["authUserId"]),

  events: defineTable({
    sessionId: v.string(),
    projectId: v.optional(v.string()), // Add projectId for better event tracking post-payment
    kind: v.string(),
    payload: v.optional(v.any()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_kind", ["kind"]),
});
```

---

#### **Part III: The End-to-End Architectural Flow**

This is the step-by-step journey from a user's first click to their final project portal.

1.  **Step 1: Onboarding (`/onboarding`)**
    *   On first visit we call `profiles.initSession`, creating a `profiles` record keyed by `sessionId` and `resumeToken`.
    *   The pre-pay experience now has **four focused screens** only:
        1.  **Contact basics** (name, email, company) → writes into `brief.contact*`.
        2.  **Business snapshot** (one-line description, optional industry) → `brief.businessDescription`, `brief.industry`.
        3.  **Needs & timing** (primary need, primary action, timeline) → maps to `brief.primaryNeed`, `brief.primaryAction`, `brief.timeline`.
        4.  **Terms & context** (short free-text `additionalNotes`, terms checkbox) → ensures legal acceptance before plan reveal.
    *   Logo readiness, photo readiness, and style vibe are **deferred to the post-pay portal** to reduce friction.
    *   After the final screen, we trigger an internal action `generatePlanRecommendation` that:
        *   Gathers the completed `brief` + any analytics context.
        *   Calls our AI provider to produce tailored tier insights.
        *   Stores the structured response under `profiles.plan.aiProposal`.
    *   The plan selection view reads from `plan.aiProposal.tiers` and renders the AI crafted copy alongside the tier pricing placeholders.

2.  **Step 2: Checkout (Stripe)**
    *   Once a tier is chosen, we launch checkout (stub today, Stripe later).
    *   On successful payment, Stripe redirects to `/payment/success`; the page polls `profiles.plan.tierId` and `paymentStatus`.

3.  **Step 3: The Webhook Handler (The Backend Core)**
    *   Stripe sends a `checkout.session.completed` webhook to a Convex `httpAction`.
    *   The handler:
        a. Verifies the Stripe signature.
        b. Looks up the profile by `resumeToken`/`sessionId` from metadata.
        c. Generates a human-readable `projectId` (e.g., `acme-widgets-2025`).
        d. Updates the profile with payment + subscription data, persists the chosen tier, and sets `projectStatus` to `'AWAITING_ASSETS'`.
        e. Logs the event and dispatches Resend emails.

4.  **Step 4: The Redirect to the Portal**
    *   `/payment/success` subscribes to the profile. When `projectId` and `paymentStatus.status === "succeeded"`, it redirects to `/portal/${projectId}`.

5.  **Step 5: The Client Portal (`/portal/[projectId]`)**
    *   The client sees their personalized portal. The kickoff tab now hosts the **post-pay asset form** (logo readiness, photo readiness, style vibe, asset uploads, domain preference, inspiration links, functional requirements).
    *   Once assets are submitted we flip `postPay.brandAssetsUploaded` and advance the status to unlock build tracking.

---

#### **Part IV: The Client Portal Blueprint**

**URL Structure:** `/portal/[projectId]`

**Layout:** A persistent layout containing the client's company name/logo and a clear tabbed navigation.

**Tabs & Functionality:**

*   **Tab 1: Project Kickoff (Initial View)**
    *   **State:** This is the default view as long as `projectStatus` is `AWAITING_ASSETS`.
    *   **Content:** A welcome message and the Post-Pay Form.
        *   **Form Fields:** Logo Upload, Image Upload, Homepage Headline, Domain Preference, etc.
    *   **Action:** The "Submit Assets" button at the bottom triggers a Convex mutation that:
        1.  Saves the asset URLs and form data to the `postPay` object.
        2.  Updates `projectStatus` to `'IN_PROGRESS'`.
        3.  Sends you a notification that the client is ready for you to start building.
    *   After submission, this tab becomes a read-only view of the submitted assets.

*   **Tab 2: Project Hub (Default View Post-Kickoff)**
    *   **State:** This becomes the default view for all statuses *after* `AWAITING_ASSETS`.
    *   **Content:** A dashboard providing a clear overview of the project.
        *   **Project Status Tracker:** A visual component (e.g., a stepper) that highlights the current `projectStatus` (`In Progress`, `In Review`, `Live`).
        *   **Important Links:** Displays the `stagingUrl` and `liveUrl` from the `deployment` object once they are available.
        *   **Communication Log:** A simple read-only feed of key project updates you can add from a separate admin view.

*   **Tab 3: AI Editor (The Future)**
    *   **State:** Always visible, but functionality is gated by subscription status.
    *   **Initial Content:** A beautifully designed "Coming Soon" page. "The AI Editor is under construction. Soon, you'll be able to make instant design changes to your live site right here."
    *   **Future Content:** This will house the full AI editor interface, which will read from and write to the client's codebase.

*   **Tab 4: Account & Billing**
    *   **State:** Always visible.
    *   **Content:** A simple interface for subscription management.
    *   **Action:** A "Manage Subscription" button that redirects the user to their Stripe Customer Portal. This is a secure, pre-built page hosted by Stripe where they can update their card, view invoices, and cancel their plan. This saves you an enormous amount of development time.

---

#### **Part V: AI-Driven Plan Generation & Data Model Updates**

- **Objective:** Produce tailored plan copy per tier for every prospect while preserving the handcrafted placeholder copy as a baseline. We call OpenAI (or Anthropic) with the user's onboarding brief and receive structured JSON describing deliverables for Starter, Professional, and Enterprise.
- **Storage:** Results live in `profiles.plan.aiProposal`. Each tier stores:
  - `headline`: hero copy for the tier card.
  - `summary`: 1–2 sentence contextual pitch.
  - `pages`: array of page names we commit to delivering.
  - `features`: bullet list of included capabilities (contact form, scheduler, CMS, etc.).
  - `aiEditorAccess`: boolean; determines whether messaging references the editor.
  - `deliverableNotes` (optional) for extra nuance (e.g., “Includes Calendly integration if you provide credentials”).
- **Versioning:** `promptVersion` tracks prompt iterations. `generatedAt` is a unix timestamp for cache invalidation + analytics.
- **Regeneration:** Allow manual re-run (internal action) without overwriting hand edits. When we regenerate we store event logs in `events` with kind `plan.ai_regenerated`.
- **Rendering:**
  - The onboarding plan step hydrates from `plan.aiProposal.tiers`. We merge AI copy into the existing `PLAN_TIERS` structure on the client. Missing fields gracefully fallback to defaults.
  - The portal `Project Hub` tab can surface the accepted proposal for reference.
- **Analytics:** Append an `events` record each time we generate or serve an AI plan for instrumentation.

---

#### **Part VI: File-by-File Upgrade Checklist**

- `types/profile.ts`
  - Update `OnboardingBrief` to remove `logoReadiness`, `photosReadiness`, `styleVibe` from pre-pay.
  - Add strong types for `PlanRecommendation`, `AiProposal`, and new `PostPayBrand` object.
  - Adjust `defaultProfile` to match trimmed pre-pay fields.
- `convex/schema.ts`
  - Apply schema shown above, including `plan.aiProposal` and nested `postPay.brand`.
- `convex/profiles.ts`
  - Update validators to match schema changes.
  - Add `generatePlanRecommendation` internal action (Node runtime) that collects brief data, calls AI, validates JSON, stores in `plan.aiProposal` and logs events.
  - Update `initSession`, `updateProfileBySession`, and any admin queries to respect new field layout.
- `convex/config.ts`
  - Once `convex/profiles.ts` is updated, deprecate duplicate logic or re-export shared validators from a common module to avoid drift.
- `lib/convex/useOnboardingProfile.ts`
  - Ensure autosave logic handles removed fields; purge state mutations for style/brand readiness.
  - Expose a `regeneratePlan` helper if we want client-triggered refresh (optional future).
- `components/onboarding/steps.tsx`
  - Reduce to four steps: Contact, Needs, Actions/Timeline, Terms & Notes.
  - Remove summary step, move notes + terms into final screen.
  - Keep plan card layout but hydrate AI copy by reading from `state.plan` (or `useOnboardingProfile` extension).
  - Post-pay brand readiness UI migrates to a new portal component.
- `app/onboarding/page.tsx`
  - Update step order and navigation logic (no summary step, new gating for final CTA).
  - Trigger plan generation after terms acceptance (via mutation calling the internal action). Show loading state if AI plan pending.
- `components/onboarding/ui/autosave-status.tsx`
  - No functional change, but verify copy still makes sense once plan generation delay is introduced.
- `.cursor/rules/context/ob-form.md` & `.cursor/rules/context/project-plan.md`
  - Sync narrative descriptions to mention the streamlined four-step pre-pay brief and AI proposal pipeline.