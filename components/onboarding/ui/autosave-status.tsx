export function AutosaveStatus({
  isSaving,
  dirty,
  isGeneratingPlan,
}: {
  isSaving: boolean;
  dirty: boolean;
  isGeneratingPlan: boolean;
}) {
  if (isGeneratingPlan) {
    return (
      <div className="inline-flex items-center gap-2 text-[var(--secondary)]">
        <span className="inline-flex h-2 w-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
        </span>
        <span className="text-xs font-medium">Generating your tailored plan…</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="inline-flex items-center gap-2 text-[var(--secondary)]">
        <span className="inline-flex h-2 w-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
        </span>
        <span className="text-xs font-medium">Saving…</span>
      </div>
    );
  }

  if (dirty) {
    return (
      <div className="inline-flex items-center gap-2 text-[var(--secondary)]">
        <span className="inline-flex h-2 w-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
        </span>
        <span className="text-xs font-medium">Unsaved changes</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 text-[var(--secondary)]">
      <span className="inline-flex h-2 w-2">
        <span className="h-2 w-2 rounded-full bg-[var(--secondary)]/50" />
      </span>
      <span className="text-xs font-medium">Saved</span>
    </div>
  );
}

