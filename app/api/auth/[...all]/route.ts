import { handler } from "@/lib/auth-server";

// HTTP Handlers & Next Proxy
// This route handler proxies all auth requests from /api/auth/* to Convex
// Handles GET and POST requests for sign-in, sign-out, callbacks, etc.
export const { GET, POST } = handler;

