import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { AuditBanner } from "@/components/audit/AuditBanner";
import { AuditReport } from "@/components/audit/AuditReport";
import { AuditViewTracker } from "@/components/audit/AuditViewTracker";
import { isAdminEmail } from "@/lib/admin-access";
import { getToken } from "@/lib/auth-server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type AuditPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ source?: string | Array<string> }>;
};

export default async function AuditPage({ params, searchParams }: AuditPageProps) {
  const { token } = await params;
  const { source } = await searchParams;
  const sourceValue = Array.isArray(source) ? source[0] : source;
  const audit = await fetchQuery(api.marketing.public.getAuditData, { token });
  const authToken = await getOptionalAuthToken();
  const currentUser = authToken
    ? await fetchQuery(api.auth.getCurrentUser, {}, { token: authToken })
    : null;
  const skipTracking = sourceValue === "firecrawl-screenshot" || isAdminEmail(currentUser);

  if (!audit) {
    notFound();
  }

  return (
    <>
      <AuditViewTracker token={token} skipTracking={skipTracking} />
      <AuditReport data={audit} />
      <AuditBanner />
    </>
  );
}

async function getOptionalAuthToken() {
  try {
    return await getToken();
  } catch {
    return null;
  }
}
