"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated } from "convex/react";

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
            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            <span>Redirecting to portal...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            ✓
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-[var(--secondary)] mb-4">
          {syncing ? statusMessage : "Redirecting to your portal..."}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <span>Please wait</span>
        </div>
      </div>
    </div>
  );
}

