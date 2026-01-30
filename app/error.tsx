"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Global Error Boundary
 * 
 * Catches unhandled client-side errors and displays a user-friendly error page.
 * This prevents users from seeing the generic "Application had client side error" message.
 * 
 * Common causes of client-side errors:
 * - Auth state transitions during reconnection
 * - Network failures during API calls
 * - Hydration mismatches
 * - Unhandled promise rejections
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error("[error-boundary] Client-side error caught:", error);
    
    // You could also send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <div className="w-full max-w-md text-center">
        {/* Error icon */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>

        {/* Error message */}
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">
          We encountered an unexpected error. This is usually temporary and can be fixed by refreshing the page.
        </p>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-left">
            <p className="text-xs font-mono text-red-500 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => reset()}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Help text */}
        <p className="mt-8 text-xs text-[var(--muted-foreground)]">
          If this problem persists, please{" "}
          <a
            href="mailto:support@acadianawebdesign.com"
            className="text-[hsl(var(--primary))] hover:underline"
          >
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}
