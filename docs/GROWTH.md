# Growth

Status: **canonical growth and acquisition source of truth**  
Owner: Layken  
Last reviewed: 2026-08-10  
Metrics current through: 2026-08-08

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
5. Audit email and warm follow-up for genuinely qualified prospects

### Add only after current execution is reliable

- Tight, high-intent Google Search Ads
- Retargeting of qualified audit visitors
- Direct mail using the existing audit material
- Local SEO roundup or service-area content

### Defer

- Mass cold dialing
- Generic social-content treadmill
- Broad national web-design SEO
- LinkedIn advertising
- Another CRM, sequencer, or outsourced AI prospecting service

## Scorecard

| Date | Channel | Spend | Conversations | Qualified | Calls | Market-rate closes | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| 2026-08-02 | Meta Messenger | ~$14.00 | 0 | 0 | 0 | 0 | Pilot active |
| 2026-08-04 | Meta Messenger | $30.72 | 0 | 0 | 0 | 0 | 887 impressions, 380 reach |
| 2026-08-08 | Meta Messenger | $64.92 | 2 | 1 | 0 | 0 | Both conversations came from the $0-down post |
| 2026-08-03 | Facebook group outreach | $0 | 3 replies | 2 | 0 | 0 | Three targeted messages; two previews built |

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
| $150 | If there are fewer than three conversations, change creative or targeting. Prioritize a truthful testimonial asset. |
| $300 | If conversations exist but calls do not, fix qualification and the Messenger close rather than rebuilding the campaign. |
| $500 | Stop new spend and allow the final cohort two to three weeks to close before the channel verdict. |

Rotate creative if frequency moves past roughly 3.5–4, even before the next
gate.

### Current paid lead status

- Carpenter's Remodeling: qualified; broken former domain confirmed; offered a
  free homepage concept and awaiting a response/assets.
- Travis Tidwell: business unidentified; awaiting the existing website URL
  before qualification.

Detailed captured research remains in
`client-research/meta-messenger-leads-2026-08-08.md`. Do not buy a prospect's
brand domain as leverage. The client should own it.

## Facebook group outreach

Use recurring local business-promotion threads as a selective research source,
not a bulk-message list.

Every Monday:

1. Read the current thread and the group rules.
2. Open each promising business page and verify location, activity, reviews,
   services, website condition, and usable proof.
3. Exclude businesses already contacted elsewhere.
4. Select at most 5–10 strong fits.
5. Write an individual Messenger message referencing the actual business gap.
6. Respond quickly.
7. Build a preview only after explicit interest or an active website need.
8. Send one follow-up after two or three days, then stop.
9. Reconcile results into the scorecard.

A good target has a real local service, recent proof, and a missing, broken, or
weak site. Do not manufacture a problem for a business with a strong current
site.

### Outreach scripts

No website:

> Hey [first name], I saw [business] in the Acadiana Business Hub promotion
> post. You've built some good proof with [specific work or review], but I
> couldn't find a website where people can see the services and request a
> quote. I build managed websites for Acadiana service businesses. Would you
> like me to send a quick homepage idea? No pressure.

Active need:

> Absolutely. I'm thinking a clean site that explains what you do, shows the
> work, and makes it easy to call or request a quote. If you send the logo, a
> few photos, and the main services, I can put together a free concept. If you
> like it, the managed website plan is $0 down and starts at $199/month with a
> 12-month commitment. That includes the build, hosting, updates, and support.

Preview handoff:

> I put together a website concept using your logo, services, and approved
> photos: [preview URL]. Take a look when you have a minute. If you like the
> direction, we can customize the wording and photos and talk through getting it
> live.

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
