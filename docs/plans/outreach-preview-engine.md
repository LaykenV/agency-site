# Facebook Lead Website Concept Generator

Status: **Core generator live; structured harvesting B0-B3 shipped; B4 and destructive cutover remain gated**
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
- **Step 3 — in progress.** The additive production deployment and real
  OpenRouter completion have been exercised. The remaining production and
  real-iPhone checks are tracked in
  [`outreach-preview-engine-cutover.md`](outreach-preview-engine-cutover.md).
  The legacy-row deletion and schema contraction remain gated on that smoke
  test, including the real-iPhone check.
- **Step 4 — done.** `GROWTH.md`, `ARCHITECTURE.md`, `OPERATIONS.md`,
  `BUSINESS.md`, `ROADMAP.md`, and `CLAUDE.md` updated.
- **Structured harvesting — B0 through B3 shipped 2026-08-11.** Google is identity
  only, the bounded source-backed harvest is live, and generation/publication
  stay gated while a harvest is running or awaiting review. Approved facts now
  reach regeneration through a mobile review gate, and source-observed website
  images are safely staged into Convex for explicit logo/photo approval. B4
  remains in this document under **Structured content harvesting plan**.

The 2026-08-11 review blockers are fixed:

- Places auto-confirmation requires one unique, independently corroborated
  candidate; uncertain and ambiguous matches still require human confirmation
- every paid generation path passes through one daily limiter
- brief, quote, phone, website, name, and asset changes revoke stale output
- generation and publication require a confirmed match and current research
- in-flight generations carry request IDs, so stale completions cannot overwrite
  newer edits
- the cutover runbook now uses supported Convex deployment syntax, explicit row
  counts, archive integrity testing, and export/count reconciliation

Local exit checks pass: Convex codegen, TypeScript, 188 tests, lint, production
build (172 routes), and `git diff --check`. The implementation is done; live
OpenRouter generation is now verified, while full production and
physical-device verification remain operational gates.

Three decisions were taken during implementation that this plan did not specify:

1. **A `matching` status was added.** The plan's status list had no state for
   "Places returned candidates, but none met the automatic confidence
   threshold", which the requirement to never silently attach the wrong
   business needs.
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

| Question                            | Decision                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Primary acquisition channel         | Facebook and Messenger                                                     |
| Lead discovery                      | Manual; outside the application                                            |
| Facebook scraping                   | None                                                                       |
| Automated Messenger sending         | None                                                                       |
| Admin route                         | Replace `/admin/marketing` in place                                        |
| Legacy route or legacy UI           | None                                                                       |
| Historical marketing-data migration | None                                                                       |
| Preview hosting                     | Existing application at `/preview/<token>`                                 |
| Preview subdomain                   | None                                                                       |
| Concept format                      | Fully custom self-contained HTML and CSS                                   |
| Default concept scope               | One substantial homepage                                                   |
| Model                               | Configurable OpenRouter model, initially `deepseek/deepseek-v4-flash-0731` |
| Public cold email                   | Removed                                                                    |
| Human review                        | Required before publishing                                                 |

## Scope

### Included

- One new database table for website concepts.
- One replacement `/admin/marketing` page.
- Manual lead intake.
- Google Places matching.
- Existing-website enrichment with Firecrawl and PageSpeed.
- Logo and image uploads or clipboard paste through existing Convex file storage
  patterns.
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

1. uploads or pastes those assets during the supervised research session, or
2. asks the interested owner to send the logo and several favorite photos.

The generator must still work without photography by using typography, color,
layout, and only the facts it has.

### 3. Enrich

After submission, one Convex action:

1. searches Google Places for the named business and location clues;
2. auto-confirms only one uniquely corroborated match: equivalent business name
   plus matching phone, website, or submitted city; a phone-and-website match
   may also resolve a name variant;
3. presents all candidates when evidence is missing, conflicting, closed, or
   ambiguous rather than silently attaching the wrong business;
4. records verified public facts needed for the concept;
5. uses the submitted website or matched Places website when present;
6. runs Firecrawl and PageSpeed against that website; and
7. produces a concise generation brief.

Reuse the existing Places, Firecrawl, and PageSpeed implementation where it is
useful, but extract only the single-business functions. Do not preserve the
batch-search workflow merely to reuse those functions.

Phase B0 tightened this boundary and is implemented: Places is used for live
identity matching and the exempt place ID only. Review text, ratings, review
counts, opening hours, and street addresses are neither persisted nor passed to
generation, and match candidates are fetched live rather than stored. Preview
images can be manual/pasted assets or individually approved website-source
candidates copied into Convex storage.

## Structured content harvesting plan

Status: **B0 through B3 implemented on 2026-08-11; B4 not implemented**

What is live: the corrected Google source boundary, the pure harvest core in
`lib/concepts/harvest.ts`, the additive schema fields, the `content_review`
status and its generation/publication gate, the `conceptHarvestGlobalDaily`
limiter, the Map-plus-six-Scrape action in `convex/concepts/harvest.ts`, and the
mobile factual approval-to-regeneration path.

What is not: the full three-site canary. Remote image URLs still cannot reach a
generated page directly; approved Convex copies can. Facebook-only content
capture remains a separate decision after this website path is proven.

The first successful production concepts showed that model output is no longer
the main bottleneck. Collecting trustworthy services, about copy, logos, and
photos is. This phase adds a bounded enrichment-and-approval workflow. It does
not add lead discovery, a general crawler, or automatic publishing.

### Outcome and exit condition

For a prospect with an existing website, the application should:

1. find the few pages most likely to contain useful business content;
2. extract source-backed fact, quote, logo, and photo candidates;
3. stop before generation for a short human review;
4. copy approved images into Convex storage;
5. build the generation brief only from approved facts and assets; and
6. show exactly what is still missing.

The phase succeeds when a normal small-business website can reach a reviewed
generation brief in under five minutes, without copying Google or Facebook
content into the prospect page and without Layken manually transcribing the
site.

### Research findings and locked decisions

#### Use Firecrawl Map plus targeted Scrape, not an open crawl

The current implementation scrapes only the homepage. That misses services,
about, gallery, FAQ, and contact pages on many small-business sites.

Firecrawl's `/v2/map` endpoint discovers URLs without scraping every page and
can cap results, ignore query parameters, and exclude subdomains. Its
`/v2/scrape` endpoint can return markdown, structured JSON, raw image URLs, and
branding/logo data. The implementation will therefore:

1. map at most 40 same-site URLs;
2. rank them locally using path, title, and description clues;
3. select the homepage plus at most five pages covering services, about,
   gallery/projects, contact, and FAQ; and
4. scrape those pages with a fixed schema.

Do not use Firecrawl Agent for this flow. It is autonomous, asynchronous, and
dynamically priced; the exact domain is already known. Do not use an unbounded
`/crawl` job either. Map plus a maximum of six synchronous page scrapes is
cheaper, easier to retry, and easier to explain from logs.

Normal enrichment may use Firecrawl's cache. An explicit **Refresh website
content** action bypasses the map/scrape cache. Retry `429` and transient `5xx`
responses with capped exponential backoff; permanent page failures are warnings
and do not discard successful pages.

#### Google Places is identity matching, not the content library

Google's current Places policy restricts storing Places content beyond named
exceptions; the place ID is explicitly exempt. Photos and reviews also carry
author attribution and direct-source requirements. The safest design is:

- use Places live to identify the business and show its current site as a
  recognition clue only;
- retain the confirmed `placeId` and the human/automatic match decision;
- do not persist review text or review-derived snippets;
- do not import Google photos;
- do not feed Google rating, review count, hours, address, or review themes into
  generated concepts unless a separate approved source supplies the same fact;
- clear candidate details after a match, and fetch uncertain candidates live
  when the admin match panel opens; and
- label the live candidate panel as Google Maps content with the required
  attribution and source links.

Before building the harvesting UI, remove `googleReviewSummary` from the
persistent brief and stop treating the current truncated review snippets as a
summary. Existing concept rows should retain the matched place ID but have
persisted Google candidate/detail content cleared by an explicit, separately
verified migration.

#### Facebook remains supervised capture

Meta's Page Public Content Access feature is required to read public content
from Pages the app does not manage, and it requires App Review for live access.
These prospects have not connected their Pages or granted the agency Page
permissions. Therefore Facebook is not a reliable backend enrichment source for
this workflow.

Keep upload and clipboard paste as the current fallback. After ten real
concepts, if Facebook-only content is still the dominant bottleneck, consider a
separate supervised browser helper that uses Layken's signed-in session to send
selected text and images into the same review queue. Do not add Graph API app
review, Page tokens, group scraping, or automated messaging to Phase B.

#### A public website is evidence, not proof of reuse rights

Website text and photographs can be copyrightable, and a business may itself be
using photographer, vendor, franchise, or stock-library assets under a limited
licence. Every harvested item is therefore labelled **Found on business
website**, not **business-owned**. Source URL and source page remain visible.
Layken explicitly approves an item for concept use; extraction alone never does.
This is a provenance and review control, not a legal ownership determination.

### Bounded harvesting workflow

```text
confirmed business identity
  -> resolve the verified website
  -> map up to 40 same-site URLs
  -> rank and scrape no more than 6 pages
  -> normalize and deduplicate candidates
  -> save one bounded harvest snapshot
  -> status: content_review
  -> Layken approves, edits, rejects, or skips
  -> approved images become Convex storage assets
  -> materialize the approved website-content brief
  -> generate
```

If there is no website, Firecrawl is blocked, or no usable candidates are
found, the concept stays buildable from Layken's notes and uploaded assets. Show
the failure or gap, but do not convert it into a terminal pipeline failure.

Generation behavior changes in one important way: when a harvest snapshot has
reviewable candidates, automatic generation pauses at `content_review`.
Generating before approval would spend an OpenRouter call on a page that is
immediately stale. A visible **Skip harvested content** control resolves the
gate when the extraction is irrelevant.

### URL selection rules

Always include the verified homepage. Rank remaining same-site pages in this
order:

1. services or products;
2. about, story, team, or company;
3. gallery, portfolio, projects, work, or menu;
4. contact, locations, or service area; and
5. FAQ or process.

Exclude login, account, cart, checkout, search, tag/category archives, privacy,
terms, accessibility, feeds, calendars, individual blog posts, duplicate query
variants, and files other than an explicitly selected PDF. Keep
`includeSubdomains: false` and `ignoreQueryParameters: true`. Canonicalize URLs
before deduplication and never leave the verified site's registrable domain.

When several URLs rank equally, prefer shorter paths and Map results whose
title or description contains the business name. Persist the selected page URL
and title, not the raw map response.

### Firecrawl extraction contract

The homepage request uses `onlyMainContent: false` so navigation, logo, social
links, and footer contact details remain visible. Other selected pages use
`onlyMainContent: true`. Request `markdown`, `images`, and structured `json` on
each page; request `branding` on the homepage only.

The JSON schema returns candidates, not an already-approved company profile:

```text
pageType: home | services | about | gallery | contact | faq | other
taglines[]
aboutSections[]
services[]: name, description?, evidence
serviceAreas[]: value, evidence
differentiators[]: value, evidence
sensitiveClaims[]: value, type, evidence
phones[]: value, evidence
hours[]: value, evidence
socialLinks[]: platform, url
quotes[]: text, author?, rating?, evidence
imageSelections[]: url, roleHint, alt?
```

Every factual candidate must carry a short source excerpt in `evidence`. The
server attaches the scraped page URL; it never trusts a model-supplied source
URL. `imageSelections[].url` is accepted only when it exactly matches an URL in
Firecrawl's raw `images` result or homepage branding result, preventing a
structured extractor from inventing a remote asset.

Normalize all output before storage:

- collapse whitespace and strip markup;
- cap any candidate value at 500 characters and evidence at 400;
- cap about copy at 1,200 characters;
- keep at most 60 factual candidates and 12 image candidates total;
- deduplicate services and claims by normalized text while preserving the best
  evidence;
- normalize phones and URLs for comparison, not display;
- flag conflicts with the submitted phone, Google identity, or another page;
  and
- discard a candidate with no evidence instead of asking Layken to trust it.

Credentials, insured/bonded/licensed claims, years in business, awards,
guarantees, prices, financing, statistics, and 24/7 or emergency availability
are `sensitiveClaims`. Each requires individual approval. They are never part
of a bulk **Approve standard facts** action.

### Data model: keep it on `website_concepts`

Do not add generalized content, crawler, or asset-manifest tables. The snapshot
is small, belongs to one concept, and has no life outside that concept. Add
optional fields to `website_concepts`:

```text
harvestRequestId?
harvestedAt?
harvestSourceUrl?
harvestedPages[]: url, title?
harvestCandidates[]:
  id, kind, value, detail?, evidence, sourceUrl, risk
harvestImageCandidates[]:
  id, remoteUrl, sourceUrl, roleHint, alt?, previewStorageId?, importError?
harvestWarnings[]
harvestReviewState?: pending | approved | skipped
harvestReviewedAt?
approvedHarvestCandidateIds[]
approvedWebsiteContent?:
  tagline?
  about?
  services[]: name, description?
  serviceAreas[]
  differentiators[]
  sensitiveClaims[]
importedWebsiteAssets[]:
  candidateId, storageId, kind, sourceUrl, importedAt
```

Candidate IDs are deterministic hashes of kind, normalized value, and source
page, so rerunning the same site produces stable review keys. The request ID
works like the existing generation request ID: a late scrape cannot overwrite
a newer refresh or an edited website URL.

Keep the snapshot well below Convex's 1 MiB document limit through the hard
caps above. Do not store raw markdown, raw HTML, complete Firecrawl responses,
or image bytes in the document. Files live in Convex storage.

Add one status, `content_review`. Add one daily fixed-window limiter,
`conceptHarvestGlobalDaily`, covering map, page scrapes, and refreshes. The
existing generation limiter does not protect enrichment because enrichment
runs before `queueGeneration`.

### Approved brief contract

Add structured `approvedWebsiteContent` to `ConceptBrief`. The prompt renders
it under **APPROVED WEBSITE CONTENT**, with services, about, service areas, and
claims as distinct fields. `refreshConceptBrief` overlays the latest approved
snapshot just as it currently overlays notes and assets.

Stop using `existingSiteSummary` as factual input. It currently gives the model
unreviewed homepage copy while simultaneously claiming the brief is the
complete approved fact set. Keep technology, performance, and brand colour as
research signals, but only approved structured candidates may supply services,
about copy, differentiators, or claims.

Website testimonials may become `approvedQuotes` only after individual review.
Preserve their source URL and source kind on the quote record. Google reviews
never enter this path. A quote without visible text and an attribution is not
approvable.

### Image staging, safety, and provenance

Generated concepts continue to use only Convex storage URLs. Never hotlink a
harvested remote image in generated HTML.

Remote thumbnails also should not be loaded directly in the admin browser: it
leaks the admin's request to the remote host and exposes the browser to
untrusted formats. Stage a capped preview through a dedicated Node-runtime
action:

1. the admin mutation validates that the candidate belongs to the current
   harvest and schedules an internal import action;
2. the action reads the remote URL from the database, never from action
   arguments supplied by the browser;
3. fetch only from the verified website's exact host or a narrow reviewed list
   of site-builder CDN hosts; do not allow generic wildcard CDNs;
4. leave an unrecognized cross-origin candidate as a URL-only item with a
   manual paste/upload fallback rather than fetching it server-side;
5. allow HTTPS only; reject credentials, custom ports, IP-literal hosts,
   localhost, and local/internal hostnames;
6. resolve DNS and reject loopback, private, link-local, multicast, and reserved
   IPv4/IPv6 ranges;
7. disable automatic redirects, follow at most three manually, and repeat host,
   URL, and DNS validation for every hop;
8. cap each response at 8 MiB and each concept at 12 staged candidates;
9. allow JPEG, PNG, and WebP only; reject SVG, HTML, GIF, and unknown types;
10. verify magic bytes instead of trusting the response `Content-Type`; and
11. store the Blob with `ctx.storage.store()`, then save the storage ID through
    an internal mutation.

The Node action has more memory than the default Convex runtime and Convex
officially supports fetching a Blob and storing it from an action. Failed
imports remain per-candidate warnings. A single broken image never fails the
text harvest.

DNS and URL validation run before every fetch and redirect. Imports are limited
to the exact bare/www business host plus a short exact-host list for Wix,
Squarespace, and Webflow assets; generic wildcard CDNs are rejected. The Node
worker still uses the platform resolver for the final HTTPS fetch, so the
remaining DNS check-versus-use limitation is documented rather than hidden.

Staged preview files are temporary. Approving one attaches the same storage ID
to `logoStorageId` or `assetStorageIds` and records its provenance. Rejecting,
refreshing, or deleting the concept removes any staged file not attached as an
approved asset. Replacing an imported logo removes both its storage file and
provenance entry.

Approval means **use this source-observed item in this concept**. The UI must
not label it owned, licensed, or verified unless Layken supplies that evidence.

### Admin review interface

Insert a **Harvested website content** card between Google matching and
approved images. It contains:

- source website and selected page links;
- extraction warnings and conflicts;
- editable tagline and about candidates;
- checkbox lists for services, service areas, and differentiators;
- a separate caution block for sensitive claims and testimonials;
- a staged logo/photo grid with **Use as logo**, **Add photo**, and **Reject**;
- **Approve selected**, **Reject remaining**, **Skip harvested content**, and
  **Refresh website content** actions; and
- a source link and evidence excerpt beside every fact.

Nothing is selected by default. A convenience action may select standard facts,
but never sensitive claims, quotes, or images. Edits are stored as the approved
value while retaining the original candidate and evidence for comparison.

The concept list shows **Content review** when this gate is pending. The review
card shows a compact completeness checklist:

```text
Identity       required, already resolved
Phone / CTA    recommended
Services       at least one recommended
About          recommended
Logo           optional
Photos         three useful images recommended
Proof          optional; never fabricate it
```

Only a pending harvest review blocks generation. Missing photography, about
copy, or proof remains advisory; typographic concepts and sparse honest pages
are valid outcomes.

### Lifecycle and invalidation rules

- A business-name or website change clears research, harvest, approval, staged
  images, generated HTML, and publication.
- A new harvest request clears the old pending review immediately and carries a
  request ID so stale results cannot save.
- Refreshing the same source blocks generation while the new snapshot is
  pending but may retain already approved images; approving the new snapshot
  replaces the prior approved text profile.
- Changing to a different website source removes the prior site's approved
  content, imported assets, provenance, and unattached staged previews.
- Approving, editing, rejecting, skipping, or importing an asset revokes any
  generated/published artifact until regeneration.
- Notes, manual uploads, and pasted assets continue to outrank harvested data.
- A submitted website outranks a website discovered during Places matching.
- Partial page failures persist as warnings and preserve successful candidates.
- A Firecrawl-wide failure leaves the concept in `draft` with a retry action;
  it does not erase manual inputs or the confirmed place ID.
- Deleting a concept removes manual assets, imported assets, and unattached
  staged previews.
- Activity log events record harvest started, completed, reviewed, skipped,
  refreshed, and website asset imported. Logs contain counts and source hosts,
  never raw page copy or image bytes.

### Implementation sequence

#### B0 — correct source boundaries first — **implemented 2026-08-11**

- ~~Remove persistent Google review snippets and Google-derived generation
  facts.~~ `address`, `googleRating`, `googleReviewCount`, `hours`, and
  `googleReviewSummary` are gone from `ConceptBrief`, the prompt, and the
  structure picker. The Places field masks no longer request reviews, ratings,
  or opening hours at all.
- ~~Refactor unresolved candidate display to fetch live Places details and add
  Google Maps attribution.~~ `concepts/enrich.listPlaceCandidates` is an admin
  action the review card calls when the match panel opens; the panel carries the
  attribution and a per-candidate Maps link.
- ~~Retain only confirmed place IDs after matching.~~ Candidates are never
  persisted. `confirmPlaceMatch` moved to an action and re-runs the current
  concept search before accepting the selected place ID. Google-returned phone,
  category, locality, website, matched name, ratings, and review counts are not
  stored or passed to generation.
- ~~Retire persisted `matchedGoogleMapsUrl`.~~ `lib/concepts/googleMaps.ts`
  rebuilds the link from the place ID. It is deterministic because
  `validateConceptHtml` allowlists the exact string at publish time.
- ~~Write, dry-run, and execute the explicit cleanup migration.~~
  `convex/concepts/migrations.ts`, dry-run by default. Development contained no
  concept rows. Production scanned one concept, cleared its old candidate,
  Maps URL, and deprecated brief content plus four match-log payloads, retained
  its place ID, and then returned `cleared: 0` and `activityLogsCleared: 0` on
  the verification dry run.

Exit: met in code and deployed data. Google is an identity provider, not an
undocumented content database.

#### B0 deployment sequence

The removed brief fields stay declared as deprecated optionals so pre-migration
rows still validate. The 2026-08-11 additive deployment and migration completed
steps 1-4:

1. Deploy. Existing rows keep their stale Google fields; nothing reads them.
2. `npx convex run concepts/migrations:clearPersistedGoogleContent '{"dryRun": true}'`
   and record the concept, Google-discovered website, and activity-log counts.
3. Re-run with `"dryRun": false`, then dry-run again — `cleared: 0` is the proof
   it finished.
4. Repeat both against `--prod`.
5. Only then contract: delete the DEPRECATED blocks in `convex/schema.ts` and
   `convex/validators.ts`, and delete `convex/concepts/migrations.ts`.

Step 5 remains a separate cleanup change. Convex validates the whole table at
deploy time; keeping contraction separate preserves the verified rollback path
for this release.

#### B1 — harvest core — **implemented 2026-08-11**

- ~~Add runtime-agnostic harvest types, normalizers, URL ranking, deduplication,
  conflict detection, completeness calculation, and focused tests.~~
  `lib/concepts/harvest.ts` and focused harvest tests. Remote JSON is parsed and
  capped at runtime; duplicate evidence moves with its actual source URL and ID.
- ~~Add optional schema fields and validators on `website_concepts`.~~ The
  harvest block first; B2 added `approvedWebsiteContent` and B3 added
  `importedWebsiteAssets` additively.
- ~~Split structured harvesting into `convex/concepts/harvest.ts`.~~ Network
  work there, database writes in `concepts/internal.ts` with the rest of the
  transactional surface, admin surface in `concepts/admin.ts`.
- ~~Implement Map plus at-most-six Scrape requests, request IDs,
  partial-failure warnings, the harvest limiter, and `content_review`.~~

Two additions the sequence did not name but B1 needs to stand on its own:

- Harvesting is triggered explicitly by `concepts/admin.harvestWebsiteContent`,
  not automatically after research. Automatic harvesting before the B2 review
  card exists would park concepts in `content_review` with nothing on screen to
  resolve them.
- `concepts/admin.skipHarvestReview` is the escape hatch from that gate. The
  plan puts skip in B2; without it in B1 the gate is a trap.
- `harvesting` plus `harvestRequestId` block generation and publication before
  candidates exist. An empty or failed refresh restores a deterministic
  draft/review/published state rather than leaving a skipped concept parked in
  `content_review`.

Firecrawl's Map and Scrape response shapes are parsed defensively — links as
objects or bare strings, images as strings or objects, branding logo under
several keys, and model JSON through a capped runtime parser. Returned metadata
URLs must remain on the selected bare/`www` host. The canary is what confirms
which shape this account actually returns.

Exit: met in code and unit tests. The three-site canary has not been run.

#### B2 — factual approval and prompt integration — **implemented 2026-08-11**

- ~~Build `ConceptHarvestReview.tsx` and admin review/skip/refresh mutations.~~
- ~~Materialize `approvedWebsiteContent` and wire it through `ConceptBrief`,
  prompt construction, lifecycle gating, and publication invalidation.~~
- ~~Remove factual use of `existingSiteSummary`.~~
- ~~Add the completeness checklist.~~

The production canary changed one workflow decision: matching and baseline
research now always stop at `draft`. Generation is explicit only. The review
panel shows every harvested fact, separates the sensitive subset, links the
source evidence, and makes **Approve and regenerate** the primary next action;
**Re-scan website** is secondary and replaces the current snapshot.

Exit: only approved website facts reach the prompt, and a skipped harvest is
explicit rather than accidental.

#### B3 — safe image staging and approval — **implemented 2026-08-11**

- ~~Add the Node-runtime remote-image action, DNS/redirect/type/size validation,
  storage cleanup, and provenance records.~~
- ~~Add staged image previews and logo/photo approval controls.~~ The mobile
  interface uses a swipeable strip rather than stacking twelve full-width cards.
- ~~Verify imported storage URLs remain the only new image URLs admitted by the
  existing HTML validator.~~ Remote URLs never render in the admin browser.

The TB Tree Service canary found one real response-negotiation issue: its
Next.js optimizer returns AVIF when requested. The staging worker deliberately
does not admit AVIF; it requests WebP/JPEG/PNG only. All 12 current candidates
returned valid WebP magic bytes and remained below the 8 MiB per-file cap.

Exit: a source-observed logo and photos can be reviewed and attached without a
manual download/upload cycle or remote hotlink.

#### B4 — canary and documentation

- Update architecture and operations docs only after the behavior ships.
- Run a development canary against one Wix/Squarespace-style CDN site, one
  multi-page WordPress/custom site, and one no-site or blocked-site lead.
- Deploy additively, then production-test one unsent concept before using the
  workflow in outreach.
- Inspect Firecrawl credits and logs after each canary; do not infer cost from a
  successful response.

Exit: all three fallback shapes work and no unapproved fact or remote URL reaches
a generated page.

### Verification matrix

Automated tests must cover:

- page ranking, same-site enforcement, query deduplication, and excluded paths;
- malformed/oversized Firecrawl JSON and missing evidence;
- candidate caps, stable IDs, deduplication, and conflicting phone/service data;
- sensitive-claim classification;
- stale harvest request rejection;
- generation blocked while review is pending and allowed after approve/skip;
- approval or asset changes revoking generated and published output;
- remote URL, DNS, redirect, MIME, magic-byte, size, and candidate-membership
  checks;
- staged-file cleanup without deleting an attached approved asset;
- generated HTML accepting imported Convex URLs and rejecting original remote
  URLs; and
- old rows with no harvest fields remaining valid after the additive deploy.

Manual verification must confirm:

1. the selected source pages are the pages a human would choose;
2. evidence links and excerpts make every approval defensible;
3. sensitive claims and quotes are never bulk-selected;
4. admin thumbnails are served from Convex, not the source host;
5. Refresh cannot let an older request overwrite a newer one;
6. Firecrawl/PageSpeed/image failures remain isolated;
7. one approved image can be removed without orphaning storage; and
8. the final prompt contains only manual inputs and approved website content.

Then rerun Convex codegen/typecheck, TypeScript, the full test suite, lint, the
production build, and `git diff --check`.

### Rollout and stop rule

This is an additive feature release, separate from the legacy-table destructive
cutover. Do not combine its first production canary with row deletion or schema
contraction.

Record these values for the first ten real concepts:

- pages selected and successfully scraped;
- standard candidates accepted/rejected;
- sensitive candidates accepted/rejected;
- useful images staged/approved;
- Firecrawl credits used;
- minutes from confirmed match to generation; and
- which missing content still required Facebook or owner follow-up.

Continue only if the median review-to-generation time is under five minutes and
the accepted candidates materially improve the page. If most extracted content
is rejected, simplify the schema or lower the page cap before adding another
source. Build a Facebook helper only if Facebook-only content remains the
largest measured bottleneck after those ten concepts.

### Explicit non-goals

- No web-wide search, business discovery, or competitor research.
- No arbitrary domain crawl and no background recrawl schedule.
- No automatic claim, quote, logo, or photo approval.
- No Google photo/review ingestion.
- No Facebook Graph API integration, Page token collection, or group scraping.
- No asset licensing determination.
- No generated image fallback in this phase.
- No new generalized content or asset tables.
- No automatic generation while harvest review is pending.

### Primary references checked for this plan

- [Firecrawl Scrape v2](https://docs.firecrawl.dev/api-reference/endpoint/scrape)
- [Firecrawl Map v2](https://docs.firecrawl.dev/api-reference/endpoint/map)
- [Firecrawl extractor selection](https://docs.firecrawl.dev/developer-guides/usage-guides/choosing-the-data-extractor)
- [Convex actions](https://docs.convex.dev/functions/actions)
- [Convex action file storage](https://docs.convex.dev/file-storage/store-files)
- [Convex limits](https://docs.convex.dev/production/state/limits)
- [Google Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Meta Page Public Content Access](https://developers.facebook.com/docs/features-reference/page-public-content-access/)
- [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [U.S. Copyright Office: websites and website content](https://www.copyright.gov/circs/circ66.pdf)
- [U.S. Copyright Office: photographs](https://www.copyright.gov/engage/photographers/)

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
