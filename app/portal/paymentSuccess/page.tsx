"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { ProgressTimeline } from "@/components/portal";

export default function PaymentSuccessPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <p className="text-[var(--secondary)]">Redirecting...</p>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <PaymentSuccessContent />
      </Authenticated>
    </>
  );
}

function PaymentSuccessContent() {
  const syncAfterSuccess = useAction(api.stripeActions.syncAfterSuccessForSelf);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(true);
  const decision = useQuery(api.auth.getPortalDecision);

  useEffect(() => {
    if (!decision) return;
    if (!decision.authed) {
      router.replace("/portal");
    }
  }, [decision, router]);

  const statusMessage = useMemo(() => {
    if (!decision) return "Setting up your subscription...";
    if (!decision.authed) return "Redirecting to sign-in...";
    const status = decision.primaryProject?.projectStatus ?? "AWAITING_AGREEMENT";
    if (status === "AWAITING_PAYMENT") {
      return "Finalizing your subscription...";
    }
    if (status === "AWAITING_AGREEMENT") {
      return "Redirecting to agreement...";
    }
    return "Redirecting to your portal...";
  }, [decision]);

  useEffect(() => {
    async function syncAndRedirect() {
      try {
        setSyncing(true);
        await syncAfterSuccess({});
        await new Promise((resolve) => setTimeout(resolve, 1000));
        router.push("/portal");
      } catch (err) {
        console.error("Error syncing subscription:", err);
        setError("Failed to sync subscription. Redirecting anyway...");
        setTimeout(() => {
          router.push("/portal");
        }, 2000);
      } finally {
        setSyncing(false);
      }
    }

    void syncAndRedirect();
  }, [router, syncAfterSuccess]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
              ⚠️
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
          <p className="text-[var(--secondary)] mb-4">{error}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--secondary)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
            <span>Redirecting to portal...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10 md:py-12 text-[var(--foreground)] w-full">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* Progress Timeline - Shows payment complete, assets next */}
        <ProgressTimeline currentStatus="AWAITING_ASSETS" className="" />

        {/* Success Card */}
        <div className="surface-elevated rounded-2xl p-6 lg:p-8 relative overflow-hidden">
          {/* Celebration gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-[hsl(var(--primary)/0.05)]" />
          
          <div className="relative">
            <div className="flex flex-col items-center text-center">
              {/* Success icon with pulse animation */}
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-4 ring-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Payment Successful!
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-md">
                {syncing 
                  ? "Setting up your account..." 
                  : "Your subscription is active. Let's get your brand details next!"}
              </p>

              {/* Progress indicator */}
              <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--muted)]/30">
                {syncing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" />
                    <span className="text-sm">{statusMessage}</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm">Redirecting to share your brand assets...</span>
                  </>
                )}
              </div>

              {/* Manual link fallback */}
              <Link 
                href="/portal" 
                className="mt-4 text-sm text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1"
              >
                Go to portal now
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* What's next card */}
        <div className="surface-soft rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-3">What happens next?</h3>
          <ul className="space-y-2 text-xs text-[var(--muted-foreground)]">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5 font-bold">1.</span>
              <span>Share your brand colors, logo, and inspiration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5 font-bold">2.</span>
              <span>We&apos;ll start building your custom website</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5 font-bold">3.</span>
              <span>Review and approve before we go live</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

