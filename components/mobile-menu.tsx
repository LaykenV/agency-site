"use client";

import { useEffect, useRef } from "react";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function MobileMenu({ open, onClose, children }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  return (
    <div
      id="mobile-menu"
      className="md:hidden absolute right-4 top-[calc(100%+12px)] w-[min(92vw,20rem)]"
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
}


