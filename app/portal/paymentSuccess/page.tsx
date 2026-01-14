"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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
      <div className="w-full max-w-xl mx-auto">
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-600/20 p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                Payment successful
              </h1>
              <p className="mt-1 text-sm text-[var(--foreground)]/80">
                {syncing ? statusMessage : "Redirecting to your portal..."}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--foreground)]/70">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                <span>Please wait</span>
              </div>
            </div>
            <Link href="/portal" className="btn-secondary px-4 py-2 self-start md:self-auto">
              View my portal
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

