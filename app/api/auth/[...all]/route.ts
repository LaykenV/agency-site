import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

// Phase 3: HTTP Handlers & Next Proxy
// This route handler proxies all auth requests from /api/auth/* to Convex
// Handles GET and POST requests for sign-in, sign-out, callbacks, etc.
export const { GET, POST } = nextJsHandler();

