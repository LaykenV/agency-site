"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

export function PageHeader(props: PageHeaderProps) {
  const { title, description, primaryAction, secondaryAction, className } = props;
  return (
    <header className={`mb-6 md:mb-8 ${className ?? ""}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--foreground)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </header>
  );
}


