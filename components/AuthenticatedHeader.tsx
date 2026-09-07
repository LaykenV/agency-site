"use client";

import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { GlobalHeader } from "./global-header";

export function AuthenticatedHeader() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const decision = useQuery(api.auth.getPortalDecision, pathname.startsWith("/portal") ? {} : "skip");
  const isAdmin = useQuery(api.adminAccess.currentUserIsAdmin, isAuthenticated ? {} : "skip");
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("[auth] sign out failed", error);
    } finally {
      window.location.replace("/portal");
    }
  };
  return <GlobalHeader decision={decision} showAdminLink={isAdmin === true && !pathname.startsWith("/admin")} handleSignOut={handleSignOut} />;
}
