### Admin UI Design Guide

This guide summarizes the visual language applied to the Admin pages so new features remain consistent with the rest of the app.

#### Page shell
- Add a gradient backdrop near the top of the page:
  - Wrapper: `className="relative"`
  - Backdrop: `<div aria-hidden className="absolute inset-x-0 -top-16 -z-10 page-gradient h-[30vh] pointer-events-none" />`
- Use `SectionHeader` for page titles:
  - Example: `<SectionHeader as="h1" align="left" size="md">Admin</SectionHeader>`

#### Tabs (segmented control)
- Container: `surface-elevated rounded-xl p-1.5`
- Items: `pill px-3 py-1.5`
- Active item: `border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]`

```tsx
<div className="surface-elevated rounded-xl p-1.5">
  <nav className="flex flex-wrap gap-1.5">
    <button className="pill px-3 py-1.5 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]">Prospects</button>
    <button className="pill px-3 py-1.5">Projects</button>
  </nav>
</div>
```

#### Buttons
- Primary CTAs: `.btn-cta`
- Secondary: `.btn-secondary`
- Outline: `.btn-outline-strong`
- Dangerous: `.btn-danger`

```tsx
<button className="btn-cta px-4 py-2">Save</button>
<button className="btn-outline-strong px-4 py-2">Cancel</button>
```

#### Forms
- Labels: `.form-label`
- Inputs: `.form-control`
- Textareas: `.form-control form-textarea`
- Selects: `className="form-control !h-8 !py-1 !text-sm"` for compact rows

```tsx
<label className="form-label">Email *</label>
<input type="email" required className="form-control" />

<label className="form-label">Notes</label>
<textarea rows={3} className="form-control form-textarea" />
```

#### Surfaces and cards
- Primary container card: `surface rounded-xl p-*`
- Elevated modals/important panels: `surface-elevated rounded-xl`
- Subtle blocks within rows: `surface-soft`

```tsx
<div className="surface rounded-xl p-6">…</div>
<div className="surface-elevated rounded-xl p-6">…</div>
<div className="surface-soft p-4">…</div>
```

#### Tables
- Wrap tables in a surface:
  - `<div className="surface rounded-xl overflow-x-auto">`
  - `<table className="min-w-full">`
- Avoid `bg-gray-*` and explicit gray borders; rely on tokens.

```tsx
<div className="surface rounded-xl overflow-x-auto">
  <table className="min-w-full">
    <thead>
      <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th></tr>
    </thead>
    <tbody>…</tbody>
  </table>
</div>
```

#### Badges and pills
- Generic badge: `.badge`
- Metric/strong badge: `.badge-metric`
- Small status pills: `.pill`
- Success/Destructive pills: `.pill-success` / `.pill-danger`
- Request status mapping:
  - open: `pill text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.10)]`
  - in_progress: `pill text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.10)]`
  - waiting_on_client: `pill text-[hsl(var(--brand-amber))] bg-[hsl(var(--brand-amber)/0.10)]`
  - resolved: `pill-success`
  - closed: `pill`

```tsx
<span className="pill text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.10)]">Open</span>
```

#### Links
- Use brand color with underline on hover:
  - `className="text-[hsl(var(--primary))] hover:underline"`

#### Images/attachments
- Use token borders, avoid gray literals:
  - `className="rounded border hover:border-blue-500 transition"`

#### Notes
- Stick to utilities in `app/globals.css` and prefer tokens over literal Tailwind grays.
- Keep logic unchanged; updates are visual only.

