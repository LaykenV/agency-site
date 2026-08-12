import { proxyConvexAuthRequest } from "@/lib/auth-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy auth requests without forwarding Vercel's public Host headers. Convex
// routes HTTP actions by deployment host, so an inherited app-domain host can
// turn a valid Better Auth request into an upstream 404.
export const GET = proxyConvexAuthRequest;
export const POST = proxyConvexAuthRequest;
