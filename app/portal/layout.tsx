import { AuthenticatedHeader as GlobalHeader } from "@/components/AuthenticatedHeader";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let token: string | undefined;
  try {
    token = await getToken();
  } catch {
    /* Client auth can recover a failed token prefetch. */
  }
  return (
    <ConvexClientProvider initialToken={token}>
      <GlobalHeader />
      {children}
    </ConvexClientProvider>
  );
}
