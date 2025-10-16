"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export default function ProjectPortalPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            <p>Loading your project...</p>
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <UnauthenticatedView />
      </Unauthenticated>

      <Authenticated>
        <ProjectPortalContent />
      </Authenticated>
    </>
  );
}

function UnauthenticatedView() {
  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.pathname,
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--background)] px-8 py-12 text-center shadow-lg shadow-black/5">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">Authentication Required</h1>
          <p className="text-sm text-[var(--secondary)]">
            Please sign in to access this project portal.
          </p>
        </div>

        <button
          onClick={handleSignIn}
          className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function ProjectPortalContent() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const profile = useQuery(api.profiles.getProfileByProjectId, { projectId });

  if (profile === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--background)] px-8 py-12 text-center shadow-lg shadow-black/5">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold">Project Not Found</h1>
            <p className="text-sm text-[var(--secondary)]">
              The project <span className="font-mono text-xs">{projectId}</span> could not be found or you don&apos;t have access to it.
            </p>
          </div>

          <Link
            href="/portal"
            className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Go to Portal Home
          </Link>
        </div>
      </div>
    );
  }

  const tierName = profile.plan?.tierId
    ? profile.plan.tierId.charAt(0).toUpperCase() + profile.plan.tierId.slice(1)
    : "Not selected";

  const statusDisplay = profile.projectStatus
    ? profile.projectStatus.replace(/_/g, " ")
    : "Unknown";

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold md:text-4xl">
                Welcome, {profile.brief.contactName}!
              </h1>
              <p className="text-lg text-[var(--secondary)]">
                {profile.brief.companyName}
              </p>
            </div>
            <span className="rounded-full bg-[var(--muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
              {statusDisplay}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Project ID
              </span>
              <span className="font-mono text-[var(--foreground)]">{projectId}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Selected Tier
              </span>
              <span className="text-[var(--foreground)]">{tierName}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Email
              </span>
              <span className="text-[var(--foreground)]">{profile.brief.contactEmail}</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold">Next Steps</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Step 1: Assets */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white font-semibold">
                  1
                </div>
                <h3 className="text-lg font-semibold">Provide Your Assets</h3>
              </div>
              <p className="text-sm text-[var(--secondary)]">
                Upload your logo, brand colors, photos, and any content you&apos;d like included on your site.
              </p>
              <div className="mt-2">
                <button
                  disabled
                  className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold text-[var(--secondary)] transition opacity-50 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>

            {/* Step 2: Review */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary)] text-white font-semibold">
                  2
                </div>
                <h3 className="text-lg font-semibold">Review & Approve</h3>
              </div>
              <p className="text-sm text-[var(--secondary)]">
                Once we build your site, you&apos;ll review it here and request any changes before launch.
              </p>
            </div>

            {/* Step 3: Launch */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary)] text-white font-semibold">
                  3
                </div>
                <h3 className="text-lg font-semibold">Launch Your Site</h3>
              </div>
              <p className="text-sm text-[var(--secondary)]">
                We&apos;ll handle deployment, domain setup, and make sure everything is live and running smoothly.
              </p>
            </div>

            {/* Step 4: Manage */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary)] text-white font-semibold">
                  4
                </div>
                <h3 className="text-lg font-semibold">Manage & Update</h3>
              </div>
              <p className="text-sm text-[var(--secondary)]">
                Use the AI Editor to make updates, add content, and evolve your site over time.
              </p>
            </div>
          </div>
        </section>

        {/* Project Brief Summary */}
        <section className="flex flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-8">
          <h2 className="text-xl font-semibold">Your Project Brief</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Industry
              </span>
              <span className="text-[var(--foreground)]">{profile.brief.industry || "Not specified"}</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Primary Need
              </span>
              <span className="text-[var(--foreground)]">
                {profile.brief.primaryNeed.replace(/_/g, " ")}
              </span>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Primary Action
              </span>
              <span className="text-[var(--foreground)]">
                {profile.brief.primaryAction.replace(/_/g, " ")}
              </span>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Timeline
              </span>
              <span className="text-[var(--foreground)]">
                {profile.brief.timeline.option === "asap" 
                  ? "As soon as possible" 
                  : profile.brief.timeline.date || "Not specified"}
              </span>
            </div>
            
            <div className="col-span-2 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                Business Description
              </span>
              <p className="text-sm text-[var(--foreground)]">
                {profile.brief.businessDescription || "Not provided"}
              </p>
            </div>
            
            {profile.brief.additionalNotes && (
              <div className="col-span-2 flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
                  Additional Notes
                </span>
                <p className="text-sm text-[var(--foreground)]">
                  {profile.brief.additionalNotes}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

