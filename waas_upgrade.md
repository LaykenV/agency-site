# WAAS Upgrade — Hub ↔ Spoke Security & Telemetry

Status: **Phase 1A complete in production (closed 2026-08-05). Phase 1B is next.**
Owner: Layken
Written: 2026-08-04
Last reviewed: 2026-08-05 (scope trim — see `UPGRADE_PLAN.md` § 7)

Plan to replace the current Hub ↔ client-site connection, which has no real
authentication, with a credential-based contract — using only Convex and the
client site's own hosting. No third-party bot-protection service.

Now is the time: only two client sites currently connect, so the migration is
bounded. It is not zero-cost: Chelsea posts directly from the browser, while TB
Tree posts from a Next.js Server Action without a browser `Origin`. Both shapes
must remain live during the transition.

---

## 1. How it works today

### Client side

The current live example is `clients/chelsea-social/` — a static, framework-free
site, not built from `agency-template/`. New sites are built custom, with the
Hub contract described to the model rather than inherited from a template.

- `waas-config.js` — frozen global with `apiUrl`, `projectId` (a UUID), `allowedPaths`.
- `waas.js` — one IIFE:
  - Pageview → `POST /api/v1/analytics/pixel` with `{projectId, path, referrer}`.
  - Contact form → `POST /api/v1/ingest-lead`, guarded by a honeypot field
    (`website`) and a 3-second minimum fill time (`waas.js:66-74`).

### Hub side (`convex/http.ts`)

**Leads** (`ingestLeadHandler`, `http.ts:143-257`):

1. Parse JSON, require `projectId`.
2. Look up project by slug; must exist.
3. Status must be `LIVE` or `IN_REVIEW`.
4. Build CORS headers from `deployment.liveUrl` / `stagingUrl` vs `Origin`.
5. Reject if `Origin` is present and does not match.
6. Rate limit: 5/min token bucket keyed `projectId:ip`.
7. Require `data.name` and `data.email` to be non-empty.
8. Insert into `client_leads`, schedule Groq triage.
9. Triage → Resend email → optional Twilio SMS.

**Analytics** (`analyticsPixelHandler`, `http.ts:275-326`): same shape, but the
`Origin` match is mandatory, the rate limit is 60/min keyed on `projectId`
alone, and only `{projectId, path}` are read from the body.

---

## 2. Audit findings

### Critical

**F1 — There is no authentication on either endpoint.**
The whole trust model is the `Origin` header. `Origin` is freely settable by any
non-browser client, and `projectId` is public in `waas-config.js` (view-source).
The complete attack is: copy the UUID from the page, then curl the endpoint.

**F2 — Leads accept requests with no `Origin` header at all.**
`http.ts:197` reads `if (origin && !corsHeaders[...])`. A request that simply
omits `Origin` skips the check entirely. The comment at `http.ts:191-196`
justifies this with "Turnstile validation at client template level" — **that
Turnstile does not exist.** The only reference anywhere in `agency-template/` is
a to-do line in `tasks.txt`. Remove the comment along with the bypass.

Operational constraint: TB Tree's live Server Action legitimately uses that
no-`Origin` path today. The bypass cannot be removed as an isolated Hub deploy;
TB Tree must move to authenticated v2 first or in the same release window.

**F3 — Unauthenticated requests fan out into paid services.**
Each accepted lead triggers a Groq LLM call (`leadTriage.ts:113`), a Resend
email, and optionally a **Twilio SMS to the client's personal cell**
(`leadTriage.ts:184`). This is the finding that makes F1/F2 more than cosmetic:
a public endpoint spends money and wakes up a client.

**F4 — The per-IP rate limit is bypassable from a single machine.**
`http.ts:206` falls back to `x-forwarded-for`, which the caller controls. A
random XFF per request means the 5/min bucket never engages. Never key a
security control on a header the attacker can write.

### High

**F5 — No per-project lead ceiling.** The only bucket is `projectId:ip`. A proxy
pool has no upper bound at all. This is the missing cost circuit breaker.

**F6 — No length limits on any field.** `name` / `email` / `message` are
unbounded strings going into the DB, then a Groq prompt, then an email body.

**F7 — No email format validation.** `leadData.email` only has to be non-empty.

**F8 — Analytics is blackout-able.** `http.ts:311-313` keys the 60/min bucket on
`projectId` alone, so anyone spoofing `Origin` can drain it and silently 429 the
client's real traffic. A genuinely busy site would also self-DoS.

**F9 — The honeypot and time-trap protect nothing against direct POSTs.** Both
are evaluated in browser JS; neither value is transmitted, so the Hub cannot
enforce them. They stop naive form-filling bots only.

### Medium

**F10 — `referrer` is collected and discarded.** `waas.js:36` sends it;
`http.ts:278` destructures only `{projectId, path}`.

**F11 — No replay protection and no `Content-Type` enforcement.**

**F12 — No credential revocation.** The only lever is flipping project status.

**F13 — Inconsistent URL conventions.** `liveUrl` is a bare domain matched as
`https://${liveUrl}`; `stagingUrl` is matched both bare and prefixed
(`http.ts:120-127`). No wildcard for Vercel preview domains. This is the
stale-URL footgun already flagged in `CLAUDE.md`.

**F14 — SMS fires on `review` verdicts.** `shouldEmail` (`leadTriage.ts:163`)
gates both email and SMS, so a borderline-spam lead still texts the client.

---

## 3. Target architecture

### 3.1 The core decision: no browser ever posts a lead to the Hub

This single change removes the need for any third-party bot service.

```
Visitor → [client site's own /api/contact function] → authenticated → Hub
```

The client site's serverless function holds a random bearer credential
(`sk_live_…`) in its hosting environment and sends it in the `Authorization`
header over HTTPS. The Hub hashes the presented credential and compares that
digest to its stored row. The raw credential is never stored in Convex.

This is preferable to the previously proposed HMAC scheme. HMAC verification
requires the Hub to possess the original symmetric secret; a table containing
only `SHA-256(secret)` cannot verify `HMAC(secret, payload)`. Application-level
encryption or asymmetric signing would solve that, but both add key-management
cost without a corresponding benefit for this narrow server-to-server path.
TLS already protects the request in transit, and a high-entropy bearer token
provides the required client authentication.

This replaces Turnstile for **Hub authentication**, not for proving that the
upstream visitor is human. Anyone can still call the public client-site function;
rate limits, honeypot signals, and triage remain separate spam controls.

Every current client site can support this, including Chelsea's otherwise static
site. Vercel deploys root `api/*` entrypoints as Functions, so Chelsea can add one
function and one environment variable without adopting React or Next.js.

### 3.2 Analytics stays in the browser

Pageviews must fire from the browser. Proxying them through the client's own
function would double the request count for no security gain, because the harm
from forged analytics is bounded: inflated numbers, no cost fan-out, no
notification. Analytics keeps `pk_live_…` + `Origin` checking and the stricter project bucket
it already falls back to, rather than trusting caller-supplied XFF. No trusted
Hub edge-IP signal was established — that investigation was declined; see § 5
Phase 1A. The worst case for analytics without a per-visitor key is an inaccurate
pageview count, not a lost lead.

This remains a **soft integrity boundary**, not authentication. Do not proxy or
secret-sign browser analytics to make it equivalent to lead auth; that would add
cost and break valid browser pageviews without making a publishable signal
secret.

### 3.3 Credential model

New table `project_credentials`, one row per key, **hashed at rest**:

```ts
project_credentials: defineTable({
  projectId: v.id("projects"),
  keyId: v.string(),            // public identifier/prefix, not the credential
  kind: v.union(v.literal("publishable"), v.literal("secret")),
  credentialHash: v.string(),   // SHA-256 of full high-entropy key
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  label: v.optional(v.string()),  // "chelsea prod", "chelsea preview"
})
  .index("by_keyId", ["keyId"])
  .index("by_projectId", ["projectId"])
  .index("by_projectId_and_kind", ["projectId", "kind"]),
```

- `pk_live_…` — publishable. Safe in browser JS. Analytics identification only.
- `sk_live_…` — secret bearer credential. Server-side only. Authorizes lead
  submissions.

The raw key is shown exactly once at creation in the admin UI. Generate at least
256 random bits, keep the lookup `keyId` separate from the secret portion, and
compare decoded hashes without logging the raw header. Rotation = issue a new
key, deploy it, prove use, then set `revokedAt` on the old one. Both keys are
valid during the overlap.

### 3.4 Request authentication

The client function sends:

| Header | Value |
|---|---|
| `Authorization` | `Bearer sk_live_<keyId>_<secret>` |
| `Content-Type` | `application/json` |

Hub verification order — cheapest rejections first:

1. Require `Content-Type: application/json` and stream/read the body with a
   16 KB ceiling. `request.json()` followed by a length check is too late.
2. Parse the credential prefix and resolve `keyId` to a non-revoked `secret`
   credential.
3. Hash the full presented credential and compare its fixed-length digest to
   `credentialHash` with a constant-time primitive available in the runtime.
4. Validate and normalize every field.
5. Apply project and trusted-visitor rate limits.
6. Insert the lead and schedule triage exactly once.

Submission-level idempotency (`Idempotency-Key` plus a receipts table) was cut on
2026-08-05 — `UPGRADE_PLAN.md` § 7. Bearer verification removes the forging
attacker, and neither spoke retries a failed submission, so the remaining
duplicate risk is a client Function we control. Reintroduce it if duplicates are
actually observed; the header name is reserved for that.

The authenticated client function may include `visitorHash`, `country`, and
`userAgentClass` in the payload. For Vercel clients, derive these from platform
headers inside the Function, not from form fields. Use a keyed HMAC/pepper for
`visitorHash`; plain `sha256(ip + userAgent + date)` is enumerable and should
not be described as anonymous. Never send or store raw IP in Convex.

### 3.5 Bot defense, without a third party

Authentication (§3.4) stops forgery. Spam is a separate problem — a real
visitor's browser on a real client site submitting junk. Defense in depth, in
order of cost to implement:

**Tier 1 — client-function validation of honeypot and time-trap (do this).**
Move the checks out of browser-only JavaScript and into the client site's
Function before it calls the Hub. Include the normalized signals in the
authenticated payload for auditability:

```json
{
  "data": { "name": "…", "email": "…" },
  "meta": { "hp": "", "renderedAt": 1754300000000 }
}
```

Reject if `hp` is non-empty, or if `submittedAt - renderedAt < 3000`. Add an
upper bound too — reject `> 24h` as stale. These remain heuristics: a caller can
submit an empty honeypot and invented timestamp to the public client Function.
They catch naive automation; they do not attest that a human filled the form.

**Tier 2 — rate limits (do this).** Apply a visitor limit at the Vercel Function,
where Vercel overwrites `x-forwarded-for`, and enforce the authenticated
per-project cost ceiling again at the Hub. See §3.7.

**Tier 3 — Groq triage (already built).** `leadTriage.ts` is the last line and
already handles semantic spam well.

**Tier 4 — additional challenge only if measured spam warrants it.** Do not
preselect proof-of-work or claim a fixed invisible CPU cost. If Tiers 1-3 fail,
compare a managed challenge, proof-of-work, and provider-level WAF/rate limiting
against accessibility, privacy, battery, and operational cost before choosing.

### 3.6 Endpoint layout

Per `CLAUDE.md`, breaking changes ship as a new version. v1 stays alive.

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/v2/leads` | hashed `sk_` bearer | New authenticated lead path |
| `POST /api/v2/events` | `pk_` + Origin | Pageviews **and** click/conversion events |
| `POST /api/v1/ingest-lead` | legacy | Patch per §5 Phase 1, retire after migration |
| `POST /api/v1/analytics/pixel` | legacy | Patch per §5 Phase 1, retire after migration |
| `POST /api/ingest-lead` | legacy | Unversioned alias, same treatment |
| `POST /api/analytics/pixel` | legacy | Unversioned alias, same treatment |

The v1 endpoints do **not** get deleted in Phase 1A. They receive containment
controls because two live clients depend on them. The no-`Origin` legacy path
stays available only until TB Tree is proven on v2; Chelsea then moves through
its own Function, and all lead aliases can be retired together.

### 3.7 Rate limits

```ts
// convex/rateLimiter.ts
leadPerVisitor:       { kind: "token bucket", rate: 5,   period: MINUTE, capacity: 5 },
leadIngestPerProject: { kind: "fixed window", rate: 1000, period: DAY },
paidFanoutPerProject: { kind: "fixed window", rate: 50,  period: DAY },
leadNoTrustedVisitor: { kind: "fixed window", rate: 30,  period: HOUR },
eventsPerVisitor:     { kind: "token bucket", rate: 60,  period: MINUTE, capacity: 60 },
smsPerProject:        { kind: "fixed window", rate: 20,  period: DAY },
adminOpsAlertGlobal:  { kind: "fixed window", rate: 20,  period: HOUR },
```

- Fixed windows are intentional for daily cost ceilings. A token bucket refills
  continuously and is not a hard per-day maximum.
- `paidFanoutPerProject` is the circuit breaker for Groq/Resend/Twilio (F5).
  When it is exhausted, keep an otherwise valid lead as `review`/untriaged and
  expose it in admin rather than silently dropping it. Emit one threshold alert,
  not one alert per rejected fan-out.
- Threshold alerts use a separate admin-operations path keyed and deduplicated by
  `projectId:limit:window`. They bypass the exhausted project's paid-fanout and
  SMS buckets, but remain globally capped by `adminOpsAlertGlobal`. Persist the
  alert in admin even if the global delivery cap suppresses its email/SMS.
- `leadIngestPerProject` is a higher storage-abuse ceiling.
- Drop the `x-forwarded-for` fallback (F4). When no trusted IP is available on
  legacy requests, use `leadNoTrustedVisitor` instead of trusting a spoofable
  value. The originally planned one-day header logging was declined on
  2026-08-05 — see § 5 Phase 1A.
- Authenticated v2 leads key on `projectId:visitorHash`, where `visitorHash` is
  derived inside the client Function from provider-controlled request headers.
- Analytics keys on `projectId:trustedEdgeHash` when available, with a stricter
  project fallback when it is not (F8).

### 3.8 Input validation

Enforced **before** anything is inserted or scheduled (F6, F7). Enforce the body
ceiling while reading the stream; checking after `request.json()` has already
allocated an oversized payload.

| Field | Rule |
|---|---|
| body | ≤ 16 KB |
| `name` | 1-120 chars |
| `email` | ≤ 200 chars, must match a basic RFC-ish regex |
| `phone` | ≤ 40 chars |
| `message` | ≤ 4000 chars |
| all | strip C0/C1 control characters except `\n` and `\t` |

Expose the same limits in the client form and reject every over-limit field.
Legacy v1 cannot prove that a client UI disclosed a message limit, so the Hub
must not return success after truncating an inquiry. Return generic public
errors and never echo raw input.

### 3.9 Origin matching (F13)

Normalise on storage, not at comparison time. Store `liveUrl` and `stagingUrl`
as full origins (`https://chelseasoco.com`), and derive the `www` variant at
match time.

`previewUrlPattern` was cut on 2026-08-05 (`UPGRADE_PLAN.md` § 7). Once leads
move to bearer auth, `Origin` gates analytics only, where the worst outcome of a
stale URL is an inaccurate pageview count rather than a lost lead.

---

## 4. Telemetry expansion

### 4.1 Fold the pixel into a general event endpoint

`POST /api/v2/events` takes `{publishableKey, type, path, meta}`; `pageview`
becomes one type among several. This avoids adding a new endpoint per metric.

Store a typed, bounded normalized event. Do not put public `v.string()` type
names and `v.any()` metadata on an Internet-facing ingestion path:

```ts
client_events: defineTable({
  projectId: v.id("projects"),
  publishableKeyId: v.string(),
  type: v.union(
    v.literal("pageview"),
    v.literal("click"),
    v.literal("form_start"),
    v.literal("form_submit"),
    v.literal("web_vital"),
    v.literal("js_error"),
  ),
  path: v.string(),
  visitorHash: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  referrer: v.optional(v.string()),
  utm: v.optional(v.object({
    source: v.optional(v.string()),
    medium: v.optional(v.string()),
    campaign: v.optional(v.string()),
  })),
  device: v.optional(v.union(
    v.literal("mobile"),
    v.literal("tablet"),
    v.literal("desktop"),
    v.literal("unknown"),
  )),
  country: v.optional(v.string()),
  payload: v.optional(v.union(
    v.object({
      kind: v.literal("link"),
      target: v.union(v.literal("tel"), v.literal("email"), v.literal("directions")),
    }),
    v.object({ kind: v.literal("form"), formId: v.string() }),
    v.object({
      kind: v.literal("web_vital"),
      metric: v.union(v.literal("CLS"), v.literal("INP"), v.literal("LCP")),
      value: v.number(),
      rating: v.union(v.literal("good"), v.literal("needs-improvement"), v.literal("poor")),
    }),
    v.object({ kind: v.literal("js_error"), messageHash: v.string() }),
  )),
  createdAt: v.number(),
})
  .index("by_projectId_and_createdAt", ["projectId", "createdAt"])
  .index("by_projectId_and_type_and_createdAt", ["projectId", "type", "createdAt"])
```

The handler enforces event-specific `type`/`payload` pairings, allowed paths,
field lengths, and the project Origin before insertion.

Keep the existing `client_analytics` daily rollup as the query-side aggregate —
the portal should not scan raw events. Roll up on write, or on a cron.

### 4.2 What to add, ranked

**Highest value: click tracking on `tel:`, `mailto:`, and directions links.**
For a local service business these are stronger intent signals than pageviews.
Report them honestly as **tap-to-call clicks**, email clicks, and directions
clicks. A `tel:` click does not prove a connected phone call; reporting actual
calls requires a call-tracking number/provider and is outside this phase.

Then, in rough order:

1. **`referrer`** — already being sent and thrown away (F10). Classify into
   organic / social / direct. Attribute GBP only when the listing links use
   explicit UTM parameters; a bare Google referrer is not reliable GBP proof.
2. **UTM parameters** — needed before any paid campaign is worth running.
3. **Approximate unique visitors** via a keyed, daily-rotating visitor hash
   derived at a trusted server boundary. Never store raw IP. Treat the hash as
   personal/pseudonymous data for privacy review; do not promise that its use
   automatically removes consent obligations.
4. **Sessions** via a short-lived first-party `sessionStorage` id → bounce rate
   and pages per session. Include it in the same privacy inventory and review.
5. **Form start vs. submit** → abandonment rate, which is directly actionable.
6. **Device type and coarse country** — derive country only from a
   provider-controlled header in the client Function or a verified Hub edge
   header, never a caller-provided body field.
7. **Core Web Vitals** from real users via the `web-vitals` package. Feeds the
   same performance story the outbound audit pipeline already sells on.
8. **JS error beacon** — find out a client's form broke before they call.

Privacy gate: before collecting visitor hashes or session identifiers, document
the purpose, fields, retention period, processors, access controls, deletion
path, and applicable opt-out/consent treatment. Update every client privacy page
before enabling collection; `clients/chelsea-social/privacy.html` is one known
surface. Default raw-event retention to 90 days, keep longer-lived aggregates
only when they cannot be tied back to a visitor/session identifier, and obtain
legal review rather than encoding "no banner required" as an engineering fact.

### 4.3 One-time PageSpeed snapshot

Not a recurring cron — a snapshot captured once, stored, and available to render
in the dashboard whenever it is useful.

`runPageSpeed()` already exists at `convex/publicAudits.ts:181` but is
module-private. Extract it into a shared module (`convex/lib/pagespeed.ts`) so
both the audit pipeline and the client-project path can call it. Reuse
`pageSpeedDataValidator` (`convex/validators.ts:316`) unchanged:
`{performanceScore, fcp, lcp, cls, fetchedAt}`.

Add to the `projects` table:

```ts
pageSpeedSnapshot: v.optional(pageSpeedDataValidator),
```

Populate via an admin-triggered internal action — a button on
`/admin/projects/{id}`, plus an automatic run once when a project first
transitions to `LIVE`. `fetchedAt` is already in the validator, so the portal
can honestly label it "measured on {date}" rather than implying it is live.

If a trend line is ever wanted later, promoting this to a history table is a
small change. Not now.

### 4.4 External data (no client-side code)

Hub-side enrichment, gathered on a schedule, requiring no change to any client
site. Ranked by how much each justifies a recurring invoice:

1. **Google review snapshot** — aggregate rating and review count can come from
   Places, but the rating count field is a paid Enterprise Places Data SKU. It
   does not provide authenticated ownership data or a dependable "new reviews"
   feed. A true Google Business Profile integration requires client OAuth,
   project approval, and the Business Profile APIs; choose only after pricing
   and consent are acceptable.
2. **Availability checks** — cron pinging `deployment.liveUrl`, with retries,
   regional/provider-failure handling, and an incident threshold. Report
   "successful checks" and observed incidents. Do not call this SLA-grade uptime
   until the monitoring design, exclusions, and response obligations support it.
3. **Google Search Console** — real queries, impressions, clicks, and average
   position. This requires the client's OAuth authorization and property access;
   it is not a service-account-only shortcut for arbitrary client properties.

Lower priority: SSL and domain expiry warnings, a monthly broken-link crawl,
sitemap indexation checks, local keyword rank tracking against competitors.

---

## 5. Implementation sequence

### Phase 1A — contain legacy v1 without breaking TB Tree

Ship before new capabilities. This is a bounded safety patch, not the final
authentication model.

- [x] Keep the no-`Origin` compatibility path temporarily: TB Tree's live Next.js
      Server Action depends on it. Delete the false Turnstile claim and mark the
      bypass as a migration exception with a removal gate.
- [x] Enforce the 16 KB body ceiling while streaming, then validate field lengths
      and email format **before** insert or `scheduler.runAfter` (F6, F7).
- [x] Add `leadIngestPerProject`, `paidFanoutPerProject`, and `smsPerProject`
      fixed-window ceilings (F5), with one threshold alert and visible untriaged
      leads when paid fan-out is paused.
- [x] Route the threshold alert through the separately deduplicated and globally
      capped admin-operations path. Prove exhausting a project fan-out bucket
      cannot suppress its own persisted admin alarm.
- [x] Stop trusting caller-controlled XFF; use `leadNoTrustedVisitor` when no
      trustworthy visitor signal exists (F4).
- [~] **Declined 2026-08-05:** the bounded 24-hour header observation. Do not set
      `HUB_VISITOR_OBSERVATION_UNTIL`. The `leadNoTrustedVisitor` fallback is
      adequate for the legacy window, and after Phase 1B leads arrive from the
      client's Vercel Function, which overwrites `x-forwarded-for` with the true
      client IP — that is where per-visitor limiting belongs. The Hub then needs
      only per-project ceilings, which use no IP. The observation code is gated
      off by default; leave it dormant and let Phase 1B remove it with the
      handler rewrite.
- [x] Re-key analytics to the trusted signal or a stricter project fallback (F8).
- [x] Restrict SMS to `verdict === "allow"` (F14).
- [x] Persist bounded `referrer` data (F10).
- [x] Live production evidence: a real lead through TB Tree's no-`Origin` Server
      Action was accepted, stored, triaged, and notified after the deploy.
      Chelsea's browser POST is an accepted residual — see `UPGRADE_PLAN.md` § 5.
- [x] Add counters/dashboard visibility for accepted leads, `429`s, paid fan-out
      paused, SMS sent, and SMS blocked by verdict.
- [~] **Declined 2026-08-05:** the spoofed-XFF ceiling load test. Every project
      ceiling is keyed on `projectId` alone (`http.ts:284`, `http.ts:311`,
      `leadTriage.ts:207`) — there is no IP component for a rotated header to
      influence, so the property holds by construction rather than by
      measurement. Verified by code read instead.

### Phase 1B — authenticated v2 and legacy retirement

**Scope trimmed 2026-08-05.** Idempotency receipts and `previewUrlPattern` are
cut; see `UPGRADE_PLAN.md` § 7 for the reasoning. The `Idempotency-Key` header in
§ 3.4 is not sent and not verified in this phase.

- [x] Add `project_credentials` with typed validators and indexes.
- [x] Build key issue / rotate / revoke in admin, showing the raw key once and
      redacting all request logs.
- [x] Build `POST /api/v2/leads` with bearer verification in the order in §3.4.
- [x] Move honeypot/time-trap checks into each client Function and pass their
      normalized signals to the Hub (F9).
- [ ] Normalize stored origins on write (F13). `previewUrlPattern` is cut.
- [x] Write and test both reference shapes: a static site's `/api/contact`
      Function and a Next.js Server Action/route handler. Each derives trusted
      visitor metadata from provider headers and holds `sk_` only server-side.
- [x] Migrate TB Tree first because it depends on no-`Origin`; then migrate
      Chelsea from direct browser POST to its own Function.
- [ ] Use the same production runbook for each client:

      1. Issue `sk_`; store only its hash; verify Authorization is redacted.
      2. Deploy the client Function and server-only environment variable.
      3. Submit a labeled test lead from the production browser form.
      4. Confirm project attribution, one stored lead, one triage, exactly one
         expected notification, and credential `lastUsedAt`.
      5. Revoke the key and prove the Hub rejects it; issue/restore the live key.
      6. Record v1/v2 volume, auth failures, and duplicate-triage count before
         advancing.
- [ ] After both clients are proven and monitored, reject no-`Origin` v1 leads,
      then retire v1 and unversioned lead aliases. Keep analytics v1 until its
      event migration is independently complete.
- [ ] In the same stage, either patch `agency-template/` to authenticated v2 or
      mark it legacy prominently and remove v1 setup guidance. A new client must
      not be able to reintroduce the retired pattern.

**Production migration evidence, 2026-08-05.** TB Tree commit `9cc809e` and
Chelsea commit `2dbf569` are deployed with separate sensitive
`WAAS_SECRET_KEY` values. Labeled production browser submissions through both
custom domains returned success, produced project-attributed lead rows with one
triage per submission, populated each credential's `lastUsedAt`, and logged
`hasVisitorHash: true`. Chelsea's browser posts only to same-origin
`/api/contact`; page-view analytics intentionally remains on
`/api/v1/analytics/pixel`. The observation and legacy-retirement gate above is
still open.

### Phase 2 — typed telemetry

Promoted ahead of the portal work on 2026-08-05 (`UPGRADE_PLAN.md` Stage 3) and
reduced to the signals that justify an invoice. All About Towing has no contact
form, so tap-to-call is its only conversion signal.

- [ ] Add `client_events` and `POST /api/v2/events` authenticated by the Phase 1B
      publishable key; make `pageview` one type.
- [ ] Add `tel:` / `mailto:` / directions click tracking — highest value here.
- [ ] Classify `referrer` into organic / social / direct; capture UTM.
- [ ] Add device type and coarse country, derived only from a provider-controlled
      header at a trusted boundary, never a body field.
- [ ] Extract `runPageSpeed()` to a shared module; add `pageSpeedSnapshot` to
      `projects` with an admin button and an on-first-LIVE run.
- [ ] Render the new metrics into the existing portal widgets. Converting them to
      registry modules belongs to the portal refactor, and this phase must not
      wait on it.

Deferred out of this phase (`UPGRADE_PLAN.md` Stage 8): visitor hashes, session
identifiers, bounce rate, pages per session, form start vs. submit, Core Web
Vitals, and the JS error beacon. Every one of those requires the privacy
inventory, retention policy, and client privacy-page updates in § 4.2 first, and
none of them is what a local service client is buying.

### Phase 3 — external data, only after consent and pricing review

No date. Revisit per item when a client pays for the outcome.

- [ ] Availability-check cron with retry/incident semantics.
- [ ] Defer paid Places review snapshots, GBP OAuth, and Search Console until a
      client is paying for the reporting outcome or ownership data is required.
- [ ] When that demand exists, choose either paid Places snapshots or approved
      GBP OAuth; do not describe one as the other. Add Search Console only with
      explicit property authorization.

---

## 6. Notes

- The `.agents/skills/cloudflare-turnstile/` skill is currently deleted in the
  working tree. Given the decision not to use Turnstile, that deletion can stand.
- `CLAUDE.md` needs updating once Phase 1B ships: the Hub ↔ Spoke contract
  section still describes `Origin` as the security boundary, and the
  "check the Origin allowlist first" troubleshooting note will only apply to
  analytics after leads move to authenticated bearer credentials.
- Research references: [Vercel request headers](https://vercel.com/docs/headers/request-headers),
  [Places API field pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing),
  [Business Profile API prerequisites](https://developers.google.com/my-business/content/prereqs),
  and [Search Console authorization](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing).
- `agency-template/` is no longer the path new client sites take, but Phase 1B
  still owns its patch-or-mark-legacy decision so it cannot remain an accidental
  source of v1 code.
