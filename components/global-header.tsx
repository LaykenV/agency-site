"use client";

import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/animated-theme-toggler";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

export function GlobalHeader() {
  const pathname = usePathname();
  const isPortal = pathname.startsWith("/portal");
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
          {isPortal ? null : (
            <Link href="/portal" className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--primary)]">
            Client Portal
            <ArrowRight className="w-4 h-4 text-[var(--primary)]" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

