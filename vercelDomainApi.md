# Vercel Domains API: Domain Selection, Suggestions, Locking, and Purchase Plan

This doc captures the full plan to add **Vercel Domains Registrar API** support to the **Build Details** “Domain Preference” flow, so clients can:

- Type a preferred domain
- Click **Check availability**
- If available and under the cap, **confirm and lock** the choice (explicitly “no changing it”)
- If unavailable or over the cap, generate **AI alternatives**, bulk-check availability + price, and show suggestions
- (Optional follow-up) Purchase the domain programmatically once confirmed

This aligns with our WaaS model: **domain included and managed while subscribed** (we are the registrant; client rents it).

---

## Current app context (where this lives today)

- **Client enters `domainPreference`** in the portal’s Build Details form:
  - File: `app/portal/[projectId]/page.tsx`
  - UI: plain text input labeled “Domain Preference”
- **Saved to Convex** via `api.projects.upsertBuildDetails`:
  - File: `convex/projects.ts`
  - Field stored in `projects.buildDetails.domainPreference`
- **Admin can edit deployment URLs** (`liveUrl`, `stagingUrl`, `vercelProjectId`) in admin UI:
  - File: `app/admin/page.tsx`

We will extend build details with explicit **domain state** so “locked/finalized/purchased” is not inferred from `deployment.liveUrl`.

---

## Vercel Domains Registrar API capabilities (what we can do)

Vercel provides registrar endpoints we can call from a server environment (Convex **Node action**).

### Core endpoints we’ll use

- **Check availability (single domain)**  
  `GET /v1/registrar/domains/{domain}/availability`  
  Returns `{ available: boolean }`.

- **Get price data for a domain (exact pricing; required for premium domains)**  
  `GET /v1/registrar/domains/{domain}/price`  
  Use this for our **$20/yr** cap checks (do not rely only on TLD base prices).

- **Check availability (bulk)**  
  `POST /v1/registrar/domains/availability`  
  Use this to evaluate AI-generated candidates efficiently.

- **Buy a domain**  
  `POST /v1/registrar/domains/{domain}/buy`  
  Used in the optional “purchase” step after confirmation.

### Supporting endpoints (optional / later)

- **Get supported TLDs**: to constrain candidate generation to what Vercel can sell.
- **Get TLD price data**: `GET /v1/registrar/tlds/{tld}/price`  
  Useful for displaying *base* pricing, but **premium domains can differ**, so it’s not sufficient for our cap logic.
- **Get contact info schema**: to confirm which registrant fields are required for purchase.

### What Vercel does *not* provide

- There’s no single “search suggestions” endpoint for a keyword. We generate candidates (deterministic + AI) and then bulk-check them.

---

## Product decisions (locked in for this implementation)

- **Registrant**: Agency (us). Clients rent the domain during subscription term.
- **Price cap**: $20/year (we must define whether cap applies to **renewal**, **purchase**, or **both**; see “Cap policy” below).
- **No changing once confirmed**: enforce server-side (not just UI).
- **Where this happens**: inside the **Build Details** form in the client portal (`AWAITING_ASSETS` stage).

---

## Domain state model (new fields)

We will extend `buildDetails` with explicit domain state. Proposed minimal fields:

- `domainPreference: string | null` (existing; remains “freeform input / starting point”)
- `domainSelected: string | null` (**the domain the client picked from check/suggestions**)
- `domainLockedAt: number | null` (**lock timestamp**; if set, client cannot change selection)
- `domainPriceQuote: { purchasePrice: number; renewalPrice: number; years: number } | null` (**quote used when locking**, informational + auditing)
- `domainOrder: { orderId: string | null; purchasedAt: number | null } | null` (**only if/when we purchase programmatically**)

Notes:
- `deployment.liveUrl` will still be set by admin when going live, and we’ll “usually” set it to the purchased domain—but **domain locking/purchase state should not depend on liveUrl**.

---

## Cap policy (define precisely)

We need a precise rule for “under $20/yr”. Recommended:

- **Cap on renewal price**: `renewalPrice <= 20` (prevents unexpected annual cost later)
- Optional: also cap purchase price `purchasePrice <= 20` to keep Year 1 consistent

Implementation should return both prices so UI can explain why a candidate is rejected.

---

## UX flow (client portal)

### A) Primary flow: user types preferred domain and checks it

1. User types into “Domain Preference” input.
2. User clicks **Check availability**.
3. UI calls Convex `action` with the typed value.
4. If available and cap-ok:
   - Show a **confirmation panel** with:
     - the domain
     - price details (purchase + renewal)
     - explicit statement: “Confirming locks this choice and it can’t be changed.”
   - User clicks **Confirm domain**.
5. On confirm:
   - Convex `mutation` locks the domain fields on the project (`domainSelected`, `domainLockedAt`, `domainPriceQuote`, etc.)
   - UI disables domain input + check button once locked.

### B) Failure flow: unavailable or over cap → suggestions

1. If the preferred domain is unavailable or cap-fails:
   - Backend generates 10 candidates with AI (plus optional deterministic fallbacks).
2. Backend bulk checks availability.
3. Backend fetches price for available ones, filters to cap-ok.
4. UI displays:
   - “Not available” or “Over price cap” reason for the original
   - Suggested alternatives list, each showing:
     - domain name
     - purchase price
     - renewal price
     - an action: **Use this**
5. Choosing a suggestion opens the same confirmation panel → lock mutation.
6. User can also retype a new preference and re-check.

### C) Optional follow-up: purchase programmatically

After domain is locked, show an optional step:

- Button: **Purchase domain now** (explicitly labeled as irreversible)
- Calls Convex `action` that:
  - re-checks availability and price immediately
  - calls Vercel buy endpoint
  - stores order info

We can also make purchase an **admin-only** action initially to reduce risk while we validate in production.

---

## Backend design (Convex)

### Why actions

All Vercel API calls and AI calls should be in Convex **Node actions** (“use node”), not queries/mutations.

### Proposed functions (names are suggestions)

#### 1) `domains.checkOrSuggest` (action)

**Input**
- `projectId: Id<"projects">`
- `rawDomain: string`

**Output (discriminated union)**
- Success:
  - `ok: true`
  - `domain: string` (normalized)
  - `availability: true`
  - `price: { purchasePrice: number; renewalPrice: number; years: number }`
  - `capOk: true`
- Failure:
  - `ok: false`
  - `reason: "unavailable" | "over_cap" | "invalid_domain" | "api_error"`
  - `attemptedDomain: string` (normalized or original)
  - `price?: { purchasePrice; renewalPrice; years }` (if available)
  - `domainSuggestions: Array<{ domain: string; price: { purchasePrice; renewalPrice; years } }>`

**Behavior**
- Normalize & validate domain (strip scheme, path, whitespace; enforce hostname-only).
- Check availability via Vercel.
- If unavailable: generate candidates (AI + optional deterministic), bulk-check, price-check, filter.
- If available: price-check the chosen domain; enforce cap.

#### 2) `domains.lockDomain` (mutation)

**Input**
- `projectId: Id<"projects">`
- `domain: string` (normalized; must match what was just checked)
- `priceQuote: { purchasePrice; renewalPrice; years }`

**Behavior**
- Auth required; ensure project belongs to auth user.
- If `domainLockedAt` already set: reject (unless admin override).
- Patch `buildDetails`:
  - set `domainSelected`, `domainLockedAt`, `domainPriceQuote`
- Log activity event, e.g. `domain.locked`

#### 3) `domains.purchaseLockedDomain` (action) (optional)

**Input**
- `projectId`

**Behavior**
- Load project; require domain locked.
- Re-check availability + price (cap enforcement again).
- Call Vercel buy endpoint.
- Store order id + purchased timestamp.
- Log activity `domain.purchased`.

---

## AI suggestions strategy

We already have an AI agent component set up. Use it to generate candidates like:

- alternate TLDs: `.com` → `.net`, `.org`, `.co`, `.io`, `.biz`, `.info` (but keep a curated list; supported TLDs can be fetched from Vercel)
- short modifiers: `get`, `try`, `go`, `my`, `local`, `hq`
- service-area variants: append city/state abbreviations if present in company name or build details
- hyphenation: `tb-tree-service.com` (only if it remains readable; avoid ugly results)

Hard rules for generated candidates:
- max length
- no spaces
- valid label characters
- must be a registrable domain (not subdomain)

Then:
- bulk availability check
- price check for available ones
- filter to cap-ok
- return top 5–10 suggestions

---

## Security, secrets, and rate limiting

- **Vercel API auth**: store a Vercel bearer token in Convex environment variables (server-only).
- **teamId**: pass `teamId` if domains are purchased under a team. (If bought under personal account, omit teamId.)
- **Rate limiting / abuse prevention**
  - Debounce “Check availability” on the client (but button is already explicit).
  - Add server-side throttling per `projectId` + IP/user (Convex rate limiter component if desired).
  - Consider caching results for `(domain, years)` for short TTL (e.g. 5–15 minutes) to reduce repeated calls.
- **Audit trail**
  - Log `domain.check`, `domain.suggested`, `domain.locked`, `domain.purchased`

---

## Implementation steps (repository work plan)

### 1) Schema/validators
- Update `convex/validators.ts` `buildDetailsValidator` to include new fields:
  - `domainSelected`, `domainLockedAt`, `domainPriceQuote`, `domainOrder` (optional)
- Update `convex/schema.ts` indirectly via `buildDetailsValidator` usage (ensure compatibility with existing records by making new fields optional / nullable).

### 2) Convex domain module
- Add `convex/domains.ts` with:
  - Node action: `checkOrSuggest`
  - Mutation: `lockDomain`
  - (Optional) Node action: `purchaseLockedDomain`
- Use `fetch` to Vercel REST API or `@vercel/sdk` (either is fine; REST is simplest/minimal dependency).

### 3) Portal UI changes
- Update `BuildDetailsForm` in `app/portal/[projectId]/page.tsx`
  - Add **Check availability** button near domain input
  - Add loading + results UI
  - Add suggestions list
  - Add confirmation panel (“no changing it”)
  - Disable input if `domainLockedAt` is set

### 4) Server-side enforcement
- Ensure `projects.upsertBuildDetails` cannot change domain fields once locked:
  - either reject `domainPreference/domainSelected` updates post-lock
  - or split “domain” into a dedicated mutation path and remove from generic upsert

### 5) Admin tooling (optional but helpful)
- In `app/admin/page.tsx`, display domain state fields so admin can see:
  - selected domain, lockedAt, quote, purchasedAt/orderId
- Add admin override mutation if you want the ability to unlock/change.

### 6) Purchase (optional phase)
- Add purchase action behind:
  - admin-only at first, or
  - client flow after lock with explicit consent
- Integrate with existing “Go Live” process:
  - after purchase and once configured, admin sets `deployment.liveUrl` to the purchased domain

---

## Open questions (to answer once before coding purchase)

- Does the **$20 cap** apply to:
  - renewal only (recommended), or
  - purchase + renewal?
- Do we purchase immediately on confirmation, or keep purchase as admin-triggered until stable?
- Which TLDs do we want to allow for suggestions (curated list vs Vercel supported TLDs)?

