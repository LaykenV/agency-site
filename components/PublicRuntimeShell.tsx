"use client";

import ConvexClientProvider from "./ConvexClientProvider";
import { AuthenticatedHeader } from "./AuthenticatedHeader";

/** Public audit and concept routes use Convex; ordinary marketing does not. */
export default function PublicRuntimeShell({ children }: { children: React.ReactNode }) {
  return <ConvexClientProvider><AuthenticatedHeader />{children}</ConvexClientProvider>;
}
