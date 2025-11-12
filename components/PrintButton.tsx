"use client";

import type { ReactNode } from "react";

type PrintButtonProps = {
  className?: string;
  children?: ReactNode;
};

export function PrintButton({ className, children }: PrintButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.print()}
      aria-label="Print this page"
    >
      {children ?? "Print"}
    </button>
  );
}


