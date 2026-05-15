# Current State — Acadiana Web Design (2026-05-14)

**Purpose:** Single context doc to hand to any agent / advisor. Consolidates the business model, current traction, what's built, and the active marketing strategy. Source docs: `non-tech-docs.md` (business overview), `newMarketing.md` (current 90-day marketing plan), `marketing.md` (outbound pipeline system docs), `marketingHelp.md` (cold-call cheat sheet, kept as reference), `.cursor/rules/context/agency.md` (technical blueprint), `wilderGroup.md` (in-progress prospect strategy).

---

## TL;DR (read this first)

- **Business:** Veteran-owned Website-as-a-Service for local trades / service businesses in Acadiana, Louisiana.
- **Offer:** $0 down, $199/mo, 12-month minimum, everything included (custom 7-page site, hosting, domain, SSL, unlimited edits, support, analytics, client portal).
- **Traction today:** **3 free clients (family / friends). 0 paying clients.** Two of those serve as the public testimonials we lean on (All About Towing, TB Tree Service).
- **Built:** A real product (Next.js + Convex), client portal, admin panel, Stripe billing wired up, end-to-end onboarding flow, automated outbound pipeline that scrapes leads → AI-scores them → generates tokenized audit report pages → sends personalized outreach emails.
- **Bottleneck:** Not top-of-funnel. It's the human conversion step. A month of paralysis on cold-dialing is the evidence. The 90-day plan routes around this.
- **Active plan (90 days):** Tier 1 = referrals + in-person drop-ins + local partnerships. Tier 2 (after day 30) = Google Search Ads + retargeting + direct mail + programmatic local SEO. Cold calls demoted to follow-up tool for warm leads only.
- **CAC budget:** $200–$400 per closed client (Year-1 LTV ≈ $2,388).

---

## 1. Business Model

### What we sell

A fully managed website experience for local service businesses — sold as a monthly subscription, not a project.

| Item | Included |
|---|---|
| Custom 7-page site (Home, About, Services, Gallery, Reviews, Contact, FAQ) | Yes |
| Hosting, SSL, custom domain | Yes |
| Unlimited edits + same-day support | Yes |
| Google Reviews widget | Yes |
| Contact form + lead delivery to inbox | Yes |
| Monthly analytics summary | Yes |
| Client portal (edit requests, analytics, leads) | Yes |
| 95+ PageSpeed score | Yes |
| Live in 72 hours from kickoff | Yes |

### Pricing

- **$0 down, $199/month, 12-month minimum.**
- After 12 months: month-to-month, cancel anytime.
- One plan. No tiers, no upsells, no surprise invoices.
- Year-1 LTV: ~$2,388.
- Healthy CAC budget: **$200–$400** per closed client.

### Who we serve

Local, owner-operator, service-based businesses with strong reviews but a weak / missing / outdated website. Geo: Acadiana parishes first (Lafayette, St. Martin, Vermilion, Acadia, Iberia, St. Landry), expand outward.

**Target industries (highest fit):** plumbers, landscapers, roofers, tree services, towing, HVAC, electricians, painters, pressure washers, pest control, cleaning, fencing, general contractors.

**Profile of a "yes":** good Google reviews, owner-operator, time-poor, hands-on, has no site / a slow builder site (Wix/Squarespace/GoDaddy) / a dated DIY site, doesn't want to manage web stuff.

**Profile of a "no" (don't waste effort):** already with an agency, mature professional site, broadly bad reviews, hostile to inbound.

### Differentiators

1. $0 upfront (vs. $3K–$5K traditional agency)
2. Live in 72 hours (vs. 4–8 weeks)
3. Unlimited edits included (vs. $75–$150/hr)
4. 95+ PageSpeed (vs. typical 60–80 builder sites)
5. Veteran-owned, local, one person fully accountable
6. Service relationship, not a one-shot project

---

## 2. Current Traction (Honest)

- **3 active clients, all free, all family / personal-connection. 0 paying clients to date.**
- Two are usable as public proof:
  - **All About Towing** — Alexandria, LA (testimonial: "phone started ringing more within the first week")
  - **TB Tree Service** — Central LA (testimonial: "$199/mo, I don't have to think about it")
- **The Wilder Group** (real estate brokerage, Alexandria LA) is the most active in-progress prospect — strategy doc in `wilderGroup.md`. IDX Broker integration plan is mapped out.
- **No closed cold-started client yet.** This is the single most important fact when deciding what to do next. Until that flips, every strategy is theoretical.

---

## 3. What's Built

### Product / app

Full-stack Next.js 15 + Convex application:

- **Marketing site** with inbound onboarding flow.
- **Client portal** — status-driven UI (AWAITING_AGREEMENT → AWAITING_PAYMENT → AWAITING_ASSETS → IN_PROGRESS → IN_REVIEW → LIVE), build details form with brand asset uploads, edit request system with attachments, live analytics view, recent leads view.
- **Admin panel** at `/admin` — prospects, projects, scheduled calls, edit requests, marketing pipeline.
- **Agreement flow** — clickwrap (versioned + hashed terms), captured user agent and timestamp.
- **Stripe** — checkout sessions, customer mapping, subscription state cached locally, webhook handles `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, `payment_intent.*`.
- **Auth** — Better Auth magic links (no password), 24-hour token, 1-year session, mobile cross-tab bug already fixed.
- **Hub ↔ Spoke architecture** — client template sites POST leads and pageview events to this Convex backend; rate-limited, Origin-checked.

### Outbound marketing pipeline (`/admin/marketing`)

A working automated lead-gen system. Steps:

1. Admin enters city + industry.
2. Google Places API returns up to 60 businesses.
3. Firecrawl scrapes each website (markdown, screenshot, primary color, tech detection, contact email).
4. PageSpeed Insights API runs a mobile performance score.
5. Groq AI scores each lead 1–10 for fit, generates pain points / selling points / outreach angle.
6. Qualified leads (fitScore ≥ 6) get a UUID `demoToken`.
7. `/audit/{token}` renders a public tokenized audit report (performance gauge, issues, portfolio examples, Cal.com CTA).
8. Firecrawl screenshots the audit page for email embedding.
9. Personalized outreach email sent via Resend.
10. First visit to audit page sets `demoViewedAt` — used for follow-up prioritization.
11. One-click "Convert to Prospect" moves qualified leads into the sales workflow.

**Orchestration:** `@convex-dev/workflow` with bounded parallelism (`maxParallelism: 2`) to respect API quotas. Per-step retries, per-lead error isolation.

**Three-stage funnel in the DB:**
```
scraped_leads (hundreds / thousands, top of funnel)
   → prospects (tens, human-vetted)
      → projects (single digits, paying clients)
```

### What this means for marketing strategy

The pipeline already does what most outsourced "AI marketing agent" services do. We do **not** need to buy one. The choke point is not top-of-funnel — it's the human conversion step after first contact.

---

## 4. Active Marketing Plan (from `newMarketing.md`)

### Channel framework

**Tier 1 — run weekly, every week.** Match the founder's actual advantages (local, veteran, face-to-face, accountable).

| Channel | Notes | Cost |
|---|---|---|
| **Client referrals** | All About Towing + TB Tree Service. $50 Visa gift card per referral that closes (mailed after 2nd monthly payment to avoid gaming) | ~$50/closed referral |
| **In-person drop-ins** | Print the audit report, staple business card + handwritten note, drop it off at the shop. Don't pitch — leave. Follow up by phone 3–5 days later (now a warm call) | Printing + gas |
| **Local partnerships** | Chamber of Commerce, accountants, sign shops, insurance agents, print shops. Offer 10% of Year-1 MRR (~$240/client) or flat $200 per close | ~$200–$400/yr Chamber dues |

**Tier 2 — add after day 30, once Tier 1 is running.**

| Channel | Use | Starter budget |
|---|---|---|
| **Google Search Ads** | Tight high-intent local terms only: `web designer lafayette`, `website for plumber louisiana`, `fix slow website`, etc. Drive to dedicated landing page, email-gate a free audit | $300–500/mo test |
| **Facebook/IG retargeting** | Audience: visited an `/audit/{token}` page but didn't book. 3 creatives rotating. Not cold | $3–5/day |
| **Direct mail** | Same qualified-lead list, but for prospects too far to drive to. Print audit, cover letter, business card, padded envelope | ~$3/piece |
| **Programmatic local SEO** | `/guides/best-plumbers-lafayette-la` style roundup pages. Rank on Google + warm-intro emails to featured businesses ("you're in my roundup, no catch"). Scraper already has the data | Time only |

**Tier 3 — explicitly defer or skip.**

- Cold dialing at scale (it caused the paralysis — keep as a follow-up tool for warm leads only)
- LinkedIn ads/content (trades owners aren't there)
- Broad SEO for "web design" (national competition, wrong game for a local 1-person shop)
- TikTok/Instagram organic (no posting habit, content treadmill)
- AI marketing agent services like enrichlabs (the pipeline already does this; outsourcing the one moat — local + physical + veteran — kills the moat)
- Podcast ads (wrong audience, wrong scale)

### 90-day execution arc

**Days 1–30 — prove human conversion works.**
- 2 referral calls to existing clients (Week 1)
- 20 in-person drop-ins with printed audits
- 5 partnership conversations
- **Target:** 2–3 signed clients, 3–5 warm follow-ups
- No paid ads. No new tools. No new channels.

**Days 31–60 — add one paid channel, measure CAC.**
- Continue Tier 1 cadence
- Launch Google Search Ads (~$300 budget, 10 tight keywords)
- Publish one programmatic SEO roundup page
- **Target:** 3–5 more clients closed, first signal on paid CAC

**Days 61–90 — compound winners, cut losers.**
- Double down on highest-ROI channel
- Add Facebook retargeting on audit-page traffic
- Build 2nd / 3rd programmatic SEO page
- **Target:** 8–12 total clients closed, repeatable pipeline from ≥2 channels

### Decision rules

- **Kill a channel** if 60 days of effort produce zero closes, OR CAC > $400 after sufficient data.
- **Scale a channel** if CAC < $200.
- **Add a new channel** only when existing ones hit targets 3+ weeks in a row.
- **Revisit cold dialing** only after 5+ clients close via other channels, and only on warm leads.
- **Revisit outsourced marketing services** only after 10+ closed clients and a clear top-of-funnel bottleneck.

### Metrics to track (keep small)

| Metric | Month 1 target | Month 3 target |
|---|---|---|
| Qualified leads generated / week | 20 | 40 |
| Contacts made / week (drop-ins + asks + partnerships) | 10 | 20 |
| Conversations had / week (real decision-maker) | 3 | 8 |
| Signed clients / month | 2–3 | 4–6 |
| Cost per closed client (by channel) | N/A | < $400 |

---

## 5. Mindset Anchors (worth keeping front and center for any advisor)

- **Not selling, filtering.** The target self-identifies by having the problem. Don't push it on people who don't.
- **Local + veteran + face-to-face is the moat.** Every national competitor loses this game. Don't outsource it.
- **First 3–5 cold-started closes change everything psychologically.** Until then, every strategy is theoretical.
- **Activity beats perfection.** A mediocre drop-in that actually happens beats a perfect call script that never does.
- **One closed client pays for months of experimenting.** $199/mo × 4 = ~$800. Math is on the founder's side.

---

## 6. Assets That Exist (Things Agents Can Reference / Build On)

- Two real testimonials (All About Towing, TB Tree Service).
- A working `/audit/{token}` page that scores any prospect's site and shows fixes.
- Automated audit + outreach email pipeline.
- Brand identity: blue-dominant (`hsl(215, 85%, 55%)`) + gold accent (`hsl(43, 74%, 52%)`). Logo SVG is in `non-tech-docs.md`.
- Cold-call cheat sheet (`marketingHelp.md`) — kept as a reference for warm-lead follow-ups.
- An in-progress real estate prospect (The Wilder Group) with a full strategy doc — useful if any agent is asked about real estate / IDX edge cases.

---

## 7. What Specifically To Help With Next

When handing this doc to another agent, the question almost always reduces to one of:

1. **Conversion / sales help** — how to actually close the first cold-started client. Drop-in scripts, follow-up cadence, objection handling, partnership pitches.
2. **Paid channel setup** (Day 30+) — Google Ads keyword list, landing-page copy, retargeting creative.
3. **Programmatic SEO pages** — content layout, on-page structure, link strategy for the roundup pages.
4. **Outreach copy refinement** — sharpening audit email subject lines, follow-up sequences, partnership cold emails.
5. **Specific prospect strategy** — like the Wilder Group plan.

If an agent is asked something outside those five, route back through the channel framework above before pursuing it. Anything that adds tooling complexity, broad-funnel SEO, content-treadmill social, or outsourced marketing services is almost certainly a distraction at this stage.
