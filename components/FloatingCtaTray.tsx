"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { ONBOARDING_CAL_LINK } from "@/lib/config";
import { ShinyLink } from "@/components/ui/shiny-button";

export function FloatingCtaTray() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false); // hero CTAs scrolled out
  const [anchorVersion, setAnchorVersion] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onResize = () => setAnchorVersion((v) => v + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          className="floating-cta"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={prefersReduced ? { duration: 0.12 } : { duration: 0.2, ease: "easeOut" }}
        >
          <ShinyLink
            href={ONBOARDING_CAL_LINK}
            target="_blank"
            rel="noreferrer"
            className="schedule-call-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 text-base md:text-lg font-bold whitespace-nowrap"
          >
            Schedule Call
          </ShinyLink>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
