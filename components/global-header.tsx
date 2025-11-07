"use client";

import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { MobileMenu } from "@/components/mobile-menu";
import { Logo } from "@/components/logo";

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isPortal = pathname.startsWith("/portal");
  const decision = useQuery(api.auth.getPortalDecision);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header
      className={
        `sticky top-0 z-50 backdrop-blur-sm transition-colors bg-transparent`
      }
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2"
        >
          <Logo size="sm" className="" />
          <span className="whitespace-nowrap text-base md:text-lg font-extrabold tracking-tight leading-none text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
            Acadiana Web Design
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-4 md:flex">
          {!isPortal ? (
            <>
              <AnimatedThemeToggler />
              <Link
                href="/portal"
                className="group btn-cta inline-flex items-center gap-2 px-4 py-2 transition-transform hover:translate-y-0"
              >
                Client Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          ) : decision?.authed ? (
            <>
              <AnimatedThemeToggler />
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
            </>
          ) : (
            <>
              <AnimatedThemeToggler />
              <Link
                href="/portal"
                className="group btn-cta inline-flex items-center gap-2 px-4 py-2 transition-transform hover:translate-y-0"
              >
                Client Portal
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger + menu */}
        <div className="md:hidden">
          <label className="hamburger" aria-label="Open menu">
            <input
              type="checkbox"
              checked={menuOpen}
              onChange={() => setMenuOpen(!menuOpen)}
              aria-checked={menuOpen}
              aria-controls="mobile-menu"
            />
            <svg viewBox="0 0 32 32" aria-hidden="true" width="32" height="32">
              <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"></path>
              <path className="line" d="M7 16 27 16"></path>
            </svg>
          </label>

          <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold opacity-80">Menu</span>
                <AnimatedThemeToggler className="btn-icon" />
              </div>
              <div className="h-px" style={{ background: "hsl(var(--border))" }} />

              {decision?.authed ? (
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-[var(--muted-foreground)]">
                    Signed in as {decision?.user?.email}
                  </div>
                  <Link
                    href="/portal"
                    onClick={() => setMenuOpen(false)}
                    className="group btn-cta inline-flex items-center gap-2 px-4 py-2 transition-transform hover:translate-y-0"
                  >
                    Account
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <button
                    onClick={async () => {
                      await handleSignOut();
                      setMenuOpen(false);
                    }}
                    className="btn-danger inline-flex items-center justify-between gap-2 px-4 py-2 text-sm font-semibold"
                  >
                    Sign Out
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/portal"
                  onClick={() => setMenuOpen(false)}
                  className="group btn-cta inline-flex items-center gap-2 px-4 py-2 transition-transform hover:translate-y-0"
                >
                  Client Portal
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

