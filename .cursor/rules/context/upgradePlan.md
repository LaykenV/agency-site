## Upgrade Plan: Color Scheme + File Uploads (Convex)

### Goals
- Replace `brand.styleVibe` with `brand.colorScheme` containing `primary` and `accent` colors.
- Wire up file upload to Convex storage for logo and brand images with client-side previews.
- Keep implementation simple: native color inputs, gradient preview; no color picker library.
- No data migration or backward compatibility paths. Existing projects without a `colorScheme` will display defaults until saved.

### Constraints and Decisions
- No migration function; do not read or preserve `styleVibe`.
- If a project’s `buildDetails.brand.colorScheme` is missing, the server will return a default color pair so the client validator shape is always satisfied.
- Native `<input type="color">` for picking `primary` and `accent`.
- Gradient preview card uses soft tints and more apparent gradients to match the product’s style preferences [[memory:10223702]].

---

## Affected Files and Current References

### Current validator (to be replaced)
```33:44:convex/validators.ts
export const buildDetailsValidator = v.object({
  headline: v.union(v.string(), v.null()),
  domainPreference: v.union(v.string(), v.null()),
  inspirationLinks: v.array(v.string()),
  myNotes: v.union(v.string(), v.null()),
  brand: v.object({
    styleVibe: v.union(v.string(), v.null()),
    logoStorageId: v.optional(v.id("_storage")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  }),
  brandAssetsUploaded: v.boolean(),
});
```

### Backend return shape including styleVibe (to be updated)
```202:211:convex/projects.ts
const buildDetails = project.buildDetails ? {
  headline: project.buildDetails.headline,
  domainPreference: project.buildDetails.domainPreference,
  inspirationLinks: project.buildDetails.inspirationLinks,
  brand: {
    styleVibe: project.buildDetails.brand.styleVibe,
    logoStorageId: project.buildDetails.brand.logoStorageId,
    imageStorageIds: project.buildDetails.brand.imageStorageIds,
  },
  brandAssetsUploaded: project.buildDetails.brandAssetsUploaded,
} : undefined;
```

### Backend args for upsert including styleVibe (to be updated)
```255:266:convex/projects.ts
export const upsertBuildDetails = mutation({
  args: {
    projectId: v.id("projects"),
    headline: v.optional(v.string()),
    domainPreference: v.optional(v.string()),
    inspirationLinks: v.optional(v.array(v.string())),
    brand: v.optional(v.object({
      styleVibe: v.optional(v.string()),
    })),
    logoStorageId: v.optional(v.id("_storage")),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
  },
```

### Client UI field (to be replaced with color pickers + preview)
```433:447:app/portal/[projectId]/page.tsx
<Label htmlFor="styleVibe">Style & Vibe</Label>
<Input
  id="styleVibe"
  value={formData.brand.styleVibe}
  onChange={(e) => setFormData({
    ...formData,
    brand: { ...formData.brand, styleVibe: e.target.value }
  })}
  placeholder="e.g., Minimal and modern, Bold and colorful..."
/>
```

---

## Planned Changes (No Migration)

### 1) Validators and Types
- Update `convex/validators.ts`:
  - Replace `brand.styleVibe` with `brand.colorScheme: v.object({ primary: v.string(), accent: v.string() })`.
  - Keep `logoStorageId` and `imageStorageIds` as-is.
  - Keep `brandAssetsUploaded` as-is.

- Update any corresponding exported types inferred from validators (client usage expects `brand.colorScheme` now).

Notes:
- Color strings validated as `v.string()`; client enforces hex format `#RRGGBB`.

### 2) Backend Functions (`convex/projects.ts`)
- `upsertBuildDetails` args: accept `brand: { colorScheme?: { primary: string; accent: string } }` only.
- Merge logic:
  - Set `buildDetails.brand.colorScheme` to provided values if present; otherwise leave unchanged.
  - Remove any logic referencing `styleVibe`.
  - Preserve and recompute `brandAssetsUploaded` as today based on storage IDs.
- `getPortalProject` return validator and mapping:
  - Return `brand.colorScheme` in the response.
  - If `project.buildDetails.brand.colorScheme` is absent, synthesize a default pair (e.g., `primary = "#111827"`, `accent = "#6EE7B7"`) so the returned object always satisfies the validator.
  - Do not include `styleVibe` anywhere in the returned object.

Rationale:
- This avoids a DB migration while keeping the API shape consistent for the client.

### 3) Schema (`convex/schema.ts`)
- No structural change; schema imports `buildDetailsValidator` which will now include `colorScheme`.

### 4) Storage Endpoints (new `convex/files.ts`)
- Add functions aligned with Convex storage best practices:
  - `generateUploadUrl` (mutation): returns `await ctx.storage.generateUploadUrl()`.
  - `getUrls` (query): args `{ ids: v.array(v.id("_storage")) }`; returns `Record<Id<'_storage'>, string>` using `await ctx.storage.getUrl(id)` and omitting nulls.
  - `deleteFile` (mutation, optional): args `{ storageId: v.id("_storage") }`; calls `await ctx.storage.delete(storageId)`.
- Access control:
  - For `getUrls`, verify that requested IDs belong to the caller’s project(s) before returning URLs. Simplest: fetch project by `args.projectId` and ensure id set is a subset of `logoStorageId` and `imageStorageIds`.
  - For `deleteFile`, ensure the caller owns the project that references the storage ID.

References:
- Generate upload URLs (mutation context is permitted): [Convex file storage – upload files](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/file-storage/upload-files.mdx)
- Generate signed URLs on server: [Convex file storage – serve files](https://github.com/get-convex/convex-backend/blob/main/npm-packages/docs/docs/file-storage/serve-files.mdx)
- Storage API: `generateUploadUrl`, `getUrl`, `delete` on ctx.storage: [Server API: Storage](https://github.com/get-convex/convex-backend/blob/main/npm-packages/convex/api-extractor-configs/reports/server.api.md)
- Metadata: if needed later, query `_storage` via `ctx.db.system.get` (avoid deprecated metadata helpers).

### 5) Client UI: Build Details Form (`app/portal/[projectId]/page.tsx`)
- State shape:
  - Replace `formData.brand.styleVibe: string` with `formData.brand.colorScheme: { primary: string; accent: string }`.
  - Initialize defaults from server values; if undefined, use the same defaults as server (`#111827` / `#6EE7B7`).

- Inputs:
  - Replace styleVibe input with two native color inputs:
    - Primary color: `<input type="color" value={...} onChange=... />`
    - Accent color: `<input type="color" value={...} onChange=... />`
  - Keep logo and images file inputs as-is.

- Gradient preview:
  - Add a small live preview card using the selected colors, e.g., a top-to-bottom gradient from `primary` → `accent`, with soft tinted background and a small sample button/badge to visualize contrast [[memory:10223702]].

- Submit flow (simple, on submit):
  1) Validate text fields.
  2) If files selected:
     - For each file, request `generateUploadUrl`.
     - `fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })`.
     - Parse `{ storageId }` from JSON response.
  3) Call `projects.upsertBuildDetails` with:
     - `brand: { colorScheme: { primary, accent } }`
     - `logoStorageId` (if uploaded)
     - `imageStorageIds` (if uploaded)
  4) Optimistic UI: show local `URL.createObjectURL(file)` previews immediately; after save, refresh signed URLs via `files.getUrls`.

- Previews after save:
  - Request signed URLs from the server via `files.getUrls([logoStorageId, ...imageStorageIds])` and render those URLs (they are ephemeral; rely on re-render to refresh).

### 6) Security and Validation
- Server-side authorization (already present on project mutations/queries) must also guard `files.getUrls` and `files.deleteFile`.
- Client-side validation:
  - Accept images only (existing `accept` attributes already enforce this).
  - Surface a friendly max size (e.g., 10MB) with immediate feedback.
- Rate limiting is not required initially; consider later if needed.

### 7) Implementation Order
1) Update `buildDetailsValidator` to use `brand.colorScheme`.
2) Update `projects.upsertBuildDetails` args and merge logic; remove all `styleVibe` references.
3) Update `projects.getPortalProject` mapping to always return `brand.colorScheme`, synthesizing defaults if absent.
4) Add `convex/files.ts` with `generateUploadUrl`, `getUrls`, and optional `deleteFile`.
5) Update `BuildDetailsForm` state, inputs, submit logic, and preview UI.
6) Sanity pass: remove any leftover `styleVibe` usage in client code.
7) QA.

### 8) QA Checklist
- Color scheme
  - New projects: pick colors, save, reload; values persist and render.
  - Existing projects (no migration): default colors appear; saving writes `colorScheme` and clears any obsolete UI state client-side.
  - No references to `styleVibe` remain in API shapes or UI.

- File uploads
  - Upload single logo and multiple images; get previews immediately (local) and after save (signed URLs).
  - URLs resolve and display; deleting (if implemented) removes files and thumbnails.
  - Unauthorized access blocked for storage URL resolution and deletion.

### Acceptance Criteria
- `buildDetails.brand.colorScheme.primary` and `.accent` are the sole color fields persisted and returned; `styleVibe` is not used.
- Client shows two color inputs and a live gradient preview; selections persist.
- Logo and images upload successfully to Convex storage via pre-signed URLs; previews render via signed URLs.
- All endpoints enforce ownership checks.

### Notes on Convex Storage Best Practices
- Use `ctx.storage.generateUploadUrl()` in a mutation to obtain a client upload URL.
- Use `ctx.storage.getUrl(storageId)` in queries/mutations to produce signed, ephemeral URLs for rendering.
- Use `ctx.storage.delete(storageId)` in a mutation for cleanup.
- If metadata is ever needed, query `_storage` via `ctx.db.system.get(id)` rather than deprecated helpers.


