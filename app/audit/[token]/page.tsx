import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { AuditBanner } from "@/components/audit/AuditBanner";
import { AuditReport } from "@/components/audit/AuditReport";
import { AuditViewTracker } from "@/components/audit/AuditViewTracker";

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

  if (!audit) {
    notFound();
  }

  return (
    <>
      <AuditViewTracker token={token} skipTracking={sourceValue === "firecrawl-screenshot"} />
      <AuditReport data={audit} />
      <AuditBanner />
    </>
  );
}
