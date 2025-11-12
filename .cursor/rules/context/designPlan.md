## App‑Wide Design System Plan (Non‑Landing Pages)

This document defines how to build the rest of the application (portal, subscribe, success, admin) to match the landing page’s visual language without the landing‑specific animations and hero treatments. It standardizes layout, surfaces, components, and states using the tokens and utilities already defined in `app/globals.css`.

The intent: simple, breathable UI; soft off‑white/off‑gray bases with visible yet tasteful gradients; strong contrast and clear hierarchy; minimum ornamentation on app pages.

### 1) Design Principles
- Consistency over novelty: reuse the same spacing, borders, and surfaces across all screens.
- Restraint: no hero beams or animated word reveals on app pages; use static surfaces.
- Contrast and clarity: rely on `--foreground` and `--muted-foreground` for hierarchy; avoid low‑contrast “washed” text.
- Motion: respect `prefers-reduced-motion`; keep app pages mostly static (subtle fades at most).
- Performance: pure CSS, no decorative images; compositing-friendly shadows already provided by utilities.

### 2) Tokens and Utilities (from globals.css)
- Colors (HSL tokens, light/dark aware):
  - Backgrounds: `--background`, `--card`, `--secondary`
  - Text: `--foreground`, `--muted-foreground`
  - Brand: `--primary`, `--accent`, `--brand-amber`
  - UI chrome: `--border`, `--input`, `--ring`
- Surfaces:
  - `.surface` (default card), `.surface-soft` (subtle block), `.surface-elevated` (high emphasis)
- Buttons:
  - `.btn-cta` (primary), `.btn-secondary` (secondary), `.btn-soft`, `.btn-outline-strong`, `.btn-ghost`, `.btn-danger`
- Badges & Pills:
  - `.badge`, `.badge-good`, `.badge-bad`, `.badge-neutral`, `.badge-metric`, `.pill` (+ `.pill-success`, `.pill-danger`)
- Misc:
  - `.info-banner`, `.stat-pill`, `.progress-track` + `.progress-fill`
- Layout helpers:
  - `.anchor-target` (for in-page anchors), responsive utilities via Tailwind

Recommendation: Do not introduce new color tokens. Build on the existing mapping under `@theme inline` so the whole app stays visually cohesive.

Status pill color guidance
- Prefer the existing `.badge`/`.pill` variants when a semantic match exists.
- When using utility classes for status, pair saturated backgrounds with white text for contrast:
  - Success: `bg-emerald-600 text-white`
  - Info/Progress: `bg-blue-600 text-white` or `bg-sky-600 text-white`
  - Attention/Waiting: `bg-amber-600 text-white`
  - Neutral/Review/Closed: `bg-slate-600 text-white` or `bg-slate-700 text-white`
  - Error/Archived: `bg-rose-600 text-white`

### 3) Layout Standards
- Page container
  - Default: `mx-auto max-w-6xl px-6`
  - Admin widescreen pages: `max-w-7xl` when dense tables/lists are present
  - Vertical rhythm: top/bottom padding by context
    - Top sections: `py-10 md:py-12`
    - Inner sections: `py-6 md:py-8`
- Sectioning
  - Wrap content groups in `.surface` for clear separation.
  - Use `.surface-soft` when a visual group doesn’t need elevation (filters, inline notes, small summaries).
  - Reserve `.surface-elevated` for standout modules (confirmation panes, destructive dialogs).
- Grids
  - Two‑column content: `grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-8`
  - Forms: `grid gap-4 md:grid-cols-2` for related fields; keep long text areas full width.
  - Sticky sidebars only at `md+` (`md:sticky md:top-24`); avoid sticky on mobile.
- Spacing scale
  - Use Tailwind spacing consistently: 4, 6, 8, 10, 12, 16 (and 20 for page‑level blocks).
  - Inside cards: `p-4 sm:p-6` (forms/tables can use `p-4`; summaries use `p-3`).

### 4) Page Header Pattern
- Composition
  - Title (H1/H2), concise description, primary and secondary actions
  - Optional breadcrumbs when nested under `/portal` or `/admin`
- Example
```tsx
export function PageHeader(props: {
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <header className="mb-6 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--foreground)]">{props.title}</h1>
          {props.description ? (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{props.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {props.secondaryAction}
          {props.primaryAction}
        </div>
      </div>
    </header>
  );
}
```
- Actions
  - Primary: `.btn-cta`
  - Secondary: `.btn-secondary` or `.btn-outline-strong`

### 5) Cards and Content Blocks
- Default card
  - Use `.surface rounded-xl p-4 sm:p-6`
  - Title row: bold label with `text-[var(--muted-foreground)]` for section labels, `text-[var(--foreground)]` for content titles
- Dense information (metrics, summaries)
  - Use `.stat-pill` for compact numeric highlights
  - For side‑by‑side stat groups, apply `grid grid-cols-2 md:grid-cols-4 gap-3`
- Do not nest multiple `.surface` layers deeply; prefer sibling cards with grid layouts.

### 6) Forms
- Inputs
  - Use `components/ui/input.tsx`, `textarea.tsx`, `label.tsx` for consistent focus, borders, and spacing.
  - Field block spacing: wrap each in a `div` with `space-y-2` or `mb-4`
- Groups
  - Two or more related fields: `grid gap-4 md:grid-cols-2`
  - Full‑width fields (URLs, long text): `md:col-span-2`
- Actions
  - Submit: `.btn-cta`
  - Secondary/cancel: `.btn-secondary` or `.btn-ghost`
- Inline help and errors
  - Help text: `text-xs text-[var(--muted-foreground)]`
  - Error text: `text-xs text-[hsl(var(--destructive))]`

Selects and truncation
- Use `h-10 w-full text-sm` on selects to avoid option text clipping; pair with our `form-control` base.
- Keep option strings concise; where longer helper text is needed, mirror it below as help text rather than inside the option.

Example
```tsx
<form className="space-y-4">
  <div className="grid gap-4 md:grid-cols-2">
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">Company name</label>
      <input className="w-full" placeholder="Acme Services" />
    </div>
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">Contact email</label>
      <input type="email" className="w-full" placeholder="owner@example.com" />
    </div>
  </div>
  <div>
    <label className="text-sm font-medium text-[var(--foreground)]">Notes</label>
    <textarea className="w-full" rows={4} placeholder="Anything we should know?" />
    <p className="mt-1 text-xs text-[var(--muted-foreground)]">Keep it short and actionable.</p>
  </div>
  <div className="flex items-center gap-2">
    <button type="submit" className="btn-cta inline-flex items-center gap-2 px-5 py-2.5">Save</button>
    <button type="button" className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5">Cancel</button>
  </div>
  {/* Validation example */}
  {/* <p className="text-xs text-[hsl(var(--destructive))]">Email is required.</p> */}
  {/* <p className="text-xs text-[var(--muted-foreground)]">Saved just now.</p> */}
</form>
```

### 7) Tables and Lists
- Use a card wrapper `.surface` and keep tables light with clear separators.
- Mobile first: Prefer responsive lists over tables when columns exceed 3–4.
- Pattern: “key on left, value on right” for definition‑style lists.

Example table
```tsx
<div className="surface rounded-xl overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <th className="text-left p-3 text-[var(--foreground)]">Name</th>
        <th className="text-left p-3 text-[var(--foreground)]">Status</th>
        <th className="text-left p-3 text-[var(--foreground)]">Updated</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <td className="p-3">Acme Plumbing</td>
        <td className="p-3"><span className="badge badge-good">Active</span></td>
        <td className="p-3 text-[var(--muted-foreground)]">Today</td>
      </tr>
      {/* ... */}
    </tbody>
  </table>
</div>
```

### 8) Buttons and Actions
- Primary: `.btn-cta` for commit actions (Create, Save, Continue)
- Secondary: `.btn-secondary` for neutral actions
- Ghost/outline: for low‑emphasis or inline actions (`.btn-ghost`, `.btn-outline-strong`)
- Destructive: `.btn-danger` for irreversible actions; pair with confirmation

Sizing guidance
- Default: `px-5 py-2.5`
- Compact in tables/toolbars: `px-3 py-1.5 text-sm`

### 9) Badges, Pills, and Inline Status
- Status in rows/lists: `.badge-good`, `.badge-bad`, `.badge-neutral`
- Inline filters or selection chips: `.pill` (hover styles already defined)
- Performance metric: `.badge-metric` for bold numerics (e.g., 95+)

Recommended status mappings
- Project status → pill:
  - `LIVE`: `bg-emerald-600 text-white` (or `.badge-good`)
  - `IN_PROGRESS`: `bg-blue-600 text-white`
  - `IN_REVIEW`: `bg-slate-700 text-white`
  - `AWAITING_ASSETS` / `AWAITING_PAYMENT` / `AWAITING_AGREEMENT`: `bg-amber-600 text-white`
  - `ARCHIVED`: `bg-rose-600 text-white` (or `.badge-bad`)
- Edit request status → pill:
  - `open`: `bg-sky-600 text-white`
  - `in_progress`: `bg-indigo-600 text-white`
  - `waiting_on_client`: `bg-amber-600 text-white`
  - `resolved`: `bg-emerald-600 text-white`
  - `closed`: `bg-slate-600 text-white`

Implementation note
- Pills should be compact and readable: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`.
- Always ensure at least AA contrast; prefer white text on saturated pills unless legibility is better with dark text.

### 10) Banners, Alerts, and Empty States
- Informational: `.info-banner` inside a `.surface` or directly below headers
- Empty states: centered icon + headline + helper text + primary button
  - Container: `.surface rounded-xl p-8 text-center`
  - Headline: `text-[var(--foreground)]`
  - Body: `text-[var(--muted-foreground)]`
  - Action: `.btn-cta` (create first item)

Success/Live panel pattern
- For prominent success states (e.g., live site confirmation), use a soft green gradient with visible but tasteful emphasis:
  - Container: `rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-600/20 p-6`
  - Title: `text-emerald-600 dark:text-emerald-400`
  - Buttons: outline or default depending on emphasis; keep contrast strong against the tinted background.

### 11) Loading and Skeletons
- Use `animate-pulse` on neutral blocks; avoid shimmer.
- Skeleton pattern
```tsx
<div className="surface rounded-xl p-4 sm:p-6 animate-pulse">
  <div className="h-5 w-40 rounded bg-[hsl(var(--secondary))]" />
  <div className="mt-4 grid gap-3 md:grid-cols-2">
    <div className="h-9 rounded bg-[hsl(var(--secondary))]" />
    <div className="h-9 rounded bg-[hsl(var(--secondary))]" />
  </div>
</div>
```

### 12) Modals and Drawers
- Modal body: `.surface-elevated rounded-xl p-6`
- Underlay: a simple semi‑transparent scrim; avoid blur for app modals
- Title + body + actions row (primary on the right)
- Destructive flows use `.btn-danger` primary with clear copy

### 13) Navigation Patterns
- Portal pages (client)
  - Top header (existing sticky global header)
  - Page header with title/description/actions
  - Content in stacked `.surface` cards, each with clear titles
- Admin pages
  - When needed: two‑column layout with a left info panel and right details panel
  - Prefer tabular views only where scan speed is important; otherwise cards/lists
  - Use `.badge` variants to communicate item status at a glance

### 14) Typography and Iconography
- Type scale
  - Page titles: `text-2xl md:text-3xl` (marketing) or `text-xl md:text-2xl` (app)
  - Section titles: `text-lg md:text-xl font-semibold`
  - Body: `text-sm md:text-base`
  - Meta/labels/help: `text-xs`
- Icons
  - Use `lucide-react`; sizes 16–20 for inline, 24 for section headers
  - Match icon color to purpose: default `currentColor`, success uses brand via `.badge-good` etc.

### 15) Accessibility
- Always ensure focus visibility (already handled globally via outline tokens).
- Logical headings order (h1 → h2 → h3).
- Labels and `aria-*` attributes on form elements; link labels are descriptive.
- Motion is minimal on app pages; rely on content clarity.

### 16) Responsive Behavior
- Mobile first stacks; convert to grids at `md+`.
- Sticky elements only at `md+` to avoid covering content on small screens.
- Tables degrade to lists on mobile when more than 3 columns.

### 17) Page Templates
- Agreement page (`/portal/agreement`)
  - `PageHeader` with short summary and link to Terms
  - Agreement card: `.surface rounded-xl p-6` with checkbox + submit (`.btn-cta`)
  - Inline fine print uses `text-[var(--muted-foreground)] text-sm`
- Subscribe page (`/portal/subscribe`)
  - Plan summary card + “Continue to Checkout” primary button
  - Secondary link to Terms
- Payment success (`/portal/paymentSuccess`)
  - Confirmation `.surface-elevated` with success pill and next steps
  - Link to `/portal`
- Portal dashboard (`/portal/[projectId]`)
  - Header with status badge (derived from project/subscription)
  - Cards:
    - “Status” (pill + short copy)
    - “Next step” CTA
    - “Recent activity” list (activity_log)
- Admin lists (`/admin`)
  - Page header with filters in `.surface-soft p-3`
  - Data presented as either:
    - Cards grid: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`
    - Table inside `.surface` as shown above

### 18) Do/Don’t Summary
- Do
  - Use `.surface` and `.surface-soft` for most content groupings
  - Use `.btn-cta` for primary actions; `.btn-secondary` for secondary
  - Keep copy concise; use `--muted-foreground` for helper text
  - Show status via `.badge` variants and `.pill` where appropriate
- Don’t
  - Reuse landing hero gradients/beams/word animations on app pages
  - Nest surfaces excessively or use mixed border radii
  - Introduce new colors outside the token system

### 19) Quick Starters
- Standard content section
```tsx
<section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
  <div className="surface rounded-xl p-4 sm:p-6">
    <h2 className="text-lg md:text-xl font-semibold text-[var(--foreground)]">Section title</h2>
    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Short description or guidance.</p>
    {/* Content */}
  </div>
</section>
```
- Toolbar with filters
```tsx
<div className="surface-soft rounded-xl p-3 flex flex-wrap items-center gap-2">
  {/* Filters */}
  <input className="w-48" placeholder="Search…" />
  <select className="w-40">
    <option>All statuses</option>
  </select>
  <div className="ml-auto flex items-center gap-2">
    <button className="btn-secondary px-4 py-2">Export</button>
    <button className="btn-cta px-4 py-2">New</button>
  </div>
}
```

 - Brand assets color picker + preview
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
  <div className="space-y-4 md:col-span-1">
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">Primary color</label>
      <div className="mt-1.5 flex items-center gap-3">
        <input type="color" className="h-10 w-12 rounded border border-[hsl(var(--border))]" />
        <input className="h-10 w-28 font-mono text-xs" placeholder="#111827" />
      </div>
    </div>
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">Accent color</label>
      <div className="mt-1.5 flex items-center gap-3">
        <input type="color" className="h-10 w-12 rounded border border-[hsl(var(--border))]" />
        <input className="h-10 w-28 font-mono text-xs" placeholder="#6EE7B7" />
      </div>
    </div>
  </div>
  <div className="md:col-span-2">
    <label className="text-sm font-medium text-[var(--foreground)]">Preview</label>
    <div
      className="rounded-xl h-40 md:h-48 p-6 flex items-end justify-between overflow-hidden"
      style={{ background: `linear-gradient(135deg, var(--primary), var(--accent))` }}
    >
      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium">Preview</span>
      <button className="px-3 py-1.5 rounded-md text-xs font-medium shadow-sm">Sample Button</button>
    </div>
    <p className="mt-2 text-xs text-[var(--muted-foreground)]">Ensure text has sufficient contrast against chosen colors.</p>
  </div>
</div>
```

Accessibility note for color previews
- Compute readable text color against chosen swatches using relative luminance. Prefer white on dark/saturated colors and near-black on light colors.

This plan intentionally keeps non‑landing pages calm and practical, while preserving the same visual language, tokens, and component treatments established on the landing page. Adjust spacing or density per page needs, but keep surfaces, borders, and button styles consistent throughout the app.

