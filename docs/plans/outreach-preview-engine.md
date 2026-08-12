# Facebook Lead Website Concept Generator

Status: **Muse and single-pass evidence release ready; C5/B4 production canaries and destructive cutover remain gated**
Owner: Layken
Written: 2026-08-10
Last reviewed: 2026-08-12

## Implementation state (2026-08-12)

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
  `BUSINESS.md`, `ROADMAP.md`, and `CLAUDE.md` updated for the generator and
  again for Phase C behavior.
- **Structured harvesting — B0 through B3 shipped 2026-08-11.** Google is identity
  only, the bounded source-backed harvest is live. Phase C converted harvest
  approval to Luna; B4 (three-site canary) remains gated.
- **Facebook Pack — Phase C C1–C4 implemented.** Supervised Facebook
  capture is the primary content path. Layken pastes logos, business photos,
  screenshots, and text; one medium-reasoning `openai/gpt-5.6-luna` pass
  classifies the material, selects visual roles, extracts facts, and flags
  conflicts. Server rules admit source-backed, non-conflicting evidence. Muse
  Spark 1.2 generates the page, then Luna audits the finished claims.
  Candidate-by-candidate human approval is gone for new work; final concept
  review before publication remains required. C5 remains gated.

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

Local exit checks for Phase C C1–C4: Convex codegen with typecheck, TypeScript,
full unit suite, lint, and production build. Live OpenRouter pack analysis,
claim audit, and production canary remain C5 operational gates.

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
  -> confirm its identity with Google Places
  -> paste a Facebook Pack: logo, photos, screenshots, and text
  -> let Luna classify the pack, select imagery, extract evidence, and flag conflicts
  -> optionally fill remaining gaps from an existing website
  -> let Muse Spark 1.2 generate one fully custom homepage concept
  -> let Luna audit the generated claims against the evidence
  -> review the final concept on mobile and desktop
  -> publish /preview/<private-token>
  -> copy the link and Messenger draft
```

This is a website-concept tool, not a CRM, outreach platform, Facebook scraper,
or general marketing automation product.

## Locked decisions

| Question                            | Decision                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Primary acquisition channel         | Facebook and Messenger                                                           |
| Lead discovery                      | Manual; outside the application                                                  |
| Facebook collection                 | Supervised clipboard/upload capture; no crawling or Graph API                    |
| Primary content source              | Facebook Pack                                                                    |
| Secondary content source            | Optional existing-website harvest used only to fill gaps                         |
| Automated Messenger sending         | None                                                                             |
| Admin route                         | Replace `/admin/marketing` in place                                              |
| Legacy route or legacy UI           | None                                                                             |
| Historical marketing-data migration | None                                                                             |
| Preview hosting                     | Existing application at `/preview/<token>`                                       |
| Preview subdomain                   | None                                                                             |
| Concept format                      | Fully custom self-contained HTML and CSS                                         |
| Default concept scope               | One substantial homepage                                                         |
| Generation model                    | OpenRouter `meta/muse-spark-1.2`, configurable through `OPENROUTER_MODEL`        |
| Evidence and vision model           | OpenRouter `openai/gpt-5.6-luna`                                                 |
| Evidence approval                   | One Luna extraction/conflict pass plus server admission; no manual fact approval |
| Visual selection                    | Luna selects the logo, hero, gallery, and rejects unusable or duplicate material |
| Public cold email                   | Removed                                                                          |
| Human review                        | One final concept review remains required before publishing                      |

## Scope

### Included

- One new database table for website concepts.
- One replacement `/admin/marketing` page.
- Manual lead intake.
- Google Places matching.
- Existing-website enrichment with Firecrawl and PageSpeed.
- A primary Facebook Pack intake for pasted/uploaded logos, business photos,
  screenshots, and copied text.
- Luna vision classification, OCR, structured evidence extraction, conflict
  flagging, automatic visual selection, and final generated-claim audit.
- Logo and image storage through existing Convex file-storage patterns.
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
- Initial logo and business photos, optional; the primary asset intake happens
  in the Facebook Pack after identity matching.

Facebook Page extraction is not a server dependency. An arbitrary Page cannot
be reliably or safely scraped. The application does not crawl the Page or
require a Graph API connection. Layken opens the Page in the signed-in browser
and pastes or uploads selected material into one Facebook Pack during the
supervised research session. The pack accepts logos, business photos,
screenshots containing useful context, and copied text. If the Page is sparse,
Layken can ask the interested owner to send a logo and favorite photos.

The generator must still work without photography by using typography, color,
layout, and only the facts it has.

### 3. Enrich

Enrichment is ordered deliberately:

1. searches Google Places for the named business and location clues;
2. auto-confirms only one uniquely corroborated match: equivalent business name
   plus matching phone, website, or submitted city; a phone-and-website match
   may also resolve a name variant;
3. presents all candidates when evidence is missing, conflicting, closed, or
   ambiguous rather than silently attaching the wrong business;
4. accepts the supervised Facebook Pack as the primary content source;
5. uses Luna to classify images, choose the logo/hero/gallery, read context
   screenshots and text, and compile a source-linked evidence pack;
6. applies server admission rules to source-backed facts and withholds conflicts
   without requiring Layken to approve individual facts or assets;
7. optionally uses the submitted website or matched Places website to fill
   gaps through Firecrawl and PageSpeed; and
8. produces one machine-reviewed generation brief.

Reuse the existing Places, Firecrawl, and PageSpeed implementation where it is
useful, but extract only the single-business functions. Do not preserve the
batch-search workflow merely to reuse those functions.

Phase B0 tightened this boundary and is implemented: Places is used for live
identity matching and the exempt place ID only. Review text, ratings, review
counts, opening hours, and street addresses are neither persisted nor passed to
generation, and match candidates are fetched live rather than stored. Preview
images can be manual/pasted assets or Luna-selected website-source candidates
copied into Convex storage. Phase C replaced the manual approval UI with common
source-backed server admission; legacy `pending` harvest rows keep the old
surface until they are resolved or migrated.

## Structured content harvesting plan

Status: **B0 through B3 implemented; source-text admission added 2026-08-12; B4 canary not run**

What is live: the corrected Google source boundary, the pure harvest core in
`lib/concepts/harvest.ts`, the additive schema fields, the
`conceptHarvestGlobalDaily` limiter, the Map-plus-six-Scrape action, exact
value/evidence verification against each page's returned Markdown, automatic
staging and Luna image selection, and the legacy `content_review` path for
pre-Phase-C pending rows only.

What is not: the full three-site canary (B4). Remote image URLs still cannot
reach a generated page directly; Convex copies can. Facebook Pack is primary;
this website path is secondary gap-fill.

The first successful production concepts showed that model output is no longer
the main bottleneck. Collecting trustworthy services, about copy, logos, and
photos is. This phase added a bounded enrichment-and-approval workflow. Phase C
replaces its manual candidate approval with source-backed server admission, but does not add lead
discovery, a general crawler, or automatic publishing.

### Outcome and exit condition

For a prospect with an existing website, the shipped Phase B path:

1. find the few pages most likely to contain useful business content;
2. extract source-backed fact, quote, logo, and photo candidates;
3. stop before generation for a short human review;
4. copy approved images into Convex storage;
5. build the generation brief only from approved facts and assets; and
6. show exactly what is still missing.

The phase succeeds when a normal small-business website can reach a reviewed
generation brief in under five minutes without Layken manually transcribing the
site. Phase C changes who performs candidate approval, not the source-backed
harvest contract or the rule that remote source URLs never reach generation.

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

#### Facebook remains supervised capture and becomes primary in Phase C

Meta's Page Public Content Access feature is required to read public content
from Pages the app does not manage, and it requires App Review for live access.
These prospects have not connected their Pages or granted the agency Page
permissions. Therefore Facebook is not a reliable backend enrichment source for
this workflow.

Production use confirmed that Facebook-only content is the dominant bottleneck.
Phase C therefore promotes upload and clipboard paste from fallback to the
primary enrichment flow. Layken remains in control of what leaves the signed-in
Facebook session: there is no automated Page navigation, browser extraction,
Graph API app review, Page token, group scraping, or automated messaging.

#### A public website is evidence, not proof of reuse rights

Website text and photographs can be copyrightable, and a business may itself be
using photographer, vendor, franchise, or stock-library assets under a limited
licence. Every harvested item is therefore labelled **Found on business
website**, not **business-owned**. Source URL and source page remain visible.
In Phase B, Layken explicitly approved an item for concept use. In Phase C,
server rules admit exact-excerpt facts and Luna selects usable imagery; source
provenance remains recorded. This is a provenance control, not a legal ownership
determination.

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

The production path established that Facebook-only content remains the larger
bottleneck. Phase C is the resulting decision. Website harvesting remains worth
keeping only when it materially fills gaps after Facebook Pack analysis; do not
expand it into a broader crawler.

### Explicit non-goals for Phase B

The manual-approval and pending-review restrictions below describe the shipped
Phase B implementation. Phase C intentionally supersedes those restrictions
with source-backed server admission and machine-reviewed readiness states.

- No web-wide search, business discovery, or competitor research.
- No arbitrary domain crawl and no background recrawl schedule.
- No automatic claim, quote, logo, or photo approval in the Phase B path.
- No Google photo/review ingestion.
- No Facebook Graph API integration, Page token collection, or group scraping.
- No asset licensing determination.
- No generated image fallback in this phase.
- No new generalized content or asset tables.
- No automatic generation while the Phase B harvest review is pending.

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

## Facebook Pack plan

Status: **Phase C C1–C4 implemented 2026-08-11; C5 canary and cleanup gated**

Facebook Pack is the primary evidence and asset path for this product. It is a
supervised intake, not a Facebook scraper: Layken opens the prospect's Page,
chooses useful material, and pastes or uploads it into the concept. Existing
website harvesting remains available only as a secondary gap-fill path.

### Locked Phase C decisions

1. Luna may extract every evidence category, including testimonials,
   credentials, insurance, years, prices, guarantees, awards, superlatives, and
   emergency claims. Server rules admit candidates with exact excerpts and
   withhold conflicts. There is no manual fact-approval queue.
2. Luna automatically chooses the logo, hero, gallery, and supporting images
   and rejects screenshots, duplicates, or unusable imagery from page display.
   Layken can remove a mistake or add more material, but does not select every
   visual role manually.
3. Layken still reviews the finished concept and explicitly publishes it. There
   is no automatic publication.
4. There is no preliminary model spike or separate F0 phase. Implementation
   begins with the bounded storage and intake contract, then exercises the real
   OpenRouter call as part of the first vertical slice.
5. `openai/gpt-5.6-luna` is the vision, extraction, conflict, and final
   factual-audit model. `meta/muse-spark-1.2` is the HTML generation model, so
   the final audit is performed by a model that did not write the page.

### Primary workflow

```text
confirmed business identity
  -> paste/upload one bounded Facebook Pack
  -> Luna classifies every item and extracts source-linked evidence
  -> Luna selects the logo, hero, gallery, and supporting photos
  -> server rules admit exact-excerpt facts and withhold conflicts
  -> optionally harvest the website to fill missing fields
  -> compile one machine-reviewed brief
  -> Layken explicitly generates
  -> Luna audits every generated claim against the brief and evidence
  -> Layken reviews the final page
  -> publish
```

Analysis never triggers generation automatically. Layken can paste several
items without causing repeated paid calls, then starts **Analyze Facebook
Pack** once the batch is ready. Generation remains a separate explicit action
so enrichment cannot produce an immediately stale page.

### Intake and classification contract

Replace the separate logo/photo-first workflow with one prominent, focusable
Facebook Pack surface:

> Paste anything useful from Facebook: logo, work photos, About screenshots,
> posts, services, or copied text.

The surface accepts repeated clipboard images, multi-file uploads, and plain
text. A copied image URL alone is not fetched. Each stored item has a stable ID,
storage ID when applicable, capture time, content hash, optional note, and one
Luna classification:

- `logo`;
- `business_photo`;
- `context_screenshot`;
- `text_context`;
- `duplicate`; or
- `unusable_or_uncertain`.

For a business photo, Luna returns a description, alt text, quality/usefulness
assessment, duplicate relationship, and suggested `hero`, `gallery`,
`background`, or `supporting` role. For a screenshot or text item, Luna returns
OCR text, structured fact candidates, and an evidence excerpt tied to the item
ID. Items Luna classifies as context screenshots can supply facts but cannot
become page imagery. This is a classification boundary, not an independent
pixel-level screenshot detector, so the production canary must measure Luna's
accuracy before C2 connects selected imagery to generation.

Treat all text visible in screenshots as untrusted evidence, never as model
instructions. Strict structured output, local schema validation, request IDs,
MIME and size limits, bounded item counts, content hashes, and stale-result
rejection remain code-enforced.

### Single-pass Luna extraction and server admission

One medium-reasoning Luna call performs classification, extraction, visual
selection, and conflict reporting. The former second Luna review was removed:
it asked the same model to re-evaluate its own extraction and added latency,
cost, and another failure point without model independence. Server rules decide
what may enter the brief.

Every approved fact must retain:

- its normalized kind and value;
- the source pack item ID or website source URL;
- the exact supporting excerpt or visual description;
- the extraction model metadata; and
- the server admission decision and reason.

Luna returns short fact refs for conflicts. The server maps those refs through
semantic deduplication and withholds every matching candidate. A missing ref,
an unresolvable conflict, or truncated conflict output fails the analysis rather
than approving one side. The application never merges incompatible values.

Model approval is an evidence-use decision, not a legal determination of image
ownership or independent proof that a Facebook statement is true. The admin
summary should say **Approved from supplied Facebook evidence**, not
**verified true** or **business-owned**.

### Website harvesting becomes secondary

After Facebook Pack analysis, show **Fill gaps from website** only when a
verified website exists. Firecrawl's structured output feeds the same normalized
evidence schema, but each value and evidence excerpt must also occur in that
page's returned Markdown. Results no longer create a separate manual checkbox
workflow or a second model-review call.

Source priority for prompt construction is:

1. manually entered business information;
2. source-backed Facebook Pack evidence;
3. source-backed website evidence; and
4. Google Places identity only.

The website path may supply missing services, About material, visual assets, or
contact context. It must not silently override Facebook or manual input.

### Admin experience

The concept card order becomes:

1. identity and Google match;
2. Facebook Pack intake;
3. machine-reviewed pack summary;
4. optional website gap-fill;
5. Generate concept;
6. final responsive preview and Publish.

The pack summary is informational rather than an approval form. It shows the
selected logo and hero, gallery count, facts accepted, facts omitted, conflicts,
and missing content. The available corrections are remove an item, paste more,
reanalyze, or edit the manual brief. There are no fact checkboxes, **Needs
care** section, or **Approve selected** action.

### Lifecycle and data model

Keep the bounded pack on `website_concepts`; do not add a generalized content,
Facebook, crawler, or asset-manifest table. Image bytes remain in Convex
storage. Add only bounded metadata and compiled evidence, including fields
equivalent to:

```text
facebookPackItems[]
facebookPackRequestId?
facebookPackState?: collecting | analyzing | ready | failed
facebookPackAnalyzedAt?
facebookEvidence?
facebookReviewModel?
facebookReviewPromptVersion?
facebookReviewError?
```

Starting a new analysis invalidates older in-flight results. Adding, removing,
or replacing pack material invalidates the compiled evidence, generated HTML,
and publication until reanalysis and regeneration. A website gap-fill does the
same. Deleting a concept removes pack storage and unattached derivatives.

Replace the user-facing `content_review` gate with analysis/readiness states
after website harvesting has moved to shared server admission. Do not contract
the old validators or fields until production rows have been migrated and the
new path has passed its canary.

### Final generated-claim audit

After the HTML generator and deterministic HTML validator succeed, Luna gets
the generated copy, compiled brief, and evidence map. It extracts the factual
claims in the page and confirms that each is supported. An unsupported or
materially changed claim fails the draft and may trigger one bounded
regeneration. A second failure is shown as an actionable generation error; it
is never published automatically.

This audit complements rather than replaces the deterministic restrictions on
scripts, forms, contact data, asset hosts, placeholders, and approved quotes.

### Phase C implementation sequence

#### C1 — bounded pack intake and storage — **implemented 2026-08-11**

- ~~Add the additive validators and `website_concepts` fields.~~
  `facebookPackItems`, `facebookPackRequestId`, `facebookPackState`,
  `facebookPackAnalyzedAt`, `facebookPackModel`, `facebookPackPromptVersion`,
  and `facebookPackError`, all optional, so pre-pack rows still validate.
- ~~Add the unified paste/upload/text surface and compact item gallery.~~
  `ConceptFacebookPack.tsx`. One textarea takes both clipboard images and copied
  text — images are intercepted on paste, text falls through — and the gallery
  is a swipeable strip on a phone and a grid at `sm`. It sits directly under the
  Google match card, ahead of website harvesting.
- ~~Enforce file, MIME, count, size, hash, deletion, and stale-request rules.~~
  20 items, 12 of them images, 8 text; JPEG/PNG/WebP only; 6 MiB a file;
  duplicate content hashes refused. A rejected upload is deleted before the
  error is thrown, and deleting a concept now removes pack files too.
- ~~Wire the first real Luna request through the existing OpenRouter
  integration.~~ `convex/concepts/facebookPack.ts`, a Node action, with the new
  `conceptPackAnalyzeGlobalDaily` ceiling reserved transactionally in
  `queueFacebookPackAnalysis`.

Five decisions this section did not specify:

1. **Images are sent as data URLs, not Convex storage links.** The model then
   sees exactly the bytes the action verified, with no window between the
   magic-byte check and a third-party fetch, and screenshots of a prospect's
   Page are never handed out as URLs that outlive the request. The cost is
   request size, which is why `PACK_ANALYSIS_MAX_TOTAL_BYTES` exists and an
   over-budget pack is refused rather than silently trimmed.
2. **Duplicate detection uses Convex's own SHA-256.** `ctx.db.system.get` on the
   storage ID returns the hash, size, and content type of the file Convex
   actually stored, so the declared type and the duplicate key are both
   server-side facts rather than browser claims.
3. **Alt text, visual role, and quality are stored only for `logo` and
   `business_photo`.** A screenshot that arrives with `roleHint: "hero"` keeps
   its description and loses the display hints, so no later change can read a
   hint on a screenshot as permission to display it.
4. **An unrecognized classification becomes `unusable_or_uncertain`.** Defaulting
   toward the most useful-sounding neighbour is exactly how a screenshot would
   reach a page.
5. **Changing pack material does not yet revoke generated HTML.** Nothing in the
   pack reaches a generation prompt in C1, so unpublishing a page because a
   screenshot was pasted would be confusing rather than careful. C2
   materializes admitted evidence into `ConceptBrief` and must add that
   invalidation in the same change; `packChanged` in `concepts/admin.ts` carries
   the note.

Exit: met. A concept collects a mixed pack, persists it, and classifies it, and
`canUsePackItemAsPageImagery` admits only `logo` and `business_photo`. Local
checks pass: Convex codegen with typecheck, TypeScript, 210 tests, lint,
production build, and `git diff --check`. A real OpenRouter classification call
against a live pack has not been run; that is C5's canary.

#### C2 — Luna classification, selection, and evidence admission — **implemented; collapsed to one pass 2026-08-12**

- ~~Add strict structured schemas for per-item classification and extracted
  evidence.~~ `lib/concepts/evidence.ts`, pack fact extraction in
  `lib/concepts/facebookPack.ts`, and `conceptFacebookEvidenceValidator`.
- ~~Add automatic logo, hero, gallery, duplicate, and reject decisions.~~
  `selectPackImagery` and `canUsePackItemAsPageImagery`.
- ~~Add automatic evidence admission for all fact categories.~~ The original
  second Luna turn was retired on 2026-08-12. Luna now extracts exact excerpts
  and conflict refs once; `resolveEvidenceLocally` admits or withholds them.
- ~~Materialize the reviewed Facebook evidence into `ConceptBrief`.~~
  `approvedFacebookContent`, pack imagery resolution in `generate.ts`, and
  pack-change invalidation in `packChanged`.
- ~~Use Facebook evidence when selecting the page shape.~~ Fit and content
  richness combine the primary Facebook evidence with website gap-fill, so a
  rich Facebook-only concept cannot be mistaken for an empty brief.

Exit: met in code and unit tests. A Facebook-only business reaches a generation
brief without a manual candidate-approval step.

#### C3 — primary UI and final factual audit — **implemented 2026-08-11**

- ~~Make Facebook Pack the primary content card and generation prerequisite once
  analysis has started.~~ Generation and publication gate on unanalyzed pack
  material; list shows pack state. The gate is fail-closed: a failed, partial, or
  unknown state with pack items is not equivalent to `ready`.
- ~~Replace approval checkboxes with the compact pack summary and correction
  controls.~~ `ConceptPackSummary` and `ConceptEvidenceReport`.
- ~~Add the post-generation Luna claim audit and bounded retry.~~
  `lib/concepts/claimAudit.ts` and the two-attempt loop in `generate.ts`. Empty,
  malformed, over-limit, provider-error, truncated, and partially-read audit
  results fail rather than pass.
- ~~Keep explicit Generate and Publish actions.~~ Analysis never starts
  generation.

Exit: met in code. The only required human review is the finished page before
publication.

#### C4 — convert website harvesting to gap-fill — **implemented 2026-08-11**

- ~~Route harvested facts through the common evidence contract and staged
  images through Luna.~~ Structured values and excerpts must occur in the same
  page's returned Markdown; `imageClassify.ts` handles staged images.
- ~~Keep generation locked until asynchronous website image staging and Luna
  selection resolves.~~ `harvestImageAnalysisState` separates the image pass
  from the completed Firecrawl/fact-review request and resolves visibly to
  `ready` or `failed`.
- ~~Remove the manual standard/sensitive fact review and separate image approval
  flow.~~ New harvests use exact source-text admission; legacy `pending` rows
  keep the old UI until C5 cleanup.
- ~~Replace `content_review` behavior with shared analysis/readiness behavior.~~
  New harvests land as `approved`/`skipped`; `content_review` remains only for
  legacy pending rows.
- ~~Preserve website provenance, bounded Firecrawl behavior, remote-image safety,
  and failure isolation.~~ Every admitted value now proves exact source-text
  presence before storage.

Exit: met in code. Facebook is visibly primary, website enrichment is optional,
and neither source requires line-by-line approval for new work.

#### C5 — canary, migration, and cleanup

- Test a photo-rich Page, a screenshot/text-heavy Page, a sparse Page, a Page
  with conflicting claims, a business with both Facebook and a website, and a
  no-website business.
- Verify on desktop, real iPhone Safari, and Messenger's in-app browser.
- Run the additive production deployment and exercise real OpenRouter calls.
- Migrate existing pending/approved website review state after verifying row
  counts and backups.
- Delete the old approval UI, mutations, validators, and status only after the
  new production path succeeds.

Exit: no screenshot appears as page imagery, Luna-selected assets render in the
intended roles, every generated claim passes the evidence audit, a Facebook-only
concept reaches generation in under five minutes, and publication still
requires Layken's final review.

### Phase C verification

Automated coverage must include mixed clipboard intake, item caps, MIME and
size rejection, duplicate hashes, stale analysis rejection, screenshot/photo
separation, structured-response validation, source linkage, automatic
sensitive-claim approval/rejection, conflict handling, asset-role selection,
invalidation, final-claim audit failure, bounded regeneration, storage cleanup,
and old rows remaining valid during the additive deployment.

The canary must demonstrate that:

1. screenshots never become page imagery;
2. every fact category can be admitted or withheld without a manual queue;
3. selected logos, heroes, and gallery images are usable;
4. website evidence only fills gaps and does not silently override Facebook;
5. unsupported generated claims block the draft;
6. analysis never starts generation implicitly; and
7. the final Publish action remains manual.

### 4. Generate

The generation action sends the machine-reviewed brief and Luna-selected asset
URLs to a configurable OpenRouter model. Call OpenRouter directly from the
action rather than adding an incompatible AI SDK provider solely for this
feature.

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
- gallery or work examples when Luna-selected photos exist;
- reviews or proof only when admitted from exact source evidence;
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
Phase C adds a Luna audit that checks all generated claims, including
credentials, years in business, insurance, service areas, prices, guarantees,
testimonials, and superlatives, against the compiled evidence. These categories
do not create a manual fact-approval queue.

The admin review card renders the concept in a sandboxed iframe using `srcDoc`.
It provides mobile and desktop widths without generating separate screenshot
files.

Actions:

- Regenerate.
- Edit the input/brief and regenerate.
- Publish.
- Delete.

There is no automated publication. Layken reviews every finished concept; this
final page review is the only required human approval after Phase C ships.

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
facebookPackItems[]?
facebookPackRequestId?
facebookPackState?
facebookEvidence?
researchBrief?
generatedHtml?
status: draft | enriching | matching | harvesting | content_review | generating | review | published | failed
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
- `../OPERATIONS.md`: supervised Facebook Pack capture, server evidence admission,
  final human concept review, Messenger handoff, and manual prospect creation
  after real interest.
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
