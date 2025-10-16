"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { handoffAnonymousSession } from "@/lib/auth/session-handoff";

export default function Onboarding() {
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
        <p>Loading onboarding…</p>
      </div>
    </div>
  );
}

function OnboardingContent() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showAuthFallback, setShowAuthFallback] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const setPlanSelection = useMutation(api.profiles.setPlanSelection);
  const linkSession = useMutation(api.auth.linkAnonymousSession);
  const confirmCheckout = useMutation(api.profiles.confirmCheckoutForSession);
  const currentUser = useQuery(api.auth.getCurrentUser);
  const isAuthenticated = Boolean(currentUser);
  
  // Fetch profile to check if user already has a projectId
  const userProfile = useQuery(api.auth.getCurrentUserProfile);
  
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
    authStatusLoaded: currentUser !== undefined,
  });

  // Redirect authenticated users who already have a projectId
  useEffect(() => {
    // Skip if still loading user or profile data
    if (currentUser === undefined || userProfile === undefined) {
      return;
    }
    
    // If user is authenticated and has a projectId, redirect to portal
    if (isAuthenticated && userProfile?.projectId) {
      console.log("User already has project, redirecting to portal...");
      router.push(`/portal/${userProfile.projectId}`);
    }
  }, [currentUser, userProfile, isAuthenticated, router]);

  // Handle OAuth callback from fallback auth flow
  useEffect(() => {
    const checkoutPending = searchParams.get("checkout");
    
    if (checkoutPending === "pending" && isAuthenticated && sessionId) {
      // User just returned from OAuth flow, link the session and complete checkout
      const completeCheckout = async () => {
        try {
          setIsCheckingOut(true);
          await handoffAnonymousSession(linkSession);
          console.log("Session successfully linked after OAuth callback");
          
          // Confirm checkout with simulated payment
          const result = await confirmCheckout({ sessionId });
          console.log("Checkout confirmed, projectId:", result.projectId);
          
          // TODO: Replace simulated payment with real Stripe checkout:
          // const checkoutUrl = await createStripeCheckout({ tierId: plan?.tierId, sessionId });
          // window.location.href = checkoutUrl;
          
          // Redirect to portal
          router.push(`/portal/${result.projectId}`);
        } catch (err) {
          console.error("Failed to complete checkout after OAuth:", err);
          setError("Failed to complete checkout. Please try again or contact support.");
        } finally {
          setIsCheckingOut(false);
        }
      };
      
      void completeCheckout();
    }
  }, [searchParams, isAuthenticated, sessionId, linkSession, confirmCheckout, router]);

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

  const handleCheckout = async (tierId: PlanTierOption) => {
    if (!sessionId) {
      setError("Session not initialized. Please refresh the page.");
      return;
    }

    try {
      setIsCheckingOut(true);
      setError(null);
      setShowAuthFallback(false);

      // 1. Save tier selection
      await setPlanSelection({ sessionId, tierId });
      console.log("Tier selected:", tierId);

      // If user is already authenticated, skip One Tap and go straight to checkout
      if (isAuthenticated) {
        console.log("User already authenticated, confirming checkout...");
        const result = await confirmCheckout({ sessionId, tierId });
        console.log("Checkout confirmed, projectId:", result.projectId);
        
        // TODO: Replace simulated payment with real Stripe checkout:
        // const checkoutUrl = await createStripeCheckout({ tierId, sessionId });
        // window.location.href = checkoutUrl;
        
        router.push(`/portal/${result.projectId}`);
        return;
      }

      // 2. Trigger Google One Tap for anonymous users
      await authClient.oneTap({
        fetchOptions: {
          onSuccess: async () => {
            try {
              // 3. Link anonymous session to authenticated user
              await handoffAnonymousSession(linkSession);
              console.log("Session successfully linked to authenticated user");

              // 4. Confirm checkout with simulated payment
              const result = await confirmCheckout({ sessionId, tierId });
              console.log("Checkout confirmed, projectId:", result.projectId);
              
              // TODO: Replace simulated payment with real Stripe checkout:
              // const checkoutUrl = await createStripeCheckout({ tierId, sessionId });
              // window.location.href = checkoutUrl;
              
              // Redirect to portal
              router.push(`/portal/${result.projectId}`);
            } catch (linkError) {
              console.error("Failed to link session or confirm checkout:", linkError);
              setError("Failed to complete checkout. Please contact support.");
            } finally {
              setIsCheckingOut(false);
            }
          },
          onError: (error) => {
            console.error("One Tap sign-in failed:", error);
            setError("Sign-in failed. Please try again.");
            setShowAuthFallback(true);
            setIsCheckingOut(false);
          },
        },
        onPromptNotification: (notification) => {
          console.warn("One Tap prompt notification:", notification);

          if (
            notification.isNotDisplayed() ||
            notification.isSkippedMoment() ||
            notification.isDismissedMoment()
          ) {
            setShowAuthFallback(true);
            setIsCheckingOut(false);
            return;
          }

          if ((notification as { reason?: string | null }).reason === "secure-context-required") {
            setError(
              "Google Sign-In needs HTTPS or localhost. Try disabling extensions or switching to Chrome with cookies allowed."
            );
            setShowAuthFallback(true);
            setIsCheckingOut(false);
          }
        },
      });
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Failed to initiate checkout. Please try again.");
      setShowAuthFallback(true);
      setIsCheckingOut(false);
    } finally {
      if (isAuthenticated) {
        setIsCheckingOut(false);
      }
    }
  };

  const handleFallbackAuth = async () => {
    try {
      setIsCheckingOut(true);
      setError(null);

      // Trigger standard Google OAuth flow
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding?checkout=pending",
      });
    } catch (err) {
      console.error("Fallback auth error:", err);
      setError("Failed to sign in. Please try again.");
      setShowAuthFallback(true);
      setIsCheckingOut(false);
    } finally {
      // If navigation didn’t happen (popup blocked, etc.), ensure fallback stays visible
      setShowAuthFallback(true);
      setIsCheckingOut(false);
    }
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
                  return (
                    <BriefSummaryStep 
                      value={state} 
                      plan={plan} 
                      onCheckout={handleCheckout}
                      isCheckingOut={isCheckingOut}
                    showAuthFallback={showAuthFallback && !isAuthenticated}
                    onFallbackAuth={isAuthenticated ? undefined : handleFallbackAuth}
                    />
                  );
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