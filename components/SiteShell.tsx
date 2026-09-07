"use client";

import { usePathname } from "next/navigation";
import ConvexClientProvider from "./ConvexClientProvider";
import { GlobalHeader } from "./global-header";

/** Protected layouts own their prefetched auth provider; marketing stays static. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return children;
  }
  return (
    <ConvexClientProvider>
      <GlobalHeader />
      {children}
    </ConvexClientProvider>
  );
}
