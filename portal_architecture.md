# Portal Architecture — Multi-Offering Support

Status: **planned, revised after architecture review; not implemented**
Owner: Layken
Written: 2026-08-04

Plan to decouple the client portal from the single $199 website product so it
can serve different kinds of engagements — different onboarding, different
fulfillment stages, different dashboard widgets — and so one client can hold
more than one project.

Companion docs:
- `waas_upgrade.md` — Hub ↔ Spoke security and telemetry. Intersects at the metrics layer.
- `billing_migration.md` — Stripe component migration. **Resolves blocker B3 below.**
- `UPGRADE_PLAN.md` — cross-doc sequencing. Read that first.

---

## 1. Diagnosis

The portal is not merely "styled for the $199 plan." **There is no entity
representing what a client bought**, so product variation has nowhere to live
except hardcoded branches.

The canary is already in the codebase:

```ts
// convex/stripeActions.ts:16-21
const isChelsea = email?.trim().toLowerCase() === CHELSEA_BILLING_EMAIL;
const priceId = isChelsea ? process.env.STRIPE_CHELSEA_PRICE_ID : process.env.STRIPE_PRICE_ID;
```

The first client who did not fit the standard plan was hardcoded into the
payment path by email address. That function does not survive a second custom
price.

### Weld points

| # | Problem | Evidence |
|---|---|---|
| P1 | `projectStatus` is both the fulfillment stage **and** the portal router | `app/portal/[projectId]/page.tsx:239-268` switches on status to choose the section |
| P2 | `buildDetails` is a website-shaped struct | `convex/validators.ts:44-65` — `headline`, `domainPreference`, `inspirationLinks` |
| P3 | Dashboard widgets are hardcoded and unconditional | `page.tsx:1423` `LiveSupportPanel` calls `getSummary`/`getLeadsSummary` and renders `RecentLeads`/`TopPages`/`PageViewsChart` directly |
| P4 | The portal page is 2,191 lines holding every stage and widget | `app/portal/[projectId]/page.tsx` |
| P5 | No plan/price entity | `stripeActions.ts:16` |
| P6 | Project creation is an implicit side effect with an anti-duplicate guard | `convex/projects.ts:100-109` |
| P7 | Subscriptions are per-user, not per-project | `schema.ts:88`, `stripeHelpers.ts:141-145` |
| P8 | `/portal` assumes exactly one project | `convex/auth.ts:237` returns a single `primaryProject` |

---

## 2. Offering registry

### 2.1 Defined in code, not in Convex

Offerings reference React components (onboarding steps, dashboard widgets),
which cannot live in a database, and a DB-driven product catalog means building
and maintaining admin CRUD that a solo founder does not need.

**Definitions live in code, keyed by string. Only the key and per-project
overrides live in Convex.**

```ts
// lib/offerings/registry.ts

export type OfferingKey = "waas_local" | "waas_local_family";
// Future: "mobile_app" | "idx_website" | "custom"

export interface Offering {
  key: OfferingKey;
  label: string;
  stripePriceEnvVar: string;      // resolved server-side; never the raw id
  termsTemplate: string;          // key into lib/legal/terms
  onboardingSteps: StepKey[];
  fulfillmentStages: StageKey[];  // slots after the universal commercial prefix
  defaultModules: ModuleKey[];
  stageDefinitions: Partial<Record<StageKey, StageDefinition>>;
}

export interface StageDefinition {
  label: string;
  phase: "PRE_SALE" | "ONBOARDING" | "BUILDING" | "DELIVERED";
  capabilities: {
    acceptsLeads: boolean;
    showsClientMetrics: boolean;
    acceptsEditRequests: boolean;
    canCheckout: boolean;
  };
}
```

Validate the registry at startup/test time: every commercial and fulfillment
stage in an offering must have exactly one definition, stage names must be
unique, and the final fulfillment stage must declare `phase: "DELIVERED"`.

### 2.2 Initial catalog

```ts
export const OFFERINGS: Record<OfferingKey, Offering> = {
  waas_local: {
    key: "waas_local",
    label: "Website-as-a-Service — Local",
    stripePriceEnvVar: "STRIPE_PRICE_ID",
    termsTemplate: "waas_v1",
    onboardingSteps: ["contact", "company", "brand_assets"],
    fulfillmentStages: ["AWAITING_ASSETS", "IN_PROGRESS", "IN_REVIEW", "LIVE"],
    defaultModules: ["leads", "web_analytics", "edit_requests", "pagespeed"],
    stageDefinitions: WAAS_STAGE_DEFINITIONS,
  },

  // Identical to waas_local in every respect except price and terms.
  // This is deliberately the first test of the registry: it exercises the
  // whole mechanism with near-zero behavioral risk.
  waas_local_family: {
    key: "waas_local_family",
    label: "Website-as-a-Service — Family Rate",
    stripePriceEnvVar: "STRIPE_CHELSEA_PRICE_ID",   // rename to STRIPE_PRICE_ID_FAMILY
    termsTemplate: "waas_family_v1",
    onboardingSteps: ["contact", "company", "brand_assets"],
    fulfillmentStages: ["AWAITING_ASSETS", "IN_PROGRESS", "IN_REVIEW", "LIVE"],
    defaultModules: ["leads", "web_analytics", "edit_requests", "pagespeed"],
    stageDefinitions: WAAS_STAGE_DEFINITIONS,
  },
};
```

### 2.3 Future offerings (examples only — do not build yet)

Kept here so the shape stays honest as the registry is designed. Neither is on
the roadmap until a contract is signed.

```ts
// mobile_app: {
//   onboardingSteps:    ["contact", "company", "app_store_accounts", "brand_assets"],
//   fulfillmentStages:  ["DISCOVERY", "DESIGN", "BUILD", "BETA", "STORE_REVIEW", "PUBLISHED"],
//   defaultModules:     ["app_installs", "app_ratings", "edit_requests"],
// }
//
// idx_website: {
//   onboardingSteps:    ["contact", "company", "idx_credentials", "brand_assets"],
//   fulfillmentStages:  ["AWAITING_ASSETS", "IDX_INTEGRATION", "IN_PROGRESS", "IN_REVIEW", "LIVE"],
//   defaultModules:     ["leads", "web_analytics", "listing_views", "gbp", "edit_requests"],
// }
```

Note what these examples prove: `mobile_app` has **no** `leads` module and a
completely different stage list. Any design that cannot express that is not
done.

### 2.4 Pricing

Resolution order, replacing `getCheckoutPriceId` entirely:

1. `project.billing.priceIdOverride` if set (one-off negotiated pricing).
2. `process.env[OFFERINGS[project.serviceType].stripePriceEnvVar]`.

Delete the `isChelsea` branch and `CHELSEA_BILLING_EMAIL`. Chelsea becomes a
project row with `serviceType: "waas_local_family"` instead of a code path.

---

## 3. Stages: commercial vs. fulfillment

### 3.1 The split

The seven statuses in `projectStatusValidator` are two different concepts fused
together:

- **Commercial** (universal): `AWAITING_AGREEMENT` → `AWAITING_PAYMENT`.
  Every client signs and pays, regardless of what they bought.
- **Fulfillment** (per-offering): today `AWAITING_ASSETS` → `IN_PROGRESS` →
  `IN_REVIEW` → `LIVE`. This is the part that varies.

Archival is not a stage in this model. It overlays any current stage and must be
reversible without losing where work stopped:

```ts
archivedAt: v.optional(v.number()),
archivedBy: v.optional(v.string()),       // Better Auth user id
archiveReason: v.optional(v.string()),
```

Keep `ARCHIVED` in the validator during migration so existing rows remain valid.
For each such row, reconstruct the prior stage from `activity_log`; any ambiguous
row requires an explicit admin choice. Backfill `archivedAt` plus that stage,
verify, then remove `ARCHIVED` in the contract deploy. A project's stage list is
`[...COMMERCIAL, ...offering.fulfillmentStages]`; archive state is independent.

### 3.2 Keep the validator as a superset union

Do **not** widen `projectStatus` to `v.string()`. Keep
`projectStatusValidator` as a union covering every stage across all offerings.
Adding an offering means adding its new stages to that union — one explicit
line, and Convex validation plus exhaustiveness checking are preserved. Revisit
only if the union becomes genuinely unwieldy.

### 3.3 Derive a broad phase and explicit capabilities

```ts
export type Phase = "PRE_SALE" | "ONBOARDING" | "BUILDING" | "DELIVERED";
export function phaseOf(project: Project): Phase;
export function capabilitiesOf(project: Project): StageDefinition["capabilities"];
```

`phase` is computed from the offering's stage list: the last fulfillment stage
maps to `DELIVERED`, the rest to `BUILDING`, and so on.

`phase` is useful for broad presentation, but it is not expressive enough for
operational authorization. The live example is lead ingestion:

```ts
// convex/http.ts:177 — breaks the moment stages vary per offering
const allowedStatuses = ["LIVE", "IN_REVIEW"];
```

`IN_REVIEW` accepts leads today even though it is not the last fulfillment stage
and would map to `BUILDING`. Replacing the check with `phase === "DELIVERED"`
would silently break production. It becomes:

```ts
!project.archivedAt && capabilitiesOf(project).acceptsLeads
```

Use `phase` for layout and general progress. Use named capabilities for lead
ingestion, edit requests, metrics visibility, checkout eligibility, and any
other behavior whose meaning varies by offering/stage. Audit all hardcoded
status comparisons and classify each as presentation, transition, or capability
logic before replacing it.

---

## 4. Dashboard modules

### 4.1 Storage

```ts
// Expand deploy: optional until backfill and verification finish.
serviceType: v.optional(v.union(
  v.literal("waas_local"),
  v.literal("waas_local_family"),
)),
moduleOverrides: v.optional(v.array(v.union(
  v.object({ key: v.literal("leads"), enabled: v.boolean() }),
  v.object({ key: v.literal("web_analytics"), enabled: v.boolean() }),
  v.object({ key: v.literal("edit_requests"), enabled: v.boolean() }),
  v.object({ key: v.literal("pagespeed"), enabled: v.boolean() }),
))),
billing: v.optional(v.object({
  priceIdOverride: v.optional(v.string()),
})),
archivedAt: v.optional(v.number()),
archivedBy: v.optional(v.string()),       // Better Auth user id
archiveReason: v.optional(v.string()),
```

Effective modules = offering `defaultModules`, overridden per project. The row
stores only deviations. Do not accept `v.any()` module configuration. When a
module later needs configuration, add a discriminated, module-specific validator
and matching TypeScript type. After backfill is verified, the contract deploy
makes `serviceType` required; application reads must not permanently default a
missing value to `waas_local` because that hides incomplete migrations.

### 4.2 Registry

```ts
// lib/portal/modules.tsx
export const MODULE_REGISTRY: Record<ModuleKey, {
  label: string;
  component: React.ComponentType<{ projectId: Id<"projects"> }>;
  span: "full" | "half";
  capability: "showsClientMetrics" | "acceptsEditRequests";
}> = {
  leads:          { label: "Leads",       component: LeadsModule,     span: "half", capability: "showsClientMetrics" },
  web_analytics:  { label: "Traffic",     component: AnalyticsModule, span: "full", capability: "showsClientMetrics" },
  edit_requests:  { label: "Requests",    component: RequestsModule,  span: "full", capability: "acceptsEditRequests" },
  pagespeed:      { label: "Performance", component: PageSpeedModule, span: "half", capability: "showsClientMetrics" },
  // app_installs, gbp, uptime, listing_views — added as offerings need them
};
```

The dashboard becomes: resolve effective modules → filter against current stage
capabilities → render from the registry. **Adding "app downloads" is one
component plus one registry entry, with zero edits to the portal page.**

The existing `components/portal/*` widgets (`RecentLeads`, `TopPages`,
`PageViewsChart`, `DashboardStats`) become the first modules nearly as-is —
they already take `projectId` as a prop.

### 4.3 Admin control

`/admin/projects/{id}` gets a module toggle list showing offering defaults with
per-project overrides. This is the "turn things on and off" surface.

---

## 5. Onboarding

### 5.1 The current flow is the right shape — keep it

Today: admin creates a prospect → sends a magic link → client logs in and
self-serves through agreement, payment, and asset upload.

For a sales-led, low-volume, high-touch business this is correct. Do not replace
it with public self-serve signup.

**Decision: the public `/onboarding` route is retired.** Admin-created prospects
become the only intake path, which means every project has a deliberate
`serviceType` from birth. See §5.5 for the cleanup surface — it is larger than
deleting the directory.

### 5.2 Three changes it needs

**C1 — Choose the offering at prospect creation.** `admin.ts:364` `createProspect`
currently accepts only `prospectDetailsStoredValidator`. Add `serviceType` and
an optional `priceIdOverride`. This is where the type of engagement gets
decided, which is exactly where it belongs — you already know what you sold.

**C2 — Create the project explicitly, not as a side effect.** Today a project is
created lazily inside `getOrCreateProject` (`projects.ts:115`) during the
agreement flow. Move creation to an explicit admin mutation
(`admin.createProjectForProspect`) that stamps `serviceType`, leaves module
overrides empty so registry defaults apply, then starts the project at
`AWAITING_AGREEMENT`.

The agreement page then becomes **read-only with respect to project existence**:
it loads the project or shows an empty state. It never creates one.

This is worth doing for its own sake — implicit creation makes the project's
offering ambiguous — but it also unblocks multi-project (§6), because the
current lazy path contains a guard that actively prevents second projects.

**C2a — Gate the admin invite on project existence.** Disable the "send magic
link" action in `/admin` until the selected prospect has a project. That makes
"a magic link recipient always has a project" an enforced precondition rather
than a state the portal has to defend against.

**Scope this to the admin invite only.** There are two magic-link senders:

| Path | File | Gate? |
|---|---|---|
| Admin invites a client | `app/admin/page.tsx:302` | **Yes** — block until a project exists |
| Client self-serve login | `app/portal/page.tsx:102` | **No** — never gate this |

The portal login is how existing clients get back in. It is pre-checked against
`api.prospects.isKnownEmail`, and gating it on project existence would lock out
any client whose project was archived, or during any window where project state
is being edited. `app/portal/page.tsx:278` already renders a reasonable
"no active project yet" empty state for that case; keep it.

**C3 — Per-offering onboarding steps.** The step sequence comes from
`offering.onboardingSteps`. For `waas_local` and `waas_local_family` the
sequence is identical to today, so this is a refactor with no behavior change.

### 5.3 Build details

Keep genuinely universal fields where they are; add a discriminated union
alongside for type-specific data:

```ts
buildDetails,                            // brand, notificationPhone, smsConsent — universal
offeringDetails: v.optional(v.union(
  v.object({ type: v.literal("waas_local"), headline: ..., domainPreference: ..., inspirationLinks: ... }),
  // v.object({ type: v.literal("mobile_app"),  bundleId: ..., platforms: ... }),
  // v.object({ type: v.literal("idx_website"), mlsBoard: ..., idxProvider: ... }),
)),
```

Validated unions over `v.any()` — worth the ceremony to keep Convex validation
meaningful. Note that `waas_local` and `waas_local_family` share one variant;
the union discriminates on engagement *type*, not on price tier.

### 5.4 Terms

`lib/legal/terms.ts` hardcodes $199 in the agreement body (lines 22, 40, 118).
Terms become per-offering templates selected by `offering.termsTemplate`.

Structurally this is safe: `agreements` already records `termsVersion` and
`termsHash` (`validators.ts:91-100`), so previously signed agreements remain
valid and verifiable. `waas_local_family` needs its own template with the $49
figure before Chelsea's next signature event.

### 5.5 Retiring `/onboarding`

Deleting `app/onboarding/` is the small part. The route is referenced in at
least ten places, and two of them break the sales funnel if missed:

| Location | Reference | Risk if missed |
|---|---|---|
| `components/lead-demo/SoftServiceDemoPage.tsx:21,228` | CTA links | **High** — demo pages the outbound pipeline sends prospects to; CTAs 404 |
| `components/lead-demo/TradeDemoPage.tsx:16,162` | CTA links | **High** — same |
| `app/sitemap.ts:19` | Sitemap entry | Google indexes a 404 |
| `lib/seo/site.ts:170` | Structured data URL | Invalid structured data |
| `lib/seo/blog.ts:106,173,260` | Blog CTAs | Dead links in published content |
| `app/portal/page.tsx:196,282` | "Start onboarding" buttons | Dead links in the portal |
| `app/portal/page.tsx:142` | Copy: "Start onboarding or schedule a call" | Refers to a retired route |
| `components/global-header.tsx:40,50` | Path-based header visibility | Dead branch; harmless but should go |

Every one of these needs a replacement destination. The natural target is the
Cal.com booking flow, since a call is now the only entry point.

Retire `lib/onboarding/useOnboardingSession.ts` and the public generator path
with the route. `convex/onboarding/agent.ts` is currently used only by that
experience, so remove it rather than carrying an unowned website-shaped feature.
The repo's other Agent usage remains intact. If an admin-side planning assistant
later earns a real workflow, design it as a new bounded feature with its own
inputs, review step, and per-offering prompts.

---

## 6. Multiple projects per client

### 6.1 What already works

More of this is in place than expected. `projects` has `by_authUserId`,
`internalGetLatestProjectByAuthUser` already tolerates multiple rows, and every
downstream table — `client_leads`, `client_analytics`, `edit_requests`,
`activity_log`, `agreements` — is already keyed by project, not by user.

### 6.2 Three real blockers

**B1 — The anti-duplicate guard.** `projects.ts:100-109`:

```ts
// returns the existing project even when the prospect is DIFFERENT
if (anyExistingProject) { return anyExistingProject._id; }
```

This exists to stop duplicate prospects with the same email from spawning
duplicate projects. Once creation is explicit (C2), `getOrCreateProject` should
match on **exact prospect only** and never invent a project. The guard's original
job moves to the admin UI, which can warn when creating a second project for a
client who already has one.

**B2 — `getPortalDecision` returns a single project.** `convex/auth.ts:237`
returns `primaryProject`. It needs to return `projects: []` plus a `redirect`
that points at a picker when the count is greater than one. Keep the
single-project redirect behavior identical when the count is one, so nothing
changes for existing clients.

**B3 — Subscriptions are not linked to projects.** This is the hard one.
`schema.ts:88` `subscriptions` has `userId` but no `projectId`, and
`getMySubscription` (`stripeHelpers.ts:141-145`) simply takes the newest row for
the user. With two projects there is no way to know which subscription pays for
which, so billing state, dunning, and the `AWAITING_PAYMENT` gate all become
ambiguous.

**Resolved by the Stripe component migration — see `billing_migration.md`.**
The component's subscription records link to a `userId` *or* an `orgId`; use
`project:<projectId>` as the immutable identity. Do not use the project slug.
Do not call singular `getSubscriptionByOrgId` as the authority: it returns the
first matching row and can select stale history after resubscribe. Use the
published `listSubscriptionsByOrgId("project:<projectId>")`, then select
active/trialing/past-due state before canceled history and break ties by newest
period. Use `listSubscriptionsByUserId` only as a shadow/backfill fallback for
rows still missing `orgId`.

This is the single biggest reason that migration is worth doing, and it creates
the one hard ordering constraint in the whole plan: **the billing migration must
land before Phase 5 below**, so per-project attribution is built once instead of
twice.

Source review confirmed `orgId` accepts an arbitrary string. The sandbox spike
must still prove two subscriptions for one customer, duplicate/out-of-order
webhooks, and cancel/resubscribe selection before this feature is exposed.

Either way, do B3 **before** creating a second project for a real client.
Retrofitting attribution once two live subscriptions exist for one user means
reconciling against Stripe by hand.

### 6.3 UI

- `/portal` — redirect when the client has one project (unchanged); render a
  project list when they have more.
- Header — a project switcher, shown only when the count is greater than one.
  Zero visual change for every current client.
- `/portal/[projectId]` — unchanged; already scoped correctly.

### 6.4 Creating a second project

Matches the intended workflow: in `/admin/projects`, "New project for existing
client" → pick the auth user → pick the offering → optional price override →
creates a project at `AWAITING_AGREEMENT`, with registry defaults and no stored
module overrides. The client sees it appear in their switcher and walks the
agreement and payment steps for that engagement independently.

Until billing migration Phase E and the Stage 6 exit evidence are complete,
this mutation must reject creation when the selected auth user already owns a
project, even if an in-progress admin UI is visible behind a development flag.

---

## 7. Implementation sequence

Use **expand → backfill → verify → contract** for every schema change. Existing
projects are expected to be `waas_local`, but the backfill report must enumerate
every row and require zero unresolved records; do not encode that assumption as
a permanent read fallback. Before each production backfill, create and verify a
dated private `npx convex export --prod` archive outside the repository. Include
file storage when that migration touches stored files, and record the archive
location plus restore owner in the migration log.

### Phase 1 — introduce offerings (no behavior change)

- [ ] Expand with optional typed `serviceType`, `moduleOverrides`, `billing`, and
      archive fields. Keep legacy fields/read paths during this deploy.
- [ ] Backfill every existing project to the correct service type and convert any
      `ARCHIVED` row to independent archive metadata without losing its stage.
- [ ] Produce a report of total, migrated, skipped, and invalid rows; require
      exact counts and zero invalid rows before contract.
- [ ] Build `lib/offerings/registry.ts` with `waas_local` reproducing today's
      behavior exactly.
- [ ] Add `waas_local_family`; rename `STRIPE_CHELSEA_PRICE_ID` to
      `STRIPE_PRICE_ID_FAMILY`; set Chelsea's project to that offering.
- [ ] Delete `getCheckoutPriceId`'s `isChelsea` branch and `CHELSEA_BILLING_EMAIL`.
- [ ] Add the `waas_family_v1` terms template with the correct $49 figure.
- [ ] Verify in Stripe test mode: Chelsea resolves the family price and a normal
      project resolves $199, both from project data only. This is resolution
      proof, not authorization to create a live charge.
- [ ] Contract only after verification: make `serviceType` required and remove
      the legacy archive representation/read fallback.

### Phase 2 — derive phase and capabilities; remove status coupling

- [ ] Implement `phaseOf()` plus explicit stage capabilities and independent
      archive handling.
- [ ] Replace the hardcoded `["LIVE","IN_REVIEW"]` lead check with
      `!archivedAt && capabilities.acceptsLeads`; prove both statuses still work.
- [ ] Audit every other `projectStatus` comparison outside the portal's stage
      sections; classify and convert it to phase, capability, or explicit
      transition logic. **Highest-risk step — a miss can silently reject work.**

### Phase 3 — decompose the portal

- [ ] Split `app/portal/[projectId]/page.tsx` (2,191 lines) into per-stage
      section components.
- [ ] Build `MODULE_REGISTRY`; convert the four existing widgets into modules.
- [ ] Render the dashboard from effective modules filtered by capabilities.
- [ ] Add module toggles to `/admin/projects/{id}`.
- [ ] Verify against current behavior — still one offering shape, pure refactor.

### Phase 4 — explicit project creation and onboarding steps

- [ ] Add `serviceType` + `priceIdOverride` to `admin.createProspect` (C1).
- [ ] Add `admin.createProjectForProspect` (C2).
- [ ] Narrow `getOrCreateProject` to exact-prospect matching; remove the
      `anyExistingProject` fallback (B1).
- [ ] Make the agreement page load-or-empty-state; never create (C2).
- [ ] Gate the **admin** magic-link action on project existence (C2a).
      Leave the portal self-serve login ungated.
- [ ] Drive onboarding steps from `offering.onboardingSteps` (C3).
- [ ] Expand with typed `offeringDetails`, dual-read legacy `buildDetails`,
      backfill and verify row-by-row, switch writes, then contract the
      website-specific legacy fields in a later deploy (§5.3).
- [ ] Retire `/onboarding` and fix all ten-plus references (§5.5), starting with
      the two `components/lead-demo/*` CTAs.
- [ ] Remove the now-unreferenced public onboarding hook and plan generator; run
      a repo-wide reference/link check and verify every replacement CTA.

### Phase 5 — multiple projects per client

**Prerequisite: `billing_migration.md` is complete through Phase E.**

- [ ] Confirm every live subscription carries `project:<projectId>` in Stripe
      metadata and component state.
- [ ] Add `getSubscriptionForProject`; migrate the portal off `getMySubscription`.
- [ ] Return a project array from `getPortalDecision` (B2).
- [ ] Build the `/portal` project list and the header switcher.
- [ ] Add "New project for existing client" to admin behind a disabled-by-default
      feature flag. The UI may be tested with fixtures, but it must refuse to
      create a second real client project until the Stage 6 billing reader,
      Checkout writer, zero-mismatch gate, and rollback drill all pass.

### Later — second engagement type

Only when a contract is actually signed. If Phases 1-5 are done, adding
`mobile_app` or `idx_website` is mostly writing a registry entry, an
`offeringDetails` variant, a terms template, and any genuinely new modules.

---

## 8. Sequencing rule

**Do not add a second engagement type before Phase 3 is complete.** Adding
`mobile_app` to the current 2,191-line monolith is what guarantees the refactor
never happens. `waas_local_family` is safe to add in Phase 1 precisely because
it changes only data, never structure.

---

## 9. Resolved decisions

- **Billing:** two subscriptions for two projects, not one subscription with two
  line items. This preserves independent attribution, invoices, failure states,
  and cancellation.
- **Archive:** independent `archivedAt` metadata, not a universal terminal stage.
  Preserve and restore the underlying fulfillment stage.
- **Public onboarding AI:** retire the route, its session hook, and its dedicated
  plan generator. Reintroduce an admin assistant only after a bounded workflow
  earns it.
- **Operational routing:** broad `phase` is for presentation; explicit stage
  capabilities control lead intake, edit requests, and metrics visibility.

These decisions should be reopened only with buyer evidence or an implementation
finding that invalidates an assumption, not simply because a future offering is
easy to imagine.
