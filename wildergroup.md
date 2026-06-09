# The Wilder Group — Custom Project Plan

Status: pre-pitch, decision-stage
Last updated: 2026-05-23

---

## TL;DR

The Wilder Group is a 16-agent real estate brokerage in Alexandria, LA currently on RealGeeks (~$850/mo). Standard Acadiana Web Design WaaS ($199/mo) is the wrong shape — would stack on top of RealGeeks rather than replace it.

**Decision: pitch this as a custom one-off build, run completely outside the AWD admin portal, billed through the AWD LLC. Fresh Next.js project, no template inheritance, IDX Broker for MLS, her own CRM (Wise Agent default / Follow Up Boss premium upgrade).**

Target deal: **~$8,500 upfront + $499/mo recurring** with a 2 hr/month edit cap ($125/hr beyond). Year 1 net to us: ~$13,900. Recurring margin: ~$5,400/yr after stack costs.

Do not productize a "real estate tier" until at least two brokerages have signed.

---

## The Client

| | |
|---|---|
| Brokerage | The Wilder Group |
| Domain | thewildergroup.net |
| Owner | Jennifer Wilder |
| Broker of record | Rusty Wilder |
| Team size | 16 agents |
| HQ | 3516 Parliament Dr, Alexandria, LA 71303 |
| Service area | Central Louisiana — Rapides Parish + 21 surrounding towns (Alexandria, Pineville, Natchitoches, Deville, Boyce, Ball, etc.) |
| Phone | (318) 625-7475 |
| Email | thewildergroup@att.net |
| Distance from Youngsville | ~2.5 hrs (still in-state, drivable for in-person meetings) |
| Social | Facebook only (numeric-ID URL — never claimed vanity URL, indicates low brand maturity) |
| Likely MLS | GSREIN (Gulf South) and/or GCLRA (Greater Central Louisiana REALTORS) — confirm during discovery; central LA brokers typically use GCLRA |

### Team (per about page)

Jennifer Wilder (Owner), Rusty Wilder (Broker), Dickie Johnson, Tom Bouchie, Candace King, Julie Thompson, Savanna Setliff, Jarryd Raynes, Brandon Melder, Charlie Beauford, Kimberly Dryden, Dana Malcolm, Chanel Bolton, Brett Bolton, April Spicer, Jessica Gallent.

### Current site weaknesses (visible on RealGeeks template)

- Generic RealGeeks visual template — looks like every other RealGeeks site
- "Your Friends in Real Estate" — soft positioning, no real differentiator
- No blog / SEO content
- No neighborhood / community pages (huge missed SEO — Alexandria, Pineville, Natchitoches, Deville all have search volume)
- Thin team bios
- No testimonials
- Weak brand identity

---

## Their Current Stack (RealGeeks)

RealGeeks is a hosted all-in-one real estate platform. It bundles:

- IDX/MLS search (updated every 15 min)
- Home valuation tool ("Property Valuation Tool")
- CRM with lead routing
- Email drip ("Nurture and Convert Your Database")
- SMS autoresponders
- Geek AI (auto-engagement assistant) — $200/mo add-on
- Built-in dialer
- Marketing Studio (design/ads/promotion)
- Hosted website with their templates

### Estimated monthly cost for 16-agent team

| Line item | Cost |
|---|---|
| Base platform (2 users) | $249/mo |
| 14 additional users @ ~$25 | ~$350/mo |
| Geek AI add-on | ~$200/mo |
| MLS feed + misc add-ons | $50–100/mo |
| **Realistic total** | **~$850–$1,000/mo** |
| Initial onboarding (sunk cost) | $250 |

Assume **$850/mo** as the pitch baseline. Confirm during discovery.

### Lock-in / cancellation terms

- Initial 6 or 12 month term
- Early cancellation = buyout of 2 monthly payments OR remaining contract fees, whichever is greater
- **"You lose access to the website and all content hosted on it upon cancellation"** — IDX content, leads, valuation requests, market reports all live on RealGeeks
- Domain transfer fee: $50 (if RealGeeks purchased her domain)
- Site assets do NOT automatically transfer

**Implication for us:** plan to keep RealGeeks running until our new site is live. No gap in lead capture. Migrate CRM data before cancellation.

---

## Why Standard AWD WaaS Doesn't Fit

1. **$199/mo doesn't replace RealGeeks — it adds to it.** She'd be paying both.
2. **IDX is non-negotiable for a brokerage.** Buyers expect MLS search on the brokerage site. RealGeeks owns that experience; AWD template doesn't ship it.
3. **Our hub's lead-intake value is duplicative.** Real estate uses agent-routing CRMs (Follow Up Boss, Lofty, Sierra Interactive). Funneling leads into AWD's `client_leads` table would be a downgrade for her — no agent territory routing, no MLS-aware drip, no shared inbox.
4. **AWD template assumes one contact form → one Convex table.** Brokerages have 5+ lead sources (IDX saved searches, valuation requests, contact, listing inquiries, agent-direct forms) routing to 16 different agents.
5. **Visual maintenance load is higher.** 16 agents = realistic 2–3/year turnover, profile updates, headshots, new community pages. Doesn't fit "$199/mo unlimited edits" math.
6. **Solo founder bandwidth.** Real estate weekends are high-stakes. A broken form during an open house Saturday is a 4-alarm fire. Doesn't fit the WaaS scale model.

### Iframing RealGeeks is a trap

- RealGeeks is hosted, not embeddable — no portable widget
- IDX content lives on `realgeeks.com` subdomains → SEO juice goes to them, not her
- If she cancels RealGeeks, the iframes break
- We'd be skinning a pig — beautiful homepage that links into a generic RealGeeks search

---

## The Decision: Custom One-Off Build, Outside the Portal

**Pitch:** swap her ~$850/mo + zero ownership for ~$499/mo to me + ~$369/mo to a CRM she owns (or ~$745/mo for premium CRM) + $80/mo IDX Broker direct. Custom-designed marketing site. MLS search lives on her domain. She owns her data.

### Why "outside the portal" and not a new tier

Adding a "Custom" tier to the admin portal would require:

- `projectType: "STANDARD" | "CUSTOM"` flag on `projects`
- Conditional rendering in 8+ admin views
- Stripe custom-price logic
- Agreement template branching
- `client_leads` / `client_analytics` tables handling nulls
- Edit-request category branching
- Status workflow branching (custom builds have different phases)

That's 1–2 weeks of engineering for ONE client. Wrong investment.

**Run her completely outside the portal:**
- She is NOT in the `projects` table
- No magic-link portal login
- No agreement clickwrap — standard contract in Google Docs / DocuSign
- Stripe payment link or manual invoicing
- Project tracked in Linear / Notion, not admin app

If a second brokerage signs within 6 months, reevaluate productization. **Two data points beats premature abstraction.**

### Why same LLC (AWD), not separate entity

- Same EIN, same Stripe account, same bank account, same tax filing
- This is a product line under AWD, not a new business
- Footer attribution stays "Built by Acadiana Web Design"
- Avoids double overhead for a solo founder

---

## Feature Gap: What She Loses Moving Off RealGeeks

RealGeeks bundles features the IDX Broker + CRM split doesn't natively cover. Four matter:

| Gap | What RealGeeks does | Replacement | Default approach |
|---|---|---|---|
| **Property valuation tool** | "What's your home worth" → auto-estimate → seller lead | Custom seller form on `/selling` page → manual agent follow-up | Skip the auto-estimate widget. Build a clean lead-capture form. Most teams get more usable leads from real human follow-up than from auto-estimates. |
| **Automated market reports** | Monthly email to leads with home value + neighborhood comps | **Homebot** ($60/mo) — arguably better than RealGeeks' version | **Pitch as optional add-on, not default.** Don't bundle. |
| **Geek AI auto-texting** | Auto-texts new leads within ~60 seconds | FUB has Smart Lists / auto-text Action Plans; Wise Agent has SMS drip | Skip the AI bot. Most brokerages don't get good results from Geek AI anyway (false starts, awkward replies). |
| **Live chat on site** | Chat widget on homepage | **Crisp** (free tier) or **Tawk.to** (free) | Optional add ($0). Honestly most brokerage chat widgets get ignored. |

### Pitch language for the gap

> "You'll lose four things by leaving RealGeeks: the valuation widget, Geek AI texting, on-site chat, and automated market reports. We replace the valuation widget with a clean seller form — usually more usable leads, fewer false positives. Live chat is free to add if you want it. Geek AI most brokerages don't get good results from, so we'd skip it. Automated market reports come back via Homebot if you want them — $60/mo, totally optional, and frankly a better tool than what RealGeeks ships."

### Optional add-on: Homebot

- $60/mo for team plan
- Sends monthly home-value updates to her CRM contacts (re-engagement gold)
- Existing leads see their home value going up → call her to list
- **Default: don't bundle.** Mention as optional. If she asks for "the market reports back," offer it.

---

## Pricing & Margins

### Our pricing

| Component | Amount |
|---|---|
| One-time custom build (design, dev, IDX setup, CRM integration, RealGeeks migration, training) | **$8,500** |
| Monthly recurring (hosting, IDX feed config, lead routing, support, analytics, 2 hrs/month of edits) | **$499/mo** |
| Edits beyond 2 hrs/month | $125/hr, quoted upfront for larger work |
| Minimum term | 12 months, auto-renewing |

The 2 hr/month edit cap protects margin against a 16-agent brokerage with realistic turnover and content needs. Most months will come in under the cap and she won't notice; big projects (new community-page series, full agent rebrand) get scoped separately.

### What she pays — two paths to offer

**Lead with Path A. Offer Path B only if she pushes for premium CRM features.**

#### Path A — Value (matches her current cost)

| Line | Recipient | Monthly |
|---|---|---|
| Custom site + IDX layer + support | AWD (us) | $499 |
| IDX Broker Platinum | IDX Broker directly | ~$80 |
| Wise Agent CRM (16 individual logins) | Wise Agent directly | ~$369 |
| MLS dues | GSREIN/GCLRA directly | unchanged |
| **Total recurring** | | **~$948/mo** |
| **One-time** | | $8,500 + ~$300 IDX setup |
| **Year 1 total to her** | | ~$20,200 |

#### Path B — Premium (better CRM)

| Line | Recipient | Monthly |
|---|---|---|
| Custom site + IDX layer + support | AWD (us) | $499 |
| IDX Broker Platinum | IDX Broker directly | ~$80 |
| Follow Up Boss Pro (16 agents) | Follow Up Boss directly | ~$745 |
| MLS dues | GSREIN/GCLRA directly | unchanged |
| **Total recurring** | | **~$1,324/mo** |
| **One-time** | | $8,500 + ~$300 IDX setup |
| **Year 1 total to her** | | ~$24,700 |

#### Optional add-ons (offer if asked, don't bundle by default)

- **Homebot** ($60/mo) — automated monthly home-value reports to her CRM contacts. Replaces RealGeeks' valuation tool + market reports. Single best ROI add-on if she wants those features back.
- **Live chat** ($0 with Crisp / Tawk.to free tier) — most brokerage chat widgets get ignored, but free to add.

### Comparison vs. RealGeeks

| | RealGeeks (current) | Path A (value) | Path B (premium) |
|---|---|---|---|
| Total monthly to her | ~$850 | ~$948 | ~$1,324 |
| Delta from current | — | +$98/mo | +$474/mo |
| Custom-designed site | ❌ | ✅ | ✅ |
| Data ownership (CRM, leads, content) | ❌ | ✅ | ✅ |
| MLS search on her domain (SEO) | ❌ subdomain | ✅ | ✅ |
| Community / neighborhood pages (SEO) | ❌ | ✅ | ✅ |
| Industry-best CRM | ⚠️ RealGeeks CRM is OK | ⚠️ Wise Agent is mid-tier | ✅ FUB is best in class |

**Path A is a $98/mo upgrade** for a custom site and data ownership. Easy sell.
**Path B is a $474/mo upgrade** for the above + the best CRM. Harder sell unless she's already frustrated with RealGeeks CRM.

### What it costs us to run

She signs up directly for IDX Broker and her CRM. Our stack cost is just the hosting/infra layer:

| Line item | Cost |
|---|---|
| Vercel hosting | ~$20/mo |
| Resend (transactional emails / contact form delivery) | ~$20/mo |
| Misc tooling (monitoring, error tracking) | ~$10/mo |
| Domain (client-owned) | $0 |
| **Total stack cost** | **~$50/mo** |

### Our margin

- **Monthly margin:** $499 − $50 = **$449/mo = ~$5,400/yr**
- **Year 1 net:** $8,500 (upfront) + $5,988 (12 × $499) − $600 (12 × $50 stack) = **~$13,888 net**
- **Year 2+ net recurring:** ~$5,400/yr

Becomes meaningful if we land 3–5 brokerages over 18 months (~$50k+ upfront + ~$25k/yr recurring on top of existing AWD book).

### Negotiation floor

If she pushes back on price:

- **Drop monthly to $449** (margin still ~$399/mo). Total becomes ~$898/mo Path A — within ~$50 of her current spend.
- **Do not drop setup below $7,500.** Setup is the actual work; cutting it eats real hours.
- **Do not eliminate the edit cap.** Open-ended "unlimited edits" with a 16-agent brokerage is a margin trap.

---

## CRM Decision: She Owns It — Two Paths to Offer

**Do not build a CRM. Do not resell a CRM.**

Real estate CRMs need: agent round-robin routing, territory rules, MLS-aware drip (price drops, listing matches), shared inbox, dialer integration, SMS, activity log, pipeline stages. Building this is a 6-month project. Reselling means we manage seats, billing, support tickets, churn.

She signs up directly. We configure the webhook integration once. She owns her account, her data, her agent seats. If she leaves us, her CRM keeps working.

### Path A — Wise Agent (default pitch, matches her current cost)

- **~$369/mo** for 16 individual logins ($49 base + 16 × $20)
- +$20/mo if she wants SMS drip / texting
- Real estate-focused CRM, flat pricing, no surprise upgrades
- Has REST API + native IDX Broker integration
- 70+ direct integrations
- **Limitations:** weaker mobile app than FUB, no built-in dialer (agents use their phones), less sophisticated automation builder

**Good enough for most small-market brokerages, especially ones not running aggressive lead-conversion playbooks.**

### Path B — Follow Up Boss Pro (premium upgrade, +$376/mo over Path A)

- **~$745/mo** for 16 agents ($499 base for 10 + 6 × $41 annual billing)
- Industry standard — when she asks her broker friends, they'll know FUB
- Best mobile app in the category (agents use it from the car)
- Built-in dialer for power-calling leads
- Best webhook API + REST docs — slightly easier integration for us
- Sophisticated "Action Plans" with branching automation
- Native IDX Broker integration

### When to upsell Path B

Lead with Path A by default. Upsell to Path B only if during discovery she mentions:

- "Our agents miss leads / slow response is killing us"
- "I want to track every call, text, and email in one place"
- "I'm losing money on the CRM side, not the website side"
- She's already evaluated FUB and wants it

### CRM landscape reference (2026)

| Tool | Pricing for 16-agent team | Verdict |
|---|---|---|
| **Wise Agent** (default) | **~$369/mo** | $49 + 16 × $20 individual logins. +$20 for texting. ✅ |
| **Follow Up Boss Pro** (premium) | **~$745/mo** | $499 (10 users) + 6 × $41 annual. Industry standard. ✅ |
| Follow Up Boss Platform | $1,000/mo | Large-team tier. Overkill for 16 agents. |
| Lofty Core | $449/mo | Includes IDX — overlaps with us, kills design value prop. ❌ |
| iHomefinder Premium + CRM | $135/mo headline | WordPress-first; Next.js API support is undocumented vs. IDX Broker. ❌ |
| Top Producer | $40–60/agent/mo | Older platform, mediocre mobile. ❌ |
| IXACT Contact | $39–129/mo | Sphere/referral CRM, not a lead-gen machine. ❌ |

---

## Tech Stack

### Repo structure

```
~/projects/agency/
├── agency-site/                  ← AWD hub (Convex + Next.js) — untouched
├── agency-template/              ← WaaS template — untouched
├── clients/                      ← existing WaaS client repos
└── custom/                       ← NEW: one-off custom builds
    └── wildergroup-web/          ← fresh Next.js, no template ancestry
```

```bash
cd ~/projects/agency
mkdir -p custom && cd custom
bunx create-next-app@latest wildergroup-web --typescript --tailwind --app --no-src-dir
```

No `upstream` remote. No `.gitattributes` merge=ours. No plumbing validator. No `config/client.ts` shape. No `lib/waas/` imports.

### What to lift from the template (copy, not import)

1. `LocalBusinessSchema` JSON-LD component (~30 lines) — useful for SEO
2. Google Places reviews server action with `unstable_cache` (~40 lines)
3. Contact form spam protection pattern (honeypot `name="website"` + `_formLoadedAt` time check, ~50 lines) — rewire submit to POST to her CRM webhook (Wise Agent or FUB) instead of AWD hub

Everything else is fresh.

### What lives where

| Concern | Location |
|---|---|
| Marketing pages (home, about, team, communities, blog, contact) | Next.js app, our repo |
| MLS search, listing detail, map, valuation | IDX Broker via Wrappers (renders inside our header/footer shell on `thewildergroup.net/idx/...`) |
| Buyer leads from IDX | IDX Broker → her CRM webhook (both Wise Agent and FUB have native IDX Broker integrations) |
| Seller/general leads from contact form | Next.js server action → her CRM webhook |
| CRM, drip, dialer, SMS, agent inbox | Her CRM (Wise Agent default / FUB if Path B) — her account, her billing |
| Email broadcasts / newsletters | Her CRM's drip + optionally Resend/Mailchimp |
| Analytics | Google Analytics 4 + Vercel Analytics |
| Reviews | Google Places (lifted helper from template) |
| Billing for our services | Stripe payment link or manual invoice (AWD Stripe) |
| Project tracking | Linear or Notion (not admin portal) |
| Contract | Google Docs + DocuSign (not clickwrap) |

### Pages to build (initial scope)

- `/` — home, custom designed for her brand
- `/about` — story, values, broker bios
- `/team` — 16 agent profile cards
- `/team/[agent-slug]` — individual agent pages with bio, contact, listings filtered to that agent
- `/communities` — index of neighborhood/town pages
- `/communities/[slug]` — Alexandria, Pineville, Natchitoches, Deville, Boyce, Ball, Marksville, Bunkie, etc. (SEO play — pick top 8–12 by population/search volume)
- `/buying` — buyer's guide + valuation lead capture
- `/selling` — seller's guide + home value request
- `/blog` — markdown-driven, local market updates
- `/blog/[slug]` — post pages
- `/contact` — general contact form
- `/idx/*` — IDX Broker Wrapper pages (search, listings, listing detail, map)

Sitemap should include all marketing pages; IDX pages are managed by IDX Broker's sitemap.

### IDX Broker Wrappers — how it works

- IDX Broker hosts the listing/search content on their infrastructure
- We provide a "wrapper" HTML template URL (a Next.js route that renders header/footer with a placeholder)
- IDX fetches our wrapper, injects their content into the placeholder, serves the combined page
- URLs appear as `thewildergroup.net/idx/...` via CNAME / reverse proxy configuration
- Plan ~1 day for IDX Broker setup + ~1–2 weeks for MLS approval after she signs the IDX agreement

---

## Pitch / Outreach

### Discovery email (first contact)

```
Hi Jennifer — Layken with Acadiana Web Design out of Youngsville.

I spent some time on thewildergroup.net this week and have an honest
question for you: how much are you paying RealGeeks each month, and
are you happy with it?

The reason I ask — I build custom real estate sites that use IDX Broker
for MLS search (also a GSREIN-approved vendor) and let you bring your
own CRM. For a 16-agent team like yours, the total monthly stack is
usually $200–$400 less than RealGeeks, and the site looks like it was
designed for The Wilder Group instead of looking like every other
RealGeeks site online.

If you're locked into a RealGeeks contract right now, we can plan
around the renewal date. If you're month-to-month, we can move faster.

Either way, 20 minutes on the phone would tell us whether it's worth
having a longer conversation. I'm in Youngsville — happy to drive up
to Alexandria if it gets serious.
```

### Follow-up with rough numbers (if she responds positive)

```
Quick rough sketch before our call so you can sanity-check:

WHAT YOU'D PAY (custom build)
- One-time site build: $8,500 (design, dev, IDX setup, CRM
  integration, RealGeeks migration, agent training)
- Monthly to me: $499 (hosting, IDX feed config, support, lead
  routing, analytics, up to 2 hrs/month of edits)
- Monthly to IDX Broker: ~$80 (MLS search engine for your site)
- Monthly to your CRM: two options
    Path A (matches your current cost): Wise Agent ~$369/mo for
    16 individual logins. Solid CRM, real estate-focused.
    Path B (premium): Follow Up Boss ~$745/mo. Industry standard,
    best mobile app, built-in dialer.
- MLS dues: unchanged (you pay GSREIN/GCLRA directly already)

TOTAL MONTHLY
- Path A: ~$948/mo (about the same as RealGeeks today, with a
  custom site and full data ownership)
- Path B: ~$1,324/mo (premium CRM stack)

OPTIONAL ADD-ONS (not bundled — only if you want them)
- Homebot ($60/mo) brings back the home value + market reports
  features. Most brokerages who use it like it better than the
  RealGeeks version.
- Live chat widget — free options (Crisp, Tawk.to) work fine if
  you want one.

WHAT YOU GET
- A custom-designed site, not a RealGeeks template
- MLS search lives on thewildergroup.net (better SEO than RealGeeks
  subdomain pattern)
- 16 individual agent pages designed for actual lead capture
- Community pages for Alexandria, Pineville, Natchitoches, Deville —
  the searches that should be ranking you and aren't
- Your customer data lives in your CRM under your account. If you
  ever leave me, you take everything with you.

I'd want to keep your RealGeeks running until the new site is live —
no gap in lead capture. Realistic timeline: 6–8 weeks from kickoff.
```

### Decline (if we decide not to pursue)

```
Hi Jennifer — appreciate you reaching out. After looking at your setup, I'd
be doing you a disservice to take this on. RealGeeks is doing the IDX, CRM,
and lead automation work that's actually moving the needle for a brokerage,
and my $199/mo Website-as-a-Service is built for trades and local service
businesses — not for sitting on top of a real estate stack like yours.

If you ever want to do a one-off custom marketing site that runs alongside
RealGeeks, I'm open to that conversation. Otherwise I'd point you toward
agencies that specialize in real estate (Luxury Presence, Union Street Media,
or asking RealGeeks for their preferred design partners).
```

---

## Action Plan

### Pre-pitch
- [ ] Send discovery email above
- [ ] Confirm her actual RealGeeks bill on discovery call
- [ ] Confirm RealGeeks contract status (in-term vs. month-to-month, renewal date)
- [ ] Confirm her MLS membership (GSREIN, GCLRA, or both)
- [ ] Confirm she has a domain she controls (not RealGeeks-purchased)
- [ ] Confirm 16-agent count is accurate
- [ ] Get her Google Place ID (likely exists for office at 3516 Parliament Dr)

### If she signs
- [ ] DocuSign contract: scope, payment terms ($8,500 upfront + $499/mo with 2 hr/month edit cap, $125/hr beyond), 12-month minimum with auto-renewal, support hours, emergency rate, ownership clause (she owns the code if she leaves)
- [ ] Stripe: create "AWD Custom Build" product with one-time + recurring prices, generate payment links
- [ ] Linear: create "Wilder Group" project with phases — Discovery → Contract → IDX Setup → Design → Build → MLS Approval → Training → Live
- [ ] Create `~/projects/agency/custom/wildergroup-web/` with fresh `create-next-app`
- [ ] Help her sign up for IDX Broker Platinum + connect to her MLS feed (1–2 week MLS approval window)
- [ ] Help her sign up for her chosen CRM (Wise Agent default / FUB if Path B) under her own billing
- [ ] Build the marketing pages while MLS approval is pending
- [ ] Configure IDX Broker Wrappers once MLS approval lands
- [ ] Wire IDX Broker → her CRM (native integration — both Wise Agent and FUB)
- [ ] Wire contact form → her CRM webhook
- [ ] Set up Google Analytics 4 under her account
- [ ] Migrate any existing leads from RealGeeks CRM → her new CRM (CSV export/import; charge separately if substantial)
- [ ] If she opted into Homebot add-on, configure account and lead sync
- [ ] QA on staging subdomain (e.g., `staging.thewildergroup.net`)
- [ ] DNS cutover to new site (keep RealGeeks running on a temp subdomain during transition)
- [ ] Train Jennifer + agents on her new CRM (1–2 hour session)
- [ ] Help her cancel RealGeeks (handle the 2-month buyout if applicable)
- [ ] Update `wildergroup.md` with Per-Project Notes at end of build

### Post-launch
- [ ] Set up monthly check-in calendar invite (15 min, 1st of each month)
- [ ] Document her MLS compliance requirements (IDX Broker handles 95%, but be aware)
- [ ] If we land brokerage #2 within 6 months → reevaluate productizing this as an AWD "Brokerage" tier

---

## Risks / Gotchas

### Technical
- **MLS approval lag.** GSREIN/GCLRA approval after IDX agreement signature can take 1–2 weeks. Plan around it.
- **IDX compliance.** Display rules: photo attribution, refresh frequency, "deemed reliable but not guaranteed" disclaimer. IDX Broker handles 95% but Jennifer signs their compliance agreement.
- **Wrapper configuration.** IDX Broker Wrappers require CNAME + wrapper template URL setup. Not hard but not zero-touch — plan a day.
- **CRM data migration.** RealGeeks → FUB CSV migration is half a day for ~3,000 leads. Could be longer if she has years of history.

### Business
- **You're on call.** Real estate weekends matter. Broken forms during open-house Saturdays are emergencies. Set support hours in contract with an emergency rate for after-hours.
- **Agent turnover.** Realistic 2–3 agent changes/year. Bake into "unlimited edits" or charge per-change.
- **Long sales cycle.** Brokerages get pitched constantly. Lock 12–24 month contract with auto-renewal or churn within 18 months.
- **Higher cost-of-failure than WaaS clients.** A broken brokerage site costs her real money (lost lead → lost commission). Higher SLA expectation.
- **One-client revenue risk.** ~$10k/yr deal — losing her would sting more than losing a $199/mo WaaS client.

### Strategic
- **Don't productize prematurely.** One brokerage is a one-off. Two is a pattern. Three is a product line. Don't engineer the "Brokerage tier" until at least two have signed.
- **Don't fragment focus.** This is an AWD project, not a new business. Same LLC, same Stripe, same brand. Just a different product offering tracked separately.

---

## Sources (pricing / vendor research)

- [Real Geeks Pricing 2026 — Luxury Presence](https://www.luxurypresence.com/blogs/real-geeks-pricing/)
- [June 2025 RealGeeks Pricing Updates](https://support.realgeeks.com/pricing-update)
- [Wise Agent Pricing](https://wiseagent.com/pricing.asp)
- [Follow Up Boss Pricing 2026 — Luxury Presence](https://www.luxurypresence.com/blogs/follow-up-boss-pricing/)
- [Follow Up Boss Webhooks Guide](https://docs.followupboss.com/reference/webhooks-guide)
- [Lofty Developer API](https://developer.lofty.com/)
- [Lofty CRM Review 2026](https://aiandrealtors.com/review-lofty)
- [iHomefinder Optima Express](https://wordpress.org/plugins/optima-express/)
- [IDX Broker Platinum pricing review — inbound REM](https://inboundrem.com/idx-broker-review/)
- [IDX Broker — GSREIN approved vendor](https://www.idxbroker.com/mls/gulf-south-real-estate-info-network-gsrein)
- [IDX Broker — GCLRA approved vendor](https://www.idxbroker.com/mls/greater-central-louisiana-realtors-association-mls-rets-gclra-rets)
- [Homebot — automated home value reports](https://homebot.ai/)
- [Crisp Chat free tier](https://crisp.chat/en/pricing/)

---

## Per-Project Notes (fill in during/after build)

### Discovery findings
_Filled in after first call with Jennifer._

- Actual RealGeeks monthly: __
- Contract status: __
- Renewal date: __
- MLS memberships (GSREIN / GCLRA / both): __
- Domain ownership (RealGeeks-purchased or hers): __
- Pain points she mentioned: __
- CRM usage maturity (do agents use it / what's broken): __

### Build decisions
_Filled in during build phase._

- Final pricing agreed (setup / monthly / edit cap): __
- CRM path selected (A: Wise Agent / B: FUB): __
- Homebot opt-in (yes / no): __
- Live chat opt-in (yes / no / which provider): __
- Final community pages list: __
- Custom design decisions: __

### Follow-up items
_Track open items here as they arise._

- [ ] _Item_
