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

const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());
const validatePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return true; // optional
  return digits.length >= 10 && digits.length <= 15;
};
const normalizeWebsite = (value: string) => {
  const raw = value.trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
};

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
  const [fieldErrors, setFieldErrors] = useState<{
    contactEmail?: string;
    phone?: string;
    currentWebsite?: string;
  }>({});

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
  const hasFieldErrors = useMemo(
    () => Object.values(fieldErrors).some(Boolean),
    [fieldErrors],
  );
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
    if (hasFieldErrors) return true;
    if (hasGeneratedPlan && !hasUnsavedChanges) {
      return true;
    }
    return false;
  }, [
    canGeneratePlan,
    hasGeneratedPlan,
    hasUnsavedChanges,
    isGeneratingPlan,
    hasFieldErrors,
  ]);

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
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:px-10 md:py-16 lg:gap-10">
          <header className="flex flex-col gap-3">
            <span className="section-overline text-[var(--muted-foreground)]">Onboarding</span>
            <h1 className="hero-title text-[hsl(var(--hero-foreground))] text-3xl font-semibold md:text-4xl">
              Let&apos;s map out your website plan
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] md:text-base">
              Share a few details so we can craft the plan and help you schedule a call.
            </p>
          </header>

          <section className="surface rounded-3xl px-6 py-8 md:px-10 md:py-12 lg:px-12 lg:py-14">
            <div className="flex flex-col gap-8 lg:gap-10">
              <span className="section-overline text-[var(--muted-foreground)]">Your details</span>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="form-label" htmlFor="contactName">
                    Your name
                  </Label>
                  <Input
                    id="contactName"
                    value={details.contactName}
                    onChange={(event) => handleFieldChange("contactName", event.target.value)}
                    required
                    className="form-control rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="form-label" htmlFor="contactEmail">
                    Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={details.contactEmail}
                    onChange={(event) => handleFieldChange("contactEmail", event.target.value)}
                    onBlur={(event) => {
                      const value = event.target.value;
                      const valid = validateEmail(value);
                      setFieldErrors((prev) => ({
                        ...prev,
                        contactEmail: valid ? undefined : "Enter a valid email (e.g. name@domain.com)",
                      }));
                    }}
                    required
                    aria-invalid={Boolean(fieldErrors.contactEmail)}
                    aria-describedby={fieldErrors.contactEmail ? "contactEmail-error" : undefined}
                    data-invalid={Boolean(fieldErrors.contactEmail)}
                    className="form-control rounded-lg"
                  />
                  {fieldErrors.contactEmail ? (
                    <p
                      id="contactEmail-error"
                      className="form-message form-message--error"
                      aria-live="polite"
                    >
                      {fieldErrors.contactEmail}
                    </p>
                  ) : (
                    <p className="form-message form-message--hint">We&apos;ll send your plan here.</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="form-label" htmlFor="companyName">
                    Company
                  </Label>
                  <Input
                    id="companyName"
                    value={details.companyName}
                    onChange={(event) => handleFieldChange("companyName", event.target.value)}
                    required
                    className="form-control rounded-lg"
                  />
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <Label className="form-label" htmlFor="phone">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={details.phone}
                    onChange={(event) => handleFieldChange("phone", event.target.value)}
                    onBlur={(event) => {
                      const value = event.target.value;
                      const valid = validatePhone(value);
                      setFieldErrors((prev) => ({
                        ...prev,
                        phone: valid ? undefined : "Enter a valid phone number (10–15 digits).",
                      }));
                    }}
                    placeholder="Optional"
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                    data-invalid={Boolean(fieldErrors.phone)}
                    className="form-control rounded-lg"
                  />
                  {fieldErrors.phone ? (
                    <p
                      id="phone-error"
                      className="form-message form-message--error"
                      aria-live="polite"
                    >
                      {fieldErrors.phone}
                    </p>
                  ) : (
                    <p className="form-message form-message--hint">
                      Optional — helps if we need a quick follow-up.
                    </p>
                  )}
                </div>
              </div>

              <span className="section-overline text-[var(--muted-foreground)]">Business overview</span>
              <div className="flex flex-col gap-2 text-sm">
                <Label className="form-label" htmlFor="currentWebsite">
                  Current website
                </Label>
                <Input
                  id="currentWebsite"
                  type="url"
                  autoComplete="url"
                  inputMode="url"
                  value={details.currentWebsite}
                  onChange={(event) => handleFieldChange("currentWebsite", event.target.value)}
                  onBlur={(event) => {
                    const value = event.target.value;
                    const normalized = normalizeWebsite(value);
                    if (normalized === null) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        currentWebsite: "Enter a valid URL (domain or full link).",
                      }));
                    } else {
                      setFieldErrors((prev) => ({ ...prev, currentWebsite: undefined }));
                      if (normalized !== "" && normalized !== value) {
                        handleFieldChange("currentWebsite", normalized);
                      }
                    }
                  }}
                  placeholder="Paste a link if you have one"
                  aria-invalid={Boolean(fieldErrors.currentWebsite)}
                  aria-describedby={fieldErrors.currentWebsite ? "currentWebsite-error" : undefined}
                  data-invalid={Boolean(fieldErrors.currentWebsite)}
                  className="form-control rounded-lg"
                />
                {fieldErrors.currentWebsite ? (
                  <p
                    id="currentWebsite-error"
                    className="form-message form-message--error"
                    aria-live="polite"
                  >
                    {fieldErrors.currentWebsite}
                  </p>
                ) : (
                  <p className="form-message form-message--hint">
                    If you have one, this helps us tailor your plan.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label className="form-label" htmlFor="businessDescription">
                  What should we know about your business?
                </Label>
                <Textarea
                  id="businessDescription"
                  value={details.businessDescription}
                  onChange={(event) => handleFieldChange("businessDescription", event.target.value)}
                  required
                  rows={4}
                  className="form-control form-textarea rounded-lg"
                />
                <p className="form-message form-message--hint">
                  Tell us your services, service area, and who you want to reach.
                </p>
              </div>

              <div className="flex flex-col gap-2 text-sm">
                <Label className="form-label" htmlFor="prospectNotes">
                  Anything else we should keep in mind?
                </Label>
                <Textarea
                  id="prospectNotes"
                  value={details.prospectNotes}
                  onChange={(event) => handleFieldChange("prospectNotes", event.target.value)}
                  placeholder="Optional context, inspiration links, requirements, etc."
                  rows={4}
                  className="form-control form-textarea rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={handleGeneratePlan}
                  variant="outline"
                  className="btn-cta rounded-full px-6 py-3"
                  disabled={buttonDisabled}
                >
                  {buttonLabel}
                </Button>
                {error && <div className="info-banner text-sm">{error}</div>}
                {dirtyFields.size > 0 && !isGeneratingPlan && (
                  <span className="pill text-xs font-semibold">Unsaved changes</span>
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
                <p className="info-banner text-sm">
                  We couldn&apos;t generate a plan just yet. Check your connection and try again.
                </p>
              )}
            </div>
          </section>

          {/* CTA moved into the plan card for a cohesive experience */}
        </div>
      </div>
    </>
  );
}
