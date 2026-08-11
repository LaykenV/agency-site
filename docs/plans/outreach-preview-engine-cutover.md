# Concept generator — production cutover runbook

Status: **production smoke in progress; destructive steps remain gated**
Owner: Layken
Written: 2026-08-10
Last reviewed: 2026-08-11

Steps 1, 2, and 4 of `outreach-preview-engine.md` are implemented and verified
locally. The implementation passed Convex codegen, TypeScript, 176 tests, lint,
the 172-route production build, and `git diff --check` on 2026-08-11.

This file is the remaining Step 3. It has two gates:

- **Approved now:** steps 0–6 — set the production key, inventory and back up
  the legacy data, deploy additively, and smoke-test production.
- **Not approved in advance:** steps 7–8 — clear legacy rows and contract the
  schema only after every step-6 check passes, including the real-iPhone
  Safari/Messenger test and a real OpenRouter completion.

The production OpenRouter request and completion are verified. The rest of the
step-6 checklist, including the physical-iPhone path, is still pending unless
Layken records it as passed below.

Structured content harvesting B0-B3 shipped additively on 2026-08-11. Its
source-boundary cleanup used its own verified exports and migration; it did not
execute this runbook's legacy-table deletion or schema contraction. B2-B4 and
the separate Firecrawl canary remain in `outreach-preview-engine.md` under
**Structured content harvesting plan**.

It is written to be executed top to bottom at a terminal. Every command names
its target explicitly, because the single failure that matters here is running a
deletion against the wrong deployment.

---

## 0. Before anything

Confirm which deployment you are pointed at. Do this even if you are certain.

```bash
npx convex env list --prod
npx convex dashboard --prod
```

The dashboard URL that opens is the deployment every `--prod` command below
will hit. If it is not the production deployment for `acadianawebdesign.com`,
stop.

---

## 1. Set the OpenRouter credential

The generator cannot run without this. It is a new variable — nothing in the
repository has used OpenRouter before.

```bash
# Development
npx convex env set OPENROUTER_API_KEY sk-or-v1-...

# Production
npx convex env set --prod OPENROUTER_API_KEY sk-or-v1-...
```

Optional. The default is `deepseek/deepseek-v4-flash-0731`, pinned in
`convex/concepts/generate.ts`:

```bash
npx convex env set --prod OPENROUTER_MODEL anthropic/claude-sonnet-5
```

Verify the three existing enrichment keys are present in production:

```bash
npx convex env list --prod | grep -E "GOOGLE_PLACES_API_KEY|FIRECRAWL_API_KEY|GOOGLE_PAGESPEED_API_KEY"
```

---

## 2. Confirm nothing is still running

The retired workflow component could still hold a scheduled marketing job from
before the cutover.

In the production dashboard:

- **Functions → Scheduled** — cancel anything named `marketing.*`.
- **Data → `marketing_searches`** — no row should have status `searching`,
  `scraping`, or `analyzing`. If one does, it belongs to a workflow that will
  never resume, since its functions no longer exist. That is fine; note it and
  continue.

---

## 3. Inventory the exact rows

Record these three numbers before deleting anything. They are what you check the
export against. `convex data` defaults to only 100 rows, so the explicit high
limit and JSON count below matter.

```bash
for concept_table in marketing_searches scraped_leads preview_views; do
  CONCEPT_TABLE="$concept_table" npx convex data --prod "$concept_table" --limit 1000000 --format json \
    | CONCEPT_TABLE="$concept_table" node -e '
      let input = "";
      process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const count = JSON.parse(input).length;
        console.log(`${process.env.CONCEPT_TABLE}: ${count}`);
        if (count === 1000000) {
          console.error("Reached the explicit limit; this is not an exact count. Stop.");
          process.exitCode = 1;
        }
      });
    '
done
```

Write the counts down:

| Table                | Rows before |
| -------------------- | ----------- |
| `marketing_searches` |             |
| `scraped_leads`      |             |
| `preview_views`      |             |

---

## 4. Take the rollback export

This is the only artifact that makes the deletion recoverable. It is a private
backup file — it is never imported back into the application or exposed through
any UI. It exists solely in case the wrong deployment or the wrong rows were
selected.

```bash
CONCEPT_BACKUP_PATH=/Users/laykenvarholdt/Documents/awd-cutover-backup-2026-08-10.zip
npx convex export --prod --path "$CONCEPT_BACKUP_PATH"
```

Verify archive integrity, then count the exported JSONL rows. An export you did
not test and reconcile is not a backup:

```bash
unzip -t "$CONCEPT_BACKUP_PATH"
for concept_table in marketing_searches scraped_leads preview_views; do
  exported_count=$(unzip -p "$CONCEPT_BACKUP_PATH" "$concept_table/documents.jsonl" | wc -l | tr -d ' ')
  echo "$concept_table: $exported_count"
done
```

All three exported counts must exactly equal the counts from step 3. Empty
tables legitimately have zero rows; a missing archive member or a mismatch is a
hard stop. The path above keeps the backup outside the repository.

---

## 5. Deploy the additive schema and new functions

This deployment adds `website_concepts` and the `convex/concepts/` module and
removes the old marketing functions. It does **not** touch the three legacy
tables, so it is safe to run while their rows still exist.

```bash
npx convex deploy --typecheck enable
```

`convex deploy` targets production by default; this CLI does not accept a
`--prod` flag for `deploy`. Read the target printed by the command before
confirming. If `CONVEX_DEPLOY_KEY` is set to a preview key, stop and unset it in
that terminal before continuing.

Then deploy the frontend as usual (push to `main`, or `vercel --prod`).

---

## 6. Smoke-test before deleting anything

Do this on production, with real credentials, before the irreversible step.

1. Open `/admin/marketing`. Confirm it loads and is still admin-gated — sign out
   and confirm you are redirected away.
2. Create a concept for a business you know. Use **Shay's Cleaning Services** or
   **Gator Constructors**; their inputs were the original test cases.
3. Confirm a uniquely corroborated Google match proceeds automatically, while
   an uncertain or ambiguous result shows the candidate confirmation step.
4. Upload a logo and a photo, then paste another image with the Paste photos
   control. Confirm all thumbnails render.
5. Generate. Confirm the page appears in the review frame at all three widths.
6. **Do not publish yet.** Open `/preview/<token>` in a private window and
   confirm it returns 404 while unpublished.
7. Publish. Reload the same URL and confirm the concept now renders inside the
   sandboxed frame with the notice bar above it.
8. Open `/preview/<token>?notrack=1` and confirm the open count does **not**
   increase. Open it without the parameter and confirm it does.
9. Unpublish. Confirm the URL returns 404 again.
10. Confirm `/audit` and `/audit/request/<token>` still work end to end.

Expected provider behavior during this smoke test:

- A PageSpeed `500` with `reason: lighthouseError` is a non-fatal warning. The
  concept continues without a performance score; do not treat that warning by
  itself as a failed generation.
- `Invalid arguments for fetch: invalid char for header` was traced on
  2026-08-11 to a typographic em dash in OpenRouter's optional `X-Title` header
  and fixed by making all attribution-header values printable ASCII. If that
  exact error appears after this change, the latest Convex functions are not the
  ones running; redeploy before investigating the API key or model.
- `OpenRouter returned an empty completion` was observed with DeepSeek V4 Flash
  after a roughly six-minute request. The model defaults to high reasoning; the
  request now explicitly uses low reasoning and excludes the reasoning trace so
  the output budget is reserved for final HTML. Empty results now record only
  safe request/model/provider/finish/token diagnostics, never prompts or model
  reasoning.

**The real-device check.** Open a published concept on your iPhone, in Safari
and then from a Messenger message to yourself. Verify:

- the page fills the screen below the notice bar
- it scrolls smoothly to the bottom, with no trapped or doubled scrolling
- sticky or fixed elements inside the concept behave
- anchor links jump correctly
- the **Call** button in the notice bar opens the dialer
- the call link inside the concept itself also opens the dialer

If scrolling or sizing is unacceptable, stop and switch to the direct-document
fallback described in `outreach-preview-engine.md` § Rendering and security
boundary before going further. The comment block at the top of
`app/preview/[token]/page.tsx` records exactly what that change involves.

If only the in-frame call link fails but the notice-bar button works, that is
tolerable — the conversion path still exists — but note it.

---

## 7. Delete the legacy rows

Irreversible except through the step-4 export.

In the production dashboard, **Data →** each table → **Clear table**:

1. `scraped_leads` (first — it references `marketing_searches`)
2. `marketing_searches`
3. `preview_views`

There is deliberately no application function that does this. Every marketing
mutation was deleted in Step 2, and adding a delete-everything endpoint just to
run it once would leave a loaded gun in the codebase.

Verify all three are empty:

```bash
npx convex data --prod marketing_searches
npx convex data --prod scraped_leads
npx convex data --prod preview_views
```

---

## 8. Contract the schema

Only after step 7 shows three empty tables.

**`convex/schema.ts`** — delete:

- the `marketing_searches` table definition
- the `scraped_leads` table definition
- the `preview_views` table definition
- these names from the `./validators` import: `marketingSearchStatusValidator`,
  `scrapedLeadStatusValidator`, `googleDataValidator`,
  `physicalPresenceValidator`

Keep `websiteDataValidator`, `pageSpeedDataValidator`, and
`aiLeadAnalysisValidator` in the import — `public_audits` and `projects` still
use them.

**`convex/validators.ts`** — delete these nine, which nothing else references
once the tables are gone:

- `marketingSearchStatusValidator`
- `scrapedLeadStatusValidator`
- `googleDataValidator`
- `googleReviewValidator`
- `googleLocationValidator`
- `googleAddressComponentValidator`
- `googleOpeningHoursValidator`
- `physicalPresenceValidator`
- `physicalPresenceStatusValidator`

Do **not** delete `websiteDataValidator`, `pageSpeedDataValidator`,
`aiLeadAnalysisValidator`, `publicAuditStatusValidator`, or
`publicAuditDocValidator`. All are still live.

Then:

```bash
npx convex codegen --typecheck enable
npx tsc --noEmit
bun test
bun run lint
bun run build
git diff --check
npx convex deploy --typecheck enable
```

If `convex deploy` rejects the schema, a row still exists somewhere. Go back to
step 7 rather than forcing it.

---

## 9. Verify production

- `/admin/marketing` loads, lists the smoke-test concept, and is admin-gated.
- A published concept renders at its token; an unpublished one 404s.
- `/audit` and `/audit/request/<token>` work.
- `/preview/shays-cleaning-services` and `/preview/gator-constructors` now 404.
  This is intentional and agreed: neither recipient continued the conversation,
  so the old URLs have no business value.
- Sign in to the client portal and confirm the dashboard, agreement, billing,
  and analytics paths are unchanged.
- Confirm a transactional email still sends (a magic link to yourself is enough).
- Dashboard → **Functions**: no `marketing.*` function is listed.
- Dashboard → **Scheduled**: no entry can call a removed marketing function.

---

## 10. Close out

- Delete the smoke-test concept from `/admin/marketing` if it was not for a real
  lead.
- Keep `/Users/laykenvarholdt/Documents/awd-cutover-backup-*.zip` until at least
  ten concepts have been produced and the generator is clearly working, then
  move it into your normal durable-backup location.
- Update `docs/GROWTH.md` with the first real concept sent, and record opens in
  the scorecard.
- Mark this runbook executed, with the date and the three row counts from
  step 3.
