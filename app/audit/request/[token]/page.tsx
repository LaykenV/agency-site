import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { isAdminEmail } from "@/lib/admin-access";
import { getToken } from "@/lib/auth-server";
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
  const authToken = await getOptionalAuthToken();
  const currentUser = authToken
    ? await fetchQuery(api.auth.getCurrentUser, {}, { token: authToken })
    : null;

  return <PublicAuditReportClient token={token} skipTracking={isAdminEmail(currentUser)} />;
}

async function getOptionalAuthToken() {
  try {
    return await getToken();
  } catch {
    return null;
  }
}
