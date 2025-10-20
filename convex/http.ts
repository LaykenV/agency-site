import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { calWebhook } from "./calWebhook";

const http = httpRouter();

// Register Better Auth route handlers on the Convex deployment
// Phase 3: HTTP Handlers & Next Proxy
// This enables auth endpoints like /api/auth/sign-in, /api/auth/sign-out, etc.
authComponent.registerRoutes(http, createAuth, {
  // Enable CORS for auth endpoints
  // This allows requests from your Next.js frontend
  cors: true,
});

http.route({
  path: "/cal-webhook",
  method: "POST",
  handler: calWebhook,
});

export default http;

