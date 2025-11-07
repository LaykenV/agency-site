"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ONBOARDING_CAL_LINK } from "@/lib/config";

type PlanPreviewProps = {
  headline: string;
  summary: string;
  highlights: Array<string>;
  nextSteps: Array<string>;
};

export function PlanPreview({ headline, summary, highlights, nextSteps }: PlanPreviewProps) {
  return (
    <div className="surface rounded-2xl p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <span className="section-overline text-[var(--muted-foreground)]">Your plan</span>
        <h2 className="heading-gradient-soft text-2xl font-semibold">{headline}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{summary}</p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">What&apos;s included</h3>
        <ul className="list-checks">
          {highlights.map((item, index) => {
            return (
              <li key={`highlight-${index}`} className="inline-flex items-start gap-2 text-sm text-[var(--foreground)]">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 text-[var(--primary)]">
                  <path fill="currentColor" d="M8.293 13.293a1 1 0 0 0 1.414 0l6-6a1 1 0 1 0-1.414-1.414L9 10.172 5.707 6.879A1 1 0 0 0 4.293 8.293l4 4z"/>
                </svg>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Next steps</h3>
        <ol className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
          {nextSteps.map((step, index) => {
            return (
              <li key={`step-${index}`} className="flex items-start gap-2">
                <span className="mt-[3px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-8 flex flex-col items-end gap-3">
        <p className="text-right text-sm text-[var(--muted-foreground)]">
          Ready to talk through the details? Book a call and we&apos;ll align on timeline and deliverables.
        </p>
        <Button asChild variant="outline" className="btn-secondary">
          <Link href={ONBOARDING_CAL_LINK} target="_blank" rel="noreferrer">
            Schedule a call
          </Link>
        </Button>
      </div>
    </div>
  );
}


