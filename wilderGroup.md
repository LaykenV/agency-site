# The Wilder Group — Real Estate Client Strategy

## The Situation

The Wilder Group is a real estate brokerage in Alexandria, LA, owned by Jennifer Wilder. They reached out about a new website.

**Contact Info:**
- Owner: Jennifer Wilder
- Phone: (318) 625-7475
- Address: 3516 Parliament Drive, Alexandria, LA 71303
- Email: thewildergroup@att.net
- DRE#: 995709978
- Current site: https://www.thewildergroup.net/

**What they currently have:**

Their entire website is built on **Real Geeks** — an all-in-one real estate platform that provides the website, IDX/MLS integration, CRM, lead capture, user accounts, and SEO pages as a single service. They also use **Content Codes** for supplementary data widgets (mortgage calculator, market reports, home valuations).

This is NOT a standard service business with an informational website. Their site has property search, MLS listings, interactive map search, user accounts with saved searches, email alerts, auto-generated SEO pages by area/price/type, and more — all provided by the Real Geeks platform.

**Estimated current cost:** $400–$600+/mo (Real Geeks $299–$500+ plus Content Codes ~$50–$100)

---

## What We Decided

### The Offer: Standard Plan — $0 Down, $199/mo

We are NOT creating a separate pricing tier, charging an upfront fee, or offering an add-on package. Jennifer gets the same offer as every other client:

- $0 down, $199/month, 12-month minimum
- Custom website built with our template
- Hosting, SSL, domain, unlimited edits, support, analytics
- Contact form with lead delivery via our WaaS hub
- Client portal access

### How the IDX Works

Jennifer signs up for **IDX Broker Engage** ($99/mo) directly — she pays IDX Broker, she owns the account, she has the login. We set it up and integrate it into her site, but it's her subscription.

**IDX Broker Engage provides:**
- Property search widgets (Quick Search, full search)
- Listing showcase and carousel widgets
- Interactive map search
- Property detail pages (hosted on her subdomain, wrapped in her site's header/footer)
- Saved searches and daily email alerts for her clients
- User account system (registration, login)
- Market report widget
- Lead capture (email notifications when visitors register or inquire)

**Her total cost: $298/mo** ($199 to us + $99 to IDX Broker) — saving her $100–$200+/mo compared to Real Geeks.

### Template Integration

We use our standard template for marketing pages and add two small components:

1. **Embed section type** — A generic component added to the template (useful for all clients, not just real estate). Renders script-based widgets or iframes on any page via config. IDX Broker widgets (search bar, featured listings, listing carousel) are configured in `config/site.ts` using this section type.

2. **IDX Broker wrapper page** — A page in the client repo that IDX Broker fetches (via cURL) to grab the site's header and footer HTML. IDX Broker wraps its hosted pages (search results, property details) in this shell so they look like part of the site. One-time setup.

3. **Subdomain DNS** — Point `homes.thewildergroup.net` (or similar) to IDX Broker's servers via CNAME record. Property search results and detail pages are served from this subdomain, wrapped in the site's design.

**Extra work beyond a normal template client: ~4–7 hours total.**

### Content Codes: Dropped

We are dropping Content Codes entirely. Here's how we replace what it provided:

| Content Codes Feature | Our Replacement |
|----------------------|----------------|
| Mortgage calculator | Build a simple calculator as a client component in her repo (~50 lines of React, just math) |
| Market reports | IDX Broker Engage includes a Market Report widget — covered |
| Home valuation tool | Replace with a lead capture page: "Want to know what your home is worth? Fill out this form and Jennifer will send you a personalized market analysis within 24 hours." Better lead gen — she gets contact info instead of the visitor seeing a number and leaving |

### CRM: Not Replaced (Probably Not Needed)

Real Geeks includes a built-in CRM with lead profiles, property behavior tracking, drip campaigns, and pipeline management. We don't replace this.

**Ask on the call:** "Do you actively use the CRM in Real Geeks? Do you log in and manage leads there, or do you mostly just get the email notifications?"

- If she doesn't really use it (likely for a solo agent): IDX Broker emails her when leads register. Our contact form sends leads to her inbox. She manages leads from her phone and email like she probably already does. No loss.
- If she does actively use it: She can add a standalone CRM — Follow Up Boss (~$69/mo) or LionDesk (~$25/mo). Both integrate with IDX Broker via webhook or Zapier.

---

## Feature Comparison: Real Geeks (Current) vs. Our Setup

### What She Keeps (Same or Better)

| Feature | Real Geeks | Our Setup | Notes |
|---------|-----------|-----------|-------|
| Property search with filters | Yes | Yes (IDX Broker widget) | Same MLS data, same filters |
| Property listing pages | Yes | Yes (IDX Broker wrapper pages) | Hosted on her subdomain, wrapped in her site design |
| Interactive map search | Yes | Yes (IDX Broker Engage) | Engage tier includes map search |
| Saved searches & email alerts | Yes | Yes (IDX Broker) | Built into IDX Broker |
| User accounts (login/signup) | Yes | Yes (IDX Broker) | Built into IDX Broker |
| Market reports | Yes (Content Codes) | Yes (IDX Broker Engage) | Engage tier includes market reports |
| Featured/just listed properties | Yes | Yes (IDX Broker showcase widget) | Embedded on home page via config |
| Lead capture from property inquiries | Yes (goes to CRM) | Yes (IDX Broker emails her) | She gets email notifications instead of CRM dashboard |
| Contact form | Yes | Yes (our WaaS hub + lead delivery) | Better — leads flow into our system with analytics |
| Mobile responsive | Yes (mediocre) | Yes (excellent) | Our template is mobile-first, dramatically better |
| SSL / hosting | Yes | Yes (Vercel) | Better performance |
| Domain management | Yes | Yes (we manage) | Same |

### What Gets Better

| Feature | Real Geeks | Our Setup | Why It's Better |
|---------|-----------|-----------|----------------|
| Site speed / PageSpeed | 40–60 on mobile (typical for Real Geeks) | 95+ on mobile | Google ranks faster sites higher. Night and day difference. Run her current site through PageSpeed Insights before the call for a real number to cite |
| Design / branding | Generic Real Geeks template (looks like every other Real Geeks agent) | Custom design, archetype-driven, unique | She'll stand out from every other agent in her market |
| Marketing pages | Template-looking, slow | Hand-coded, blazing fast, custom content | Home, About, Buying, Selling, Team, Contact — all dramatically better |
| Edits & support | Real Geeks support ticket queue | Dedicated web team, unlimited edits, same-day response | Personal service vs. generic platform support |
| Analytics | Basic Real Geeks dashboard | Monthly analytics summary via our portal | Page views, top pages, leads at a glance |
| Mortgage calculator | Content Codes add-on (extra cost) | Built into the site (included) | No extra subscription needed |
| Home valuation | Content Codes tool (visitor sees number, often bounces) | Lead capture form (she gets contact info) | Better lead generation — she gets the phone call |
| Total cost | $400–$600+/mo | $298/mo | $100–$200+ in monthly savings |

### What She Loses (And Why It's Okay)

| Feature | Impact | Why It's Okay |
|---------|--------|--------------|
| Auto-generated SEO pages at scale (hundreds of pages like `/alexandria-homes-for-sale/under-200000/`) | Medium | IDX Broker supports "Saved Links" — manually created preset search URLs that act as landing pages. We'd set up 20–30 key ones (top areas, price ranges). She won't have hundreds auto-generated, but a solo agent in Alexandria doesn't need hundreds. Her traffic comes from direct, social, and Google Business — not long-tail MLS pages |
| Built-in CRM (lead profiles, behavior tracking, drip campaigns, pipeline) | Low for solo agent | Most solo agents don't actively use their CRM. IDX Broker emails her leads. Our contact form delivers leads. She follows up from her phone. If she needs a CRM later, Follow Up Boss ($69/mo) or LionDesk ($25/mo) integrates with IDX Broker |
| Property behavior tracking (see which listings each lead viewed) | Low for solo agent | Powerful for teams managing 50+ leads. A solo agent in a mid-size market knows her clients personally |
| Email drip campaigns | Low | Most agents set these up once and forget them, or never set them up |
| Mobile app (Real Geeks MoveTo app) | Low | Very few agents' clients actually use the branded app. Buyers use Zillow/Redfin for browsing and call their agent when they're serious |
| "Instant" home valuation number | None (replaced) | We replace it with a lead capture form that generates better leads |
| Content Codes widgets | None (replaced) | Mortgage calculator built in, market reports via IDX Broker, home valuation via lead capture |

---

## Selling Points

### The Core Pitch

> "You're paying over $400 a month for a Real Geeks site that looks like every other Real Geeks agent in Louisiana. I'll build you a custom site that loads in under a second, looks like a $10,000 build, and costs you less than what you're paying now. $0 upfront."

### Key Talking Points

1. **She saves money immediately.** $298/mo vs $400–$600+. Over 12 months, that's $1,200–$2,400 back in her pocket.

2. **Her site will be dramatically faster.** Run her current site through Google PageSpeed Insights before the call. Real Geeks sites typically score 40–60 on mobile. Our sites score 95+. Google uses speed as a ranking factor — this directly affects whether people find her.

3. **She'll stand out from every other agent.** Her current site uses the same Real Geeks template as thousands of agents. Our design is custom — nobody else will have her site.

4. **She gets a dedicated web team.** Not a Real Geeks support ticket queue. She submits edit requests through her portal or emails us. Unlimited changes, no extra charge.

5. **Property search still works.** MLS integration, saved searches, email alerts, map search — all of it stays through IDX Broker. She doesn't lose any functionality that matters.

6. **$0 upfront.** Real Geeks charges a setup fee. We charge nothing.

7. **Live in one week.** We can have her site ready for review within a week. Real Geeks migration is painless.

### Speed Comparison (Do Before the Call)

Run `https://www.thewildergroup.net/` through [PageSpeed Insights](https://pagespeed.web.dev/) and screenshot the results. Compare to any of our live client sites. The visual contrast between a 45 mobile score and a 97 mobile score is extremely compelling on a sales call.

---

## "What About..." Questions

### "What about my property search and MLS listings?"

> "Everything stays. We connect your site to IDX Broker, which plugs directly into your MLS through GSREIN — the same data feed you have now. Your visitors can still search properties, view listings, save favorites, and get daily email alerts. The property search pages will be on a subdomain of your domain, styled to match your new site."

### "What about my saved searches and client accounts?"

> "IDX Broker has that built in. Your clients can still create accounts, save searches, and get daily listing alerts — same as they do now."

### "What about my CRM? I manage leads in Real Geeks."

> "IDX Broker sends you email notifications when someone registers or inquires about a property. Our contact form delivers leads straight to your inbox too. If you want a full CRM dashboard, Follow Up Boss is the industry standard at $69 a month and it integrates directly with IDX Broker — leads flow in automatically. But honestly, most solo agents find that email notifications and phone follow-up work just as well."

### "What about the mortgage calculator?"

> "We build one right into your site. It's included — no extra subscription."

### "What about the 'What is Your Home Worth?' tool?"

> "We replace that with something better. Instead of showing visitors a generic estimate that they look at and leave, we set up a lead capture page — they enter their address and contact info, and you send them a personalized market analysis. You actually get the lead instead of losing them to a number on a screen."

### "What about market reports?"

> "IDX Broker Engage includes a market report widget. Your visitors can still see what's active, under contract, and sold in their neighborhood."

### "What happens to my Google rankings? I don't want to lose SEO."

> "Your main rankings come from your domain, your Google Business profile, and your reviews — none of that changes. Your new site will actually rank better because it loads faster and has cleaner code. Google prioritizes fast, mobile-first sites. For property pages, IDX Broker hosts those on a subdomain of your domain, so the SEO value stays with you. We'd also make sure your key pages have proper redirects so you don't lose any existing traffic."

### "I'm paying Real Geeks $[X] a month. How much would this cost?"

> "Our plan is $199 a month — hosting, domain, unlimited edits, support, analytics, all included. You'd also sign up for IDX Broker at $99 a month for your property search and MLS integration. So your total is $298 a month — that's [$X minus $298] less than what you're paying now, and you get a site that actually looks custom."

### "Can I see what it would look like?"

> "Absolutely. Give me 48 hours after this call and I'll have a working preview for you. It won't be a mockup — it'll be a real site you can click through on your phone."

### "What if I don't like it or it doesn't work out?"

> "There's a 12-month minimum term, same as most services. But if you're not happy with the site before we launch, we'll revise it until you are. And after 12 months, it's month-to-month — you can cancel anytime. You're never locked in long-term."

---

## Discovery Call Checklist

Questions to ask before committing:

- [ ] "What made you start looking for a new website? What's not working with Real Geeks?"
- [ ] "How much are you paying Real Geeks right now?"
- [ ] "Do you actively use the CRM in Real Geeks? Do you log in and manage leads there?"
- [ ] "Do you have team members or buyer's agents, or is it just you?"
- [ ] "Do you use the email drip campaigns in Real Geeks?"
- [ ] "How important are the saved searches and email alerts for your buyers?"
- [ ] "Where do most of your leads come from — the website, referrals, social media, ads?"
- [ ] "Do you use Content Codes? The mortgage calculator, market reports, home valuation?"
- [ ] "Do you have your MLS login / GSREIN access separate from Real Geeks?"

**Before the call:** Run her site through [PageSpeed Insights](https://pagespeed.web.dev/) and screenshot the mobile score.

---

## Technical Implementation Notes

### Template Changes (One-Time, Benefits All Clients)

- Add `embed` section type with `iframe` and `script` variants to the template
- Add `EmbedIframeContent` and `EmbedScriptContent` types to `types/config.ts`
- Register in `config/registry.ts`
- ~1–2 hours of work

### Client Repo Setup

- Clone from template as normal
- Configure marketing pages in `config/site.ts` (Home, About, Buying, Selling, Team, Contact)
- Add IDX Broker widget embed sections to config (search bar on home page, featured listings, etc.)
- Create wrapper page for IDX Broker to cURL (renders site header/footer with placeholder tags)
- Build mortgage calculator component (~50 lines)
- Build home valuation lead capture page
- Add MLS compliance disclaimer to footer

### IDX Broker Setup

- Client signs up for IDX Broker Engage ($99/mo)
- Connect to GSREIN MLS feed (Jennifer's existing MLS board membership)
- Configure wrapper (point to our wrapper page URL)
- Set up custom subdomain: `homes.thewildergroup.net` → CNAME to IDX Broker
- Theme IDX Broker pages with custom CSS to match site archetype/colors
- Create 20–30 Saved Links for key area/price SEO landing pages
- Test property search, detail pages, saved searches, map search

### Estimated Extra Time vs. Normal Client

| Task | Time |
|------|------|
| Embed component (template) | 1–2 hours |
| IDX Broker widget config in site.ts | 30 min |
| Wrapper page creation | 1–2 hours |
| Subdomain DNS setup | 15 min |
| IDX Broker dashboard config + CSS theming | 1–2 hours |
| Mortgage calculator component | 1 hour |
| Home valuation lead capture page | 30 min |
| Saved Links setup (20–30 key pages) | 1 hour |
| Testing + QA | 1 hour |
| **Total extra beyond normal client** | **~7–10 hours** |
