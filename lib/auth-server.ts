/**
 * Better Auth server-side utilities for Next.js Server Components.
 */

import { getToken as getConvexToken } from "@convex-dev/better-auth/utils";
import { headers } from "next/headers";
import { getConvexAuthProxyHeaders } from "@/lib/auth-proxy";

/**
 * Extract the Convex JWT from the current Better Auth session.
 *
 * The upstream Next.js helper forwards the request's X-Forwarded-Host during
 * this server-to-server call. Convex uses that header for HTTP routing, so
 * Vercel's public app hostname makes a valid token request return 404. Use the
 * upstream token utility with the same sanitized headers as our auth proxy.
 */
export async function getToken(): Promise<string | undefined> {
  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not set");
  }

  const requestHeaders = getConvexAuthProxyHeaders(
    new Headers(await headers()),
  );
  const result = await getConvexToken(siteUrl, requestHeaders);
  return result.token;
}
