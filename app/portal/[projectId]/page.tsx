"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { defaultBrief, PlanProposal, PlanTierOption } from "@/types/profile";

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

  const project = useQuery(api.projects.getProjectById, { projectId });
  const sessionData = useQuery(
    api.onboarding_sessions.getSession,
    project?.onboardingSessionId
      ? { sessionId: project.onboardingSessionId }
      : "skip",
  );

  if (project === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Loading project details...</p>
        </div>
      </div>
    );
  }

  if (project === null) {
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

  if (project.onboardingSessionId && sessionData === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Loading session details...</p>
        </div>
      </div>
    );
  }

  const brief = sessionData?.brief ?? defaultBrief;
  const plan = sessionData?.plan;

  const tierName = project.planTier
    ? project.planTier.charAt(0).toUpperCase() + project.planTier.slice(1)
    : "Not selected";

  const statusDisplay = project.projectStatus
    ? project.projectStatus.replace(/_/g, " ")
    : "Unknown";

  const contactName = brief.contactName || "Client";

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold md:text-4xl">
                Welcome, {contactName}!
              </h1>
              <p className="text-lg text-[var(--secondary)]">
                {brief.companyName || "Project"}
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
              <span className="text-[var(--foreground)]">{brief.contactEmail || "Unknown"}</span>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold">Next Steps</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <StepCard
              step="1"
              title="Provide Your Assets"
              description="Upload your logo, brand colors, photos, and any content you&apos;d like included on your site."
            />
            <StepCard
              step="2"
              title="Review & Approve"
              description="Once we build your site, you&apos;ll review it here and request any changes before launch."
            />
            <StepCard
              step="3"
              title="Launch Your Site"
              description="We&apos;ll handle deployment, domain setup, and make sure everything is live and running smoothly."
            />
            <StepCard
              step="4"
              title="Manage & Update"
              description="Use the AI Editor to make updates, add content, and evolve your site over time."
            />
          </div>
        </section>

        <section className="flex flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20 p-8">
          <h2 className="text-xl font-semibold">Your Project Brief</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <BriefField label="Industry" value={brief.industry || "Not specified"} />
            <BriefField
              label="Primary Need"
              value={brief.primaryNeed.replace(/_/g, " ")}
            />
            <BriefField
              label="Primary Action"
              value={brief.primaryAction.replace(/_/g, " ")}
            />
            <BriefField
              label="Timeline"
              value={
                brief.timeline.option === "asap"
                  ? "As soon as possible"
                  : brief.timeline.date || "Not specified"
              }
            />
            <BriefField
              label="Business Description"
              value={brief.businessDescription || "Not provided"}
              full
            />
            {brief.additionalNotes && (
              <BriefField
                label="Additional Notes"
                value={brief.additionalNotes}
                full
              />
            )}
          </div>
        </section>

        {plan && (
          <section className="flex flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-8">
            <h2 className="text-xl font-semibold">Plan Recommendation</h2>
            <PlanDetails plan={plan} selectedTier={project.planTier} />
          </section>
        )}
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white font-semibold">
          {step}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-[var(--secondary)]">{description}</p>
      <div className="mt-2">
        <button
          disabled
          className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold text-[var(--secondary)] transition opacity-50 cursor-not-allowed"
        >
          Coming Soon
        </button>
      </div>
    </div>
  );
}

function BriefField({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 flex flex-col gap-2" : "flex flex-col gap-2"}>
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--secondary)]">
        {label}
      </span>
      <span className="text-sm text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function PlanDetails({
  plan,
  selectedTier,
}: {
  plan: PlanProposal;
  selectedTier: PlanTierOption | null;
}) {
  const tiers: Array<PlanTierOption> = ["starter", "professional", "enterprise"];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map((tier) => {
        const tierData = plan.tiers[tier];
        const isRecommended = plan.recommendedTier === tier;
        const isSelected = selectedTier === tier;

        return (
          <div
            key={tier}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
                  {tier === "starter"
                    ? "Starter"
                    : tier === "professional"
                      ? "Professional"
                      : "Enterprise"}
                </span>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {tierData.headline}
                </h3>
              </div>
              {(isRecommended || isSelected) && (
                <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {isSelected ? "Selected" : "Recommended"}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--secondary)]">{tierData.tierSummary}</p>
            <p className="text-sm text-[var(--foreground)]">{tierData.summary}</p>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
                Pages
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
                {tierData.pages.map((page) => (
                  <li key={page}>{page}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--secondary)]">
                Key features
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
                {tierData.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-[var(--secondary)]">{tierData.deliverableNotes}</p>
          </div>
        );
      })}
    </div>
  );
}

