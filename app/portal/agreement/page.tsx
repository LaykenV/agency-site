"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
  useConvex,
} from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const convex = useConvex();

  const findOrCreateProject = useMutation(api.projects.findOrCreateProjectForProspect);

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

  const handleAgreementAccept = async () => {
    if (!latestProject) return;
    try {
      await convex.mutation(api.agreement.createFromClickwrap, {
        projectId: latestProject._id,
        termsVersion: "2024-09-01",
        termsHash: "placeholder-hash",
      });
      router.replace("/portal/subscribe");
    } catch (err) {
      console.error("[portal] failed to accept agreement", err);
      alert("We couldn't capture your agreement. Please try again.");
    }
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

        <div className="mt-8 space-y-4 text-sm text-[var(--secondary)]">
          <p>
            The full agreement text will appear here. By confirming, you agree to the terms outlined
            for your website project and acknowledge that the next step will be a secure payment checkout.
          </p>
          <button
            onClick={handleAgreementAccept}
            className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition hover:brightness-110"
          >
            Accept & Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
}

