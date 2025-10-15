"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";

export function GlobalHeader() {
  const router = useRouter();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const isAuthenticated = Boolean(currentUser);
  
  // Get current user's profile directly (no args needed)
  const profile = useQuery(api.auth.getCurrentUserProfile);


  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: profile?.projectId ? `/portal/${profile.projectId}` : "/onboarding",
    });
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link 
          href="/"
          className="text-sm font-semibold uppercase tracking-widest text-[var(--secondary)] transition hover:text-[var(--foreground)]"
        >
          Agency Builder
        </Link>
        
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {profile?.projectId && (
                <Link
                  href={`/portal/${profile.projectId}`}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                >
                  Portal
                </Link>
              )}
              
              <button
                onClick={handleSignOut}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Sign In
            </button>
          )}
          
          <AnimatedThemeToggler />
        </nav>
      </div>
    </header>
  );
}

