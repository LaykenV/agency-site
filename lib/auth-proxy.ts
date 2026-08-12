const FORWARDED_REQUEST_HEADERS_TO_DROP = [
  "connection",
  "content-length",
  "host",
  "x-forwarded-host",
] as const;

export function getConvexAuthProxyTarget(
  requestUrl: string,
  convexSiteUrl: string,
): URL {
  if (!convexSiteUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not set");
  }

  const incomingUrl = new URL(requestUrl);
  const targetUrl = new URL(convexSiteUrl);
  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;
  return targetUrl;
}

export function getConvexAuthProxyHeaders(requestHeaders: Headers): Headers {
  const headers = new Headers(requestHeaders);
  for (const name of FORWARDED_REQUEST_HEADERS_TO_DROP) {
    headers.delete(name);
  }

  // Let the upstream fetch set its own Host and body length. Convex honors
  // X-Forwarded-Host when present, so forwarding Vercel's public app hostname
  // makes the request look like it targets an unknown Convex site and returns
  // 404 before Better Auth ever sees it.
  headers.set("accept-encoding", "identity");
  return headers;
}

export async function proxyConvexAuthRequest(
  request: Request,
): Promise<Response> {
  const targetUrl = getConvexAuthProxyTarget(
    request.url,
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
  );
  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  return fetch(targetUrl, {
    method,
    headers: getConvexAuthProxyHeaders(request.headers),
    body,
    redirect: "manual",
  });
}
