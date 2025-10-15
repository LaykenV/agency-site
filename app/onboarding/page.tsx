"use client";

import { useMemo, useState } from "react";
import { useOnboardingProfile } from "@/lib/convex/useOnboardingProfile";
import { cn } from "@/lib/utils";
import {
  BriefContactStep,
  BriefNeedsStep,
  BriefNotesStep,
  BriefSummaryStep,
} from "@/components/onboarding/steps";
import { AutosaveStatus } from "@/components/onboarding/ui/autosave-status";
import { OnboardingField, PlanTierOption, orderedSteps } from "@/types/profile";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const {
    sessionId,
    state,
    dirtyFields,
    write,
    isHydrated,
    isSaving,
    isGeneratingPlan,
    plan,
    regeneratePlan,
  } = useOnboardingProfile({
    onError: () => {
      setError("We hit a snag saving your progress. Changes are local only.");
    },
  });

  const stepMeta = useMemo(() => orderedSteps[step], [step]);

  const handleFieldChange = (field: OnboardingField, value: unknown) => {
    write(field, value as never);
  };

  const nextStep = () =>
    setStep((prev) => Math.min(prev + 1, orderedSteps.length - 1));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const isNextEnabled = stepMeta.nextEnabled(state);
  const isPrevVisible = step > 0;
  const isLastStep = stepMeta.id === "summary";

  const handleNext = () => {
    if (!isNextEnabled) {
      return;
    }

    if (stepMeta.id === "notes") {
      void (async () => {
        if (regeneratePlan) {
          await regeneratePlan();
        }
        nextStep();
      })();
      return;
    }

    nextStep();
  };

  const handleCheckout = (tierId: PlanTierOption) => {
    console.log("Checkout clicked", {
      tierId,
      sessionId,
    });
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Setting up your smart brief…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
            Step {stepMeta.position} of {orderedSteps.length}
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">{stepMeta.title}</h1>
          <p className="text-sm text-[var(--secondary)] md:text-base">
            {stepMeta.caption}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{ width: `${(stepMeta.position / orderedSteps.length) * 100}%` }}
            />
          </div>
        </header>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--background)] px-6 py-8 shadow-lg shadow-black/5 md:px-10 md:py-12">
          <div className="flex flex-col gap-8">
            {(() => {
              switch (stepMeta.id) {
                case "contact":
                  return (
                    <BriefContactStep
                      value={state}
                      onChange={handleFieldChange}
                    />
                  );
                case "needs":
                  return (
                    <BriefNeedsStep
                      value={state}
                      onChange={handleFieldChange}
                    />
                  );
                case "notes":
                  return (
                    <BriefNotesStep
                      value={state}
                      onChange={handleFieldChange}
                    />
                  );
                case "summary":
                  return <BriefSummaryStep value={state} plan={plan} onCheckout={handleCheckout} />;
                default:
                  return null;
              }
            })()}
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-xs text-[var(--secondary)]">
                <AutosaveStatus
                  isSaving={isSaving}
                  dirty={dirtyFields.size > 0}
                  isGeneratingPlan={isGeneratingPlan}
                />
                {error && <span className="text-[var(--accent)]">{error}</span>}
              </div>
              {!isLastStep && (
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  {isPrevVisible && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    className={cn(
                      "rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition",
                      (!isNextEnabled || (stepMeta.id === "notes" && isGeneratingPlan)) &&
                        "pointer-events-none opacity-60",
                    )}
                  >
                    {stepMeta.id === "notes"
                      ? isGeneratingPlan
                        ? "Generating plan…"
                        : "See my tailored plan"
                      : "Next"}
                  </button>
                </div>
              )}
              {isLastStep && isPrevVisible && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="self-start rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}