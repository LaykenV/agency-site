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
  const [anchorVersion, setAnchorVersion] = useState(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const firstCtaRef = useRef<HTMLAnchorElement | null>(null);
  const pathname = usePathname();
  const collapsed = !expanded;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onResize = () => setAnchorVersion((v) => v + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close on route change
  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  // IntersectionObserver for CTA anchors (robust to hidden/mobile-only elements)
  useEffect(() => {
    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>("[data-floating-cta-anchor]")
    );
    const usableAnchors = anchors.filter((anchor) => anchor.offsetParent !== null);

    const isInViewport = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const verticallyInView = rect.top < viewportHeight && rect.bottom > 0;
      const horizontallyInView = rect.left < viewportWidth && rect.right >= 0;
      return verticallyInView && horizontallyInView;
    };

    if (usableAnchors.length === 0) {
      const onScroll = () => {
        setVisible(window.scrollY > 160);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const visibility = new Map<HTMLElement, boolean>();
    const recompute = () => {
      const anyVisible = usableAnchors.some((anchor) => {
        if (anchor.offsetParent === null) {
          visibility.set(anchor, false);
          return false;
        }
        return visibility.get(anchor) ?? false;
      });
      setVisible(!anyVisible);
    };

    usableAnchors.forEach((anchor) => {
      visibility.set(anchor, isInViewport(anchor));
    });
    recompute();

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (!visibility.has(target)) continue;
          const inView = entry.isIntersecting || isInViewport(target);
          if (visibility.get(target) !== inView) {
            visibility.set(target, inView);
            changed = true;
          }
        }
        if (changed) recompute();
      },
      { root: null, threshold: 0 }
    );

    usableAnchors.forEach((anchor) => observer.observe(anchor));

    return () => observer.disconnect();
  }, [anchorVersion]);

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
                  Schedule Call
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


