"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function MobileMenu({ open, onClose, children }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => setMounted(true), []);

  // Calculate position based on hamburger button
  const updatePosition = () => {
    const hamburger = document.querySelector("label.hamburger") as HTMLLabelElement;
    if (hamburger) {
      const rect = hamburger.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      });
    }
  };

  useEffect(() => {
    if (!open || !mounted) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, mounted]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Click outside to close (excluding the hamburger label)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !target.closest("label.hamburger")
      ) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const menuContent = (
    <div
      id="mobile-menu"
      className="md:hidden fixed w-[min(92vw,20rem)] z-[100]"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
      ref={panelRef}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={
          "relative rounded-2xl p-4 outline-none mobile-menu-panel animate-in slide-in-from-top-2"
        }
      >
        {children}
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}


