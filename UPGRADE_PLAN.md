# Upgrade Plan — Cross-Doc Sequencing

Status: **Stages 0, 1A, 2, and 3 complete in production. Stage 3 is verified end
to end on the playground spoke; spoke client code is ready on All About Towing,
TB Tree, and Chelsea. TB Tree + Chelsea need only operator credential + deploy;
All About Towing is blocked on Hub project creation.**
Owner: Layken
Written: 2026-08-04
Last reviewed: 2026-08-05 (Stage 3 spoke code reviewed; towing projectId placeholder found)

Master sequencing for three interlocking workstreams. **Read this before any of
the detail docs.**

| Doc | Workstream | Risk profile |
|---|---|---|
| `waas_upgrade.md` | Hub ↔ Spoke security + telemetry | Medium — live client migration and public endpoints |
| `billing_migration.md` | Theo pattern → `@convex-dev/stripe` | **Highest** — real money and live subscriptions |
| `portal_architecture.md` | Multi-offering portal + multi-project | Medium — large refactor and data migration |

---

## 1. Why not one big branch

These workstreams have different blast radii. If billing, portal, dependencies,
and the Hub API all change together and something breaks in production, the
failure is hard to attribute. Each stage below must be independently deployable,
observable, and revertible.

The exception is a deliberately paired migration: a client may move to the
authenticated v2 lead endpoint in the same release window that its legacy access
is disabled, but the Hub must support both paths during the overlap.

---

## 2. The revised order

```text
Stage 0   Dependency baseline ......... reconcile Bun lock + peers        [done]
Stage 1A  WAAS containment ............ cap cost without breaking v1      [shipped]
Stage 2   WAAS authenticated v2 ....... clients migrated; v1 leads retired [done]
Stage 3   Typed events + click tracking  tel:/mailto:/directions          [done; spoke rollout pending]
Stage 4   Offering registry ........... offerings, capabilities, MSA/SOW  [data-safe]
Stage 5   Portal refactor ............. modules + explicit creation       [no multi-project]
Stage 6   Stripe component ............ spike, then cutover               [spike-gated]
Stage 7   Multi-project ............... picker + independent billing      [needs Stage 6]
Stage 8   Deferred backlog ............ external data, visitor identity   [no date]

Contingency (not a stage):
  Stripe metadata bridge ............. only if a client signs before Stage 6
```

Execution order changed on 2026-08-05 against the original 0-8 listing. Two
stages moved and one was added:

- **Click tracking moved from Stage 8 to Stage 3.** All About Towing has no
  contact form, so `tel:` taps are its only conversion signal and the whole
  reason the project is billable. It is also small and depends only on the
  Stage 2 publishable credential.
- **Stripe moved after the portal work.** With no deadline on multi-project,
  the component migration no longer gates anything urgent.
- **The Stripe metadata bridge is a contingency, not a stage.** It was briefly
  planned as Stage 1B. Its only value is attributing subscriptions created
  *between now and Stage 6*, and no client will be signed in that window. See
  § 4 for the trigger that reinstates it.

Confirmed business inputs driving this order (2026-08-05):

| Input | Consequence |
|---|---|
| Mobile app + IDX clients expected | Offering registry and portal modules are required, not speculative |
| Both billed as deposit/setup fee + monthly | Stays inside Checkout `mode: "subscription"`; no Stripe Invoices path |
| All About Towing already live, happy, no contact form | Needs click tracking and a `leads`-off module override; not lead ingestion |
| No deadline to put towing under Chelsea's login | Multi-project can stay last; no bridge account needed |

### Stage 0 — dependency baseline

The problem this stage fixes: the manifest declared `convex@^1.28.0` while
`bun.lock` resolved 1.31.4, and the root workpool was a transitive `0.2.19`,
which did not satisfy `@convex-dev/workflow@0.3.4`'s `workpool ^0.3.0` peer. The
minimal coherent matrix is now decided and applied (see § 5 for resolved
evidence):

```text
convex                    1.31.7   # small patch; required by workpool 0.3.2
@convex-dev/workpool      0.3.2    # add as explicit dependency
@convex-dev/workflow      0.3.4    # hold
@convex-dev/better-auth   0.10.13  # latest 0.10.x; supports Better Auth 1.4.x
better-auth               1.4.12   # hold; do not discard later auth hardening
@convex-dev/agent         0.2.12   # hold
@convex-dev/rate-limiter  0.3.2    # hold
@convex-dev/twilio        0.2.1    # hold
@convex-dev/resend        0.1.13   # hold; its nested workpool may remain
@convex-dev/polar         0.6.4    # hold; unrelated
stripe                    19.3.1   # hold until Stage 4
```

Pin these exact versions in `package.json`, regenerate `bun.lock`, and prove a
clean `bun install --frozen-lockfile`. Moving the Better Auth component from
0.10.10 to 0.10.13 avoids downgrading core Better Auth from the current 1.4.12;
0.10.13 supports `>=1.4.9 <1.5.0`. Do not jump to the latest workflow/auth/
resend/Polar lines in Stage 0; that would introduce a separate Convex 1.36+ and
Better Auth 1.6 migration. Ship this matrix as its own deploy and verify
production magic-link auth (especially mobile), Resend, workflow execution,
current Stripe checkout/webhook behavior, codegen, types, and build before
continuing.

A latest-versions modernization remains a separate future program. Agent
parallelism may accelerate its research and regression work, but it does not
combine that program with this dependency baseline or its production deploy.

### Stage 1A — WAAS containment

`waas_upgrade.md` § Phase 1A. Add bounded body and field validation, a hard
fixed-window per-project cost ceiling, an SMS ceiling, `allow`-only SMS, and
trusted-IP-header observation.

When the paid-fanout ceiling is exhausted, accept and store an otherwise valid
lead, skip Groq/email/SMS fan-out, expose it as untriaged in admin, and send one
threshold alert. Never silently drop the lead. Project ceilings must still hold
when requests spoof or rotate XFF; the IP bucket is best-effort only. The one
threshold alert uses a separately deduplicated, globally capped admin-operations
path, not the exhausted project's Groq/Resend/Twilio fan-out path.

Do **not** remove the no-`Origin` path yet. TB Tree's live Next.js Server Action
posts server-to-server and therefore sends no browser `Origin`; rejecting that
traffic would break a real form. Stage 1A reduces blast radius but does not claim
to close the authentication hole.

### Contingency — Stripe metadata bridge

**Not scheduled (decided 2026-08-05).** `checkout.sessions.create`
(`stripeActions.ts:227`) writes no project reference, so subscriptions are born
unattributed. The fix is a few lines with no dependency or schema change:

```ts
subscription_data: {
  metadata: { orgId: `project:${projectId}`, userId: project.authUserId },
}
```

It was briefly planned as its own stage. It is not one, because its only value is
attributing subscriptions created *between now and Stage 6* — and no client will
be signed in that window. Stage 6's Checkout writer sets this metadata anyway,
and the existing live subscriptions need a hand-backfill either way.

**Trigger that reinstates it:** a client signs before Stage 6 lands. Ship this
before their checkout. The failure mode is silent — an unattributed subscription
looks completely normal until Stage 6 reconciliation — so do not rely on noticing
it later.

### Stage 2 — WAAS authenticated v2

`waas_upgrade.md` § Phase 1B. Add hashed bearer credentials, migrate TB Tree's
server path first, then migrate Chelsea's browser POST through a Vercel Function,
and smoke-test both live sites through stored lead, triage, email, and SMS
behavior.

Only after both production paths pass may the Hub reject legacy no-`Origin`
traffic and retire the v1/unversioned lead endpoints. This is the stage that
actually closes the unauthenticated paid-fan-out hole.

**Trimmed 2026-08-05.** Per-submission idempotency receipts and
`previewUrlPattern` are cut — see § 7.

**Complete in production 2026-08-05.** TB Tree
and Chelsea now send leads through authenticated v2 using separate server-only
credentials. Both live custom-domain browser paths produced attributed leads,
completed triage, populated credential `lastUsedAt`, and logged
`hasVisitorHash: true`. The playground passed the credential revoke/replace
drill. After an operator-approved immediate cutover, the Hub's unauthenticated
v1 and unversioned lead routes and their OPTIONS aliases were removed, and the
reusable template was moved to v2. Analytics remains on v1 until Stage 3
implements `/api/v2/events` and begins consuming publishable keys.

**Post-retirement proof:** both retired lead paths return `404` for POST and
OPTIONS; unauthenticated v2 still returns `401`; v1 analytics returns `204` for
both configured production Origins. Fresh browser submissions on both custom
domains each produced exactly one stored, triaged lead with
`hasVisitorHash: true`, updated credential `lastUsedAt`, and verdict-gated
notifications (review email sent where applicable; SMS blocked).

### Stage 3 — typed events and click tracking

`waas_upgrade.md` § Phase 2, reduced to the parts that sell. Add `client_events`
and `POST /api/v2/events` authenticated by the Stage 2 publishable key, make
`pageview` one type among several, and ship `tel:` / `mailto:` click tracking,
directions clicks only where a site exposes a real directions link, coarse
referrer classification, and the one-time PageSpeed snapshot.

This is ahead of the portal work because All About Towing has no contact form.
Pageviews alone do not justify an invoice for that project; tap-to-call counts
do. It depends only on the Stage 2 credential model, not on the module registry —
render a thin, self-contained metrics section in the existing portal. Do not
build the module registry early; Stage 5 should register and reuse this
component rather than rewrite it.

UTM capture, device type, country, visitor hashes, session identifiers, Web
Vitals, and the JS error beacon are deferred to Stage 8. Label what is measured
honestly: `tel:` events are tap-to-call clicks, not completed calls. Coarse
referrer classes are not campaign or GBP attribution; that requires the deferred
UTM work because a bare Google referrer is not proof.

**Complete in production 2026-08-05; spoke rollout outstanding.** Hub ships
`client_events`, `POST /api/v2/events` (publishable key in body + Origin), daily
click/referrer-class rollups on `client_analytics`, the shared
`convex/lib/pagespeed.ts` with a first-`LIVE` snapshot and an admin **Refresh
PageSpeed** control, and the portal `SiteMetrics` panel. The v1 pixel stays live
for unmigrated spokes. Two defects found in review were fixed before smoke:
clicks no longer inflate the daily referrer-class counts (they carry the same
`document.referrer` as the pageview before them), and credential `lastUsedAt` is
throttled to one write per five minutes so a single credential row is not a
write-contention hotspot under browser event volume.

**Spoke side is `../agency-playground/`, not `agency-template`.** Playground
carries the v2 client, the corrected directions-link matcher, and a Stage 3
section in its `WAAS_V2_RUNBOOK.md`.

**Production proof (playground, 2026-08-05).** Pageviews and all three click
targets — `tel`, `email`, `directions` — were accepted, attributed to the
project, and rendered in the portal's **Site activity** panel. PageSpeed refresh
verified. Two defects were found and fixed during that smoke:

- Self-referrals were classified as `other`. A full page load between the site's
  own pages sets `document.referrer` to the site itself, which is internal
  navigation, not a traffic source. The Hub now compares the referrer host to
  the already-validated request Origin and records no source at all. Not
  `direct` — that would overwrite the visit's real origin for anyone who arrived
  from search and then loaded a second page.
- Referrer classes were labeled as visit counts. Client-side routing preserves
  the original `document.referrer`, so one visitor browsing five pages counted
  their source five times.

**Referrer classes are collected but hidden from clients (decided 2026-08-05).**
The rollup keeps accruing and `clientAnalytics.getSummary` still returns it, so
re-enabling is a display change. It is not shown because it cannot yet say
anything both specific and true: `direct` is an unknown bucket that absorbs QR
scans, SMS links, in-app browsers, and no-referrer policies, and a bare
`google.com` referrer cannot separate search results from the Business Profile
listing. A client reads "direct 40" as "40 people typed my URL." Revisit when
Stage 8's UTM work can attribute a call to a specific listing or campaign.

**Spoke code is ready (2026-08-05); operator deploy closes the stage.** Each
live site now has the Stage 3 client (v2 events + click tracking, v1 pixel
fallback). What remains is per-site operator work: issue a publishable
credential, store the deployment URL as a bare host, set the key (Vercel
`NEXT_PUBLIC_WAAS_PUBLISHABLE_KEY` for Next sites; `waas-config.js` for Chelsea
static), and rebuild/redeploy. Until a given site is deployed with its key it
stays on the v1 pixel and reports pageviews only — no click data, which is the
whole point of the stage.

Client repos are **siblings of `agency-site`**, not subdirectories:

| Site | Repo | Runbook | State |
|---|---|---|---|
| All About Towing | `../clients/all-about-towing-web/` | `WAAS_V2_RUNBOOK.md` | blocked — no Hub project yet |
| TB Tree | `../clients/tb-tree/` | `WAAS_V2_RUNBOOK.md` § Stage 3 | ready to deploy |
| Chelsea Social Co. | `../clients/chelsea-social/` | `WAAS_V2_RUNBOOK.md` § Stage 3 | ready to deploy |

**All About Towing has no Hub project (2026-08-05), so it cannot go first**
despite being the most valuable target (phone-only, so tap-to-call is its only
conversion signal and the reason the project is billable). Its config had a
placeholder `projectId` — `proj_all-about-towing` — that was never real: the Hub
mints project IDs with `crypto.randomUUID()`, and `/api/v2/events` returns 401
when the body `projectId` doesn't match the credential's project. It now carries
the `PROJECT_ID_FROM_ADMIN` sentinel that `scripts/validate-plumbing.ts` already
recognises, and `app/layout.tsx` gates the pixel off entirely, so the site sends
nothing rather than 401ing every request. Create the project, paste the UUID,
then follow the runbook.

Deploy order: TB Tree and Chelsea now; All About Towing as soon as multi-project
setup lands and its project exists.

**Declined 2026-08-05 — operational counters for `/api/v2/events`.** Stage 1A
built `hub_operational_counters` because unauthenticated leads could burn Groq,
Resend, and Twilio spend. Events spend nothing: a rejected event costs one
database read and returns. The portal rollups are themselves the accepted-event
evidence, and `429`s show in Convex logs. Do not extend the counter tables to
telemetry.

**Accepted 2026-08-05 — `client_events` has no retention policy.** Raw rows grow
one per pageview and click, and nothing reads them; the portal reads only the
`client_analytics` rollups. Fine at current volume. Revisit only when a project's
row count is large enough to matter, at which point the fix is a cron deleting
rows past a fixed age, not a schema change.

### Stage 4 — offering registry

`portal_architecture.md` § Phases 1-2. Introduce offerings using an
expand → backfill → verify → contract migration, then add stage metadata and
explicit capabilities such as `acceptsLeads`.

`phase` is for broad portal presentation. Operational behavior must use named
capabilities; replacing today's `IN_REVIEW`/`LIVE` lead rule with
`phase === "DELIVERED"` would reject review-site leads.

`mobile_app` and `idx_website` are no longer hypothetical — both have expected
clients — so the registry must express an offering with no `leads` module and a
completely different fulfillment stage list from day one.

This stage also owns the **MSA / order-form split** (`portal_architecture.md`
§ 5.4). Today's terms are one global `TERMS_VERSION` with `$199` written into the
prose, an IP clause granting only a license during an active subscription, and a
liability cap of three months of fees. None of that survives a five-figure build
engagement. Universal terms become a versioned MSA; price, term, scope,
deliverables, and acceptance criteria move to a per-project order form generated
from the offering for `waas_local` and admin-authored for bespoke work. Both
hashes are recorded on the agreement.

### Stage 5 — portal refactor and onboarding retirement

`portal_architecture.md` § Phases 3-4. Decompose the portal, build the module
registry, create projects explicitly, and retire public `/onboarding` plus its
website-only AI plan generator.

Keep per-project `moduleOverrides` and build the admin toggle. All About Towing
is a live `waas_local` project with no contact form, so it needs `leads` off and
metrics on — the override case is real on day one, not a future convenience.

A second-project UI may exist only behind an admin feature flag; creating a
second real client project is forbidden until Stage 6 exits.

### Stage 6 — Stripe component

`billing_migration.md` § Phases B-E. Sandbox spike first: two subscriptions on
one customer with distinct `project:*` org IDs, duplicate and out-of-order
webhook delivery, cancel/resubscribe selection, and test-clock lifecycle. Then
install `@convex-dev/stripe@0.1.6`, move the app's direct Stripe SDK to an exact
`22.4.0` in the same PR, register `/stripe/webhook/v2` with its own
`STRIPE_WEBHOOK_SECRET_V2`, and add the application event-ID ledger before
enabling any event hook.

Checkout must support **deposit/setup fee + monthly**: a one-time price line item
alongside the recurring price in `mode: "subscription"`, billed on the first
invoice. Today `stripeActions.ts:229` hardcodes a single recurring line item.
Milestone invoicing is explicitly out of scope; if a later deal needs it, that is
Stripe Invoices and a new portal billing surface, not an extension of Checkout.

Flip reads behind a reversible switch, then move checkout writes after parity is
proven. Stage 6 exits when project-scoped reads and the single Checkout writer
pass the test-clock lifecycle, live reconciliation, and a rollback drill.

**Trimmed 2026-08-05.** The automated shadow-mismatch counting infrastructure and
Phase F decommissioning are cut/deferred — see § 7.

### Stage 7 — multi-project

`portal_architecture.md` § Phase 5. Hard-gated on Stage 6 checkout and
per-project reads. Add the project list/switcher and the admin second-project
flow. Do not create a second real project before this lands.

The first real case is Chelsea holding both her own project and All About Towing.
That site is already live and its owner is happy, and there is no deadline to
move it under her login, so nothing here needs to be rushed or bridged through a
temporary second account.

### Stage 8 — deferred backlog

No date. Revisit each item only when a client is paying for the outcome:

- Visitor hashes, session identifiers, bounce rate, Web Vitals, JS error beacon.
  These require a completed privacy inventory, a retention policy, and updates to
  every client privacy page before collection begins. Do not describe IP-derived
  hashes as anonymous or as categorically consent-free.
- Availability-check cron. Five-minute probes are successful monitoring checks,
  not an SLA.
- Paid Places review snapshots, GBP OAuth, Search Console. All require pricing
  review, and the latter two require explicit client authorization.
- `billing_migration.md` Phase F — legacy billing table decommissioning.

---

## 3. Hard constraints

1. **Stage 0 before adding another component.** The dependency baseline must be
   reproducible before billing work changes it.
2. **The Stripe metadata bridge before any client signs.** If a deal closes
   before Stage 6, ship the contingency above before their checkout runs.
3. **Stage 2 before rejecting no-`Origin` legacy leads.** Otherwise TB Tree's
   live form breaks.
4. **Stage 2 before any new spoke goes live on the Hub.** Three new sites are
   expected (towing, mobile app, IDX). Onboarding them onto the unauthenticated
   v1 contract means migrating five clients later instead of two.
5. **Stage 4 before the portal decomposition.** Capabilities and data shape are
   the seams the refactor depends on.
6. **Stage 4 before quoting a bespoke build.** The MSA/order-form split must
   exist before an agreement is signed for a mobile app or IDX engagement; the
   current terms grant only a license during an active subscription and cap
   liability at three months of fees.
7. **Stage 6 before Stage 7.** Per-project subscription attribution must exist
   before a client can own two live projects.
8. **No schema contraction before verified backfill.** New fields begin optional,
   dual reads/writes cover the migration window, and required validation lands
   only after production counts prove completeness.
9. **Snapshot the system that owns the data before mutation.** Convex backfills
   require a dated production export. Stripe metadata backfills require a
   reversible Stripe manifest; a Convex export cannot restore Stripe objects.

---

## 4. Ordering and behavior rules

- Do not add `mobile_app` or `idx_website` before the Stage 5 portal module
  refactor is complete. Both are expected, which makes this rule load-bearing
  rather than theoretical: adding a second engagement type to the current
  2,191-line portal page is what guarantees the refactor never happens.
  `waas_local_family` is safe earlier because it changes price/terms data, not
  workflow shape.
- An `idx_website` engagement has a non-code prerequisite: MLS/board data license
  and vendor approval. Split it three ways — the onboarding step collects what
  the client knows, the order form states the obligation, and a fulfillment stage
  tracks whether approval actually arrived. Do not make it a blocking onboarding
  field; approval can take weeks and is outside the client's control. See
  `portal_architecture.md` § 2.3.
- Do not run a Stripe spike against production keys. Prefer a Stripe sandbox and
  simulations/test clocks.
- Do not start legacy billing-table removal inside an observation cycle.
- Successful, verified subscription activation may idempotently advance
  `AWAITING_PAYMENT → AWAITING_ASSETS`. Payment failure, pause, cancellation,
  or booking events must only log and notify; they do not mutate fulfillment
  status automatically.
- Use one Stripe subscription per project. This permits independent cancellation
  and attribution, with the explicit tradeoff of separate invoices/charges.
- Use `listSubscriptionsByOrgId("project:<projectId>")` and apply deterministic
  active/trialing/past-due-before-canceled, newest-period selection. Use the user
  list only as a shadow/backfill fallback for legacy rows missing `orgId`; the
  singular org helper can return stale history after resubscription.

---

## 5. Current known state

### Stage 1 — containment implementation and production evidence (2026-08-04)

Shipped to production:

- 16 KB body ceiling + field validation (`convex/httpValidation.ts`)
- Fixed-window ceilings: ingest 1000/day, no-trusted visitor 30/hour, paid fan-out 50/day, SMS 20/day
- Fan-out pause stores untriaged lead + admin threshold alert path
- No XFF trust; time-bounded/redacted visitor-header observation; no-trusted-visitor project bucket
- Analytics trusted-visitor or stricter project fallback; bounded referrer rollup
- SMS allow-only (`leadTriage.ts`); durable daily accepted/429/paused counters and admin visibility

Core production smoke passed on the `acadianaweb.xyz` test project:

- Two post-deploy no-`Origin` submissions were accepted and stored; neither was
  rate-limited or fan-out paused.
- Both were triaged `allow` and sent SMS. The first email attempt correctly
  surfaced a dangling test-data reference (`Prospect not found`) rather than a
  Resend or containment failure.
- The single test project was safely relinked to its existing Acadiana Web
  Design prospect (`laykenv@gmail.com`). A second labeled submission then
  completed stored lead → triage → SMS → Resend → received email end to end.
- Admin evidence after the retest showed accepted/429 `2/0`, fan-out paused
  `0/0`, untriaged `0`, allow/review `3/0`, and SMS sent/blocked `3/0`.
- Production ceilings were intentionally not exhausted; a smoke test is not a
  destructive load test.

**Stage 1A closed 2026-08-05.** A real, good-quality lead arrived through TB
Tree's production Server Action after the containment deploy, exercising the
no-`Origin` path end to end — accepted, stored, triaged, and notified — on live
traffic rather than a synthetic test.

Accepted residual: **Chelsea's browser POST was not separately smoke-tested.**
That path is not the same code — it goes through the `Origin`/CORS branch that
TB Tree skips entirely — so the TB Tree lead does not cover it. Closing anyway
because Stage 2 migrates her off that path within days and rate-limit/validation
regressions would surface as `429`s or rejections in the admin counters. If her
project shows any accepted lead dated after the 2026-08-04 deploy, the residual
is already closed; otherwise one form submission settles it in two minutes.

**Declined 2026-08-05 — the 24-hour visitor-header observation.** Do not set
`HUB_VISITOR_OBSERVATION_UNTIL`. The observation existed to discover whether
Convex injects a client-IP header a caller cannot forge, so legacy requests could
get a real per-visitor rate-limit key. Two reasons it is not worth running:

- The `leadNoTrustedVisitor` fallback (30/hour per project) is already live and
  adequate for the legacy window.
- After Stage 2, leads arrive from the client's own Vercel Function, which
  overwrites `x-forwarded-for` with the true client IP. Per-visitor limiting
  belongs there, where it is trustworthy. The Hub then needs only its per-project
  ceilings, which use no IP at all.

The observation code is gated off by default and Stage 2 rewrites that handler.
Leave it dormant; do not treat it as an outstanding task.

**Declined 2026-08-05 — the spoofed-XFF ceiling proof.** Every project ceiling is
keyed on `projectId` alone (`http.ts:284`, `http.ts:311`, `leadTriage.ts:207`).
There is no IP component for a rotated header to influence, so the property holds
by construction. A code read replaces the staging load test.

### Stage 0 — resolved evidence (2026-08-04)

Pinned exact versions in `package.json` and regenerated `bun.lock`. Verified:

| Package | Resolved |
|---|---|
| `convex` | 1.31.7 |
| `@convex-dev/workpool` | 0.3.2 (now a direct dependency) |
| `@convex-dev/workflow` | 0.3.4 |
| `@convex-dev/better-auth` | 0.10.13 (peer `>=1.4.9 <1.5.0`) |
| `better-auth` | 1.4.12 |
| `@convex-dev/agent` | 0.2.12 |
| `@convex-dev/rate-limiter` | 0.3.2 |
| `@convex-dev/twilio` | 0.2.1 |
| `@convex-dev/resend` | 0.1.13 (nested workpool may remain 0.2.x) |
| `@convex-dev/polar` | 0.6.4 |
| `stripe` | 19.3.1 |

Local exit checks passed, exactly as run:

```bash
bun install --frozen-lockfile     # "no changes"
npx tsc --noEmit
npx convex codegen --typecheck enable   # no generated-file drift
bun run build
bun run lint
```

Note: `--typecheck-components` is not a valid flag on convex 1.31.7; the
component-typechecking codegen invocation is `--typecheck enable`.

**Residual peer skew (accepted, not blocking).** A full peer audit across
`node_modules` returns exactly one unmet peer:

```text
@better-auth/passkey@1.4.9 needs better-auth "1.4.9" -> got 1.4.12
```

Passkey is an exact-pinned hard dependency of `@convex-dev/better-auth@0.10.13`
and is not dead code — `dist/auth-options.js` calls `passkey()` at module load
and the component schema defines a `passkey` table, so it loads on every deploy.
Accepted because the component itself declares `better-auth >=1.4.9 <1.5.0`,
codegen and build exercise that path cleanly, and this app uses magic link only.
Re-check this if Better Auth moves off the 1.4.x line.

**Component schema change on deploy.** `@convex-dev/workflow` embeds workpool via
`component.use(workpool)`, so the root bump 0.2.19 → 0.3.2 changes the pushed
workflow component schema: `pendingStart.fnArgs` loosens from `v.any()` to
`v.optional(v.any())`, optional `payloadId`/`payloadSize` are added, and a new
`payload` table stores large args out-of-line. All additive or loosening —
expand direction only, so existing rows still validate. There is no `crons.ts`
and `marketingSearchWorkflow` is admin-triggered, so deploy while no marketing
search is in flight.

Stage 0's production deploy and smoke gate completed before Stage 1A began.

### `agency-template` is retired (2026-08-05)

`../agency-template/` is **fully retired**. It is not cloned for new clients, not
patched when the Hub contract changes, and not merged into existing client repos.
It was already "no longer the path new client sites take" during Stage 2; this
closes it completely so no future stage spends effort keeping a dead starter in
sync.

Consequences:

- New client sites are built bespoke against the Hub contract in
  `ARCHITECTURE.md` § Hub ↔ Spoke.
- `../agency-playground/` is the reference Spoke and the first site to run each
  new Hub contract in production.
- `CLIENT_LIFECYCLE.md` Stage 9 (`gh repo create --template`) and Stage 18
  (`git merge upstream/main`) describe the retired template workflow and are
  stale. Rewriting them for the bespoke flow is not yet done.

### Unchanged product state

- `@convex-dev/stripe` is not installed.
- Chelsea and TB Tree are the two live client sites using unauthenticated legacy
  lead endpoints. Chelsea posts from the browser; TB Tree posts from a Server
  Action without `Origin`.
- Every project is implicitly `waas_local`; `serviceType` does not exist.
- Chelsea's price selection is a hardcoded email branch.
- One project per user is enforced by the fallback guard in `projects.ts`.
- Public `/onboarding` is live in code but retired by product decision.
- `checkout.sessions.create` is `mode: "subscription"` with one recurring line
  item and no subscription metadata (`stripeActions.ts:227-238`).
- Terms are a single global `TERMS_VERSION` with `$199` in the prose
  (`lib/legal/terms.ts:22,40,118`); `agreementValidator.method` is
  `v.literal("clickwrap")`.

### Pipeline (recorded 2026-08-05)

- **All About Towing** — site already live and the client is happy. Not in the
  Hub at all; it has no contact form, so it has never needed lead ingestion.
  Chelsea manages it and will eventually hold it as a second project under her
  login. No deadline.
- **Mobile app client** — expected. Deposit/setup fee + monthly.
- **IDX website client** — expected. Deposit/setup fee + monthly.

Neither expected client is signed. The registry and portal work is justified by
them, but do not build `mobile_app` or `idx_website` registry entries, terms, or
modules until a contract exists — build the mechanism that makes each one a
small addition.

---

## 6. Required evidence at every production stage

- Clean frozen install, Convex codegen, TypeScript, diff check, and production
  build.
- An explicit production smoke test for the surface changed; a deploy or push is
  not completion.
- Before/after counts for every data migration, with zero unclassified live rows.
- Before any Convex expand/backfill migration, create a dated production export
  with `npx convex export --prod --path <private-backup-dir>/<stage>.zip`, verify
  the archive is readable, and store it outside the repository with restricted
  access. Include file storage when the migration touches stored files.
- Before Stripe metadata mutation, export a reconciliation manifest containing
  subscription/customer IDs, prior metadata, price, status, timestamps, and the
  intended project mapping; retain an idempotent reversal procedure. A Convex
  export is additional evidence, not a Stripe rollback mechanism.
- A rollback switch or previous route retained until the observation gate passes.
- Signed-in mobile and desktop portal/auth QA where applicable.
- Documentation updates in `CLAUDE.md` and `ARCHITECTURE.md` in the same stage
  that changes the corresponding contract.

Required operational signals and exit evidence:

| Stage | Counters/evidence required before exit |
|---|---|
| 0 | Exact resolved full component matrix, clean frozen install, codegen/type/build, production mobile magic link, Resend, workflow, current Checkout/webhook smoke tests |
| 1A | Leads accepted, `429`s, paid fan-out paused, SMS sent, SMS blocked by verdict; one labeled post-deploy submission through each live spoke |
| 2 | v1/v2 lead volume, credential `lastUsedAt`, auth failures (from `[hub.lead.v2] auth_failed` logs — deliberately not a counter), `hasVisitorHash: true` on live spoke traffic, duplicate triage count (must be zero) |
| 3 | Click events by type for a live project (met on playground 2026-08-05); per-spoke: one `tel` click reaching the portal after that site's key is issued. Referrer classification is collected but hidden, so it is no longer an exit signal |
| 4 | Backfill report with zero unresolved rows; both price paths resolve from project data in Stripe test mode; MSA + order-form hashes recorded on a test agreement |
| 6 | Sandbox spike outputs and Stripe object IDs; hand reconciliation of every live subscription; visible reader/writer/side-effect flag state; completed rollback drill |

Specific documentation checkpoints:

- After Stage 2: Hub ↔ Spoke auth, endpoint versions, trusted visitor metadata,
  and troubleshooting.
- After Stage 4: offering registry, capabilities, archival model, and the
  MSA/order-form agreement structure.
- After Stage 5: `/onboarding` retirement and explicit project creation.
- After Stage 6: component billing source, webhook secrets/idempotency, the
  deposit + monthly Checkout shape, and the exact successful-payment status
  transition.

---

## 7. Scope trim log (2026-08-05)

Recorded so a future reader does not reintroduce these as oversights. Each was
considered and cut deliberately.

| Cut | Original home | Reason |
|---|---|---|
| Per-submission idempotency receipts + `lead_ingest_receipts` table | `waas_upgrade.md` Phase 1B | Bearer auth removes the forging attacker. The remaining duplicate risk is our own retry logic, and neither spoke retries. Revisit if duplicates are observed. |
| `previewUrlPattern` per project | `waas_upgrade.md` Phase 1B | After v2, `Origin` gates analytics only. Worst case is an inaccurate pageview count. |
| Automated shadow-mismatch counting by customer/subscription/invoice/status/price/`orgId` | `billing_migration.md` Phase C | Built for hundreds of subscriptions; there will be three. A thorough sandbox spike plus hand reconciliation is stronger evidence at this size. |
| Full per-offering terms documents | `portal_architecture.md` § 5.4 | Replaced by MSA + per-project order form. Duplicating boilerplate per offering guarantees drift between versions. |
| Visitor hashes, session ids, bounce rate, Web Vitals, JS error beacon | `waas_upgrade.md` Phase 2 | Requires a privacy inventory, retention policy, and privacy-page updates on every client site, to produce metrics that do not sell. Moved to Stage 8. |
| Legacy billing table decommissioning | `billing_migration.md` Phase F | Dead tables cost nothing and are the rollback evidence. Deferred with no date. |
| 24-hour trusted-visitor header observation | `waas_upgrade.md` Phase 1A | The `leadNoTrustedVisitor` fallback is adequate, and Stage 2 moves per-visitor limiting to the client's Vercel Function where the IP is trustworthy. Answers a question that stops mattering. |
| Spoofed-XFF ceiling load test | `waas_upgrade.md` Phase 1A | Project ceilings are keyed on `projectId` only. True by construction; a code read is better evidence than a staging load test. |
| Stripe metadata bridge as a scheduled stage | `UPGRADE_PLAN.md` Stage 1B | No client signs before Stage 6, so there are no new subscriptions to attribute. Kept as a triggered contingency. |

Downgraded rather than cut:

- **Origin normalization (F13)** — still worth doing as a normalize-on-write
  helper, since stale URLs are the documented support footgun, but it does not
  need a schema migration.

Reinstated after review:

- **Per-project `moduleOverrides` and the admin toggle UI.** Briefly considered
  premature. All About Towing is a live `waas_local` site with no contact form,
  so a project-level module override is required on the first day the registry
  exists, not later.
