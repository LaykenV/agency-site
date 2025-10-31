### Prospect Fields Upgrade Plan (No Migration)

This plan changes the prospect details shape and related flows:
- Rename prospect fields: goals → myNotes (admin-only), notes → prospectNotes (client-facing)
- Remove the onboarding question “What are you hoping your new site will do for you?”
- Ensure myNotes is never exposed to or accepted from the onboarding/public flows, nor used in AI generation.

No backwards compatibility or data migration is required. We will implement a breaking change and update all references in a single change set.

### New data shape (prospects.details)

Stored shape (DB):
```ts
type ProspectDetailsStored = {
  contactName: string;
  contactEmail: string;
  companyName: string;
  phone: string;
  currentWebsite: string;
  businessDescription: string;
  prospectNotes: string; // client-provided notes
  myNotes?: string; // admin-only notes (optional)
};
```

Public shape (client I/O):
```ts
type ProspectDetailsPublic = Omit<ProspectDetailsStored, "myNotes">;
```

Key constraints:
- myNotes is admin-only: never accepted from or returned to onboarding/public endpoints.
- prospectNotes replaces notes everywhere; goals is removed entirely.

### Scope of changes

- Validators/types: redefine prospect details; split public vs stored validators to enforce admin-only behavior for myNotes.
- Onboarding UI: remove the goals question; keep the “Anything else…” block but wire it to prospectNotes.
- Onboarding server: accept and return only public details; do not allow myNotes in args or responses.
- AI agent: remove goals from prompt; read prospectNotes instead of notes.
- Admin UI: in Prospects tab, replace Goals with Prospect My Notes (private) and rename Notes → Prospect Notes (client-provided). Keep existing Project Build Details → My Notes unchanged.
- CAL flows: default-initialize details with prospectNotes only; remove goals/notes.

### Files to update

- Validators & schema
  - `convex/validators.ts`: 
    - Replace `prospectDetailsValidator` with two validators:
      - `prospectDetailsStoredValidator` (includes optional myNotes)
      - `prospectDetailsPublicValidator` (excludes myNotes) — use for onboarding inputs/outputs
    - Update any exports that reference the old validator names accordingly (e.g., `prospectValidator` should embed the stored variant in its `details` field type).
  - `convex/schema.ts`: continue importing the new stored validator for the schema; no index changes required.

- Onboarding server
  - `convex/onboarding/sessions.ts`:
    - `initSession`: seed `details` with the new public shape (prospectNotes: "", no goals, no notes, no myNotes).
    - `getSession`: return details typed by `prospectDetailsPublicValidator` (omit myNotes in the response).
    - `updateDetails` and `generatePlan`: change args to `prospectDetailsPublicValidator` to reject any myNotes input.
    - `saveDetailsInternal`: keep email normalization; ensure only the public shape is persisted from onboarding updates (myNotes cannot be written here).

- AI agent
  - `convex/onboarding/agent.ts`:
    - Remove any reference to `details.goals`.
    - Change “Additional notes” to use `details.prospectNotes`.
    - No references to `myNotes`.

- Admin API and pages
  - `convex/admin.ts`:
    - For `createProspect` and `updateProspectDetails`, accept the stored validator (admin can set `myNotes`).
    - Other admin functions unchanged.
  - `app/admin/page.tsx` (Prospects tab):
    - In `emptyDetails`, remove `goals`, rename `notes` → `prospectNotes`, and add optional `myNotes: ""`.
    - Create/Edit form:
      - Replace the "Goals" textarea with "Prospect My Notes (private)" wired to `details.myNotes` (not required).
      - Rename the old "Notes" control to "Prospect Notes" wired to `details.prospectNotes`.
    - Prospect cards display:
      - Replace Goals section with "Prospect My Notes" (private) showing `details.myNotes`.
      - Show "Prospect Notes" instead of "Notes" for client-provided notes.
    - Keep the Projects tab “My Notes” (project.buildDetails.myNotes) as-is; label differences clearly in UI copy to avoid confusion.

- Onboarding UI & hooks
  - `app/onboarding/OnboardingClient.tsx`:
    - Remove the entire goals block (label+textarea+state).
    - Rename the notes block to read/write `prospectNotes`.
  - `lib/onboarding/hooks/useSessionData.ts` and `usePlanGenerator.ts` and `useOnboardingSession.ts`:
    - Ensure types align to `ProspectDetailsPublic` (no myNotes) for client-side usage.
    - No behavioral changes beyond the field rename.

- Types
  - `types/prospect.ts`:
    - Update `ProspectDetails` to the public shape (no myNotes).
    - Update `defaultProspectDetails` to include `prospectNotes: ""` and remove `goals` and `notes`.
    - `ProspectField` should no longer include `goals` or `notes`.

- CAL flows
  - `convex/cal.ts`:
    - Wherever a default prospect is created/seeded, replace `goals: ""` and `notes: ""` with `prospectNotes: ""`.

- Miscellaneous references
  - `convex/prospects.ts`: If any public queries return full prospect docs, either:
    - switch to an internal query when myNotes must be visible, or
    - map responses to omit `details.myNotes` for public endpoints.
  - `app/page.tsx`: text mentioning “align on brand and goals” is marketing copy; no change required.

### Implementation order (single breaking change)

1) Update types and validators
- Implement the new validators in `convex/validators.ts` and update exports.
- Update `types/prospect.ts` to the public shape, removing goals/notes.

2) Update server onboarding flows
- `convex/onboarding/sessions.ts`: switch args/returns to public validator; seed new defaults.
- Ensure `getSession` omits myNotes.

3) Update AI agent
- `convex/onboarding/agent.ts`: remove goals, use prospectNotes.

4) Update UI (onboarding & admin)
- `app/onboarding/OnboardingClient.tsx`: remove goals block; use prospectNotes.
- `app/admin/page.tsx`: rename fields and labels in Prospects tab; wire to myNotes/prospectNotes.

5) Update CAL and any seeding/utilities
- `convex/cal.ts`: seed prospectNotes only.

6) Audit public queries of prospects
- Ensure no public query exposes `details.myNotes` inadvertently; convert to internal or map responses.

7) Build and fix TypeScript errors
- Run type checks; update imports/usages of old fields (goals/notes) across the codebase.

### Acceptance criteria

- Onboarding page no longer shows the goals question; form works and plan generation succeeds.
- AI generation does not reference goals and uses prospectNotes when present.
- Admin can view/edit `details.myNotes` (Prospect My Notes) and see `details.prospectNotes` distinctly.
- No server endpoint accepts or returns `myNotes` to public clients.
- All references to `goals` and `notes` in prospect details are removed.

### Risks/notes

- This is a breaking change with no data migration; existing stored records with old fields may fail validation or appear empty after the change. Acceptable per requirement.
- Carefully distinguish prospect-level “My Notes” from project-level “My Notes” in admin UI labels to avoid confusion.

### Post-merge QA checklist

- Generate a plan from onboarding after filling contact, email, company, business description, and prospectNotes.
- Verify admin can edit Prospect My Notes and that the value is not visible in any public query/response.
- Confirm CAL-created records have `prospectNotes: ""` and no goals/notes.
- Grep for lingering `goals` and `details.notes` references; none should remain.


