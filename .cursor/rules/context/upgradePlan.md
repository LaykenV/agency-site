Agreement & Terms MVP Plan (v1.0)

Scope
- Clickwrap agreement at `/portal/agreement` that records: `termsVersion`, `termsHash` (SHA-256), `acceptedAt`, and `userAgent`.
- Versioned, public Terms page at `/legal/terms` rendered from a canonical content module.
- Post-payment “Welcome Aboard” email sent after Stripe activation (webhook), including order summary and link to terms evidence.
- Defer PDF generation and server-captured IP to a future iteration.

Key Decisions
- Terms source of truth: a canonical content export (e.g., `lib/legal/terms.ts`) used both to render `/legal/terms` and to compute the hash during acceptance to avoid mismatches.
- Hashing: compute SHA-256 in-browser via Web Crypto on the exact canonical string used to render the page; store `termsHash` with `termsVersion`.
- Evidence: store an HTML snapshot of the accepted version server-side for durability (Convex storage). Linking to this snapshot in the welcome email is sufficient for MVP.
- Email timing: send the welcome email after Stripe confirms activation (or trialing) via webhook; no email at the acceptance step.
- Future upgrades: capture client IP at the edge and attach a PDF snapshot; not required for MVP.

Implementation Outline
1) Terms content
   - Create `lib/legal/terms.ts` exporting:
     - `TERMS_VERSION` (e.g., `"2025-10-01"`)
     - `TERMS_LAST_UPDATED` (ISO date string)
     - `TERMS_HTML` (canonical HTML string) or `TERMS_MD` + a stable renderer
   - Render `/legal/terms` from this module; display “Last updated” and add `data-terms-version` on the container.
   - Optional: plan a `/legal/terms/[version]` route for archived versions.

2) Agreement page (`app/portal/agreement/page.tsx`)
   - Add a checkbox “I agree to the Terms” (link to `/legal/terms`).
   - Disable the CTA until checked; show a brief order summary (price, 12-month minimum, recurring billing notice).
   - On accept:
     - Import the canonical content and compute `termsHash` with Web Crypto.
     - Collect `userAgent` from `navigator.userAgent`.
     - Call `api.agreement.createFromClickwrap({ projectId, termsVersion, termsHash, userAgent })`.
     - On success, redirect to `/portal/subscribe`.

3) Backend (`convex/agreement.ts`)
   - Keep `createFromClickwrap` logic (auth, ownership, idempotency, set project → AWAITING_PAYMENT, log activity).
   - Add an internal action to store an HTML snapshot of the terms (from the canonical content) into Convex storage and patch the agreement with a `snapshotUrl` or `snapshotFileId`.
   - Schedule the snapshot write with `ctx.scheduler.runAfter(0, internal.agreement.generateAndStoreTermsSnapshot, { agreementId, version })`.

4) Stripe + email
   - In `convex/stripeActions.ts` webhook sync (`syncStripeCustomer`): when subscription becomes `active` or `trialing`:
     - Set project → `AWAITING_ASSETS` if currently `AWAITING_PAYMENT`.
     - Send the “Welcome Aboard” email with order summary and a link to the stored HTML snapshot (fetch the latest agreement for the project to include `termsVersion`/`termsHash`/`snapshotUrl`).
   - Implement `internal.emails.sendWelcomeEmail` in `convex/emails.ts` using `resend`.

5) Testing checklist
- Terms page shows correct “Last updated” and version; `data-terms-version` matches `TERMS_VERSION`.
- Agreement flow stores agreement with correct `termsVersion`, `termsHash`, `userAgent`.
- Snapshot task writes an artifact and attaches `snapshotUrl` (or file id) to the agreement.
- Stripe webhook transitions project to `AWAITING_ASSETS` and sends the welcome email with expected content.

Future Upgrades (post-MVP)
- Server-captured IP: add an `httpAction` acceptance endpoint or an edge route to securely capture `x-forwarded-for` and store `ip`.
- PDF snapshot: render the versioned Terms page to PDF (e.g., `puppeteer`) in an action, store it, and link/attach in the email when requested.

Frontend — Pages (Detailed UX Plan)

1) Terms page (`/legal/terms`)
- Purpose: Clear, confidence-inspiring legal page that’s readable, skimmable, and printable.
- Rendering approach:
  - Use the canonical content module (see “Terms content”) as the single source of truth.
  - SSR page; support a `?print=1` mode for a minimal, print-friendly layout.
- Visual design (align with existing tokens and user preference for soft tints/gradients [[memory:10223702]]):
  - Page background: `bg-[var(--background)]`; optional subtle radial gradient backdrop like agreement page.
  - Content card: centered, `max-w-3xl`, rounded, `bg-[var(--card)]/90`, border `var(--border)`, `shadow-2xl`, `backdrop-blur`.
  - Typography: headings with clear hierarchy; body text uses `text-[var(--secondary)]` for long-form sections.
- Structure (ordered for skimmability):
  1. Header
     - Title: “Terms of Service”
     - Meta line: “Version: {TERMS_VERSION} • Last updated: {TERMS_LAST_UPDATED}”
     - Note: “These terms apply to Website‑as‑a‑Service subscriptions.”
  2. Conspicuous Summary (callout box)
     - Plan & Price: `$199/mo, $0 down`
     - Minimum Term: `12‑month commitment`
     - Early Termination: short statement (e.g., remaining months or defined fee)
     - Recurring Billing Authorization: simple sentence confirming ongoing monthly charge
     - Link to a short “Order Summary” section below
  3. Table of Contents (auto-generated from headings; anchors for each section)
  4. Core Sections (anchor-linked):
     - Order Summary (what you get, price, billing cadence, renewals)
     - Scope of Service (pages, performance target, edits policy expectations)
     - Unlimited Edits Policy (reasonable use, non‑material changes, examples)
     - Responsibilities (client content/assets/timely feedback)
     - Intellectual Property & License (ownership of content; service license during term; domain transfer conditions)
     - Billing & Payment Authorization (recurring, method on file)
     - Minimum Term & Early Termination (clear mechanics)
     - Scheduling & Communication (support channel and timelines)
     - Disclaimers & Warranties
     - Limitation of Liability
     - Termination & Suspension
     - Governing Law & Venue
     - Changes to Terms (how we notify/version)
     - Notices & Contact (support email)
  5. Footer
     - “Questions? Email support” with mailto link.
     - “Version {TERMS_VERSION}” repeated; `data-terms-version` on the root container.
- Accessibility & UX details:
  - Ensure keyboard navigable TOC; visible focus; `aria-label` for TOC nav.
  - High contrast for callout summary; avoid walls of text (bullets, short paragraphs).
  - In `?print=1` mode: remove gradients/shadows; black text on white; include version/date in header.

2) Agreement page (`/portal/agreement`)
- Purpose: Make it obvious, low‑friction, and reassuring to proceed while ensuring enforceable consent.
- Page layout (build on existing page):
  - Keep the soft radial gradient background and card container.
  - Left/top: Progress context (e.g., “Agreement Stage”) and a friendly headline.
  - Project Details card (already present): company, contact, email, current status.
  - Summary of the subscription (clear, non‑legalese):
    - “The All‑Inclusive Plan — $199/month, $0 down”
    - “12‑month minimum commitment”
    - “Recurring billing each month until canceled per terms”
  - Terms acceptance area:
    - Checkbox: “I have read and agree to the Terms of Service.”
    - Link opens `/legal/terms` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
    - Microcopy under the checkbox: “By clicking accept, you agree to the Terms and recurring billing.”
  - Primary CTA button (full width): “Accept & Continue to Payment”
    - Disabled until checkbox is checked.
    - On click: compute SHA‑256 of canonical terms content, capture `navigator.userAgent`, call `agreement.createFromClickwrap`, then navigate to `/portal/subscribe` on success.
- Empty/loading/error states (owner‑friendly):
  - Loading prospect/user: show spinner and short text (“Preparing your agreement…”) — already present.
  - Email mismatch/ownership: redirect to `/portal/autherror` as implemented; show a clear explanation.
  - Mutation failure: inline error above CTA with friendly text and retry guidance.
- Accessibility & UX details:
  - Associate checkbox with label; ensure it’s reachable via keyboard and has visible focus.
  - Ensure the CTA has `aria-disabled` when disabled.
  - Keep copy concise; no legalese on this page beyond the summary.
- Trust & reassurance touches:
  - “Takes 2 minutes” hint near the CTA.
  - Small “Questions? Email support” line under the CTA.
  - Optional tiny badges or lock icon near “Continue to Payment” to signal security.
- Mobile/responsive behavior:
  - Maintain card padding; stack detail fields; ensure larger tap targets for checkbox and CTA.
  - Sticky bottom CTA on mobile is optional; otherwise keep within the card near the checkbox.

3) Microcopy (ready‑to‑use)
- Checkbox label: “I have read and agree to the Terms of Service.”
- Summary bullets:
  - “$199/month, $0 down”
  - “12‑month minimum commitment”
  - “Recurring billing each month until canceled per terms”
- CTA: “Accept & Continue to Payment”
- Error (acceptance failure): “We couldn’t capture your agreement. Please try again.”

4) Analytics & success signals (optional)
- Fire an analytics event on acceptance (before redirect) with `{ termsVersion }`.
- In Stripe success page, show a brief “Subscription active” confirmation and guide to next steps.
