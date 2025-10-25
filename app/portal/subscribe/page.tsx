"use client";

import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useQuery,
} from "convex/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SubscribePage() {
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
            <h1 className="text-2xl font-bold mb-4">Please sign in to subscribe</h1>
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
        <AuthenticatedSubscribeView />
      </Authenticated>
    </>
  );
}

function AuthenticatedSubscribeView() {
  const createCheckout = useAction(api.stripeActions.createCheckoutSession);
  const [loading, setLoading] = useState(false);
  const decision = useQuery(api.auth.getPortalDecision);
  const router = useRouter();

  useEffect(() => {
    if (!decision) return;
    if (!decision.authed) {
      router.replace("/portal");
      return;
    }

    const primaryStatus = decision.primaryProject?.projectStatus ?? "AWAITING_AGREEMENT";

    if (primaryStatus === "AWAITING_AGREEMENT") {
      const destination = decision.prospectSessionId
        ? `/portal/agreement?sid=${decision.prospectSessionId}`
        : "/portal";
      router.replace(destination);
      return;
    }

    if (primaryStatus !== "AWAITING_PAYMENT") {
      if (decision.primaryProject) {
        router.replace(`/portal/${decision.primaryProject.projectId}`);
      } else if (decision.redirect) {
        router.replace(decision.redirect);
      } else {
        router.replace("/portal");
      }
    }
  }, [decision, router]);

  const statusMessage = useMemo(() => {
    if (!decision) return "Loading your subscription status...";
    if (!decision.authed) return "Redirecting to sign-in...";
    const status = decision.primaryProject?.projectStatus ?? "AWAITING_AGREEMENT";
    if (status === "AWAITING_PAYMENT") return "Ready to complete checkout";
    if (status === "AWAITING_AGREEMENT") return "Redirecting to agreement";
    return "Redirecting to your project";
  }, [decision]);
  
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <h1 className="text-2xl font-bold mb-4">Subscribe</h1>
      <p className="mb-6 text-sm text-[var(--secondary)]">{statusMessage}</p>
      <button
        disabled={loading}
        onClick={async () => {
          try {
            setLoading(true);
            const { url } = await createCheckout({});
            window.location.href = url;
          } catch (err) {
            console.error(err);
            alert("Could not start checkout. Please sign in and try again.");
          } finally {
            setLoading(false);
          }
        }}
        className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Starting checkout..." : "Subscribe Now"}
      </button>
    </div>
  );
}