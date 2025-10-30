
## Admin Page Upgrade Plan

### Goals
- Gate `app/admin/page.tsx` so only the owner can access it.
- Add tabs to browse: Prospects, Projects, Scheduled Calls, and Edit/Support Requests.
- Add admin-only actions to update Project admin notes (`buildDetails.myNotes`), Deployment details, Project status, and Edit Request status.

### 1) Security & Gating Strategy (defense in depth)
- Server-side route gating via layout:
  - Create `app/admin/layout.tsx` as a Server Component that checks the current user on the server and blocks/redirects if not admin.
  - Implementation (high level): obtain auth token using `getToken()` from `lib/auth-server.ts`, call `api.auth.getCurrentUser` via `fetchQuery`, verify against an allowlist (see env below). If unauthorized, `redirect("/")`.
- Convex RBAC guard for admin functions:
  - Add a reusable helper (e.g., `convex/adminGuard.ts`) that does `authComponent.getAuthUser(ctx)` and enforces admin via an allowlist.
  - Use this helper in every `convex/admin.ts` query/mutation and all new admin-only mutations/queries listed below.
- Environment configuration:
  - Add `ADMIN_EMAIL` (or `ADMIN_USER_ID`) to environment. Prefer email to keep it stable across environments.
  - Optionally support a comma-separated `ADMIN_EMAILS` for flexibility.
- Optional middleware (belt-and-suspenders):
  - Add `middleware.ts` to restrict `/admin` at the edge. This is optional since layout + Convex RBAC already protect access.

Why this approach:
- Server-side layout prevents the page content from rendering for non-admins and avoids flashing.
- Convex RBAC prevents API misuse even if someone crafted direct client calls.

### 2) Data model and indexing updates
- Projects: add `.index("by_updatedAt", ["updatedAt"])` to `projects` in `convex/schema.ts` for efficient admin listing by recent activity.
- Edit Requests: existing indexes `by_projectId`, `by_status_and_projectId`, `by_createdAt` are present. For global views, add `.index("by_status", ["status"])` to filter across all projects without scanning.
- Prospects: already has `by_updatedAt`.
- Scheduled Calls: already has `by_startTime`; use it for recency sorting.

Note: We will keep indexes minimal and only add those needed to avoid table scans per Convex guidelines.

### 3) Convex API surface (new/updated admin endpoints)
All endpoints must:
- Use the new function syntax with explicit `args` and `returns` validators.
- Enforce admin authorization via the shared guard.
- Log to `activity_log` with `actor: "admin"` and a specific `kind` for traceability.

Queries (admin):
- `admin.listProjects` (new): list recent projects sorted by `updatedAt desc`.
  - Returns: subset fields for table (e.g., `_id`, `projectId`, `authUserId`, `prospectId`, `projectStatus`, `buildDetails?.headline`, `buildDetails?.brandAssetsUploaded`, `deployment`, `createdAt`, `updatedAt`).
  - Pagination friendly (accept `paginationOpts` later if needed).
- `admin.listScheduledCalls` (new): list scheduled calls, default to upcoming first; allow optional filters (type, projectId/prospectId, date range).
  - Sort by `startTime desc` using `by_startTime`.
- `admin.listEditRequests` (new): list edit/support requests across all projects; support optional `status` filter (`open | in_progress | waiting_on_client` by default) using `by_status`.
- `admin.listProspects` (update): replace current `getProspects` with an indexed version (use `by_updatedAt` and return a stable structure). Keep the old name as a wrapper or migrate the page to the new query.

Mutations (admin):
- `admin.updateProjectStatus` (new): set `projectStatus`.
  - Args: `{ projectId, status, expectedCurrentStatus?: projectStatus }` (optimistic concurrency, similar to `internalSetStatusIfEligible`).
  - Effects: update, set `updatedAt`, log `project.status_updated` with `{ from, to }`.
- `admin.updateProjectMyNotes` (new): update `buildDetails.myNotes` only.
  - Args: `{ projectId, myNotes: string | null }`.
  - Effects: patch `projects.buildDetails.myNotes`, update `updatedAt`, log `build.admin_notes_updated`.
- `admin.updateDeployment` (new): upsert `deployment` fields.
  - Args: `{ projectId, liveUrl?: string, stagingUrl?: string, vercelProjectId?: string }`.
  - Effects: patch `projects.deployment`, update `updatedAt`, log `project.deployment_updated`.
- `admin.updateEditRequestStatus` (new): update ticket status (and optionally priority).
  - Args: `{ requestId, status, priority? }`.
  - Effects: patch `edit_requests`, update `updatedAt`, log `ticket.status_updated`.

Validation & safety:
- Follow Convex validator guidelines (no `any` where avoidable; exact unions for statuses; `v.null()` returns where appropriate).
- Normalize/trim URLs and notes, basic length guards (e.g., notes max ~4–8k chars to avoid abuse).
- Activity logs include `projectId`/`prospectId` where applicable.

### 4) Admin UI updates (`app/admin/page.tsx`)
Keep the page a Client Component for interactivity, but wrap it in a Server `layout.tsx` that gates access. Implement tabs and views:

Tabs
- Prospects (existing):
  - Switch data source to the indexed admin query; keep existing create/edit and magic link behaviors.
  - Add sort by `updatedAt desc` and basic search (client-side filter by name/email/company is fine initially).
- Projects (new):
  - Table with columns: Project, Status, Headline, Assets (boolean), Deployment (staging/live), Updated.
  - Inline actions:
    - Status: dropdown to select target status → calls `admin.updateProjectStatus`.
    - My Notes: expandable panel with textarea and Save → calls `admin.updateProjectMyNotes`.
    - Deployment: small form with `stagingUrl`, `liveUrl`, `vercelProjectId` + Save → calls `admin.updateDeployment`.
  - Convenience: link to `/portal/[projectId]` and indicators for scheduled calls (kickoff/review badges if present).
- Scheduled Calls (new):
  - List grouped by date (upcoming/past), show title, type, start/end, meeting URL, linked `projectId`/`prospectId`.
  - Optional filters: type and date range. Default sort `startTime desc`.
- Edit/Support Requests (new):
  - Table or lightweight kanban (Open, In progress, Waiting on client, Resolved, Closed).
  - Row actions: change status and (optional) priority → calls `admin.updateEditRequestStatus`.
  - Show created date and link to project.

UX/Visual
- Maintain current neutral palette and use subtle off-white/gray backgrounds and gradients consistent with the rest of the app.
- Disable actions while saving; optimistic UI where safe; toast/snackbar feedback on success/failure.
- Empty states and loading skeletons for each tab.

### 5) Auditing & observability
- Every admin mutation logs to `activity_log` with a descriptive `kind` and `payload` capturing changed fields.
- Console logs remain minimal and structured; avoid leaking PII.

### 6) Testing & QA checklist
- Gating:
  - Non-admin access to `/admin` redirects home; admin access renders normally.
  - Direct calls to admin Convex functions are denied for non-admins.
- Projects:
  - Status changes persist and reflect immediately; incorrect `expectedCurrentStatus` fails gracefully.
  - My Notes updates only visible here (not in client portal queries).
  - Deployment updates persist and survive refresh.
- Scheduled Calls:
  - Correct ordering and linking to projects/prospects.
- Edit Requests:
  - Status/priority updates persist and activity log entries recorded.
- Performance:
  - Lists render without table scans (use indexes). Reasonable page sizes (e.g., 25–50 rows) with potential for pagination.

### 7) Implementation steps (high level)
1. Add env variable(s): `ADMIN_EMAIL` (and optional `ADMIN_EMAILS`).
2. Add `convex/adminGuard.ts` with `requireAdmin(ctx)`.
3. Update `convex/admin.ts` queries/mutations to call `requireAdmin`.
4. Add new admin queries/mutations listed above (use validators, activity logs).
5. Add indexes to `convex/schema.ts` (`projects.by_updatedAt`, `edit_requests.by_status`).
6. Add `app/admin/layout.tsx` to gate access server-side.
7. Update `app/admin/page.tsx` with tabs and new admin actions (wire to new API calls).
8. QA against the checklist; verify activity logs; confirm no public client can call admin functions.

### 8) Acceptance criteria
- Only the configured admin can load `/admin`; others are redirected.
- Admin can:
  - View Prospects, Projects, Scheduled Calls, Edit Requests in separate tabs.
  - Update project status, admin notes, and deployment.
  - Update edit request status (and priority optionally).
- All updates are authorized, logged, and immediately reflected in the UI.
- Lists are ordered via indexes; no noticeable latency with moderate data volume.

### 9) Out of scope / later improvements
- Pagination and server-side filtering for very large datasets.
- Multi-admin roles/permissions.
- Bulk actions on tickets or projects.
- Advanced search.


