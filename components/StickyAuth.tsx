"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRef, useState, useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * StickyAuth - Prevents flash of unauthenticated content during reconnection
 * 
 * Problem: When the Convex WebSocket reconnects (after sleep, network change, etc.),
 * the auth state can briefly become undefined, causing <Unauthenticated> content to flash.
 * 
 * Solution: This component remembers if the user was previously authenticated and shows
 * a "reconnecting" state instead of the unauthenticated fallback during brief disconnections.
 * After a timeout (default 5 seconds), it will show the actual unauthenticated content.
 */

const RECONNECT_TIMEOUT_MS = 5000;

interface StickyAuthProps {
  /** Content to show when authenticated */
  children: ReactNode;
  /** Content to show when truly unauthenticated (not reconnecting) */
  unauthenticatedFallback: ReactNode;
  /** Optional custom loading content */
  loadingFallback?: ReactNode;
  /** Optional custom reconnecting content */
  reconnectingFallback?: ReactNode;
}

function DefaultLoadingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
      </div>
    </div>
  );
}

function DefaultReconnectingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
        <p>Reconnecting...</p>
      </div>
    </div>
  );
}

export function StickyAuth({
  children,
  unauthenticatedFallback,
  loadingFallback,
  reconnectingFallback,
}: StickyAuthProps) {
  // Track if user was ever authenticated in this session
  const wasAuthenticatedRef = useRef(false);
  // Track if we've timed out waiting for reconnection
  const [reconnectTimedOut, setReconnectTimedOut] = useState(false);
  // Track if we're currently in "reconnecting" state
  const [isReconnecting, setIsReconnecting] = useState(false);

  const LoadingContent = loadingFallback ?? <DefaultLoadingFallback />;
  const ReconnectingContent = reconnectingFallback ?? <DefaultReconnectingFallback />;

  return (
    <>
      <AuthLoading>
        {LoadingContent}
      </AuthLoading>

      <Authenticated>
        <AuthenticatedTracker 
          wasAuthenticatedRef={wasAuthenticatedRef}
          setReconnectTimedOut={setReconnectTimedOut}
          setIsReconnecting={setIsReconnecting}
        >
          {children}
        </AuthenticatedTracker>
      </Authenticated>

      <Unauthenticated>
        <UnauthenticatedHandler
          wasAuthenticatedRef={wasAuthenticatedRef}
          reconnectTimedOut={reconnectTimedOut}
          setReconnectTimedOut={setReconnectTimedOut}
          isReconnecting={isReconnecting}
          setIsReconnecting={setIsReconnecting}
          unauthenticatedFallback={unauthenticatedFallback}
          reconnectingFallback={ReconnectingContent}
        />
      </Unauthenticated>
    </>
  );
}

/** Tracks when user becomes authenticated and resets timeout state */
function AuthenticatedTracker({
  children,
  wasAuthenticatedRef,
  setReconnectTimedOut,
  setIsReconnecting,
}: {
  children: ReactNode;
  wasAuthenticatedRef: React.MutableRefObject<boolean>;
  setReconnectTimedOut: (v: boolean) => void;
  setIsReconnecting: (v: boolean) => void;
}) {
  useEffect(() => {
    // Mark that user has been authenticated
    wasAuthenticatedRef.current = true;
    // Reset timeout state since we're now authenticated
    setReconnectTimedOut(false);
    setIsReconnecting(false);
  }, [wasAuthenticatedRef, setReconnectTimedOut, setIsReconnecting]);

  return <>{children}</>;
}

/** Handles unauthenticated state - shows reconnecting or actual unauthenticated content */
function UnauthenticatedHandler({
  wasAuthenticatedRef,
  reconnectTimedOut,
  setReconnectTimedOut,
  isReconnecting,
  setIsReconnecting,
  unauthenticatedFallback,
  reconnectingFallback,
}: {
  wasAuthenticatedRef: React.MutableRefObject<boolean>;
  reconnectTimedOut: boolean;
  setReconnectTimedOut: (v: boolean) => void;
  isReconnecting: boolean;
  setIsReconnecting: (v: boolean) => void;
  unauthenticatedFallback: ReactNode;
  reconnectingFallback: ReactNode;
}) {
  useEffect(() => {
    // If user was previously authenticated and we're now unauthenticated,
    // this is likely a reconnection - start the timeout
    if (wasAuthenticatedRef.current && !reconnectTimedOut) {
      setIsReconnecting(true);
      
      const timer = setTimeout(() => {
        // After timeout, assume user is truly logged out
        setReconnectTimedOut(true);
        setIsReconnecting(false);
        // Reset the "was authenticated" flag so future visits show unauthenticated immediately
        wasAuthenticatedRef.current = false;
      }, RECONNECT_TIMEOUT_MS);

      return () => clearTimeout(timer);
    }
  }, [wasAuthenticatedRef, reconnectTimedOut, setReconnectTimedOut, setIsReconnecting]);

  // If user was previously authenticated and we haven't timed out, show reconnecting state
  if (wasAuthenticatedRef.current && !reconnectTimedOut && isReconnecting) {
    return <>{reconnectingFallback}</>;
  }

  // Otherwise show the actual unauthenticated content
  return <>{unauthenticatedFallback}</>;
}

/**
 * Simpler version for pages that just need basic auth gating without custom fallbacks
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <StickyAuth
      unauthenticatedFallback={
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
            <a 
              href="/portal"
              className="text-[var(--primary)] hover:underline"
            >
              Go to Login
            </a>
          </div>
        </div>
      }
    >
      {children}
    </StickyAuth>
  );
}
