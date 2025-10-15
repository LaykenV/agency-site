# Smart Onboarding Blueprint (Upgrade Version)

## Goals

- **90-second entry**: Collect only the essentials before payment.
- **AI-powered plan**: Trigger tier recommendations immediately after terms acceptance.
- **Post-pay clarity**: Reserve brand assets and domain questions for the client portal.

## Funnel Overview

1. **Step 1 – Contact basics**: Name, email, company.
2. **Step 2 – Needs snapshot**: One-line description, industry, primary need, primary action, launch timing.
3. **Step 3 – Notes (optional)**: Additional context; no brand readiness or style vibe at this stage.
4. **Step 4 – Terms & Plan**: Terms acceptance + CTA to generate AI-crafted tiers.
5. **Plan view**: Hydrates from `plan.aiProposal.tiers`; user picks a tier and proceeds to checkout.
6. **Post-pay portal**: Collect assets/headline/domain, manage status, unlock AI Editor preview.

## Step Breakdown (Pre-Pay)

- **Step 1: Contact**
  - Fields: `contactName`, `contactEmail`, `companyName`.
- **Step 2: Needs**
  - Fields: `businessDescription`, `industry` (optional), `primaryNeed`, `primaryAction`, `timeline`.
- **Step 3: Notes**
  - Field: `additionalNotes` (textarea with 300-char limit).
- **Step 4: Terms & Trigger**
  - Field: `termsAccepted` (checkbox).
  - Action: Fire `generatePlanRecommendation` once accepted; show loading state while AI plan arrives.

## Plan Reveal + Checkout

- Tier cards hydrate from `plan.aiProposal` with fallback copy.
- Selecting a tier updates `plan.tierId`.
- Checkout remains stubbed; successful payment sets status to `AWAITING_ASSETS`.

## Post-Pay Portal Inputs

- Brand logo upload, imagery, headline, domain preference, inspiration links.
- Functional requirements (Enterprise only).
- Brand object tracks logo/photo readiness, style vibe, asset URLs.

## UX Principles

- Single concept per screen; primary CTA text adapts per step.
- Inline copy reassures “You can edit this later within the portal.”
- Autosave every 500ms; status indicator reflects AI plan generation when pending.
- Terms acceptance screen clarifies next steps (“We’ll generate plan options instantly”).

## Auth & Sessions

- Anonymous session starts automatically; autosave writes to `profiles.brief` via `sessionId`.
- Checkout requires Google sign-in (Better Auth) to attach `authUserId`.
- Post-pay portal requires authenticated session; JWT used for Convex calls.

## Event Logging

- `profile.created`, `profile.updated` for autosave.
- `plan.ai_generated` and `plan.ai_regenerated` for analytics.
- Post-pay submissions emit `portal.assets_submitted`.

## Future Enhancements

- Support manual AI plan regeneration with prompt version tracking.
- Inline previews of AI tiers once generation completes.
- Apply AI recommendations to portal onboarding copy.
