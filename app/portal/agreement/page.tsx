"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

  const findOrCreateProject = useMutation(api.projects.findOrCreateProjectForProspect);

  // Get prospect by sessionId
  const prospect = useQuery(
    api.prospects.getProspectBySessionId,
    sid ? { sessionId: sid } : "skip"
  );

  // Get current user
  const user = useQuery(api.auth.getCurrentUser);

  // Redirect to error page if there's an error
  useEffect(() => {
    if (error && sid) {
      window.location.href = `/portal/autherror?sid=${sid}&error=${error}`;
    }
  }, [error, sid]);

  useEffect(() => {
    if (user && prospect && !isInitialized) {
      // Idempotent project creation
      findOrCreateProject({
        authUserId: user._id,
        prospectId: prospect._id,
      })
        .then(() => {
          console.log("[agreement] project initialized");
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error("[agreement] failed to initialize project:", error);
        });
    }
  }, [user, prospect, isInitialized, findOrCreateProject]);

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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Agreement</h1>
        <p className="text-lg text-gray-700 mb-6">
          Welcome, {prospect.details.contactName}!
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Project Overview
          </h2>
          <p className="text-blue-800">
            Company: <span className="font-medium">{prospect.details.companyName}</span>
          </p>
        </div>
        <div className="text-gray-600">
          <p className="mb-4">Agreement UI will be implemented here.</p>
          <p className="text-sm text-gray-500">
            This is a placeholder page. The actual clickwrap agreement interface will be added in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

