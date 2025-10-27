"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TERMS_SUMMARY_POINTS,
  TERMS_VERSION,
  TERMS_HASH_INPUT,
} from "@/lib/legal/terms";

export default function AgreementPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Please sign in to view the agreement</h1>
        <p className="text-[var(--secondary)] mb-4">
          You need to be authenticated to access this page.
        </p>
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

  const findOrCreateProject = useMutation(api.projects.findOrCreateProjectForProspect);
  const createFromClickwrap = useMutation(api.agreement.createFromClickwrap);

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
      router.replace("/portal/subscribe");
    } catch (err) {
      console.error("[portal] failed to accept agreement", err);
      setAcceptanceError("We couldn't capture your agreement. Please try again.");
    }
    setIsAccepting(false);
  };

  // Early returns after all hooks
  if (!sid) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Session</h1>
          <p className="text-[var(--secondary)]">No session ID provided.</p>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Loading prospect data...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Setting up your project...</p>
          {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-[var(--background)] text-[var(--foreground)] px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--muted)_0%,transparent_70%)] opacity-50" />
      <div className="relative z-10 mx-auto max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--card)]/90 p-10 shadow-2xl backdrop-blur">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--secondary)]">
            Agreement Stage
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Sign your service agreement</h1>
          <p className="mt-3 text-sm text-[var(--secondary)]">
            Hi {prospect.details.contactName}, review and approve your onboarding agreement to move forward.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
          <h2 className="text-lg font-semibold">Project details</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-[var(--secondary)] sm:grid-cols-2">
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
              <dd>{latestProject?.projectStatus ?? "AWAITING_AGREEMENT"}</dd>
            </div>
          </dl>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-500/10 p-4 text-sm text-red-500">
            {errorMessage}
          </div>
        )}

        <div className="mt-10 space-y-8 text-sm text-[var(--secondary)]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--secondary)]">Plan Snapshot</p>
            <ul className="mt-4 space-y-3">
              {TERMS_SUMMARY_POINTS.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-[var(--primary)]" />
                  <span>
                    <span className="font-semibold text-[var(--foreground)]">{item.label}:</span> {item.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-[var(--secondary)]">
              Version {TERMS_VERSION} • The complete agreement is available at the link below.
            </p>
          </div>

          <div className="space-y-3">
            <p>
              Review the Terms of Service before continuing. Acceptance confirms the 12-month commitment, recurring billing authorization, and our unlimited edits policy.
            </p>
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              View Terms of Service
            </a>
          </div>

          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                checked={isChecked}
                onChange={(event) => setIsChecked(event.target.checked)}
              />
              <span>
                I have read and agree to the Terms of Service, including the 12-month commitment and recurring billing authorization.
              </span>
            </label>
            <p className="text-xs text-[var(--secondary)]">
              By clicking accept, you authorize the monthly subscription charge of $199 after checkout. Questions? Email
              {" "}
              <a className="text-[var(--primary)]" href="mailto:support@acadianawebdesign.com">
                support@acadianawebdesign.com
              </a>
              .
            </p>
            {acceptanceError && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-500">
                {acceptanceError}
              </div>
            )}
            <button
              onClick={handleAgreementAccept}
              className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isChecked || isAccepting}
              aria-disabled={!isChecked || isAccepting}
            >
              {isAccepting ? "Capturing agreement..." : "Accept & Continue to Payment"}
            </button>
            <p className="text-xs text-[var(--secondary)]">Takes about 2 minutes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

