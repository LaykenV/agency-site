# Facebook Lead Website Concept Generator

Status: **Implementation complete; approved for additive production deploy and smoke test**
Owner: Layken
Written: 2026-08-10
Last reviewed: 2026-08-11

## Implementation state (2026-08-11)

- **Step 1 — built and verified locally.** `website_concepts`,
  `convex/concepts/`, `lib/concepts/`, the replacement `/admin/marketing`, and
  the database-backed `/preview/[token]`.
- **Step 2 — done.** The old outbound UI, functions, validators, rate limits,
  demo assets, and routes are deleted. The three legacy table definitions
  remain in `convex/schema.ts` as planned.
- **Step 3 — ready to begin, not yet executed.** The implementation is approved
  for the additive production deployment, production OpenRouter key, and live
  smoke test in
  [`outreach-preview-engine-cutover.md`](outreach-preview-engine-cutover.md).
  The legacy-row deletion and schema contraction remain gated on that smoke
  test, including the real-iPhone check.
- **Step 4 — done.** `GROWTH.md`, `ARCHITECTURE.md`, `OPERATIONS.md`,
  `BUSINESS.md`, `ROADMAP.md`, and `CLAUDE.md` updated.

The 2026-08-11 review blockers are fixed:

- every Places candidate now requires human confirmation
- every paid generation path passes through one daily limiter
- brief, quote, phone, website, name, and asset changes revoke stale output
- generation and publication require a confirmed match and current research
- in-flight generations carry request IDs, so stale completions cannot overwrite
  newer edits
- the cutover runbook now uses supported Convex deployment syntax, explicit row
  counts, archive integrity testing, and export/count reconciliation

Local exit checks pass: Convex codegen, TypeScript, 116 tests, lint, production
build (172 routes), and `git diff --check`. The implementation is done; live
provider, production, and physical-device verification are operational gates,
not remaining feature work.

Three decisions were taken during implementation that this plan did not specify:

1. **A `matching` status was added.** The plan's status list had no state for
   "Places returned candidates, awaiting human confirmation", which the
   requirement to never silently attach the wrong business needs.
2. **The sandbox grants `allow-top-navigation-by-user-activation`.** Without it
   a `tel:` link inside the frame silently fails in several browsers, and
   tapping to call is the only conversion path these pages have. Scripts,
   forms, same-origin access, and popups are all still withheld, and the
   trusted parent carries its own call button as a guaranteed path.
3. **The concept notice lives in the trusted parent, not the generated HTML.**
   The model cannot omit it and a regeneration cannot lose it. If the
   direct-document fallback is ever adopted, the notice must move into the
   generated document.

The real-iPhone spike the plan puts first has not been run — it needs a physical
device. It is step 6 of the cutover runbook, before the irreversible deletion,
so the fallback is still reachable if `srcDoc` sizing proves unacceptable.

## Outcome

Replace the current `/admin/marketing` outbound-search and cold-email system
with one focused workflow:

```text
manually find or receive a Facebook lead
  -> enter the business in /admin/marketing
  -> enrich it from Google Places and any existing website
  -> add the owner's logo and photos when available
  -> generate one fully custom homepage concept
  -> review it on mobile and desktop
  -> publish /preview/<private-token>
  -> copy the link and Messenger draft
```

This is a website-concept tool, not a CRM, outreach platform, Facebook scraper,
or general marketing automation product.

## Locked decisions

| Question | Decision |
|---|---|
| Primary acquisition channel | Facebook and Messenger |
| Lead discovery | Manual; outside the application |
| Facebook scraping | None |
| Automated Messenger sending | None |
| Admin route | Replace `/admin/marketing` in place |
| Legacy route or legacy UI | None |
| Historical marketing-data migration | None |
| Preview hosting | Existing application at `/preview/<token>` |
| Preview subdomain | None |
| Concept format | Fully custom self-contained HTML and CSS |
| Default concept scope | One substantial homepage |
| Model | Configurable OpenRouter model, initially `deepseek/deepseek-v4-flash-0731` |
| Public cold email | Removed |
| Human review | Required before publishing |

## Scope

### Included

- One new database table for website concepts.
- One replacement `/admin/marketing` page.
- Manual lead intake.
- Google Places matching.
- Existing-website enrichment with Firecrawl and PageSpeed.
- Logo and image uploads through existing Convex file storage patterns.
- AI-generated bespoke HTML and CSS.
- Basic deterministic safety and factual validation.
- Sandboxed mobile and desktop review.
- Dynamic, unlisted preview URLs with view tracking.
- A short Messenger draft and Copy Link action.
- Hard removal of the old admin marketing system and its historical data.

### Explicitly excluded

- `businesses`, `outreach_leads`, `outreach_events`, or asset-manifest tables.
- A generalized CRM or sales pipeline.
- Automatic Facebook Page or group collection.
- Messenger webhooks or automatic replies.
- Follow-up scheduling.
- Cold email, bulk email, or email sequencing.
- City-and-industry batch prospect searches.
- Per-lead public audit reports.
- Separate preview hosting, DNS, or another deployment target.
- Multiple generated routes or full sites in the first version.
- Automatic project or prospect creation.
- Historical marketing-data preservation inside the application.

If an interested lead becomes a real sales opportunity, Layken manually creates
the prospect in the existing admin/project flow. The concept generator does not
reimplement that lifecycle.

## User workflow

### 1. Capture the lead manually

Layken finds a business through a Facebook group, comment, recommendation
thread, paid Messenger conversation, or referral. Facebook remains the place
where discovery and outreach happen.

The application never crawls Facebook groups or sends Facebook messages.

### 2. Create a concept

`/admin/marketing` presents one form:

- Business name, required.
- Facebook Page URL, required for a Facebook lead.
- Existing website URL, optional.
- Google Maps URL, optional.
- Phone, optional.
- Notes, optional: services, slogan, location, differentiators, desired CTA.
- Logo and business photos, optional.

Facebook Page extraction is not a server dependency. An arbitrary Page cannot
be reliably or safely scraped. If the Page contains the only available logo,
photos, services, or copy, Layken either:

1. uploads those assets during the supervised research session, or
2. asks the interested owner to send the logo and several favorite photos.

The generator must still work without photography by using typography, color,
layout, and only the facts it has.

### 3. Enrich

After submission, one Convex action:

1. searches Google Places for the named business and location clues;
2. presents the best match when identity is uncertain rather than silently
   attaching the wrong business;
3. records verified public facts needed for the concept;
4. uses the submitted website or matched Places website when present;
5. runs Firecrawl and PageSpeed against that website; and
6. produces a concise generation brief.

Reuse the existing Places, Firecrawl, and PageSpeed implementation where it is
useful, but extract only the single-business functions. Do not preserve the
batch-search workflow merely to reuse those functions.

Google photos and review text are internal research signals only. They do not
become preview assets. Preview images must be uploaded owner/business assets,
approved licensed assets, or clearly identified generated concept imagery.

### 4. Generate

The generation action sends the verified brief and approved asset URLs to a
configurable OpenRouter model. Call OpenRouter directly from the action rather
than adding an incompatible AI SDK provider solely for this feature.

The model returns one self-contained HTML document:

- inline CSS;
- no JavaScript;
- no external stylesheets, fonts, analytics, trackers, embeds, or iframes;
- images only from the approved URL allowlist;
- one long, mobile-first homepage;
- no invented services, testimonials, credentials, prices, addresses, or
  performance claims;
- no live contact form or lead collection;
- clearly demonstrative chat, booking, or quote UI when such UI is shown; and
- a visible concept notice stating that the page is not yet the live business
  website.

Because JavaScript is prohibited, do not render a hamburger button or any
control that appears interactive but cannot work. A one-page concept uses a
small visible anchor row or no navigation on mobile.

The default homepage may include:

- hero and primary CTA;
- services;
- gallery or work examples when approved photos exist;
- verified reviews or proof only when supplied for concept use;
- about and trust section;
- service area;
- phone or quote CTA; and
- footer.

Do not generate secondary pages in version one. Add that capability only after
real prospects repeatedly need a menu, detailed service page, gallery, booking,
or similar sales-relevant demonstration.

### 5. Validate and review

Before review, reject generated HTML containing:

- `<script>`, `<iframe>`, `<object>`, `<embed>`, `<base>`, or meta refresh;
- inline event handlers such as `onclick`;
- `javascript:` URLs;
- forms that submit data;
- network calls;
- asset URLs outside the approved allowlist;
- placeholder text such as `lorem`, `TODO`, `example.com`, or fake phone
  numbers; or
- phone numbers or review quotes absent from the verified brief.

Arbitrary business claims are not represented as deterministically validated.
The human review gate explicitly checks credentials, years in business,
insurance, service areas, superlatives, and other factual claims against the
brief before publication.

The admin review card renders the concept in a sandboxed iframe using `srcDoc`.
It provides mobile and desktop widths without generating separate screenshot
files.

Actions:

- Regenerate.
- Edit the input/brief and regenerate.
- Publish.
- Delete.

There is no automated publication. Layken reviews every concept.

### 6. Publish and send

Publishing makes the concept available immediately at:

```text
https://acadianawebdesign.com/preview/<unguessable-token>
```

No application deployment occurs per concept. The dynamic preview route loads
the published concept from Convex and renders its HTML inside a sandboxed iframe.

The trusted parent page:

- supplies `noindex`, `nofollow`, and `noarchive` metadata;
- shows the business name in the document title;
- records repeat views;
- supports `?notrack=1` for Layken's own review; and
- returns not found for deleted or unpublished concepts.

The admin card provides:

- Copy Link.
- Copy Messenger Draft.
- Mark Sent, optional and informational only.
- Open count, first opened, and last opened.
- Unpublish/Delete.

Default handoff draft:

> I put together the website concept we talked about using the information and
> photos I had for [Business]: [link]. Take a look when you have a minute. If
> you like the direction, we can adjust anything you want and talk about getting
> it live.

The message remains editable and is always sent manually in Messenger.

## Data model

Add one table: `website_concepts`.

Suggested fields:

```text
token
businessName
facebookPageUrl
submittedWebsiteUrl?
matchedGooglePlaceId?
matchedGoogleMapsUrl?
verifiedWebsiteUrl?
phone?
notes?
assetStorageIds[]
researchBrief?
generatedHtml?
status: draft | enriching | generating | review | published | failed
model?
promptVersion?
error?
sentAt?
firstViewedAt?
lastViewedAt?
viewCount
createdAt
updatedAt
publishedAt?
```

Indexes:

- `by_token`
- `by_status_and_updatedAt`

The token is random and unguessable. No business, outreach, discovery, asset,
revision, or analytics-event tables are added. Regeneration replaces the current
draft HTML. This is acceptable because the tool does not need a revision-history
product.

## Rendering and security boundary

The main route remains trusted application code. Model-generated HTML never
renders directly into the React document with `dangerouslySetInnerHTML`.

Render it through an iframe with a restrictive sandbox and `srcDoc`. Do not add
`allow-scripts`, `allow-forms`, or `allow-same-origin`. The generated document
therefore cannot access the application DOM, authentication cookies, storage,
or network APIs.

The parent page owns tracking and metadata. The generated page owns only visual
presentation. This provides the necessary boundary without another domain.

This rendering choice must be proved before the rest of the feature is built.
The first implementation spike renders a long representative concept inside the
exact sandbox on a real iPhone in Safari and inside Messenger's in-app browser.
Verify viewport sizing, full-page scrolling, fixed or sticky elements, anchor
navigation, and tap behavior.

If sandboxed `srcDoc` has unacceptable iOS sizing or viewport behavior, use the
named fallback instead of adding a preview subdomain: make
`/preview/[token]` return the generated HTML as the top-level response with
server-side view counting and this response-header policy:

```text
Content-Security-Policy: default-src 'none'; img-src <approved origins>; style-src 'unsafe-inline'; script-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; connect-src 'none'; object-src 'none'
```

The direct-document fallback keeps `?notrack=1`, unpublished-token checks, and
all HTML validation requirements.

## Hard transition: delete the old system

There is no `/admin/marketing/legacy`, migration UI, compatibility layer, or
historical-lead import.

The existing `shays-cleaning-services` and `gator-constructors` preview links
are intentionally not migrated or redirected. They may return not found after
cutover. Use their current business inputs and assets as the first two generator
test cases, uploading any test assets through the new concept flow before
`public/demos/` is removed. Their former recipients did not continue the
conversations, so preserving the old URLs has no business value.

### Delete or replace

- Replace `app/admin/marketing/page.tsx` completely.
- Delete `app/admin/marketing/call/`.
- Delete the old admin preview panel.
- Delete the hard-coded lead-demo renderer and `lib/lead-demos.ts`.
- Delete the old demo assets under `public/demos/`.
- Delete the batch-search workflow and its search mutations/queries.
- Delete cold audit, portfolio, bulk, and follow-up marketing email actions.
- Delete the old marketing-only public query layer for `scraped_leads` audit
  tokens.
- Replace `convex/previewViews.ts` with concept-backed view mutations and
  queries, or fold those functions into the concept module.
- Remove unused marketing validators and rate-limit entries.
- Remove the old outbound audit routes `/audit/[token]` and
  `/audit/[token]/print` that read from `scraped_leads`.
- Remove the old `marketing_searches`, `scraped_leads`, and `preview_views`
  tables from the schema after their production rows are deleted.
- Regenerate Convex types after the contract step.

### Preserve because they are not the old outbound system

- `/audit` and `/audit/request/[token]`, which form the separate public
  self-service audit reached through direct or QR traffic.
- `public_audits` and `convex/publicAudits.ts` supporting that self-service
  route.
- `components/audit/AuditBanner.tsx` and
  `components/audit/AuditReport.tsx`, which are shared by the preserved
  self-service report. Delete only `AuditViewTracker` if no preserved route
  imports it after the outbound audit route is removed.
- Shared PageSpeed logic.
- Resend and all transactional client, authentication, project, agreement,
  billing, and notification email.
- Existing prospect, project, agreement, billing, portal, lead, and analytics
  data.
- Existing `activity_log` rows, including historical marketing actions. They
  are a harmless audit trail and are not exposed through a legacy marketing UI.

The self-service audit may be reconsidered separately, but it is not coupled to
this transition and must not be accidentally removed with the outbound system.

### Production data reset

This transition intentionally does not preserve old marketing searches, scraped
leads, outbound audit tokens, or legacy preview views in the application.

Before the destructive production mutation:

1. stop or verify completion of any running marketing workflows;
2. inventory exact row counts for `marketing_searches`, `scraped_leads`, and
   `preview_views`;
3. create one verified private Convex export as a rollback artifact;
4. delete only the inventoried rows from those three tables;
5. verify the tables are empty;
6. deploy the contracted schema and removed functions; and
7. verify no scheduler entry can call a removed marketing function.

The export is not migrated or exposed through a legacy UI. It exists only to
make the destructive cutover recoverable if the wrong production target or rows
were selected.

## Implementation sequence

### Step 1: one concept end to end in development

- First, run the real-iPhone sandboxed-iframe spike described in the rendering
  section. Choose `srcDoc` or the named direct-document fallback before building
  the surrounding workflow.
- Add `website_concepts` and its validators.
- Add admin create, update, upload, enrich, generate, publish, delete, list, and
  view functions.
- Build the replacement `/admin/marketing` form and concept list.
- Extract single-business Places and Firecrawl enrichment.
- Implement the OpenRouter generation action.
- Implement HTML validation.
- Make `/preview/[token]` database-backed using the rendering path selected by
  the real-iPhone spike.
- Adapt view tracking.
- Use Shay's Cleaning Services and Gator Constructors as the first two test
  inputs. No old URL compatibility is required.
- Generate and publish at least one complete concept in development.

Exit: a Facebook business can go from intake to an approved shareable homepage
in under ten minutes without an application deploy.

### Step 2: remove the old code in the same branch

- Remove every old UI, function, validator, renderer, asset, and route listed in
  the hard-transition section except the three legacy table definitions and the
  validators those definitions still require.
- Remove cold-email environment assumptions and close the commercial-email
  postal-address roadmap gate.
- Run targeted reference searches until nothing active imports the removed
  system.

Do not remove `marketing_searches`, `scraped_leads`, or `preview_views` from
`convex/schema.ts` in Step 2. They remain temporarily so the additive production
deployment can validate while production rows still exist. They have no UI or
callable application workflow at this point.

Exit: there is one `/admin/marketing` implementation and no legacy navigation
or callable cold-outreach endpoint.

### Step 3: destructive production cutover

- Run the exact-target inventory and private export.
- Deploy the additive `website_concepts` schema and new functions.
- Smoke-test one unpublished and one published concept.
- Delete the old production rows.
- Verify all three legacy tables are empty.
- Only then remove their schema definitions and remaining schema-only
  validators, regenerate Convex types, and deploy the contracted schema.
- Verify the new admin and public preview paths in production.

Exit: production has the concept generator and no old marketing-search,
cold-email, hard-coded preview, or outbound-audit data path.

### Step 4: update canonical documentation

- `../GROWTH.md`: Messenger-first concept workflow; cold audit email removed;
  no speculative system beyond the concept generator.
- `../ARCHITECTURE.md`: `website_concepts`, new enrichment action, sandboxed
  dynamic preview, and deleted tables/routes.
- `../OPERATIONS.md`: manual Facebook capture, human concept review, Messenger
  handoff, and manual prospect creation after real interest.
- `../BUSINESS.md`: replace the old outbound-pipeline capability description.
- `../ROADMAP.md`: close the commercial-email address gate and remove work made
  obsolete by deleting cold outreach.
- `../../CLAUDE.md`: generated HTML must remain scriptless and sandboxed.

Only document behavior as current after it has shipped and been verified.

## Verification

Run at minimum:

```text
npx convex codegen
npx tsc --noEmit
bun test
git diff --check
npm run build
```

Then verify:

1. Admin authentication still protects `/admin/marketing`.
2. A concept can be created with only business name and Facebook URL.
3. An incorrect Places match requires human correction.
4. Uploaded logo and photos render.
5. A concept without photos still produces a credible design.
6. Unsafe generated HTML is blocked.
7. A long concept scrolls and sizes correctly on a real iPhone in Safari and
   Messenger's in-app browser using the chosen rendering path.
8. An unpublished token returns not found.
9. Publishing makes the token available immediately.
10. `?notrack=1` does not increment views.
11. A normal visit increments the concept's view counters.
12. Unpublish/Delete removes public access.
13. Copy Link and Copy Messenger Draft work.
14. `/audit` and `/audit/request/[token]` still work.
15. Prospect, project, portal, billing, authentication, and transactional email
    paths are unchanged.
16. No active code references `marketing_searches`, `scraped_leads`, legacy
    demos, or cold marketing email actions.

## Stop rule

Do not add more infrastructure until this simple path produces real usage.

After at least ten concepts and one market-rate close, review whether repeated
needs justify any of the following:

- additional pages;
- concept revision history;
- more structured asset provenance;
- automatic inbound Messenger integration;
- follow-up reminders; or
- a broader opportunity queue.

Until that trigger, those features remain out of scope.
