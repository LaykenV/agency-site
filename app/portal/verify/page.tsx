"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";

/**
 * Magic Link Verification Landing Page
 * 
 * This page is the target for magic link callbacks. It handles the auth state
 * transition and redirects to the appropriate portal destination.
 * 
 * Having a dedicated page for magic link landing eliminates cross-tab session
 * contention that occurs when both the "Check your inbox" tab and the magic link
 * tab are on the same /portal route.
 * 
 * Supports optional `sid` query parameter for agreement flows.
 */
export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoadingView message="Verifying your sign-in link..." />}>
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");

  return (
    <>
      <AuthLoading>
        <VerifyLoadingView message="Verifying your sign-in link..." />
      </AuthLoading>

      <Unauthenticated>
        <VerifyUnauthenticatedView sid={sid} />
      </Unauthenticated>

      <Authenticated>
        <VerifyAuthenticatedRedirect sid={sid} />
      </Authenticated>
    </>
  );
}

function VerifyLoadingView({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
      <p className="mt-6 text-sm text-[var(--muted-foreground)]">{message}</p>
    </div>
  );
}

function VerifyUnauthenticatedView({ sid }: { sid: string | null }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  // If we're unauthenticated on the verify page, the magic link may have expired
  // or failed. Redirect back to /portal or autherror after a brief delay.
  useEffect(() => {
    if (countdown <= 0) {
      if (sid) {
        router.replace(`/portal/autherror?sid=${sid}&error=verify_failed`);
      } else {
        router.replace("/portal?error=verify_failed");
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router, sid]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-6">
      <div className="w-full max-w-md surface rounded-xl p-6 text-center">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          Sign-in link expired or invalid
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Your magic link may have expired. Redirecting you to request a new one...
        </p>
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">
          Redirecting in {countdown}...
        </p>
      </div>
    </div>
  );
}

function VerifyAuthenticatedRedirect({ sid }: { sid: string | null }) {
  const decision = useQuery(api.auth.getPortalDecision);
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!decision) return;
    if (hasRedirected.current) return;

    // If not actually authenticated (edge case), go to portal
    if (!decision.authed) {
      hasRedirected.current = true;
      router.replace("/portal");
      return;
    }

    // Determine redirect target:
    // 1. If sid is provided, go directly to agreement page
    // 2. Otherwise use the decision's redirect target
    // 3. Fall back to /portal
    let target: string;
    if (sid) {
      target = `/portal/agreement?sid=${sid}`;
    } else {
      target = decision.redirect ?? "/portal";
    }
    
    hasRedirected.current = true;
    
    // Clear any magic link localStorage state since we're now authenticated
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("portal_magic_link_sent");
      } catch {
        // Ignore localStorage errors
      }
    }
    
    router.replace(target);
  }, [decision, router, sid]);

  return <VerifyLoadingView message="Signing you in..." />;
}
