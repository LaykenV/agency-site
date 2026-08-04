# Acadiana Content + Ads Operations

The working content plan now lives at:

`/admin/content`

That private admin page is the source of truth for:

- The spend-gated Meta Messenger pilot (~$500 total, judged by spend milestones,
  not calendar days)
- The budget ($7/day at launch, $12/day after the first gate) and launch checklist
- Campaign spend, conversations, qualified leads, calls, and market-rate closes
- The live 4:5 AI lead-filtering post
- The two-posts-per-week content queue
- Asset requirements and the one-question Messenger handoff

The Messenger template is `AWD | Website opener | Manual follow-up`:

- Greeting: `Hi [first name], do you already have a website?`
- Quick replies: `Yes, I do` and `No, not yet`
- No automated response and no automated nudge
- Layken or Harley takes over manually after the reply
- If a lead does not reply to the opener, send one manual follow-up the next
  morning, verbatim: `Morning [name] — didn't want this to get buried. If you
  tell me the name of your business I'll take a quick look and tell you honestly
  whether a new site would even help. No pitch if it wouldn't.`

## Pilot structure — spend-gated (updated Aug 4)

The pilot was compressed from 90 days at $7/day (~$630) to ~$500 total at a
faster clip. Decisions happen at spend milestones, not dates. Do not touch the
campaign between gates.

| Gate | Condition | Action |
|---|---|---|
| $50 spent | Both new posts live and zero Messenger leads | Pause the AI-filtering ad. Add the Aug 3 and Aug 5 posts as existing-post ads in the same ad set. Raise budget $7/day → $12/day (under 2×, minor edit — do not rebuild the campaign). Let Meta allocate between the two for ~1 week / ~$80, then pause the loser. |
| $50 spent | The current ad has produced a lead | Keep it running, still add both new posts as challengers, still raise to $12/day. |
| $150 spent | Fewer than 3 conversations | Creative or targeting problem. Rotate in the next creative (testimonial reel is the priority asset). |
| $300 spent | Conversations happening, no calls booked | Ads work; the problem is qualification or the Messenger close. Fix the script, not the campaign. |
| $500 spent | — | Full verdict on the channel, but give the final cohort of conversations 2–3 more weeks to close before writing it off. |

Also watch frequency: past ~3.5–4, rotate creative regardless of performance.

## Weekly scoreboard log

Log every Monday (or at each gate) so decisions are made on written numbers,
not the per-browser dashboard values.

| Date | Spend | Conversations | Qualified | Calls | Closes | Notes |
|---|---|---|---|---|---|---|
| 2026-08-02 | ~$14 | 0 | 0 | 0 | 0 | Ad live since Jul 31; waiting on $50 gate |
| 2026-08-04 | $30.72 | 0 | 0 | 0 | 0 | Active; 887 impressions, 380 reach, ~2.33 frequency, 0 Meta leads. Meta shows 1 total messaging contact but 0 new messaging contacts, so do not count it as a campaign lead. |

The launch creative is the AI lead-filtering graphic at
`public/social/awd-ai-lead-filtering-2026-07-31.png`. It is a native 1080×1350
workflow showing an allowed service inquiry reaching email, optional SMS, and
the client dashboard while obvious spam skips notifications and remains
reviewable in the dashboard's Spam tab. The organic Facebook post went live
Jul 31 at 8:30 AM Central and is selected as the existing post in Ads Manager.
The public post now has the required Send Message button. Do not use the Boost
button.

## Published and scheduled organic posts — Aug 3 and Aug 5

Both posts use native 1080×1350 (4:5) feed graphics and have Boost off. The
Aug 3 post is published; the Aug 5 post remains scheduled in the Professional
Dashboard planner.

### Monday, Aug 3 at 8:30 AM Central — $0 down / $199 per month

- Asset: `public/social/awd-zero-down-2026-08-03.png`
- Status: Published Aug 3 at 8:30 AM Central
- Visible Page engagement on Aug 4: 3 reactions, 1 share, no visible comments
- Paid campaign: Organic until the $50 gate; then added as an existing-post
  challenger ad alongside the Aug 5 post
- Caption:

```text
A professional website shouldn’t require a $4,000 check before a single customer finds you.

$0 down. $199/month.

That includes:
✅ Custom-built website
✅ Hosting
✅ Unlimited edits
✅ Ongoing support

I handle the tech. You run the business.

Plans require a 12-month minimum. Need a better website without the upfront hit? Send me a message.
```

### Wednesday, Aug 5 at 8:30 AM Central — Your website should text you new leads

- Asset: `public/social/awd-text-new-leads-2026-08-05-v2.png`
- Status: Scheduled
- Paid campaign: Organic until the $50 gate; then added as an existing-post
  challenger ad alongside the Aug 3 post — Meta's auction picks the winner
- Creative: Full SMS conversation focused only on new-lead details reaching the
  owner's phone; no AI, filtering, or spam language
- Caption:

```text
Your website should text you when a new lead comes in.

A customer fills out the form, and the details land on your phone right away. No logging in. No remembering to check later.

Just a text so you can call them back while they’re ready to book.

Want your website to send new leads straight to your phone? Send me a message.
```

The live campaign: authenticated, $7/day until the first gate (then $12/day),
Leads → Messenger, Lafayette +25 miles, minimum age 25, Advantage+ placements,
the one-question Messenger opener, and multi-advertiser ads off. Automatic
visual touch-ups, animation, and multi-image adaptation are off. The campaign
started Jul 31 at 9:00 AM Central; the Oct 29 end date can stay in place — the
pilot now ends when $500 of spend is reached (~6 weeks at $12/day), per the
spend gates above. It was published July 31 and initially entered Meta's
Processing status before delivery.

## Current live snapshot — Aug 4

- Facebook Page: Acadiana Web Design (`61587652675493`), 88 followers
- Ad account: `168067751820059`
- Campaign: `Acadiana | Leads | Messenger | 90-Day Pilot | Jul 2026`
- Ad set: `Acadiana | Messenger | Local | Broad | Jul-Oct 2026`
- Delivery: Active
- Current ad: `AI Lead Filtering | Real Leads Less Spam | Existing Post`
- Spend: $30.72 of the first $50 gate
- Paid delivery: 887 impressions, 380 reach, ~2.33 frequency
- Results: 0 Meta leads; cost per result unavailable
- Messaging columns: 1 total contact, 0 new contacts. Do not promote the total
  contact to a lead without inbox and attribution evidence.
- The Jul 31 AI-filtering post is the only existing-post ad. The Aug 3 price
  post is organic, and the Aug 5 SMS post is still scheduled.
- Ads Manager warns that business verification may be required soon to avoid
  possible delivery disruption. No verification change has been made.

The campaign is actively spending, so billing is operational even though the
older admin checklist had not been marked complete. Ads Manager is authoritative
for paid metrics; the admin tracker remains the manual funnel record.

## Future content queue

Maintain two posts per week: one proof/receipt and one product/founder/launch.

### Ready

- Client comment proof card — future organic proof asset; do not use as the
  launch ad.
- PageSpeed head-to-head — record the test live and anonymize the comparison
  site.

### Needs an asset

- All About Towing testimonial re-edit — obtain the original 2:10 file and
  permission; cut a 20–45 second 9:16 version around “HE IS YOUR GUY.” This is
  the priority challenger at the $150 gate.
- Chelsea Social Co. testimonial — request a 15–30 second vertical clip covering
  problem, experience, result, and recommendation.
- Real lead hitting the inbox — create a fully redacted notification proof card.
- Same-day edit timelapse — capture one real request and the live change with
  timestamps.

### Ideas

- “Google them” ranking receipt
- Client portal walkthrough
- “I write the code myself” founder reel
- “Why $0 down works” founder reel
- Next client launch reel

## Meta Ad Library competitor scan — Aug 4

Method: United States, All ads, Active ads, sorted by `Impressions: high to
low`. Commercial-ad results are directional: Meta exposes the ranking but not
the raw impression total, conversion rate, spend, or profit. Keyword searches
can also include unrelated advertisers, so repeated angles, multiple versions,
and long-running ads are stronger signals than a single top card.

### Competitors reviewed

**Hibu** — about 53 active keyword results. The first result was a recruiting
ad, so it was excluded from offer analysis. High-ranked commercial ads used:

- A personalized, no-obligation demo with practical marketing advice
- “Get found” across Google, ChatGPT, and other discovery surfaces
- One provider handling the marketing so the owner can run the business
- One connected platform/provider instead of separate tools
- Short 10–15 second video creative, often with multiple variations

Several of these commercial ads have remained active since November 2025 or
February 2026, which is a better durability signal than a newly launched card.

**Thryv** — about 120 active keyword results. Its highest-ranked commercial
angles included:

- “Best-kept secret” / insufficient online visibility
- Turn searches into jobs and attract more leads
- Free demo or free AI-visibility score as the low-friction entry offer
- A better website and more leads without the owner managing marketing
- A local representative/team that knows the market
- Mostly video: two related 29–34 second variants and a 15-second visibility
  version among the top results

The leading “best-kept secret” variants have run since February 2026, and the
“turn searches into jobs” creative since June 2026.

### Implications for Acadiana Web Design

Do not copy competitors' wording or creative. Reuse the underlying customer
problems in AWD's local, website-specific voice:

1. **Invisible good business:** good local operators should not remain hard to
   find online. Demonstrate this with a real search or PageSpeed receipt.
2. **Owner time:** “I handle the tech. You run the business” is already aligned
   with a repeatedly used competitor angle. Keep it.
3. **Leads, not a website object:** show the website producing a call, text, or
   real inquiry. The Aug 5 SMS creative is the cleanest current expression.
4. **Local accountability:** contrast a reachable Acadiana operator with a
   national all-in-one vendor, using positive proof rather than competitor
   attacks.
5. **Low-friction diagnostic:** test the existing website audit as a future
   organic CTA or later ad challenger, but do not introduce it into the current
   Messenger pilot before a spend gate.

This scan does not change the current experiment. The AI-filtering ad stays
untouched until $50; the Aug 3 price and Aug 5 SMS posts remain the first paid
challengers. Use the competitor angles to shape the next proof/testimonial
creative only after the documented gate calls for another rotation.

Historical Facebook context remains in `ACADIANA-FACEBOOK-CONTEXT.md`.
