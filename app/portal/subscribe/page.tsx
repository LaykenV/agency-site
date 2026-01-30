"use client";

import {
  useQuery,
  useAction,
} from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProgressTimeline } from "@/components/portal";
import { StickyAuth } from "@/components/StickyAuth";

export default function SubscribePage() {
  return (
    <StickyAuth
      unauthenticatedFallback={
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
      }
    >
      <AuthenticatedSubscribeView />
    </StickyAuth>
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
    <section className="mx-auto max-w-6xl px-6 py-10 md:py-12 text-[var(--foreground)] w-full">
      {/* Progress Timeline */}
      <ProgressTimeline currentStatus="AWAITING_PAYMENT" className="mb-8" />

      <PageHeader title="Complete Your Payment" description={statusMessage} />

      <div className="surface rounded-xl p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-[var(--foreground)]">The All‑Inclusive Plan</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">$199/mo · 12‑month minimum</p>
          </div>
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
            className="btn-cta px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Starting checkout..." : "Continue to Checkout"}
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          By continuing you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:opacity-90">
            Terms
          </Link>
          .
        </p>
      </div>
    </section>
  );
}