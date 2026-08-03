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

## Pilot structure — spend-gated (updated Aug 2)

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

The launch creative is the AI lead-filtering graphic at
`public/social/awd-ai-lead-filtering-2026-07-31.png`. It is a native 1080×1350
workflow showing an allowed service inquiry reaching email, optional SMS, and
the client dashboard while obvious spam skips notifications and remains
reviewable in the dashboard's Spam tab. The organic Facebook post went live
Jul 31 at 8:30 AM Central and is selected as the existing post in Ads Manager.
The public post now has the required Send Message button. Do not use the Boost
button.

## Scheduled organic posts — Aug 3 and Aug 5

Both posts are scheduled in the Professional Dashboard planner, use native
1080×1350 (4:5) feed graphics, and have Boost off.

### Monday, Aug 3 at 8:30 AM Central — $0 down / $199 per month

- Asset: `public/social/awd-zero-down-2026-08-03.png`
- Status: Scheduled
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

Historical Facebook context remains in `ACADIANA-FACEBOOK-CONTEXT.md`.
