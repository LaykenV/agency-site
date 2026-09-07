"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
const PublicRuntimeShell = dynamic(() => import("./PublicRuntimeShell"));
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
  if (pathname === "/audit" || pathname.startsWith("/audit/") || pathname.startsWith("/preview/")) {
    return <PublicRuntimeShell>{children}</PublicRuntimeShell>;
  }
  return (
    <>
      <GlobalHeader />
      {children}
    </>
  );
}
