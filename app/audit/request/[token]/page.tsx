import type { Metadata } from "next";
import { PublicAuditReportClient } from "./PublicAuditReportClient";

export const metadata: Metadata = {
  title: "Website Audit Report",
  robots: {
    index: false,
    follow: false,
  },
};

type PublicAuditReportPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicAuditReportPage({ params }: PublicAuditReportPageProps) {
  const { token } = await params;
  return <PublicAuditReportClient token={token} />;
}
