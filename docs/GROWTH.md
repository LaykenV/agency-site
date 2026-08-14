# Growth

Status: **canonical growth and acquisition source of truth**  
Owner: Layken  
Last reviewed: 2026-08-14
Metrics current through: 2026-08-14

This document owns the active channel strategy, operating cadence, decision
rules, scripts, and written scorecard. Dated campaign captures and prior weekly
plans live under `archive/growth/`.

## Source-of-truth rule

Use this document for durable decisions and dated results.

`/admin/content` is a useful execution dashboard, but its editable state is
stored in browser `localStorage`. Until it persists to Convex, it is not the
durable record and may differ across browsers. Ads Manager is authoritative for
paid delivery and spend; Messenger is authoritative for conversations; the Hub
admin is authoritative for prospects created there.

Update this file at spend gates or weekly, then reconcile qualified Messenger
leads into the admin prospect workflow.

## Objective

Close the first unrelated, market-rate client without adding another tool or
unproven channel. The bottleneck is the human path from interest to a call and
signed Order Form.

## Channel order

### Run now

1. Existing-client referrals
2. Selective local Facebook group outreach
3. Meta click-to-Messenger pilot
4. Local partnerships and in-person opportunities

### Add only after current execution is reliable

- Tight, high-intent Google Search Ads
- Retargeting of qualified audit visitors
- Direct mail using the existing audit material
- Local SEO roundup or service-area content

### Defer

- Mass cold dialing
- Cold email of any kind, bulk or sequenced
- City-and-industry batch prospect searches
- Generic social-content treadmill
- Broad national web-design SEO
- LinkedIn advertising
- Another CRM, sequencer, or outsourced AI prospecting service

Cold outreach email was removed from the application on 2026-08-10 along with
the batch search pipeline. It produced volume, not conversations. Facebook and
Messenger are the acquisition channel; the concept generator is the artifact
that moves a conversation forward.

## Scorecard

| Date | Channel | Spend | Conversations | Qualified | Calls | Market-rate closes | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| 2026-08-02 | Meta Messenger | ~$14.00 | 0 | 0 | 0 | 0 | Pilot active |
| 2026-08-04 | Meta Messenger | $30.72 | 0 | 0 | 0 | 0 | 887 impressions, 380 reach |
| 2026-08-08 | Meta Messenger | $64.92 | 2 | 1 | 0 | 0 | Both conversations came from the $0-down post |
| 2026-08-12 | Meta Messenger | $129.00 | 5 | 1 | 0 | 0 | Cumulative campaign result; one additional reply was a custom-app lead, not a website prospect |
| 2026-08-03 | Facebook group outreach | $0 | 3 replies | 2 | 0 | 0 | Three targeted messages; two previews built |
| 2026-08-11 | Direct Facebook outreach | $0 | 1 reply | 0 | 0 | 0 | Five businesses contacted from active ads; one declined and four did not reply |
| 2026-08-13 | Facebook group outreach | $0 | 1 human reply | 0 | 0 | 0 | 18 personalized messages sent; Daniel Green declined after pointing out his existing site; Oh So Pretty sent an automated reply |
| 2026-08-14 | Facebook group posts | $0 | 0 | 0 | 0 | 0 | Free-homepage-concept offer published in five approved groups; three total concept spots |

Do not calculate paid CAC until a market-rate client closes.

## Meta Messenger pilot

The pilot has a roughly $500 ceiling and is judged at spend gates, not calendar
dates. The active handoff asks one question:

> Hi [first name], do you already have a website?

Quick replies are “Yes, I do” and “No, not yet.” There is no automated sales
sequence. Layken or Harley takes over manually.

If a person does not answer the opener, send one follow-up the next morning:

> Morning [name] — didn't want this to get buried. If you tell me the name of
> your business I'll take a quick look and tell you honestly whether a new site
> would even help. No pitch if it wouldn't.

### Spend gates

| Gate | Decision |
|---|---|
| $50 | Completed. The AI-filtering ad was paused and the Aug. 3 and Aug. 5 existing posts became challengers. |
| $150 | At the gate, the volume test passes with five conversations. Keep the current budget and the $0-down post. If the new-lead-texts challenger still has no conversations, pause it. Do not reactivate the AI-filtering post. |
| $300 | If conversations exist but calls do not, fix qualification and the Messenger close rather than rebuilding the campaign. |
| $500 | Stop new spend and allow the final cohort two to three weeks to close before the channel verdict. |

Rotate creative if frequency moves past roughly 3.5–4, even before the next
gate.

### Current paid lead status

- Carpenter's Remodeling: the only qualified website lead. The broken former
  domain was confirmed, a free homepage concept was offered, and one follow-up
  was sent on August 10. No response. Stop unless Joseph reopens the thread.
- Travis Tidwell: said he has a website but never supplied the URL. One
  follow-up was sent on August 10 with no response. Stop.
- Judia Duhon: said she has a website. Awaiting the URL before qualification.
- Suire Patricia: said she has a website but did not provide a usable link in
  the thread. Ask once for the URL, then stop if she does not answer.
- Mike Romero: asked for a Lafayette rideshare app rather than a website. This
  is a separate Varholdt custom-app opportunity and is not counted as a
  qualified website lead. He requested pricing and provided a phone number for
  follow-up.

### Paid creative snapshot

Ads Manager was read on August 13 using the last-30-days window ending August
12. Total campaign spend was $129.00.

| Creative | State | Spend | Impressions | Reach | Messaging conversations started | Cost per conversation |
|---|---|---:|---:|---:|---:|---:|
| $0 Down / $199 Monthly | Active | $74.20 | 2,427 | 1,126 | 5 | $14.84 |
| New Lead Texts / Straight to Your Phone | Active | $10.62 | 166 | 101 | 0 | — |
| AI Lead Filtering / Real Leads Less Spam | Off | $44.18 | 1,321 | 478 | 0 | — |

The $0-down post is the control. It has produced every paid conversation. The
new-lead-texts post has too little spend for a final verdict, but it has not
earned more budget than the control. Do not reactivate the AI-filtering ad.

Detailed captured research remains in
`client-research/meta-messenger-leads-2026-08-08.md`. Do not buy a prospect's
brand domain as leverage. The client should own it.

## Facebook group outreach

Facebook groups are the primary direct-outreach source. Sponsored posts in the
general feed are not part of the active routine. Use group activity as a
selective research source, not a bulk-message list.

### Daily routine

1. Check the active local groups and read each group's promotion rules.
2. Look for businesses advertising in posts or comments, owners answering
   service-recommendation requests, and recurring "share your business" posts.
3. Open each promising business Page and verify location, recent activity,
   services, customer proof, and website condition.
4. Exclude businesses already contacted and businesses with a good current
   website. Prioritize missing, broken, or clearly weak websites.
5. Select only the strongest fits and write an individual Messenger message
   that references the group context and the verified website gap.
6. Ask whether the owner would like to see a free homepage concept. Do not build
   or claim to have built the concept before the owner says yes.
7. When an owner says yes, build the concept in `/admin/marketing`, review every
   factual claim, publish it, and send the preview link promptly.
8. Send one individual follow-up after two or three days if the owner does not
   answer, then stop.
9. Reconcile new messages, replies, concepts, calls, and closes into the
   scorecard each week.

The daily check does not create a message quota. Some days may produce no good
prospects. Quality is the filter.

### Current outreach status

- Shay's Cleaning Services and Charlie Gallusser received their one allowed
  follow-up on August 11 after the previews were sent. Neither replied. Stop.
- On August 11, five businesses advertising on Facebook were contacted:
  Chris's Tree Service, Regan's Supreme Clean LLC, Rodriguez Landscaping,
  Talon Spray Foam & Insulation Services, and Leger Lawn Care Services.
  Regan's replied that the need was already covered. The other four have not
  replied.
- On August 13, 18 businesses found through recent local-group activity were
  sent personalized messages: CAP Air Solutions, Carencro Seafood Corner, Oh
  So Pretty Pet Spa, Sesalee's Solo Cleaning, Second Chance Vintage Antique
  Market, Glowloveeat, Tree Preservation and Removal by Daniel Green, Steam
  King Services, Remi's Table & Chair Rentals, Wild Oak Cleaning Service,
  Abuela's Mexican Kitchen, Chantal's Lebanese Menu, The Floor Doctor, Pi's
  Photography, Ireland's Landscaping, Lagniappe Home Co., Acadiana Roadside,
  and Taylor Outdoor Services.
- Daniel Green declined and pointed out `danielgreenenterprises.com`, which was
  linked on the Facebook Page. This was a qualification miss. Do not follow up,
  and verify every Page's full contact-info section before declaring that a
  business has no website.
- Oh So Pretty Pet Spa returned an automated business-hours response. Do not
  count it as a human conversation. The other August 13 prospects remain
  pending. If there is no human response, send one personalized follow-up on
  August 15 or 16, then stop.
- On August 14, a free-homepage-concept offer was published and verified in
  Acadiana Business Hub, Lafayette Entrepreneurs & Small Businesses, Small
  Businesses of Acadiana, What Up Acadiana!, and Louisiana Business
  Networking. The five posts use slightly different local openings but share
  one limit of three total concept spots. No conversations had started at the
  time of posting.
- Youngsville Business Networking was skipped by choice. The Youngsville sale
  group was also skipped because it allows business promotion only in its
  Monday thread. Ask Lafayette, What's Going On Youngsville, and both San
  Sebastian neighborhood groups were excluded because their rules do not allow
  this standalone offer.
- Do not send another broad template to this batch. Any follow-up must reference
  the actual business and its verified website gap.

A good target has a real local service, recent proof, and a missing, broken, or
weak site. Do not manufacture a problem for a business with a strong current
site.

### Outreach scripts

No website:

> Hey [first name], I saw [business] in [group or post context]. You've built
> some good proof with [specific work or review], but I couldn't find a website
> where people can see the services and request a quote. I build managed
> websites for Acadiana service businesses. Would you like me to put together a
> free homepage concept for you?

Broken or weak website:

> Hey [first name], I saw [business] in [group or post context]. I checked out
> the website and noticed [specific verified problem]. I build managed websites
> for Acadiana service businesses. Would you like me to put together a free
> homepage concept showing a different direction?

Active need:

> Absolutely. I'm thinking a clean site that explains what you do, shows the
> work, and makes it easy to call or request a quote. If you send the logo, a
> few photos, and the main services, I can put together a free concept. If you
> like it, the managed website plan is $0 down and starts at $199/month with a
> 12-month commitment. That includes the build, hosting, updates, and support.

Preview handoff:

> I mocked up a homepage concept for [business] from the photos and info I
> had: [preview URL]
>
> It's just a sketch so you can see a direction — not the finished site.
> Buttons don't do anything, and the real build will have more pages and a
> tighter design. If you like the vibe we can keep that look; if not, we
> start from wherever you want.

`/admin/marketing` produces this draft with the link already filled in — the
Copy Messenger Draft action. It is always pasted and sent by hand; nothing in
the application messages anyone.

## Building a concept

Concepts are built in `/admin/marketing` after explicit interest, not
speculatively. The path is: enter the business, confirm the Google match,
upload whatever logo and photos exist, generate, review every factual claim
against the brief, publish, copy the link.

Two rules that matter commercially:

- The generator will not invent testimonials, credentials, or photography. If
  the owner has not sent photos, the concept is typographic. That is preferable
  to sending someone a page with stock imagery of a business that is not theirs.
- The open count on the concept card is the qualification signal worth watching.
  Sent and never opened after a follow-up means stop.

## Referrals and partnerships

- Ask satisfied clients directly for one introduction.
- Offer a referral reward only after the referred client's second successful
  monthly payment.
- Prioritize sign shops, accountants, insurance agents, print shops, chambers,
  and adjacent service providers who meet local owners early.
- Partnership outreach should ask for a short conversation, not assume a
  referral agreement already exists.

## Content cadence

Publish two useful pieces per week when assets support them:

- one proof or receipt
- one product, founder, or launch explanation

Current asset queue:

| Item | State | Next action |
|---|---|---|
| All About Towing testimonial cut | Needs asset | Obtain original video and permission |
| Chelsea testimonial | Needs asset | Request a 15–30 second vertical clip |
| Client comment proof card | Ready | Use as organic proof |
| PageSpeed comparison | Ready | Record live and anonymize comparison |
| Real lead notification | Needs asset | Fully redact before publishing |
| Portal walkthrough | Idea | Use a safe demo account |
| Same-day edit proof | Needs asset | Capture a real request and result |

## Decision rules

- A reply is not a call; a call is not a close.
- Stop a no-response Messenger sequence after one follow-up.
- Do not build speculative previews for silent prospects.
- Cap preview work at three qualified prospects per week until it closes a
  market-rate client.
- Tell a prospect when their current site is already good enough.
- Kill a channel after sufficient effort produces no closes or CAC remains over
  $400.
- Scale only after actual closes demonstrate repeatability.
