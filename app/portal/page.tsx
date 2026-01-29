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
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const MAGIC_LINK_STORAGE_KEY = "portal_magic_link_sent";

export default function PortalPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
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
  const [status, setStatus] = useState<"idle" | "loading" | "unknown" | "error">("idle");
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
        callbackURL: "/portal/verify",
        newUserCallbackURL: "/portal/verify",
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

      // CRITICAL: Redirect to static HTML page (not a Next.js route) to completely
      // destroy the JavaScript context, close WebSocket connections, and clear
      // BroadcastChannel listeners. This prevents cross-tab session contention on
      // mobile browsers where Tab 2 (magic link) would hang until Tab 1 is closed.
      // Static files bypass Next.js entirely, ensuring full teardown.
      window.location.replace(`/link-sent.html?email=${encodeURIComponent(trimmed)}`);
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
    if (status === "unknown") {
      return "We couldn't find that email. Start onboarding or schedule a call.";
    }
    if (status === "error") {
      return errorMessage;
    }
    return null;
  }, [status, errorMessage]);

  // Login form view
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] px-6">
      <div className="w-full max-w-lg surface rounded-xl p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--muted-foreground)]">
            Client Portal Access
          </p>
          <h1 className="mt-2 text-xl md:text-2xl font-semibold">Already a client?</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Enter the email you use with us and we&apos;ll send a secure sign-in link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portal-email">Email address</Label>
            <Input
              id="portal-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              disabled={status === "loading"}
            />
          </div>

          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Sending magic link..." : "Send magic link"}
          </Button>
        </form>

        {statusCopy && (
          <div role="status" aria-live="polite" className="mt-6 info-banner text-sm">
            {statusCopy}
          </div>
        )}

        {status === "unknown" && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline">
              <Link href="/onboarding">Get Your Tailored Plan</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={ONBOARDING_CAL_LINK}>Schedule a call</a>
            </Button>
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
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="surface rounded-xl p-6">
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--foreground)]">Welcome to your portal</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            We couldn&apos;t find an active project yet. If you recently signed up, check your email for your
            agreement link or start the onboarding flow below.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline"><Link href="/onboarding">Start onboarding</Link></Button>
            <Button asChild variant="outline"><a href="https://cal.com/acadianawebdesign">Schedule a call</a></Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
      <p className="mt-6 text-sm text-[var(--secondary)]">{statusMessage}</p>
    </div>
  );
}

