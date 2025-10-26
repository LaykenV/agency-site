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
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

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

      setStatus("sent");
    } catch (error) {
      console.error("[portal] failed to send magic link", error);
      setErrorMessage("We couldn't send a magic link. Please try again.");
      setStatus("error");
    }
  };

  const statusCopy = useMemo(() => {
    if (status === "loading") {
      return "Checking your account...";
    }
    if (status === "sent") {
      return "Magic link sent! Check your inbox to continue.";
    }
    if (status === "unknown") {
      return "We couldn't find that email. Start onboarding or schedule a call.";
    }
    if (status === "error") {
      return errorMessage;
    }
    return null;
  }, [status, errorMessage]);

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
              disabled={status === "loading" || status === "sent"}
            />
          </label>

          <button
            type="submit"
            disabled={status === "loading" || status === "sent"}
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
              href="https://cal.com/acadianawebdesign"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-center font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Schedule a call
            </a>
          </div>
        )}

        {submittedEmail && status === "sent" && (
          <p className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-[var(--secondary)]">
            Sent to {submittedEmail}
          </p>
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

