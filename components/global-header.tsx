"use client";

import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";
import { usePathname } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { MobileMenu } from "@/components/mobile-menu";
import { Logo } from "@/components/logo";

export function GlobalHeader() {
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const isDemo = pathname.startsWith("/demo");
  const isPortal = pathname.startsWith("/portal");
  // Pages with gradient backgrounds where header needs light text
  // Includes landing page, SEO city pages, industry service pages
  const isGradientPage =
    pathname === "/" ||
    pathname === "/3" ||
    pathname.startsWith("/websites-for-") ||
    // Match /services/[industry] pages like /services/plumbers
    /^\/services\/[a-z-]+$/.test(pathname) ||
    // Match city pages like /lafayette, /new-iberia (but not /portal, /admin, etc.)
    (
      /^\/[a-z-]+$/.test(pathname) &&
      !pathname.startsWith("/portal") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/blog") &&
      !pathname.startsWith("/legal") &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/services")
    ) ||
    // Match city+industry pages like /lafayette/plumbers (but not protected routes)
    (
      /^\/[a-z-]+\/[a-z-]+$/.test(pathname) &&
      !pathname.startsWith("/portal") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/blog") &&
      !pathname.startsWith("/legal") &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/services")
    );
  const onLanding = isGradientPage;
  // Only check auth on portal pages to avoid unnecessary auth calls on public SEO pages
  const decision = useQuery(api.auth.getPortalDecision, isPortal ? {} : "skip");
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
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("[auth] sign out failed", error);
    } finally {
      // Use a hard redirect so protected portal routes are torn down immediately.
      window.location.replace("/portal");
    }
  };

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderHeight = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--global-header-height", `${height}px`);
    };

    updateHeaderHeight();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateHeaderHeight)
        : null;
    observer?.observe(header);
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  // Hide header entirely on demo pages — they have their own chrome
  if (isDemo) return null;

  return (
    <header
      ref={headerRef}
      data-global-header
      className={
        `z-50 backdrop-blur-sm transition-colors bg-transparent`
      }
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2"
        >
          <Logo size="sm" className="" />
          <span
            className={`whitespace-nowrap text-base md:text-lg font-extrabold tracking-tight leading-none transition-colors ${
              onLanding
                ? "text-white dark:text-[hsl(var(--hero-foreground))]"
                : "text-[hsl(var(--hero-foreground))]"
            }`}
          >
            Acadiana Web Design
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-4 md:flex">
          {!isPortal ? (
            <>
              <AnimatedThemeToggler onLanding={onLanding} />
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
              <AnimatedThemeToggler onLanding={onLanding} />
              <div className="inline-flex items-center gap-3 btn-secondary px-3 py-2 text-sm font-semibold cursor-default">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold uppercase text-[var(--foreground)]">
                  {initials}
                </span>
                <span>Account {decision?.user?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="btn-danger inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold ml-2 cursor-pointer"
                  aria-label="Sign out"
                >
                  <span>Sign Out</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <AnimatedThemeToggler onLanding={onLanding} />
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
        <div className="md:hidden relative">
          <label 
            className={`hamburger transition-colors ${
              onLanding
                ? "text-white dark:text-[hsl(var(--hero-foreground))]"
                : "text-[hsl(var(--hero-foreground))]"
            }`}
            aria-label="Open menu"
          >
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
                <AnimatedThemeToggler className="btn-icon" onLanding={onLanding} />
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
