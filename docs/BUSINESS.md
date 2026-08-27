# Business

Status: **canonical business source of truth**  
Owner: Layken  
Last reviewed: 2026-08-24
Metrics current through: 2026-08-24

This document defines what Acadiana Web Design sells, who it serves, the
commercial model, current traction, and the decisions that should constrain new
work. Campaign operations live in `GROWTH.md`; delivery lives in
`OPERATIONS.md`; implementation lives in `ARCHITECTURE.md`.

## Company

Acadiana Web Design is the customer-facing trade name for the local website
business operated by Varholdt AI LLC.

- The geauxBIZ trade-name filing, reference 12276617, was paid and submitted on
  2026-08-06. It was still in process at the last verified check and should not
  be described as accepted until the state issues the registration.
- Initial Mercury funding and later operating cash came from personal owner
  contributions, not business revenue.
- Historical Meta advertising charges used the Mercury business card, funded
  by owner contributions. All paid advertising is paused as of 2026-08-24.
  Ad spend is not evidence of earned business cash flow.
- The filing fee was paid personally and should remain recorded as an
  owner-paid business expense or reimbursement.

The pre-consolidation funding record, including transaction-level provenance, is
preserved in `archive/legacy/business-plan-pre-consolidation-2026-08-08.md`.

## Offer

The core offer is a fully managed website for local service businesses:

- $0 down
- from $199 per month
- 12-month minimum, then month-to-month
- custom site, hosting, SSL, domain coordination, edits, support, lead capture,
  analytics, and portal access
- target launch within 72 hours after scope, content, and assets are ready

`$199` is the floor, not the ceiling. Booking, commerce, custom integrations,
AI features, platform work, or unusually large content requirements are scoped
separately.

The public promise is a managed outcome, not a transferable code package.
Ownership, assigned deliverables, recurring services, term, price, scope, and
acceptance criteria are defined by the issued Order Form.

## Ideal customer

Start with owner-operated service businesses in Acadiana:

- plumbing, HVAC, electrical, roofing, landscaping, tree service, towing,
  painting, pressure washing, cleaning, fencing, pest control, and contracting
- strong customer proof but no site, a broken site, or a weak builder site
- customers normally convert through calls, texts, estimates, or quote requests
- the owner wants one accountable local partner and does not want to manage web
  infrastructure

Deprioritize businesses with a mature site and agency relationship, broadly poor
reviews, unclear ownership, or no meaningful fit for the managed-service model.

## Why buyers choose it

1. No large upfront website bill.
2. Local, veteran-owned, and directly accountable.
3. Fast custom implementation without a generic site-builder ceiling.
4. Hosting, edits, and support remain one operating relationship.
5. Fast mobile performance and clear conversion paths.
6. Leads, activity, and requests are visible through the client portal.

## Current traction

As of 2026-08-08:

- three active free clients from family or personal connections
- zero paying clients
- two strong public proof sources: All About Towing and TB Tree Service
- additional launch proof from Chelsea Social Co.
- no unrelated, market-rate close yet
- the first paid Meta Messenger conversations arrived, but neither had produced
  a booked call or close

The core business risk remains conversion, not lead-generation tooling. A reply,
preview, free client, or qualified conversation is progress but not a validated
acquisition channel. The first unrelated market-rate close is the primary
milestone.

## What exists

- Marketing site and local service SEO pages
- Admin-managed prospects and projects
- Better Auth magic-link client access
- Versioned MSA plus immutable per-project Order Forms
- Stripe Checkout and subscription synchronization
- Build-details intake, file uploads, edit requests, calls, leads, and analytics
- Authenticated Hub APIs used by bespoke client sites
- A website-concept generator: manual Facebook lead in, one bespoke reviewed
  homepage out, published at an unlisted preview link with open tracking
- Self-service tokenized audit reports reached by direct or QR traffic

Client sites are bespoke. The old `agency-template` inheritance workflow is
retired; `../agency-playground/` is the reference for Hub-facing plumbing.

## Commercial guardrails

- Do not promise ownership or scope outside an issued Order Form.
- Do not turn an exploratory price into a quote before discovery.
- Custom apps and regulated platforms require explicit scope, payment
  responsibility, client-owned vendor accounts, compliance ownership,
  milestones, change-order rules, and bounded maintenance.
- Raise the website floor only when buyer evidence and current delivery quality
  justify it; existing clients can be grandfathered.
- Do not build a new product tier from one prospect. Preserve the research and
  wait for a second real data point.

## Current priorities

1. Close the first unrelated market-rate client.
2. Build a direct quote form with stored leads plus email and SMS notification.
3. Improve Google Business Profile proof and genuine client reviews.
4. Measure organic quote requests, qualified opportunities, and closes.
5. Keep every paid advertising channel paused until Layken makes a new explicit
   decision.
6. Use existing product proof instead of adding speculative tooling.
7. Keep legal, billing, and production verification gates explicit.

## Decision rules

- Kill an acquisition channel after sufficient effort produces zero closes, or
  when measured CAC exceeds $400 without a credible correction.
- Scale a channel when market-rate closes establish CAC below $200.
- Add a channel only after existing weekly execution is reliable.
- Do not create, publish, resume, or fund an ad campaign without a new explicit
  owner decision.
- Revisit mass cold calling only as warm follow-up, not as the default engine.
- Revisit outsourced marketing only after demand proves top-of-funnel is the
  actual constraint.
- Reopen trigger-gated product work only when the trigger in `ROADMAP.md` is
  met.
