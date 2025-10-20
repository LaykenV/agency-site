"use client";

type PlanPreviewProps = {
  headline: string;
  summary: string;
  highlights: Array<string>;
  nextSteps: Array<string>;
};

export function PlanPreview({ headline, summary, highlights, nextSteps }: PlanPreviewProps) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
          Your plan
        </span>
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">{headline}</h2>
        <p className="text-sm text-[var(--secondary)]">{summary}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">What&apos;s included</h3>
        <ul className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
          {highlights.map((item, index) => (
            <li key={`highlight-${index}`} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Next steps</h3>
        <ol className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
          {nextSteps.map((step, index) => (
            <li key={`step-${index}`} className="flex items-start gap-2">
              <span className="mt-[3px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}


