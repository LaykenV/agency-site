# Inbound quote form and paused Google Search Ads

Status: **quote form active; all paid advertising paused**  
Owner: Layken  
Created: 2026-08-24

## Decision

Acadiana Web Design is inbound-only. All paid advertising is paused by owner
decision as of 2026-08-24. The Meta Messenger campaign is paused, and no Google
campaign was created.

The quote form remains active work because it supports organic, referral, Google
Business Profile, and direct website visitors. Shipping it does not authorize a
paid campaign. Any future ad test requires a new explicit owner decision.

## Current Google Ads setup

- Active customer ID: `227-048-4537`
- Login: `laykenv@gmail.com`
- Selected Business Profile: Acadiana Web Design
- Final URL: `https://acadianawebdesign.com/lafayette`
- Business name: Acadiana Web Design
- Linked phone: `(337) 306-3705`
- Country: United States
- Time zone: Chicago
- Currency: USD
- Payments profile: Varholdt AI LLC, Organization
- Payment method: Mastercard ending in `3008`
- Auto-tagging: on
- Call reporting: on
- Google strategist outreach: declined
- Advertiser disclosure: Varholdt AI LLC
- Advertiser relationship: Varholdt AI LLC does not manage Google Ads for other
  organizations
- Campaign creation was skipped. No campaign is live.
- Billing setup was submitted after explicit approval. Google disclosed a
  temporary `$50` card authorization that is typically removed within a week.
- Ads Manager shows the account as active. Google may still require additional
  advertiser-verification evidence before ads can serve.
- The `spend $500, get $500` promotion applies only to later spend after the
  first `$500` is accrued. It does not change the initial test ceiling.

## Keyword Planner evidence

The saved plan is targeted to Lafayette and uses ten high-intent web-design
terms. Google reports rounded historical ranges, so overlapping terms must not
be added together as if they were distinct searches.

| Keyword | Lafayette monthly searches | Low top-of-page bid | High top-of-page bid |
|---|---:|---:|---:|
| `web design lafayette la` | 10–100 | $5.77 | $20.00 |
| `website design lafayette la` | 10–100 | $5.77 | $20.00 |
| `web design near me` | 10–100 | $5.82 | $20.39 |
| `website design near me` | 10–100 | $10.00 | $22.17 |
| `website designer near me` | 10–100 | $8.29 | $32.02 |
| `website development lafayette la` | 10–100 | unavailable | unavailable |

Three narrower Lafayette phrases returned no publishable volume.

Google's September forecast is more pessimistic than the rounded historical
ranges:

- Lafayette city at a `$10` maximum CPC: about 24 impressions, `0.17` clicks,
  `$1.25` cost, and `$7.32` average CPC for the month.
- Lafayette city at a `$20` maximum CPC: about 31 impressions, `0.47` clicks,
  `$6.26` cost, and `$13.21` average CPC.
- Lafayette Parish at a `$20` maximum CPC: about 34 impressions, `0.52` clicks,
  `$6.73` cost, and `$12.83` average CPC.
- Lafayette city on uncapped Maximize Clicks with a `$30` daily budget: about
  43 impressions, `1.39` clicks, `$53.06` cost, and `$38.10` average CPC.

These are forecasts, not promises. They still fail the launch gate. Economical
bids are unlikely to win enough traffic for a timely test, while the forecast
that wins more traffic exceeds the offer's acquisition economics.

## User path

The primary CTA copy is **Request a Website Quote**.

1. A visitor lands on the homepage, `/lafayette`, or another city or service
   page.
2. The primary CTA moves to that page's `#quote` section. Blog and other pages
   without the embedded section link to `/quote`.
3. The visitor submits a short form.
4. The server accepts and stores the lead before the UI shows success.
5. Layken receives one email and, after the existing spam verdict allows it,
   one SMS.
6. The successful response records one GA4 `generate_lead` event. A button
   click, page view, or failed submission is not a conversion.
7. The success state offers Cal.com as an optional secondary action. Scheduling
   is no longer required to make first contact.

## Form copy and fields

Heading: **Tell me about your website**

Supporting copy: **Share a few details about your business and what you need.
Layken will review the request and contact you directly.**

Fields:

- Name, required
- Business name, required
- Phone, required
- Email, required
- Current website, optional
- Need, required: new website, redesign, website help, or not sure
- Details, optional, 2,000 character maximum
- Hidden honeypot
- Hidden form-loaded timestamp
- Hidden landing path

Submit button: **Send My Quote Request**

Success message: **Got it. I received your request and will contact you
directly.**

Failure fallback: show the AWD phone number as a `tel:` link. Never report
success when the Hub rejected or failed to store the lead.

Keep the form short. Do not add a budget question, mandatory scheduling, file
upload, account creation, or a multi-step wizard to the first release.

## Implementation

### 1. Provision AWD as a lead recipient

Reuse `client_leads`, `/api/v2/leads`, `leadTriage`, Resend, Twilio, the admin
lead view, and the current rate limits.

- Create an admin-managed Acadiana Web Design prospect and project.
- Use project slug `acadiana-web-design`.
- Set the project to `LIVE` with `acadianawebdesign.com` as its live URL.
- Set the exact recipient email.
- Set Layken's notification phone only through the existing SMS-consent flow.
- Issue a dedicated secret credential labeled `awd-site production`.
- Save the raw key once as `AWD_LEAD_SECRET_KEY` in Vercel Production. Never
  expose it through a `NEXT_PUBLIC_` variable or commit it.
- Save the Convex HTTP action base URL as `AWD_WAAS_API_URL`.

This intentionally makes AWD use the same path its clients use. Do not create a
second email or SMS implementation.

### 2. Add the server action

Add `actions/submitAgencyQuote.ts`, based on the proven server action in
`../agency-playground/actions/contact.ts`.

It must:

- validate with Zod
- reject the honeypot
- reject submissions under three seconds or over 24 hours old
- calculate the daily HMAC visitor hash on the server
- keep the bearer credential server-only
- POST to `/api/v2/leads` with source `agency-quote-form`
- combine business name, current website, need, details, and landing path into
  the existing bounded `message` field
- return the accepted `leadId` to the form for conversion deduplication
- return a generic error without echoing input or provider details

Do not expand the global lead schema for the first release. The labeled message
keeps this change isolated and preserves every client integration.

### 3. Build one reusable form

Add `components/marketing/QuoteForm.tsx` with:

- accessible labels and errors
- `useActionState`
- disabled pending state
- duplicate-submit protection
- a visible success state
- no automatic redirect
- an optional post-success Cal.com link
- mobile layout verified at 390 CSS pixels

Render the same component once per marketing template rather than maintaining
different forms for every city or industry page.

### 4. Change the CTA system

- Add a shared quote target in `lib/config.ts` and keep `ONBOARDING_CAL_LINK`
  only for secondary scheduling and portal use.
- Replace the primary Cal.com CTA in:
  - `app/page-content.tsx`
  - `app/[city]/CityPageClient.tsx`
  - `app/services/[industry]/IndustryPageClient.tsx`
  - `app/[city]/[industry]/CityIndustryPageClient.tsx`
  - `components/FloatingCtaTray.tsx`
  - the marketing CTA in `app/blog/[slug]/page.tsx`
- Do not replace Cal.com links used for client support, kickoff, review, or
  portal recovery.
- Add `/quote` as the direct fallback page for links that do not contain an
  embedded form.

### 5. Record the organic conversion

After a successful Hub response only:

- emit GA4 `generate_lead`
- pass the Hub `leadId` as the transaction ID so a rerender cannot double-count
- preserve the accepted lead ID and source so a future paid channel can be
  attributed without changing the form contract

Do not configure or emit a paid-ad conversion while all advertising is paused.
If Layken later authorizes a campaign, add and production-test that channel's
completed-lead conversion before publishing the campaign. Do not optimize for
CTA clicks.

## Release gates

The form is ready only when a production canary proves all of the following:

- one legitimate submission creates exactly one `client_leads` row
- source is `agency-quote-form`
- the row receives the current triage version and an `allow` verdict
- exactly one Resend email reaches the approved recipient
- exactly one Twilio SMS reaches the consented notification phone
- the lead appears in `/admin/leads`
- GA4 `generate_lead` fires once with the same accepted lead ID
- a honeypot submission creates no lead and sends no notification
- an obvious solicitation stores the expected spam verdict and sends no email
  or SMS
- backend failure shows the phone fallback and does not fire a conversion
- keyboard, focus, error, success, and 390-pixel mobile states pass

## Paid advertising reconsideration gate

No campaign is queued for launch. Do not create, publish, resume, or fund paid
advertising without a new explicit owner decision.

If Layken reopens paid advertising, do not launch until:

1. the form passes every release gate
2. billing uses the intended business profile and card
3. the ad blocker is disabled for `ads.google.com`
4. Keyword Planner provides Lafayette volume and CPC estimates
5. a revised exact-and-phrase forecast can produce enough clicks for a decision
   while keeping expected CPC at or below `$10`

The current forecast does not pass item 5. Do not create a campaign from the
saved plan. Do not rerun the forecast merely because the quote form ships. A
future explicit decision may authorize a fresh forecast using the full real
service area and reviewed exact and phrase terms.

If that later forecast can produce at least 25 relevant clicks inside the
`$400` hard cap, the proposed test remains Search-only with presence targeting,
no Display, no Performance Max, no broad match, and no Search Partners. These
conditions are planning evidence, not standing authorization.

Pause the campaign after `$200` or 25 relevant clicks with no qualified quote
request, whichever comes first. Stop at `$400` without a close. Do not spend
`$500` merely to earn the promotional credit.

## Required decisions before implementation

- exact email that should receive AWD quote notifications
- exact mobile number that should receive SMS notifications and record consent
