"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { Logo } from "@/components/logo";

export function FloatingCtaTray() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false); // hero CTAs scrolled out
  const [expanded, setExpanded] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const firstCtaRef = useRef<HTMLAnchorElement | null>(null);
  const pathname = usePathname();
  const collapsed = !expanded;

  useEffect(() => setMounted(true), []);

  // Close on route change
  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  // IntersectionObserver for sentinels (robust to hidden/mobile-only elements)
  useEffect(() => {
    const desktop = document.getElementById("cta-hero-desktop-sentinel") as HTMLElement | null;
    const mobile = document.getElementById("cta-hero-mobile-sentinel") as HTMLElement | null;

    if (!desktop && !mobile) {
      // If no sentinels, fallback to always visible after scroll start
      setVisible(true);
      return;
    }

    const isUsable = (el: HTMLElement | null) => !!el && el.offsetParent !== null;
    const isInViewport = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      return !(r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw);
    };

    const desktopUsable = isUsable(desktop);
    const mobileUsable = isUsable(mobile);

    const status = {
      desktop: desktopUsable && desktop ? isInViewport(desktop) : false,
      mobile: mobileUsable && mobile ? isInViewport(mobile) : false,
    };

    const recompute = () => {
      const anyIn = (desktopUsable && status.desktop) || (mobileUsable && status.mobile);
      setVisible(!anyIn);
    };

    const onIntersect: IntersectionObserverCallback = (entries) => {
      for (const e of entries) {
        if (e.target.id === "cta-hero-desktop-sentinel") status.desktop = e.isIntersecting;
        if (e.target.id === "cta-hero-mobile-sentinel") status.mobile = e.isIntersecting;
      }
      recompute();
    };

    const io = new IntersectionObserver(onIntersect, { root: null, threshold: 0 });
    if (desktopUsable && desktop) io.observe(desktop);
    if (mobileUsable && mobile) io.observe(mobile);

    // Initial computation
    recompute();

    return () => io.disconnect();
  }, []);

  // Keyboard ESC and focus management
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (expanded) firstCtaRef.current?.focus();
    else shellRef.current?.focus();
  }, [expanded]);

  if (!mounted) return null;
  return createPortal(
    <>
      {/* Scrim (under bubble) */}
      <AnimatePresence>
        {visible && expanded && (
          <motion.div
            className="floating-cta__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.02 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Fixed wrapper with single morphing shell (circle ↔ bar) */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className="floating-cta"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={prefersReduced ? { duration: 0.12 } : { duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              ref={shellRef}
              className="floating-cta__shell surface-elevated glow-primary"
              data-expanded={expanded}
              layout
              tabIndex={0}
              style={{ transformOrigin: "right center" }}
              aria-expanded={expanded}
              aria-controls="floating-cta-tray"
              aria-label={expanded ? "Close quick actions" : "Open quick actions"}
              role={expanded ? "region" : "button"}
              onClick={() => {
                if (!expanded) setExpanded(true);
              }}
              onKeyDown={(e) => {
                if (!expanded && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setExpanded(true);
                }
              }}
              initial={false}
              transition={
                prefersReduced
                  ? { duration: 0.12 }
                  : { layout: { type: "spring", stiffness: 260, damping: 26 } }
              }
            >
              <AnimatePresence initial={false}>
                {collapsed && (
                  <motion.span
                    key="floating-cta-trigger"
                    className="floating-cta__trigger"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={
                      prefersReduced ? { duration: 0.12 } : { duration: 0.18, ease: "easeOut" }
                    }
                    aria-hidden
                  >
                    {/* <Smile className="floating-cta__trigger-icon" aria-hidden /> */}
                    <Logo size="xl" className="floating-cta__trigger-icon" aria-hidden />
                  </motion.span>
                )}
              </AnimatePresence>
              <div id="floating-cta-tray" className="floating-cta__content">
                <a
                  ref={firstCtaRef}
                  className="btn-secondary w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2 text-center whitespace-nowrap"
                  href={ONBOARDING_CAL_LINK}
                  target="_blank"
                  rel="noreferrer"
                >
                  Schedule 15‑min Call
                </a>
                <Link
                  className="btn-cta w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2 text-center whitespace-nowrap"
                  href="/onboarding?utm_source=fab&cta=fab_tray"
                  onClick={() => setExpanded(false)}
                >
                  Start Onboarding
                </Link>
              </div>

              {expanded && (
                <button
                  type="button"
                  className="floating-cta__collapse btn-secondary"
                  aria-label="Close quick actions"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(false);
                  }}
                >
                  <span aria-hidden className="text-xl leading-none">×</span>
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}


