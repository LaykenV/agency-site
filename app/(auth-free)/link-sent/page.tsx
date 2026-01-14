"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAGIC_LINK_STORAGE_KEY = "portal_magic_link_sent";
const MAGIC_LINK_STORAGE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Magic Link Sent Confirmation Page (Auth-Free)
 * 
 * CRITICAL: This page is in the (auth-free) route group and does NOT use:
 * - ConvexBetterAuthProvider
 * - authClient
 * - Any Convex hooks or queries
 * 
 * This completely isolates it from any cross-tab session synchronization,
 * preventing the issue where Tab 2 (magic link) hangs until Tab 1 is closed.
 * 
 * The resend functionality redirects to /portal instead of calling authClient
 * directly, which is a minor UX tradeoff for reliability.
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

  // Get email from URL param or localStorage (with TTL validation)
  useEffect(() => {
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      return;
    }

    // Fallback to localStorage with TTL check
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(MAGIC_LINK_STORAGE_KEY);
        if (stored) {
          const { email: storedEmail, timestamp } = JSON.parse(stored);
          const now = Date.now();
          
          // Check if the stored data is still valid (within TTL)
          if (timestamp && now - timestamp < MAGIC_LINK_STORAGE_TTL) {
            setEmail(storedEmail);
          } else {
            // Expired - clean up and redirect to portal
            localStorage.removeItem(MAGIC_LINK_STORAGE_KEY);
            router.replace("/portal");
          }
        } else {
          // No stored email - redirect to portal
          router.replace("/portal");
        }
      } catch {
        // On error, redirect to portal
        router.replace("/portal");
      }
    }
  }, [emailParam, router]);

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
          {email && <p className="mt-1 text-base font-medium">{email}</p>}
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
          <p className="text-sm text-center text-amber-700 dark:text-amber-400">
            <strong>Important:</strong> You can close this tab. The sign-in link will open in a new tab.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:flex-1">
            <a href="/portal">Request new link</a>
          </Button>
          <Button asChild variant="outline" className="w-full sm:flex-1">
            <a href="/">Go to homepage</a>
          </Button>
        </div>

        <p className="mt-6 text-xs text-center text-[var(--muted-foreground)]">
          Didn&apos;t receive the email? Check your spam folder or request a new link.
        </p>
      </div>
    </div>
  );
}
