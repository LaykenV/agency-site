"use client";

import React from "react";
import { m as motion, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const animationProps = {
  initial: { ["--x" as any]: "100%", scale: 0.8 },
  animate: { ["--x" as any]: "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: "spring",
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
} as MotionProps;

type ShinyButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  keyof MotionProps
> &
  MotionProps & {
    className?: string;
    children: React.ReactNode;
  };

type ShinyLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof MotionProps
> &
  MotionProps & {
    className?: string;
    children: React.ReactNode;
  };

export const ShinyButton = React.forwardRef<HTMLButtonElement, ShinyButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative cursor-pointer rounded-lg border px-6 py-3 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow",
          "dark:bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10)_0%,transparent_60%)] dark:hover:shadow-[0_0_20px_hsl(var(--primary)/0.10)]",
          className
        )}
        {...animationProps}
        {...props}
      >
        <span
          className="relative block size-full tracking-wide uppercase"
          style={{
            WebkitMaskImage:
              "linear-gradient(-75deg,#000 calc(var(--x, 100%) + 20%),transparent calc(var(--x, 100%) + 30%),#000 calc(var(--x, 100%) + 100%))",
            maskImage:
              "linear-gradient(-75deg,#000 calc(var(--x, 100%) + 20%),transparent calc(var(--x, 100%) + 30%),#000 calc(var(--x, 100%) + 100%))",
          }}
        >
          {children}
        </span>
        <span
          style={{
            mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
            WebkitMask:
              "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
            backgroundImage:
              "linear-gradient(-75deg,hsl(var(--primary)/0.10) calc(var(--x, 100%)+20%),hsl(var(--primary)/0.50) calc(var(--x, 100%)+25%),hsl(var(--primary)/0.10) calc(var(--x, 100%)+100%))",
          }}
          className="absolute inset-0 z-10 block rounded-[inherit] p-px"
        />
      </motion.button>
    );
  }
);
ShinyButton.displayName = "ShinyButton";

export const ShinyLink = React.forwardRef<HTMLAnchorElement, ShinyLinkProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.a
        ref={ref}
        className={cn(
          "relative cursor-pointer rounded-lg border px-6 py-3 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow",
          "dark:bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10)_0%,transparent_60%)] dark:hover:shadow-[0_0_20px_hsl(var(--primary)/0.10)]",
          className
        )}
        {...animationProps}
        {...props}
      >
        <span
          className="relative block size-full tracking-wide uppercase"
          style={{
            WebkitMaskImage:
              "linear-gradient(-75deg,#000 calc(var(--x, 100%) + 20%),transparent calc(var(--x, 100%) + 30%),#000 calc(var(--x, 100%) + 100%))",
            maskImage:
              "linear-gradient(-75deg,#000 calc(var(--x, 100%) + 20%),transparent calc(var(--x, 100%) + 30%),#000 calc(var(--x, 100%) + 100%))",
          }}
        >
          {children}
        </span>
        <span
          style={{
            mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
            WebkitMask:
              "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
            backgroundImage:
              "linear-gradient(-75deg,hsl(var(--primary)/0.10) calc(var(--x, 100%)+20%),hsl(var(--primary)/0.50) calc(var(--x, 100%)+25%),hsl(var(--primary)/0.10) calc(var(--x, 100%)+100%))",
          }}
          className="absolute inset-0 z-10 block rounded-[inherit] p-px"
        />
      </motion.a>
    );
  }
);
ShinyLink.displayName = "ShinyLink";


