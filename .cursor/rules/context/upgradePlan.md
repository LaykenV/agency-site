# Convex Backend Remediation Plan

## Objective
Address the three issues flagged during the Convex backend review so the portal state, file metadata, and asset readiness signals stay accurate.

## Summary of Issues
- **Cal cancellations keep stale project bookings** (`convex/calWebhook.ts` → `internal.cal.updateProjectBooking`).
- **File deletions fail to clear project metadata** (`convex/files.ts`).
- **Ticket attachments do not mark `brandAssetsUploaded`** (`convex/projects.ts`).

## Action Plan

### 1. Clear Project Booking Snapshots on Cal Cancellations
- Update `processCalWebhook` to handle the `BOOKING_CANCELED` branch by patching the relevant project and clearing `calKickoffBooking` / `calReviewBooking` (or updating their status to reflect cancellation).
- Ensure the `activity_log` entry for cancellations includes whether the snapshot was cleared for traceability.
- Verify downstream UI (`/portal/[projectId]`, admin tables) reacts gracefully to missing bookings (e.g., optional chaining already in place).

### 2. Keep Project Build Metadata in Sync with File Deletes
- Extend `files.deleteFile` to patch the owning project document after deleting the blob:
  - If the file was the logo, clear `buildDetails.brand.logoStorageId`.
  - Remove the storage id from `brand.imageStorageIds` and deduplicate the result.
  - Recalculate `brandAssetsUploaded` based on remaining assets.
- Add an `activity_log` entry (`file.deleted`) for visibility and parity with other flows.

### 3. Flip `brandAssetsUploaded` When Ticket Attachments Add Assets
- In `projects.createEditRequest`, set `brandAssetsUploaded` to `true` whenever attachments are merged into project build details.
- Consider updating the admin-side views or analytics that rely on this flag to ensure there is no assumption based on old values.
- Optionally add an activity log payload field noting that new assets were recorded via ticket upload.

## Testing & Verification
- Unit/integration: add targeted Convex test harness calls (or temporary scripts) to confirm each mutation/query now returns the expected state.
- Manual QA: trigger a mock Cal webhook cancellation, run file upload/delete flows in the portal, and create an edit request with attachments to confirm the UI reflects the new metadata.

## Rollout Notes
- All changes are server-side; no schema migrations required.
- Coordinate with frontend to confirm they gracefully handle missing booking snapshots and updated `brandAssetsUploaded` semantics.
