# Client Lifecycle — End to End

How a single client moves from "scraped lead" or inbound prospect all the way to a live, monthly-billed, post-launch site under management. This is the operational map for the entire business.

The lifecycle spans two repos:

- **`agency-site`** (this repo) — marketing pipeline, admin portal, client portal, agreement clickwrap, Stripe billing, hub API (lead intake + analytics), Cal.com integration, email.
- **the client site repo** — one bespoke repo per paid client. Builds custom UI but talks to the hub APIs in this repo.

Stages 0–8 happen in `agency-site`. Stages 9–11 cross over to the client site repo. Stages 12+ return to `agency-site` for operations.

> `agency-template` is fully retired (2026-08-05) — not cloned, not patched,
> not merged from. `../agency-playground/` is the reference Spoke and the first
> site to run each new Hub contract in production. Stages 9 and 18 below were
> rewritten for the bespoke flow.

---

## Stage 0 — Lead discovery

The lead can arrive from either an outbound pipeline or an inbound onboarding form. Both paths converge on a row in the `prospects` table.

### Outbound (most common while marketing is ramping)

1. In `/admin/marketing`, enter city + industry.
2. Pipeline runs automatically:
   - Google Places API returns up to 60 businesses.
   - Firecrawl scrapes each website (markdown, screenshot, primary color, tech detection, contact email).
   - PageSpeed Insights returns a mobile performance score.
   - Groq AI scores each lead 1–10 for fit and generates pain points, selling points, and an outreach angle.
3. Qualified leads (`fitScore ≥ 6`) get a UUID `demoToken`.
4. `/audit/{token}` renders a public audit report with a performance gauge, listed issues, portfolio examples, and a Cal.com CTA.
5. Firecrawl screenshots the audit page for the outreach email.
6. Personalized email sent via Resend with the audit screenshot embedded.
7. First visit stamps `demoViewedAt` — your follow-up prioritization signal.

### Inbound

1. Prospect submits the onboarding form on the marketing site.
2. A `prospects` row is created with `sessionId`, `resumeToken`, and `prospectDetails`.
3. AI generates a plan summary they can review and resume later.

### Funnel state

Both paths land here:

```
scraped_leads (hundreds, top of funnel)
  → prospects (tens, human-vetted)
    → projects (single digits, paying clients)
```

---

## Stage 1 — Sales conversation

1. 15-minute confirmation call. Phone, Cal.com, or in-person drop-in follow-up.
2. Confirm fit, get verbal yes.
3. Close: *"I'll email you a link — accept the terms and start your subscription in 2 minutes."*

---

## Stage 2 — Admin sends welcome email

1. In `/admin/prospects`, open the prospect.
2. Click **Send Welcome Email**.
3. Better Auth dispatches a magic link to `/portal/agreement?sid={sessionId}`.
4. Token valid for 24 hours. Session valid for 1 year with 24-hour sliding refresh.

---

## Stage 3 — Client lands in the portal

1. Magic link authenticates server-side (`initialToken` pre-fetch → instant hydration, no flicker).
2. A `projects` stub is auto-created on landing, linked to the prospect.
3. `projectStatus = AWAITING_AGREEMENT`.
4. The client sees the agreement page with the conspicuous summary: **$199/mo, 12-month minimum, early termination policy, recurring billing authorization**, plus a link to `/legal/terms` (versioned).

---

## Stage 4 — Clickwrap signed

1. Checkbox + "I agree" + submit.
2. An `agreements` row is inserted with:
   - `termsVersion` and `termsHash` (SHA-256 of canonical terms content)
   - `acceptedAt` timestamp
   - `userAgent` from the browser
3. `activity_log` entry appended: `contract.accepted`.
4. `projectStatus → AWAITING_PAYMENT`.

---

## Stage 5 — Stripe Checkout

1. The app ensures a Stripe customer exists for this user; creates one if missing and stores the mapping `authUserId → stripeCustomerId` in the `stripe_customers` table.
2. A Stripe Checkout Session is created with metadata:

   ```json
   {
     "projectId": "...",
     "prospectId": "...",
     "agreementId": "...",
     "termsVersion": "..."
   }
   ```

3. `success_url` set to `/portal/success`.
4. Client is redirected to Stripe's hosted checkout to enter their card.

---

## Stage 6 — Webhook activates the subscription

1. `/api/stripe` receives `checkout.session.completed` and the relevant `customer.subscription.*` / `invoice.*` events.
2. Stripe signature verified. Event ID checked for idempotency.
3. Subscription state synced into the `stripe_subscription_cache` KV table (we don't maintain a local `subscriptions` table — read state from Stripe + cache).
4. `projectStatus → AWAITING_ASSETS`.
5. `activity_log` entry: `payment.subscription_activated`.
6. "Welcome Aboard" email sent via Resend with order summary and a snapshotted terms link.

---

## Stage 7 — Build Details form (client portal)

The client is back in the portal, now at the AWAITING_ASSETS stage. They fill out the Build Details form:

1. **Headline preference** — what the site should lead with.
2. **Domain preference** — what URL to register or transfer.
3. **Inspiration links** — sites they like (for direction, not copying).
4. **Brand colors** — primary + accent, picked via native color pickers with a live gradient preview.
5. **Logo upload** — Convex `_storage`, instant local preview via `URL.createObjectURL`.
6. **Brand images** — multi-upload, responsive grid preview, all stored in Convex.
7. **Cal.com kickoff link** — they book a 45-minute kickoff call.

Cal.com webhook writes the booking into `projects.calKickoffBooking`. The portal switches to show kickoff details.

---

## Stage 8 — Kickoff call (45 min)

1. Deep dive on brand, target audience, services, content, photo assets, copy preferences, and competitive context.
2. Collect any remaining assets (PDFs, brochures, real photos, testimonials).
3. After the call: in `/admin/projects/{id}`, manually transition `AWAITING_ASSETS → IN_PROGRESS`.

---

## Stage 9 — Build the bespoke site

This stage moves to a new client repo and the terminal. The result is a fully
custom site that talks to the Hub through the contract in `ARCHITECTURE.md`
§ Hub ↔ Spoke.

There is no starter template. Each site is built from a fresh Next.js app, and
`../agency-playground/` is read as the **reference implementation** for the
Hub-facing plumbing only — the lead Function, the events client, and the
schema graph. Never its design.

### 9a. Pull what you need from admin

1. Open `/admin/projects/{id}`.
2. Copy the public `projects.projectId`.
3. Confirm `projectStatus = IN_REVIEW` (you'll need to manually transition this from `IN_PROGRESS` shortly so the hub accepts staging leads from the new Vercel URL — see Stage 11).
4. Read the expanded Build Details: headline, domain, color scheme (with hex values), inspiration links, brand images, and admin notes.
5. Read your own kickoff call notes.

### 9b. Issue the project's Hub credentials

Do this **before** writing any code, so the build has real values to wire in.
In `/admin` → Projects → expand the project → **API Credentials**, issue two:

| Credential | Prefix | Where it lives on the spoke |
|---|---|---|
| Secret (leads) | `sk_live_…` | Server-only env var. Never in a `NEXT_PUBLIC_*` var, never in client code. |
| Publishable (events) | `pk_live_…` | Sent from the browser in the `/api/v2/events` body. Public by design. |

The raw key is shown **once** — the Hub stores only its SHA-256. If you lose
it, revoke and issue a new one; that's a normal operation, not an incident.
Multiple active credentials per project are allowed, which is what makes
rotation zero-downtime: issue the new key, deploy the spoke, then revoke the
old one.

### 9c. Create the repo

```bash
gh repo create "CLIENT_SLUG-web" --private --clone
cd CLIENT_SLUG-web
bunx create-next-app@latest . --typescript --tailwind --app
mkdir -p public/images/CLIENT_SLUG
```

Then port the Hub-facing plumbing from `../agency-playground/` by hand — the
lead-submitting Route Handler or Server Action, the events beacon, and the
`LocalBusinessSchema` graph builder. Copying these deliberately rather than
inheriting them is the tradeoff the template retirement bought: no client repo
silently drifts when the Hub contract changes, because propagation is Stage 18's
explicit checklist instead of a merge that may or may not have run.

### 9d. Drop client assets

Save everything from the portal Build Details + the kickoff into `public/images/CLIENT_SLUG/`:

- `logo.svg` or `logo.webp`
- `hero/*` — hero/banner photos
- `gallery/*` — work samples, before/afters
- `team/*` — staff photos if a team page is in scope
- `og-default.jpg` — 1200×630 for social shares

### 9e. Configure `config/client.ts`

```ts
export const clientConfig = {
  businessName: "Apex Plumbing",
  domain: "apexplumbing.com",
  phone: "(337) 555-0199",
  email: "hello@apexplumbing.com",
  address: { street, city, state, zip, country: "US" },
  serviceArea: ["Lafayette", "Broussard", "Youngsville"],
  waas: {
    projectId: "<paste from admin>",
    allowedPaths: ["/", "/contact"], // expand after the build picks routes
    googlePlaceId: "ChIJ...",         // or undefined if no Google reviews
  },
  seo: {
    titleTemplate: "%s | Apex Plumbing",
    description: "Licensed Lafayette plumbing service. 24/7 emergency response.",
  },
  theme: {
    themeColor: "#0a2540", // brand-aligned viewport color
  },
  socials: {
    facebook: "https://facebook.com/apexplumbing",
    instagram: "https://instagram.com/apexplumbing",
    linkedin: undefined,
  },
};
```

### 9f. Set up `.env.local`

```bash
NEXT_PUBLIC_WAAS_API_URL=https://your-hub.convex.site
NEXT_PUBLIC_WAAS_PUBLISHABLE_KEY=pk_live_...   # events; safe in the bundle
WAAS_LEAD_SECRET=sk_live_...                   # leads; server-only, NEVER NEXT_PUBLIC_
GOOGLE_PLACES_API_KEY=AIza...                  # only if Google Place ID is set
```

The `NEXT_PUBLIC_` prefix is the whole security boundary here. A `sk_live_` key
in a `NEXT_PUBLIC_` var ships to every visitor's browser and hands out the
ability to write leads into this project. Leads must be posted from a Server
Action or Route Handler that reads `WAAS_LEAD_SECRET` server-side.

Mirror all of these into Vercel → Project Settings → Environment Variables at
9i, and mark `WAAS_LEAD_SECRET` as a non-preview-exposed secret.

### 9g. Run the bespoke build prompt

1. Open `ONBOARDING.md` § 4 in the new client repo.
2. Replace every bracketed placeholder with this client's data (admin Build Details + kickoff notes).
3. Paste the filled-in prompt into Claude Code inside the new client repo.
4. Claude builds from scratch:
   - Picks routes appropriate for the vertical (using § 5 patterns as starting points).
   - Creates `components/site/*` from scratch (Header, Footer, custom Hero, service components, ContactForm with required spam fields).
   - Builds the design system in `app/globals.css` + Tailwind utilities; adds `next/font/google` imports to `app/layout.tsx` for typography.
   - Updates `clientConfig.waas.allowedPaths` to match every route it built.
   - Fills in `ONBOARDING.md` § Per-Client Maintenance Notes at the bottom.
5. **Plan 1–2 iteration passes.** The first output will not be client-ready. Review critically. Push back on generic sections. Be specific in feedback ("rework the hero, gradient feels off-brand"; "services grid is too SaaS-y for plumbing").

### 9h. Validate locally

```bash
bun run dev    # walk through every page in the browser
bun run build
```

Explicitly check:

- Mobile and desktop layout in a real browser.
- Contact form submission (will try to POST to the hub — see 9i about Origin).
- A `POST /api/v2/events` fires in the network tab on each route change, and a
  `tel:` / `mailto:` / directions tap fires a `click` event.
- `LocalBusinessSchema` JSON-LD renders correctly (View Source).
- `grep -r "sk_live_" .next/ public/` returns nothing.

### 9i. Push and deploy

```bash
git add .
git commit -m "Initial bespoke build: Apex Plumbing"
git push -u origin main
```

In Vercel:

1. Import the new repo from GitHub.
2. Add env vars (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_WAAS_API_URL`
   - `NEXT_PUBLIC_WAAS_PUBLISHABLE_KEY`
   - `WAAS_LEAD_SECRET` (secret; server-only)
   - `GOOGLE_PLACES_API_KEY` (if Google reviews are enabled)
3. Deploy. Note the Vercel preview URL (e.g., `apex-plumbing-web.vercel.app`).

---

## Stage 10 — Wire staging URL into admin

Back in `agency-site`:

1. Open `/admin/projects/{id}`. Expand the project.
2. Set `projects.deployment.stagingUrl` to the **bare host** —
   `apex-plumbing-web.vercel.app`, not `https://apex-plumbing-web.vercel.app`.
   The Hub builds `https://<host>` itself, so a stored scheme makes every
   analytics event `403`. Same rule for `liveUrl` at Stage 13.
3. Optionally set `projects.deployment.vercelProjectId` for internal tracking.
4. The hub's Origin check now accepts browser events from this URL. Leads are
   unaffected — they authenticate with the secret bearer, not with Origin.
5. If you haven't already, transition `projectStatus → IN_REVIEW`.

---

## Stage 11 — End-to-end smoke test

From the staging Vercel URL:

1. Submit the contact form → check `/admin/projects/{id}` → Leads view. The lead must appear in `client_leads`, and the secret credential's `lastUsedAt` must update.
2. Visit several routes → check the portal **Site activity** panel. Page views must appear in `client_analytics`.
3. Tap a `tel:` link (and `mailto:` / directions if the build has them) → the matching click counter must increment.
4. If anything fails, the two surfaces fail differently and are diagnosed differently:

| Symptom | Check |
|---|---|
| Leads missing | Server-only `WAAS_LEAD_SECRET` reaching the Function, secret credential `lastUsedAt`, `[hub.lead.v2]` logs, admin **Untriaged / Fan-out paused** |
| Events missing / `403` | Origin allowlist stored as a bare host, publishable credential `lastUsedAt`, `[hub.events.v2]` logs |

A stale Origin allowlist is still the single most common cause on the events
side — compare the admin value against the actual `Origin` header in the
browser network tab.

---

## Stage 12 — Review call (30 min)

1. Cal.com 30-minute review (booking link is in the portal at IN_REVIEW stage).
2. Walk through the staging site with the client live.
3. Collect edits inline.
4. Edits captured either as `edit_requests` you log in admin, or the client submits via the portal's edit form.

---

## Stage 13 — Edit cycles (typically 1–3 rounds)

For each edit:

1. Open the client repo.
2. Read the Per-Client Maintenance Notes section of `ONBOARDING.md` first — that's the briefing.
3. Use Claude (or hand-edit) to apply the change.
4. Commit + push → Vercel auto-deploys to staging.
5. In `/admin/edit-requests`, update status: `open → in_progress → resolved`.
6. Reply to the client via portal or email when done.

Edit requests support attachments (up to 5 images per request) stored in Convex `_storage`. The portal renders thumbnails lazily when a request is expanded.

---

## Stage 14 — Domain go-live

1. Domain ownership:
   - **Client owns it:** get DNS access OR have them point nameservers.
   - **You're buying it:** register through Vercel or a registrar.
2. In Vercel: Project Settings → Domains → add the custom domain.
3. DNS configuration:
   - **Option A — Vercel-managed:** update nameservers at registrar to Vercel's. Vercel handles everything (apex, www, SSL).
   - **Option B — external DNS:** add `A @ → 76.76.21.21` and `CNAME www → cname.vercel-dns.com`.
4. Wait for DNS propagation (15 min – 24 hours). Check `dnschecker.org`.
5. Vercel auto-provisions an SSL certificate via Let's Encrypt.

---

## Stage 15 — Promote to LIVE

1. `/admin/projects/{id}` → Deployment section.
2. Set `projects.deployment.liveUrl = https://apexplumbing.com`.
3. Manually transition `projectStatus = IN_REVIEW → LIVE`.
4. The hub now accepts leads/analytics from the production domain (Origin check passes).
5. From the production URL: submit a test lead → confirm it lands in admin. Visit a few routes → confirm analytics records.
6. Send launch email to client. Include:
   - Their portal login link.
   - Where leads show up.
   - Where analytics show up.
   - How to request edits.

---

## Stage 16 — Ongoing client portal experience (LIVE state)

The client logs into `/portal/{projectId}` and sees a status-driven dashboard:

- **Live site URL** + screenshot.
- **Analytics summary** — page views and top pages, from `client_analytics`.
- **Recent leads** — most recent `client_leads` for this project.
- **Edit request form** — unlimited submissions with title, details, priority (low/normal/high), and image attachments (up to 5 per request, PNG/JPEG/WebP/SVG, max 10MB each).
- **Edit request history** — status tracking (open / in_progress / waiting_on_client / resolved / closed).
- **Kickoff and review call summaries** — meeting URL, date, time, notes.

---

## Stage 17 — Billing operations (automatic)

- Stripe charges monthly on schedule.
- Webhook syncs to `stripe_subscription_cache` on every state change.
- **Dunning:**
  - Day 0 fail → notify client.
  - Day 3 → second retry attempt + email.
  - Day 7 → portal features restricted at read-time based on `stripe_subscription_cache.status`. No `projectStatus` mutation; restriction is purely read-side.
- 12-month minimum enforced via operational policy + the clickwrap agreement. Client cannot self-cancel — routes to support, where you apply the early termination policy.

---

## Stage 18 — Propagating Hub contract changes over the client's lifetime

There is no upstream remote and no merge. Client repos share no git history, so
a Hub-side plumbing change (new event type, changed auth, a `LocalBusinessSchema`
fix) reaches each site only because someone applies it there.

That is the cost of retiring the template, and it is paid deliberately: a merge
that silently conflicted or was never run produced a spoke that *looked*
migrated and wasn't. An explicit per-repo checklist fails loudly instead.

**The order is fixed. Playground first, always.**

1. Ship the Hub change with both paths live — the old contract must keep
   working while spokes are mid-migration.
2. Apply it in `../agency-playground/` and smoke-test there. Playground is the
   first site to run every new Hub contract in production, so its job is to
   find the defect before a paying client does.
3. Apply to each live client repo under `../clients/`, one at a time, smoke
   testing each before moving on:

```bash
cd ../clients/apex-plumbing-web
# hand-apply the change
bun run build
git commit -am "Hub contract: <change>"
git push origin main   # Vercel auto-deploys
```

4. Only after every spoke passes may the Hub retire the old path. Retiring it
   early is what breaks a live client form.

Track the rollout in a table in the Hub-side plan doc, with a row per spoke and
an explicit live-verified checkmark — not "deployed." Stage 2 and Stage 3 both
used this shape (`UPGRADE_PLAN.md` § Stage 3); reuse it.

| Site | Repo | State |
|---|---|---|
| Agency Playground | `../agency-playground/` | |
| All About Towing | `../clients/all-about-towing-web/` | |
| TB Tree | `../clients/tb-tree/` | |
| Chelsea Social Co. | `../clients/chelsea-social/` | |

---

## The failure modes worth memorizing

The Hub's v2 surfaces fail differently:

- `/api/v2/leads` is called by the spoke's server-side function with a secret
  bearer. A missing or stale secret returns `401`; an inactive project or stale
  project configuration is rejected before the lead is stored.
- `/api/v2/events` is called by the browser with a publishable key and validates
  the browser `Origin` against `projects.deployment.liveUrl` and
  `projects.deployment.stagingUrl`. A stale admin URL returns `403`; a missing
  publishable key means the spoke should send no event at all.

The v1 lead and analytics aliases are retired. Do not add them as fallbacks.

Common triggers:

- Client switched from staging to production but `liveUrl` in admin was never updated.
- DNS cut over to `www.` but admin has the bare domain (or vice versa).
- Client added a new alias domain that isn't registered in admin.
- A staging environment was rebuilt at a new preview URL.

For event failures, fix the Origin allowlist in admin before assuming the browser
code is broken. For lead failures, verify the spoke's server-only secret and the
Hub credential's `lastUsedAt` before changing Origin settings.

---

## Funnel summary

```
prospects (Stage 0–1)
  → projects @ AWAITING_AGREEMENT (Stage 3)
    → AWAITING_PAYMENT (Stage 4)
      → AWAITING_ASSETS (Stage 6, webhook activates subscription)
        → IN_PROGRESS (Stage 8, after kickoff call)
          → IN_REVIEW (Stage 10, staging URL wired)
            → LIVE (Stage 15, domain live)
              → (LIVE forever; edits via portal, billing automatic)
```

Each transition is logged to `activity_log` for analytics and audit.
