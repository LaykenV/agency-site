# Business

Status: **canonical business source of truth**  
Owner: Layken  
Last reviewed: 2026-10-30
Metrics current through: 2026-10-28

This document defines what Acadiana Web Design still does, who it serves, and
the decisions that constrain new work. Delivery lives in `OPERATIONS.md`;
implementation lives in `ARCHITECTURE.md`. The full offer, customer profile, and
priorities from before the retirement are preserved in
`archive/legacy/business-pre-retirement-2026-10-28.md`.

## Where it stands

On 2026-10-28 Layken stopped selling Acadiana Web Design website packages. The
public site no longer pitches the $0-down, $199-a-month plan.

On 2026-10-30 Layken chose to keep the homepage design and website portfolio.
The hero button sends new inquiries through Varholdt Labs at
https://www.varholdt.com/; existing clients still use the portal. Two client
quotes with no numbers or prices stay on the work cards. The old packages,
quote form, sales comparisons, and sales claims stay off the page.
Old sales routes redirect there.

The reason: the strongest current opportunities are software engagements under
Varholdt, and the website offer has no documented unrelated market-rate close.
Layken made the call. The Varholdt plan records it as decision D5.

Acadiana Web Design now exists to support its current clients. It runs no
acquisition work and no paid advertising, and nothing builds it up on its own.

## Company

Acadiana Web Design is the customer-facing trade name for the local website
business operated by Varholdt AI LLC. Varholdt AI LLC is also the legal entity
behind Varholdt Labs, the public name for Layken's custom software and AI work.
The LLC keeps its name on agreements, invoices and legal pages. Public pages may
keep the Acadiana Web Design name so existing clients recognize their login and
support. The support email and domain stay the same.

- The geauxBIZ trade-name filing, reference 12276617, was paid and submitted on
  2026-08-06. It was still in process at the last verified check and should not
  be described as accepted until the state issues the registration.
- Initial Mercury funding and later operating cash came from personal owner
  contributions, not business revenue.
- Historical Meta advertising charges used the Mercury business card, funded
  by owner contributions. All paid advertising has been paused since
  2026-08-24.
- The filing fee was paid personally and should remain recorded as an
  owner-paid business expense or reimbursement.

The pre-consolidation funding record, including transaction-level provenance, is
preserved in `archive/legacy/business-plan-pre-consolidation-2026-08-08.md`.

## Current clients

Existing clients stay on their agreed plans. There is no price change and no
billing migration. Keep their sites, hosting, edits, portal access, and billing
working as they do today. Current client billing and financial estimates belong
in private operating records, not this public repository.

The 2026-08-08 traction snapshot (three free family or personal clients, zero
paying) is superseded and kept in the archived business document.

## What exists

- A portfolio homepage, legal pages, and SMS consent page
- Admin-managed prospects and projects
- Better Auth magic-link client access
- Versioned MSA plus immutable per-project Order Forms
- Stripe Checkout and subscription synchronization
- Build-details intake, file uploads, edit requests, calls, leads, and analytics
- Authenticated Hub APIs used by bespoke client sites and by varholdt.com's
  form and visit counts
- The website-concept generator and unlisted `/preview/<token>` pages
- The unmounted quote form and its Hub intake

Client sites are bespoke. The old `agency-template` inheritance workflow is
retired; `../agency-playground/` is the reference for Hub-facing plumbing.

## Commercial guardrails

- Do not sell or quote new website packages. Send new work to Varholdt Labs.
- Do not promise ownership or scope outside an issued Order Form.
- Never edit an issued Order Form. A change for an existing client means a new
  Order Form version.
- Do not change existing clients' prices or billing without a new owner
  decision.

## Current priorities

1. Keep existing client sites, portal access, and billing working.
2. Keep the Hub healthy, since varholdt.com's form and visit counts run through
   it.
3. Keep legal, billing, and production verification gates explicit.

## Decision rules

- Reopen website sales only with a new, dated owner decision recorded in the
  Varholdt plan.
- Do not create, publish, resume, or fund an ad campaign.
- Reopen trigger-gated product work only when the trigger in `ROADMAP.md` is
  met.
