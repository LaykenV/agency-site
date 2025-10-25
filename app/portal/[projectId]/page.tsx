"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { api } from "@/convex/_generated/api";

export default function ProjectPage() {
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
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view this project</h1>
            <Link 
              href="/portal"
              className="text-[var(--primary)] hover:underline"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedProjectView />
      </Authenticated>
    </>
  );
}

function AuthenticatedProjectView() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();

  const decision = useQuery(api.auth.getPortalDecision);
  const project = useQuery(api.projects.getPortalProject, projectId ? { projectId } : "skip");

  useEffect(() => {
    if (!decision) return;
    if (!decision.authed) {
      router.replace("/portal");
    }
  }, [decision, router]);

  useEffect(() => {
    if (!project && projectId) {
      return;
    }
    if (project === null) {
      router.replace("/portal");
    }
  }, [project, projectId, router]);

  const status = project?.projectStatus ?? decision?.primaryProject?.projectStatus ?? "AWAITING_AGREEMENT";
  const isArchived = status === "ARCHIVED";
  const isAwaitingPayment = status === "AWAITING_PAYMENT";
  const isAwaitingAgreement = status === "AWAITING_AGREEMENT";

  // useMemo hooks must be called before any conditional returns
  const heading = useMemo(() => {
    if (isArchived) {
      return "Project (Archived)";
    }
    if (status === "IN_PROGRESS") {
      return "Project in Progress";
    }
    if (status === "AWAITING_ASSETS") {
      return "We're ready for your assets";
    }
    if (status === "IN_REVIEW") {
      return "Review your project";
    }
    if (status === "LIVE") {
      return "Live project";
    }
    return "Project";
  }, [isArchived, status]);

  const statusBadge = useMemo(() => {
    const label = status ?? "Unknown";
    const baseClass = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";
    if (isArchived) {
      return (
        <span className={`${baseClass} bg-red-500/10 text-red-500`}>Archived</span>
      );
    }
    if (status === "LIVE") {
      return <span className={`${baseClass} bg-emerald-500/10 text-emerald-500`}>Live</span>;
    }
    if (status === "IN_PROGRESS") {
      return <span className={`${baseClass} bg-blue-500/10 text-blue-500`}>In Progress</span>;
    }
    if (status === "IN_REVIEW") {
      return <span className={`${baseClass} bg-amber-500/10 text-amber-500`}>In Review</span>;
    }
    if (status === "AWAITING_ASSETS") {
      return <span className={`${baseClass} bg-purple-500/10 text-purple-500`}>Awaiting Assets</span>;
    }
    return <span className={`${baseClass} bg-[var(--muted)] text-[var(--foreground)]`}>{label}</span>;
  }, [isArchived, status]);

  useEffect(() => {
    if (!project || !decision) return;

    if (isAwaitingAgreement) {
      const target = decision.prospectSessionId
        ? `/portal/agreement?sid=${decision.prospectSessionId}`
        : "/portal";
      router.replace(target);
      return;
    }

    if (isAwaitingPayment) {
      router.replace("/portal/subscribe");
    }
  }, [decision, isAwaitingAgreement, isAwaitingPayment, project, router]);

  // Early return after all hooks
  if (!project) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Loading your project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-8 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--secondary)]">
                Client Portal
              </p>
              <h1 className="mt-3 text-3xl font-semibold">{heading}</h1>
              <p className="mt-2 text-sm text-[var(--secondary)]">
                Project ID: {project.projectId}
              </p>
            </div>
            {statusBadge}
          </div>

          {isArchived ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-500/10 p-6 text-sm text-red-500">
              This project is archived. Reach out to support if you’d like to re-open it or discuss next
              steps.
            </div>
          ) : (
            <div className="mt-8 grid gap-6 text-sm text-[var(--secondary)] sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
                <h2 className="text-base font-semibold text-[var(--foreground)]">Next steps</h2>
                <ul className="mt-4 space-y-3">
                  {status === "AWAITING_ASSETS" && (
                    <li>Share your brand assets so we can jump into build-out.</li>
                  )}
                  {status === "IN_PROGRESS" && (
                    <li>We’re building your site—check back soon for review!</li>
                  )}
                  {status === "IN_REVIEW" && (
                    <li>Review the latest build and leave feedback.</li>
                  )}
                  {status === "LIVE" && <li>Your site is live. Reach out if you need any updates!</li>}
                  {!isArchived && status === undefined && <li>We’re preparing your project details.</li>}
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 p-6">
                <h2 className="text-base font-semibold text-[var(--foreground)]">Need anything?</h2>
                <p className="mt-4">
                  Email us at <a href="mailto:support@acadianawebdesign.com" className="text-[var(--primary)]">support@acadianawebdesign.com</a>
                  {status === "IN_REVIEW" && " or leave notes in your review bundle."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--secondary)]">
          <Link href="/portal" className="text-[var(--primary)] hover:underline">
            ← Back to portal home
          </Link>
          <span>Need help? Contact support.</span>
        </div>
      </div>
    </div>
  );
}