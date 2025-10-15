"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export default function PortalPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            <p>Loading your portal...</p>
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <UnauthenticatedView />
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedPortalRedirect />
      </Authenticated>
    </>
  );
}

function UnauthenticatedView() {
  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/portal",
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--background)] px-8 py-12 text-center shadow-lg shadow-black/5">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold">Welcome to the Portal</h1>
          <p className="text-sm text-[var(--secondary)]">
            Sign in to access your project dashboard, manage your site, and track progress.
          </p>
        </div>

        <button
          onClick={handleSignIn}
          className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Sign in with Google
        </button>

        <p className="text-xs text-[var(--secondary)]">
          Don&apos;t have a project yet?{" "}
          <a href="/onboarding" className="underline hover:text-[var(--foreground)]">
            Get started
          </a>
        </p>
      </div>
    </div>
  );
}

function AuthenticatedPortalRedirect() {
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(api.auth.getCurrentUserProfile);

  useEffect(() => {
    if (profile === undefined || user === undefined) {
      // Still loading
      return;
    }

    if (profile === null) {
      // No profile found - redirect to onboarding
      router.push("/onboarding");
      return;
    }

    if (profile.projectId) {
      // Has project - redirect to project portal
      router.push(`/portal/${profile.projectId}`);
    } else {
      // Has profile but no project yet - redirect to onboarding
      router.push("/onboarding");
    }
  }, [profile, user, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
        <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
        <p>Redirecting to your portal...</p>
      </div>
    </div>
  );
}

