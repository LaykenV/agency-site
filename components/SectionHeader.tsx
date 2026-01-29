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
      ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
      : size === "sm"
      ? "text-xl sm:text-2xl md:text-3xl"
      : "text-2xl sm:text-3xl md:text-4xl";
  const alignClasses =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return createElement(
    as,
    {
      className: clsx(
        "font-extrabold tracking-tight leading-[1.15] sm:leading-tight mx-auto max-w-[24ch] heading-gradient-soft",
        sizeClasses,
        alignClasses,
        className
      ),
    },
    children
  );
}


