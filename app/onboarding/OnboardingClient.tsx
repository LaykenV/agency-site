"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useOnboardingSession } from "@/lib/onboarding/useOnboardingSession";
import { PlanPreview } from "@/components/onboarding/PlanPreview";
import type { ProspectField } from "@/types/prospect";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function OnboardingClient() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
        <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
      </div>
    </div>
  );
}

function OnboardingContent() {
  const [error, setError] = useState<string | null>(null);
  const [planRequested, setPlanRequested] = useState(false);

  const {
    sessionId,
    details,
    plan,
    dirtyFields,
    write,
    isHydrated,
    isGeneratingPlan,
    generatePlan,
  } = useOnboardingSession({
    onError: () => {
      setError("We hit a snag saving your progress. Changes are local only.");
    },
  });

  const handleFieldChange = (field: ProspectField, value: unknown) => {
    write(field, value as never);
  };

  const canGeneratePlan = useMemo(() => {
    return (
      Boolean(details.contactName.trim()) &&
      Boolean(details.contactEmail.trim()) &&
      Boolean(details.companyName.trim()) &&
      Boolean(details.businessDescription.trim())
    );
  }, [details]);

  const hasGeneratedPlan = Boolean(plan && plan.generatedAt);
  const hasUnsavedChanges = dirtyFields.size > 0;
  const buttonLabel = useMemo(() => {
    if (isGeneratingPlan) {
      return "Generating your plan…";
    }
    if (hasGeneratedPlan && hasUnsavedChanges) {
      return "Regenerate plan";
    }
    if (hasGeneratedPlan) {
      return "Plan up to date";
    }
    return "See tailored plan";
  }, [isGeneratingPlan, hasGeneratedPlan, hasUnsavedChanges]);

  const buttonDisabled = useMemo(() => {
    if (!canGeneratePlan) return true;
    if (isGeneratingPlan) return true;
    if (hasGeneratedPlan && !hasUnsavedChanges) {
      return true;
    }
    return false;
  }, [canGeneratePlan, hasGeneratedPlan, hasUnsavedChanges, isGeneratingPlan]);

  const handleGeneratePlan = async () => {
    if (!sessionId) {
      setError("Session not initialized. Please refresh the page.");
      return;
    }

    if (!canGeneratePlan) {
      setError("Please fill out your name, email, company, and business overview first.");
      return;
    }

    setError(null);
    setPlanRequested(true);

    try {
      await generatePlan();
    } catch (err) {
      console.error("Plan generation error:", err);
      setError("Failed to generate your plan. Please try again.");
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 md:px-10 md:py-16">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold md:text-4xl">
              Let&apos;s map out your website plan
            </h1>
            <p className="text-sm text-[var(--secondary)] md:text-base">
              Share a few details so we can craft the plan and help you schedule a call.
            </p>
          </header>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--background)] px-6 py-8 shadow-lg shadow-black/5 md:px-10 md:py-12">
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="font-medium text-[var(--foreground)]" htmlFor="contactName">
                    Your name
                  </Label>
                  <Input
                    id="contactName"
                    value={details.contactName}
                    onChange={(event) => handleFieldChange("contactName", event.target.value)}
                    required
                    className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                  />
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="font-medium text-[var(--foreground)]" htmlFor="contactEmail">
                    Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={details.contactEmail}
                    onChange={(event) => handleFieldChange("contactEmail", event.target.value)}
                    required
                    className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                  />
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="font-medium text-[var(--foreground)]" htmlFor="companyName">
                    Company
                  </Label>
                  <Input
                    id="companyName"
                    value={details.companyName}
                    onChange={(event) => handleFieldChange("companyName", event.target.value)}
                    required
                    className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                  />
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="font-medium text-[var(--foreground)]" htmlFor="phone">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={details.phone}
                    onChange={(event) => handleFieldChange("phone", event.target.value)}
                    placeholder="Optional"
                    className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label className="font-medium text-[var(--foreground)]" htmlFor="currentWebsite">
                  Current website
                </Label>
                <Input
                  id="currentWebsite"
                  value={details.currentWebsite}
                  onChange={(event) => handleFieldChange("currentWebsite", event.target.value)}
                  placeholder="Paste a link if you have one"
                  className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                />
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label className="font-medium text-[var(--foreground)]" htmlFor="businessDescription">
                  What should we know about your business?
                </Label>
                <Textarea
                  id="businessDescription"
                  value={details.businessDescription}
                  onChange={(event) => handleFieldChange("businessDescription", event.target.value)}
                  required
                  rows={4}
                  className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                />
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label className="font-medium text-[var(--foreground)]" htmlFor="prospectNotes">
                  Anything else we should keep in mind?
                </Label>
                <Textarea
                  id="prospectNotes"
                  value={details.prospectNotes}
                  onChange={(event) => handleFieldChange("prospectNotes", event.target.value)}
                  placeholder="Optional context, inspiration links, requirements, etc."
                  rows={4}
                  className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={handleGeneratePlan}
                  className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
                  disabled={buttonDisabled}
                >
                  {buttonLabel}
                </Button>
                {error && <span className="text-sm text-[var(--accent)]">{error}</span>}
                {dirtyFields.size > 0 && !isGeneratingPlan && (
                  <div className="inline-flex items-center gap-2 text-[var(--secondary)]">
                    <span className="inline-flex h-2 w-2">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
                    </span>
                    <span className="text-xs font-medium">Unsaved changes</span>
                  </div>
                )}
              </div>

              {plan && (
                <PlanPreview
                  headline={plan.headline}
                  summary={plan.summary}
                  highlights={plan.highlights}
                  nextSteps={plan.nextSteps}
                />
              )}

              {!plan && planRequested && !isGeneratingPlan && (
                <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-[var(--secondary)]">
                  We couldn&apos;t generate a plan just yet. Check your connection and try again.
                </p>
              )}
            </div>
          </section>

          {plan && (
            <footer className="flex flex-col items-start gap-3 text-sm text-[var(--secondary)]">
              <p>
                Ready to talk through the details? Book a call with us and we&apos;ll align on timeline and deliverables.
              </p>
              <Link
                href={ONBOARDING_CAL_LINK}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-[var(--primary)] bg-[var(--background)] px-5 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
              >
                Schedule a call
              </Link>
            </footer>
          )}
        </div>
      </div>
    </>
  );
}
