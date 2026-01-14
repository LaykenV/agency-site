"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TERMS_SUMMARY_POINTS,
  TERMS_VERSION,
  TERMS_HASH_INPUT,
} from "@/lib/legal/terms";
import { PageHeader } from "@/components/PageHeader";

export default function AgreementPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <UnauthenticatedAgreementView />
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedAgreementView />
      </Authenticated>
    </>
  );
}

function UnauthenticatedAgreementView() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const error = searchParams.get("error");

  // Redirect to error page if there's an error
  useEffect(() => {
    if (error && sid) {
      window.location.href = `/portal/autherror?sid=${sid}&error=${error}`;
    }
  }, [error, sid]);

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="surface rounded-xl p-6">
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--foreground)]">Please sign in to view the agreement</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            You need to be authenticated to access this page.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedAgreementView() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const error = searchParams.get("error");
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acceptanceError, setAcceptanceError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement | null>(null);

  const findOrCreateProject = useMutation(api.projects.findOrCreateProjectForProspect);
  const createFromClickwrap = useMutation(api.agreement.createFromClickwrap);
  const createCheckout = useAction(api.stripeActions.createCheckoutSession);

  // Get prospect by sessionId
  const prospect = useQuery(
    api.prospects.getProspectBySessionId,
    sid ? { sessionId: sid } : "skip"
  );

  // Get current user
  const user = useQuery(api.auth.getCurrentUser);

  // Load the portal decision to reuse redirect logic and the primary project
  const decision = useQuery(api.auth.getPortalDecision);

  const setError = useCallback((message: string | null) => {
    setErrorMessage(message);
  }, []);

  useEffect(() => {
    if (acceptanceError) {
      const timer = window.setTimeout(() => {
        setAcceptanceError(null);
      }, 4000);
      // Move focus to the error for screen readers
      if (errorRef.current) {
        errorRef.current.focus();
      }
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [acceptanceError]);

  // Redirect to error page if there's an error
  useEffect(() => {
    if (error && sid) {
      window.location.href = `/portal/autherror?sid=${sid}&error=${error}`;
    }
  }, [error, sid]);

  const [primaryProjectId, setPrimaryProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !prospect || isInitialized) return;

    const normalizedUserEmail = (user.email ?? "").trim().toLowerCase();
    const normalizedProspectEmail = prospect.details.contactEmail.trim().toLowerCase();
    if (!normalizedUserEmail || normalizedUserEmail !== normalizedProspectEmail) {
      setError("This agreement belongs to another account.");
      router.replace(`/portal/autherror?sid=${prospect.sessionId}&error=ownership`);
      return;
    }

    void findOrCreateProject({
      prospectId: prospect._id,
    })
      .then((projectId) => {
        setPrimaryProjectId(projectId);
        setIsInitialized(true);
      })
      .catch((initializationError) => {
        console.error("[agreement] failed to initialize project", initializationError);
        setError("We couldn't prepare your project. Please refresh or contact support.");
      });
  }, [findOrCreateProject, isInitialized, prospect, router, setError, user]);

  useEffect(() => {
    if (!decision || !prospect || !user?._id) return;

    // User must have a primary project when initialized. If already awaiting payment or assets, redirect.
    if (decision.primaryProject) {
      const status = decision.primaryProject.projectStatus ?? "AWAITING_AGREEMENT";
      if (status === "AWAITING_PAYMENT") {
        router.replace("/portal/subscribe");
        return;
      }
      if (status === "AWAITING_AGREEMENT") {
        return;
      }
      router.replace(`/portal/${decision.primaryProject.projectId}`);
      return;
    }
    if (decision.redirect && decision.redirect !== `/portal/agreement?sid=${prospect.sessionId}`) {
      router.replace(decision.redirect);
    }
  }, [decision, prospect, router, user?._id]);

  // Compute latestProject before early returns (hooks must come before conditionals)
  const latestProject = useMemo(() => {
    if (decision?.primaryProject) {
      return decision.primaryProject;
    }
    if (primaryProjectId) {
      return {
        _id: primaryProjectId as unknown as Id<"projects">,
        projectId: "",
        projectStatus: "AWAITING_AGREEMENT" as const,
      };
    }
    return null;
  }, [decision?.primaryProject, primaryProjectId]);

  const renderStatusPill = (status: string | undefined) => {
    const base = "pill";
    switch (status) {
      case "LIVE":
        return <span className={`${base} bg-emerald-600 text-white`}>Live</span>;
      case "IN_PROGRESS":
        return <span className={`${base} bg-blue-600 text-white`}>In progress</span>;
      case "IN_REVIEW":
        return <span className={`${base} bg-slate-700 text-white`}>In review</span>;
      case "AWAITING_ASSETS":
      case "AWAITING_PAYMENT":
      case "AWAITING_AGREEMENT":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border border-[hsl(var(--primary))] shadow-sm">
            Awaiting action
          </span>
        );
      case "ARCHIVED":
        return <span className={`${base} bg-rose-600 text-white`}>Archived</span>;
      default:
        return <span className={`${base} bg-slate-600 text-white`}>Unknown</span>;
    }
  };

  const computeTermsHash = useCallback(async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode(TERMS_HASH_INPUT);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const handleAgreementAccept = async () => {
    if (!latestProject || !isChecked || isAccepting) return;
    setAcceptanceError(null);
    setIsAccepting(true);
    try {
      const termsHash = await computeTermsHash();
      const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : undefined;
      await createFromClickwrap({
        projectId: latestProject._id,
        termsVersion: TERMS_VERSION,
        termsHash,
        userAgent,
      });

      // Try to redirect directly to Stripe checkout for frictionless happy path
      try {
        const { url } = await createCheckout({});
        window.location.href = url;
        return; // Exit early on success
      } catch (checkoutErr) {
        console.error("[portal] checkout creation failed, falling back to subscribe page", checkoutErr);
      }

      // Fallback: redirect to subscribe page if checkout creation fails
      router.replace("/portal/subscribe");
    } catch (err) {
      console.error("[portal] failed to accept agreement", err);
      setAcceptanceError("We couldn't capture your agreement. Please try again.");
      setIsAccepting(false);
    }
  };

  // Early returns after all hooks
  if (!sid) {
    return (
      <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="surface rounded-xl p-6">
            <h1 className="text-xl md:text-2xl font-semibold text-red-600">Invalid Session</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">No session ID provided.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Preparing your agreement...</p>
          {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <PageHeader
          title="Service Agreement"
          description={`Hi ${prospect.details.contactName}, review and approve your onboarding agreement to move forward.`}
          secondaryAction={
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-4 py-2"
            >
              View Terms
            </a>
          }
        />

        <div className="space-y-6">
          <div className="surface rounded-xl p-6 glow-primary">
            <h2 className="text-lg font-semibold text-[var(--foreground)] heading-gradient-soft">Project details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
              <div>
                <dt className="font-medium text-[var(--foreground)]">Company</dt>
                <dd>{prospect.details.companyName}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--foreground)]">Primary contact</dt>
                <dd>{prospect.details.contactName}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--foreground)]">Email</dt>
                <dd>{prospect.details.contactEmail}</dd>
              </div>
              <div>
                <dt className="font-medium text-[var(--foreground)]">Project status</dt>
                <dd>{renderStatusPill(latestProject?.projectStatus ?? "AWAITING_AGREEMENT")}</dd>
              </div>
            </dl>
            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600" role="alert" aria-live="polite">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="surface-soft rounded-xl p-6 glow-primary">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">Plan Snapshot</p>
            <ul className="mt-4 space-y-3 text-sm">
              {TERMS_SUMMARY_POINTS.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-[var(--primary)]" />
                  <span>
                    <span className="font-semibold text-[var(--foreground)]">{item.label}:</span> {item.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-[var(--muted-foreground)]">
              Version {TERMS_VERSION}. The complete agreement is available at the link above.
            </p>
          </div>

          <div className="surface rounded-xl p-6 glow-primary">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  id="agree"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded accent-[hsl(var(--primary))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                  checked={isChecked}
                  onChange={(event) => setIsChecked(event.target.checked)}
                  aria-describedby="agreement-fine-print"
                />
                <label htmlFor="agree" className="text-sm">
                  I have read and agree to the Terms of Service, including the 12-month commitment and recurring billing authorization.
                </label>
              </div>
              <p id="agreement-fine-print" className="text-xs text-[var(--muted-foreground)]">
                By clicking accept, you authorize the monthly subscription charge of $199 after checkout. Questions? Email{" "}
                <a className="text-[var(--primary)]" href="mailto:support@acadianawebdesign.com">
                  support@acadianawebdesign.com
                </a>.
              </p>
              {acceptanceError && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600"
                  role="alert"
                  aria-live="polite"
                >
                  {acceptanceError}
                </div>
              )}
              <button
                onClick={handleAgreementAccept}
                className="btn-cta w-full px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isChecked || isAccepting}
                aria-disabled={!isChecked || isAccepting}
                aria-busy={isAccepting}
              >
                {isAccepting ? "Capturing agreement..." : "Accept & Continue to Payment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

