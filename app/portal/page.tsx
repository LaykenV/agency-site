"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
  useConvex,
} from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { ONBOARDING_CAL_LINK } from "@/lib/config";

const MAGIC_LINK_STORAGE_KEY = "portal_magic_link_sent";
const MAGIC_LINK_STORAGE_TTL = 5 * 60 * 1000; // 5 minutes

export default function PortalPage() {
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
        <UnauthenticatedView />
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedPortalRedirect />
      </Authenticated>
    </>
  );
}

function UnauthenticatedView() {
  const convex = useConvex();
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "unknown" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Restore success state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(MAGIC_LINK_STORAGE_KEY);
      if (stored) {
        const { email: storedEmail, timestamp } = JSON.parse(stored);
        const now = Date.now();
        if (now - timestamp < MAGIC_LINK_STORAGE_TTL) {
          setSubmittedEmail(storedEmail);
          setStatus("sent");
        } else {
          localStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("[portal] failed to restore success state", error);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage("Please enter your email.");
      return;
    }

    setErrorMessage(null);
    setStatus("loading");
    setSubmittedEmail(trimmed);

    try {
      const known = await convex.query(api.prospects.isKnownEmail, {
        email: trimmed,
      });

      if (!known) {
        setStatus("unknown");
        return;
      }

      await authClient.signIn.magicLink({
        email: trimmed,
        callbackURL: "/portal",
        newUserCallbackURL: "/portal",
        errorCallbackURL: "/portal/autherror?error=magic_link",
      });

      // Persist success state to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            MAGIC_LINK_STORAGE_KEY,
            JSON.stringify({
              email: trimmed,
              timestamp: Date.now(),
            }),
          );
        } catch (error) {
          console.error("[portal] failed to persist success state", error);
        }
      }

      setStatus("sent");
    } catch (error) {
      console.error("[portal] failed to send magic link", error);
      setErrorMessage("We couldn't send a magic link. Please try again.");
      setStatus("error");
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      await authClient.signIn.magicLink({
        email: submittedEmail,
        callbackURL: "/portal",
        newUserCallbackURL: "/portal",
        errorCallbackURL: "/portal/autherror?error=magic_link",
      });

      setIsResending(false);
      // Update localStorage timestamp
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            MAGIC_LINK_STORAGE_KEY,
            JSON.stringify({
              email: submittedEmail,
              timestamp: Date.now(),
            }),
          );
        } catch (error) {
          console.error("[portal] failed to persist success state", error);
        }
      }
    } catch (error) {
      console.error("[portal] failed to resend magic link", error);
      setErrorMessage("We couldn't send a magic link. Please try again.");
      setIsResending(false);
      // Keep status as "sent" to stay in success view, but show error message
    }
  };

  const handleTryDifferentEmail = () => {
    setEmail("");
    setSubmittedEmail(null);
    setStatus("idle");
    setErrorMessage(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
    }
  };

  const statusCopy = useMemo(() => {
    if (status === "loading") {
      return "Checking your account...";
    }
    if (status === "unknown") {
      return "We couldn't find that email. Start onboarding or schedule a call.";
    }
    if (status === "error") {
      return errorMessage;
    }
    return null;
  }, [status, errorMessage]);

  // Success view - replaces entire form
  if (status === "sent" && submittedEmail) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--card)_0%,transparent_60%)] opacity-60" />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-10 shadow-xl backdrop-blur animate-[fadeIn_0.3s_ease-in]">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[var(--primary)]/20 animate-ping" />
                <CheckCircle2 className="relative h-16 w-16 text-[var(--primary)] animate-[zoomIn_0.5s_ease-out]" />
              </div>
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--secondary)]">
              Magic Link Sent
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Check your inbox</h1>
            <p className="mt-3 text-sm text-[var(--secondary)]">
              We&apos;ve sent a secure sign-in link to
            </p>
            <p className="mt-2 text-base font-medium text-[var(--foreground)]">
              {submittedEmail}
            </p>
          </div>

          <div className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </div>
            )}

            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-sm text-[var(--secondary)]">
              <p className="font-medium text-[var(--foreground)] mb-2">
                What&apos;s next?
              </p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Check your inbox for an email from us</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Click the sign-in link in the email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Don&apos;t see it? Check your spam folder</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleResend}
                disabled={isResending}
                className="flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResending ? "Sending..." : "Resend email"}
              </button>
              <button
                onClick={handleTryDifferentEmail}
                disabled={isResending}
                className="flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Try different email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login form view
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--card)_0%,transparent_60%)] opacity-60" />
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-10 shadow-xl backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--secondary)]">
            Client Portal Access
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Already a client?</h1>
          <p className="mt-3 text-sm text-[var(--secondary)]">
            Enter the email you use with us and we&apos;ll send a secure sign-in link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-[var(--secondary)]">
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)]/90 px-4 py-3 text-[var(--foreground)] shadow-inner focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
              placeholder="you@company.com"
              required
              disabled={status === "loading"}
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading"}
            className="flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Sending magic link..." : "Send magic link"}
          </button>
        </form>

        {statusCopy && (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4 text-sm text-[var(--secondary)]">
            {statusCopy}
          </div>
        )}

        {status === "unknown" && (
          <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--secondary)]">
            <a
              href="/onboarding"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-center font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Start onboarding
            </a>
            <a
              href={ONBOARDING_CAL_LINK}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-center font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Schedule a call
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthenticatedPortalRedirect() {
  const decision = useQuery(api.auth.getPortalDecision);
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!decision) return;
    if (hasRedirected.current) return;

    if (!decision.authed) {
      hasRedirected.current = true;
      router.replace("/portal");
      return;
    }

    const target = decision.redirect;
    if (target && target !== "/portal") {
      hasRedirected.current = true;
      router.replace(target);
      return;
    }

    if (!target) {
      hasRedirected.current = true;
      setShowFallback(true);
    }
  }, [decision, router]);

  const statusMessage = useMemo(() => {
    if (!decision) {
      return "Checking your portal status...";
    }

    if (!decision.authed) {
      return "Almost there—signing you in...";
    }

    if (!decision.primaryProject) {
      if (decision.prospectSessionId) {
        return "Taking you to your service agreement...";
      }
      if (showFallback) {
        return "Let's get you set up.";
      }
      return "We couldn't find a project yet. Redirecting...";
    }

    const status = decision.primaryProject.projectStatus ?? "AWAITING_AGREEMENT";
    if (status === "AWAITING_AGREEMENT") {
      return "Taking you to your service agreement...";
    }
    if (status === "AWAITING_PAYMENT") {
      return "Sending you to checkout...";
    }
    if (status === "ARCHIVED") {
      return "Opening your archived project...";
    }
    if (!decision.redirect) {
      return "Let&apos;s get you set up.";
    }
    return "Launching your project workspace...";
  }, [decision, showFallback]);

  if (showFallback) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Welcome to your portal</h1>
          <p className="text-sm text-[var(--secondary)]">
            We couldn&apos;t find an active project yet. If you recently signed up, check your email for your
            agreement link or start the onboarding flow below.
          </p>
          <div className="flex flex-col gap-3 text-sm">
            <a
              href="/onboarding"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Start onboarding
            </a>
            <a
              href="https://cal.com/acadianawebdesign"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Schedule a call
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <span className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
      <p className="mt-6 text-sm text-[var(--secondary)]">{statusMessage}</p>
    </div>
  );
}

