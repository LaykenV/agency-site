# Operations

Status: **canonical client-delivery source of truth**  
Owner: Layken  
Last reviewed: 2026-08-12

This is the current lead-to-live operating flow. It describes implemented
behavior, not the future portal or billing model in `plans/`.

## Lifecycle

```text
prospect
  → admin-created project and Order Form draft
  → issued Order Form and magic-link invitation
  → MSA + Order Form accepted
  → Stripe Checkout
  → assets and kickoff
  → bespoke build
  → staging review
  → domain launch
  → live support, leads, analytics, edits, and billing
```

Project status:

```text
AWAITING_AGREEMENT
  → AWAITING_PAYMENT
  → AWAITING_ASSETS
  → IN_PROGRESS
  → IN_REVIEW
  → LIVE
```

`ARCHIVED` is the current legacy terminal/archive status. A future independent
archive model is planned but not implemented.

## 1. Qualify the lead

Leads can come from referrals, Messenger, Cal.com, public audits, or admin
research. Facebook and Messenger are where discovery and outreach happen; the
application never crawls Facebook or sends a message.

Before creating a project:

- verify the business and decision-maker
- confirm the actual website problem
- confirm the managed-service offer fits
- document source, need, next action, and promised follow-up
- stop when the current site is already strong or the prospect is not a fit

Messenger and other off-platform leads must be mirrored into admin so they do
not exist only in an inbox.

### Building a website concept

For a Facebook lead who has shown interest but is not yet a prospect, build a
concept in `/admin/marketing` before creating anything in the project lifecycle:

1. Enter the business name, Facebook Page URL, service area, and any notes on
   services, slogan, and the CTA they want. Notes still outrank every other
   source of voice and service detail.
2. Confirm the Google Places match, or record that there is no listing.
   Generation is blocked until identity is settled, because attaching the wrong
   listing puts another company's facts on the page.
3. Paste a Facebook Pack from their Page: logo, work photos, About screenshots,
   posts, services, or copied text. Use **Analyze Facebook Pack** once the batch
   is ready — not after every paste. One medium-reasoning Luna pass classifies
   the material, picks the logo/hero/gallery, extracts source-linked facts, and
   flags contradictions. Server rules admit source-backed, non-conflicting
   facts. Screenshots supply facts only; they never become page imagery.
4. Optionally use **Fill gaps from website** when a verified site exists and the
   pack still leaves services, about copy, or photos missing. Website evidence
   is accepted only when its value and evidence appear in that page's returned
   Markdown. Wait for image sorting to resolve before Generate unlocks. A
   visible image failure means generation continues without those images.
5. Generate with Muse Spark 1.2. The draft is checked for unsafe markup and
   other hard HTML rules, not for every marketing flourish against the brief.
   Your job is the finished page: does it look right and sound like them?
6. Publish, then use Copy Messenger Draft and send it by hand.
7. Watch the open count. Sent and never opened after one follow-up means stop.

Google photos are never used. If the pack has no usable photography, the
generator produces a typographic concept rather than inventing imagery. Manual
image uploads remain available as overrides.

A concept is not a prospect. Create the prospect and project by hand only after
the conversation becomes a real opportunity.

## 2. Create the prospect and project

In `/admin`:

1. Create or select the prospect.
2. Create the project explicitly with
   `admin.createProjectForProspect`.
3. Review the seeded standard Order Form draft.
4. Change project-specific commercial terms before issuance when needed.
5. Issue the Order Form.
6. Send the magic-link invitation.

The agreement page does not create a project. It may attach the verified Better
Auth user to the already-created matching project.

## 3. Agreement

The client sees one acceptance experience containing:

1. the complete project Order Form
2. the complete versioned MSA
3. one unambiguous clickwrap checkbox and submission

Acceptance records the exact issued Order Form, MSA version, both server-computed
hashes, timestamp, and user agent. Issued forms are immutable. Never edit a
signed engagement by issuing a replacement and implying it changed the original.

Successful acceptance moves the project from `AWAITING_AGREEMENT` to
`AWAITING_PAYMENT`.

## 4. Checkout and activation

`convex/stripeActions.ts`:

- ensures the Better Auth user has a Stripe customer mapped in
  `billingCustomers`
- loads the latest agreement and exact accepted Order Form
- validates the recurring Stripe Price and optional one-time setup Price
- creates subscription-mode Checkout with both items when applicable
- returns to `/portal/paymentSuccess`

The current integration synchronizes subscription state into the local
`subscriptions` table. An active or trialing subscription tied to the project
may move `AWAITING_PAYMENT` to `AWAITING_ASSETS` exactly once and schedule
the welcome email.

Do not create a real charge purely for QA. An abandoned Checkout must not advance
the project.

## 5. Assets and kickoff

At `AWAITING_ASSETS`, the client provides the available build information:

- headline or positioning preference
- domain preference
- inspiration links
- brand colors
- logo and brand images
- notification details and consent where applicable

The client books a kickoff call through Cal.com. Booking updates call records;
it does not automatically change project status.

After the kickoff and usable asset handoff, an admin moves the project to
`IN_PROGRESS`.

## 6. Build the client site

Each client site is an independent bespoke repository. Do not clone or merge the
retired `agency-template`.

Use `../agency-playground/` only as the reference for Hub-facing plumbing:

- server-side lead forwarding
- browser event client
- credential handling
- LocalBusiness schema patterns

Do not copy its visual design.

Create the site with client-owned or approved assets, document its maintenance
notes in the client repository, and keep vendor/domain accounts in the client's
name whenever practical.

## 7. Issue Hub credentials

From the project's admin panel, issue:

| Kind                         | Prefix        | Location                      |
| ---------------------------- | ------------- | ----------------------------- |
| Secret lead credential       | `sk_live_...` | Server-only Spoke environment |
| Publishable event credential | `pk_live_...` | Browser bundle/environment    |

Raw credentials are shown once. Rotation is issue, deploy, verify, then revoke.
Never put an `sk_live_...` value in a `NEXT_PUBLIC_*` variable.

## 8. Stage and verify

1. Deploy the client repository to Vercel.
2. Store the staging host on the Hub project. Prefer a bare host such as
   `example.vercel.app`.
3. Move the project to `IN_REVIEW`.
4. Submit a real test form and confirm the lead appears in admin.
5. Confirm the secret credential's `lastUsedAt` changes.
6. Visit routes and click available phone, email, and directions links.
7. Confirm events reach the portal metrics and the publishable credential is
   used.
8. Test mobile and desktop behavior before the review call.

Lead failures and event failures have different first checks:

| Symptom               | First checks                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Lead missing          | server-held secret, credential state, `[hub.lead.v2]` logs, fan-out-paused view          |
| Events missing or 403 | stored staging/live host, actual browser Origin, publishable key, `[hub.events.v2]` logs |

## 9. Review and revisions

- Run the client review against the staging deployment.
- Record requested work as edit requests or explicit project notes.
- Apply, verify, commit, and deploy each revision.
- Keep edit-request status current.
- Do not expand scope silently; use the Order Form and change-order rules.

## 10. Domain launch

1. Confirm domain ownership and DNS authority.
2. Add the domain to the client Vercel project.
3. Complete DNS and SSL verification.
4. Store the production domain as a bare host in the Hub project.
5. Move `IN_REVIEW` to `LIVE`.
6. Repeat lead and event smoke tests on the real production domain.
7. Send the launch handoff with the portal, lead, analytics, and edit-request
   instructions.

## 11. Ongoing service

Live clients receive:

- portal access
- recent qualified leads
- pageview and conversion-click summaries
- edit requests with attachments and statuses
- scheduled-call information
- recurring Stripe billing

Payment failure, cancellation, or past-due status should create activity and
notifications. It must not silently rewrite the fulfillment stage.

## 12. Hub contract changes

The rollout order is fixed:

1. Add the new Hub behavior without removing the old supported behavior.
2. Apply and production-smoke it on `agency-playground`.
3. Apply it to each live client repository one at a time.
4. Record per-Spoke verification.
5. Remove the old Hub path only after every configured Spoke passes.

A deploy is not verification. Confirm the actual client path.
