"use client";

import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isPortal = pathname.startsWith("/portal");
  const decision = useQuery(api.auth.getPortalDecision);

  const initials = useMemo(() => {
    const nameOrEmail = decision?.user?.name || decision?.user?.email;
    if (!nameOrEmail) return "U";
    const parts = nameOrEmail.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0]!.slice(0, 2).toUpperCase();
    }
    const first = parts[0]?.[0] ?? "";
    const last = parts[parts.length - 1]?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }, [decision?.user?.name, decision?.user?.email]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/portal");
        },
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-widest text-[var(--secondary)] transition hover:text-[var(--foreground)]"
        >
          Agency
        </Link>

        <nav className="flex items-center gap-4">
          <AnimatedThemeToggler />
          {isPortal ? (
            decision?.authed ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/portal"
                  className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold uppercase text-[var(--foreground)]">
                    {initials}
                  </span>
                  <span>Account {decision?.user?.email}</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-red-500 hover:text-red-500"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/portal"
                className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--primary)]"
              >
                Sign in
                <ArrowRight className="h-4 w-4 text-[var(--primary)]" />
              </Link>
            )
          ) : (
            <Link
              href="/portal"
              className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--primary)]"
            >
              Client Portal
              <ArrowRight className="h-4 w-4 text-[var(--primary)]" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

