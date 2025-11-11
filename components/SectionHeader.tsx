import { clsx } from "clsx";
import { createElement, PropsWithChildren, ElementType } from "react";

type SectionHeaderProps = PropsWithChildren<{
  as?: ElementType;
  align?: "center" | "left" | "right";
  size?: "sm" | "md" | "lg";
  className?: string;
}>;

export function SectionHeader({
  as = "h2",
  align = "center",
  size = "md",
  className,
  children,
}: SectionHeaderProps) {
  const sizeClasses =
    size === "lg"
      ? "text-4xl md:text-6xl"
      : size === "sm"
      ? "text-2xl md:text-3xl"
      : "text-3xl md:text-5xl";
  const alignClasses =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return createElement(
    as,
    {
      className: clsx(
        "font-semibold tracking-tight leading-tight mx-auto max-w-[22ch] hero-title text-[hsl(var(--hero-foreground))]",
        sizeClasses,
        alignClasses,
        className
      ),
    },
    children
  );
}


