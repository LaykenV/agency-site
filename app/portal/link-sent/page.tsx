"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const MAGIC_LINK_STORAGE_KEY = "portal_magic_link_sent";
const MAGIC_LINK_STORAGE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Magic Link Sent Confirmation Page
 * 
 * CRITICAL: This page intentionally does NOT use any Convex auth components
 * (Authenticated, Unauthenticated, AuthLoading) to avoid cross-tab session
 * contention when the user clicks the magic link in another tab.
 * 
 * The problem: When both tabs have active auth components, they compete
 * for session state when the magic link is verified, causing the new tab
 * to hang until the original tab is closed.
 * 
 * The solution: This page is completely static from an auth perspective.
 */
export default function LinkSentPage() {
  return (
    <Suspense fallback={<LinkSentLoading />}>
      <LinkSentContent />
    </Suspense>
  );
}

function LinkSentLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-6">
      <div className="w-full max-w-lg surface rounded-3xl p-6 sm:p-8 text-center">
        <div className="h-12 w-12 mx-auto rounded-full bg-[hsl(var(--secondary))] animate-pulse" />
        <div className="mt-4 h-4 w-32 mx-auto rounded bg-[hsl(var(--secondary))] animate-pulse" />
      </div>
    </div>
  );
}

function LinkSentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email");
  
  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Get email from URL param or localStorage
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
      return;
    }

    // Fallback to localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(MAGIC_LINK_STORAGE_KEY);
        if (stored) {
          const { email: storedEmail, timestamp } = JSON.parse(stored);
          const now = Date.now();
          if (now - timestamp < MAGIC_LINK_STORAGE_TTL) {
            setEmail(storedEmail);
          } else {
            // Expired, redirect back to portal
            localStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
            router.replace("/portal");
          }
        } else {
          // No stored email, redirect back to portal
          router.replace("/portal");
        }
      } catch {
        router.replace("/portal");
      }
    }
  }, [emailParam, router]);

  const handleResend = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setResendSuccess(false);

    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL: "/portal/verify",
        newUserCallbackURL: "/portal/verify",
        errorCallbackURL: "/portal/autherror?error=magic_link",
      });

      // Update localStorage timestamp
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            MAGIC_LINK_STORAGE_KEY,
            JSON.stringify({
              email,
              timestamp: Date.now(),
            }),
          );
        } catch {
          // Ignore localStorage errors
        }
      }

      setResendSuccess(true);
      setIsResending(false);
    } catch (error) {
      console.error("[link-sent] failed to resend magic link", error);
      setErrorMessage("We couldn't send a magic link. Please try again.");
      setIsResending(false);
    }
  };

  const handleTryDifferentEmail = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
    }
    router.replace("/portal");
  };

  if (!email) {
    return <LinkSentLoading />;
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-6">
      <div className="w-full max-w-lg surface rounded-3xl p-6 sm:p-8" role="status" aria-live="polite">
        <div className="mb-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[hsl(var(--primary))]" />
          <p className="mt-2 text-xs uppercase tracking-[0.35em] text-[var(--muted-foreground)]">
            Magic Link Sent
          </p>
          <h1 className="mt-2 text-xl md:text-2xl font-semibold">Check your inbox</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            We&apos;ve sent a secure sign-in link to
          </p>
          <p className="mt-1 text-base font-medium">{email}</p>
        </div>

        {resendSuccess && (
          <div className="mb-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-600 text-center" role="status">
            New link sent! Check your inbox.
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 info-banner text-sm" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleResend} disabled={isResending} className="w-full sm:flex-1">
            {isResending ? "Sending..." : "Resend email"}
          </Button>
          <Button onClick={handleTryDifferentEmail} variant="outline" disabled={isResending} className="w-full sm:flex-1">
            Try different email
          </Button>
        </div>

        <p className="mt-6 text-xs text-center text-[var(--muted-foreground)]">
          You can close this tab after clicking the link in your email.
        </p>
      </div>
    </div>
  );
}
