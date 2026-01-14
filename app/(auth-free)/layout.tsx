import { AppThemeProvider } from "@/components/theme-provider";

/**
 * Auth-Free Layout
 * 
 * CRITICAL: This layout intentionally does NOT include ConvexBetterAuthProvider.
 * 
 * Pages in this route group will not have access to Convex queries/mutations
 * or auth state, but they also won't compete with other tabs for session state.
 * 
 * This is used for the "Check your inbox" page after sending a magic link,
 * to prevent cross-tab session contention when the user clicks the magic link
 * in another tab.
 */
export default function AuthFreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppThemeProvider>
      {children}
    </AppThemeProvider>
  );
}
