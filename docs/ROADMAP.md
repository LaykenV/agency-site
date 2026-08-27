# Roadmap

Status: **canonical active-work and trigger source of truth**  
Owner: Layken  
Last reviewed: 2026-08-24

This document contains only work that is active, blocked by an explicit gate, or
worth reconsidering when a trigger occurs. Completed execution detail is
preserved under `archive/migrations/`.

## Current operating priorities

1. Close the first unrelated market-rate website client.
2. Build and production-test the inbound quote form in
   `plans/inbound-quote-form-and-google-ads.md`.
3. Keep every paid advertising channel paused. The Google Ads account remains
   available for research, but no campaign work or spend is active.
4. Resolve the legal gates below before relying on the affected path.

## Open business and compliance gates

### Trade name and contracting facts

- Confirm geauxBIZ filing 12276617 is accepted before describing the trade name
  as registered.
- Confirm Varholdt AI LLC is Louisiana-formed. The current MSA says it is a
  Louisiana limited liability company; a different formation state requires a
  factual correction and MSA version bump before the next signature.

### First natural paid return

Stage 4A's agreement and unpaid-checkout paths were production-smoked. On the
first real paid Checkout return, verify without manufacturing a charge:

- the local subscription row appears
- the subscription is tied to the intended project metadata
- the project advances from `AWAITING_PAYMENT` to `AWAITING_ASSETS`
- the welcome email uses the accepted Order Form

This is an operational observation, not unfinished Stage 4A engineering.

## Trigger-gated product work

### Offering registry

Trigger: a signed second engagement type needs the portal, or a real contract
defines capabilities that the current website-only model cannot express.

Then:

- implement typed offerings and capabilities
- backfill every project with a verified classification
- move operational behavior from hardcoded statuses to explicit capabilities
- keep module overrides for exceptions such as a site without a contact form

Do not guess mobile-app or IDX workflow stages before a signed scope exists.
Detailed design: `plans/portal-evolution.md`.

### Portal decomposition

Trigger: the second offering is signed, or the current project page becomes a
measured delivery bottleneck.

Then:

- split the project-page monolith into stage sections
- add a module registry
- preserve existing website behavior before adding a second shape
- drive onboarding steps from offering data

### Stripe component and project-scoped billing

Trigger: one client needs two independently billed projects, or the direct
Stripe writer no longer safely supports the required billing shape.

The existing writer already supports an optional one-time setup Price plus a
recurring Price in subscription Checkout. That alone does not trigger the
component migration.

Before cutover:

- complete the sandbox spike
- prove two subscriptions for one customer
- add durable webhook idempotency
- backfill project identity in Stripe metadata with a reconciliation manifest
- shadow and hand-reconcile every live subscription
- keep reader, writer, and side-effect switches reversible

Detailed plan: `plans/billing-migration.md`.

### Multiple projects per client

Trigger: a real client needs a second project.

Prerequisite: project-scoped billing is complete and reconciled. Do not expose a
second-project creation path while subscription attribution is user-scoped.

### Expanded analytics

Trigger: a paying client or active acquisition channel needs a specific metric
that can be labeled truthfully.

Visitor identity, sessions, UTM attribution, Web Vitals, and error beacons remain
deferred. Before collecting pseudonymous visitor or session identifiers, define
purpose, fields, retention, access, deletion, processor, and privacy treatment.

### Persistent content operations

Trigger: the browser-local `/admin/content` dashboard causes lost state,
conflicting browser views, or multi-user coordination problems.

Then move campaign state and scorecards into authenticated Convex storage. Until
then, `GROWTH.md` is the durable record.

## Deliberately deferred

- milestone invoicing
- countersigned-PDF workflow or e-sign vendor
- full billing-table decommissioning
- automated large-scale subscription mismatch dashboards
- generic visitor/session surveillance
- restoring public AI onboarding
- reviving the retired client-template inheritance model

## Production evidence rules

For product stages:

- preserve unrelated working-tree changes
- take a verified private Convex export before destructive data migrations
- create a Stripe reconciliation manifest before billing metadata changes
- use expand, backfill, verify, then contract
- run codegen, types, tests, lint, build, and diff checks
- verify the intended signed-in or client path in production
- keep rollback behavior until the observation gate passes
- update the canonical document with the implemented contract

A completed local subtask is not a completed production stage.
