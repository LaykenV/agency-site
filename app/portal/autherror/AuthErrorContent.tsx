"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export default function AuthErrorContent() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const error = searchParams.get("error");
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const logMagicLinkSent = useMutation(api.admin.logMagicLinkSent);

  // Get prospect by sessionId
  const prospect = useQuery(
    api.prospects.getProspectBySessionId,
    sid ? { sessionId: sid } : "skip"
  );

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResendMagicLink = async () => {
    if (!prospect || cooldown > 0 || isSending) return;

    setIsSending(true);
    setMessage(null);

    try {
      // Set cooldown immediately
      setCooldown(60);

      // Call the authClient magic link method
      await authClient.signIn.magicLink(
        {
          email: prospect.details.contactEmail,
          name: prospect.details.contactName,
          callbackURL: `/portal/verify?sid=${prospect.sessionId}`,
          newUserCallbackURL: `/portal/verify?sid=${prospect.sessionId}`,
          errorCallbackURL: `/portal/autherror?sid=${prospect.sessionId}&error=magic_link`,
        },
        {
          onError: async (ctx) => {
            if (ctx.response.status === 429) {
              const retryAfter = ctx.response.headers.get("X-Retry-After");
              const waitTime = retryAfter ? `${retryAfter} seconds` : "a moment";
              setMessage(`Too many requests. Please try again in ${waitTime}.`);
              // Update cooldown if server provided a retry-after value
              if (retryAfter) {
                setCooldown(parseInt(retryAfter, 10));
              }
            } else {
              setMessage("Failed to send magic link. Please try again.");
              setCooldown(0);
            }
          },
        }
      );

      // Log the activity
      await logMagicLinkSent({
        prospectId: prospect._id,
        email: prospect.details.contactEmail,
      });

      setMessage("Magic link sent! Please check your email.");
    } catch (err) {
      console.error("Failed to send magic link:", err);
      setMessage("Failed to send magic link. Please try again.");
      setCooldown(0);
    } finally {
      setIsSending(false);
    }
  };

  const getErrorMessage = () => {
    if (error === "magic_link") {
      return "Your sign-in link has expired or is invalid.";
    }
    return "There was a problem signing you in.";
  };

  if (!sid) {
    return (
      <div className="min-h-[calc(100dvh_-_var(--global-header-height))] flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Request</h1>
          <p className="text-gray-600">No session ID provided.</p>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-[calc(100dvh_-_var(--global-header-height))] flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh_-_var(--global-header-height))] flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-6">{getErrorMessage()}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 mb-1">
            <span className="font-semibold">Name:</span> {prospect.details.contactName}
          </p>
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Company:</span> {prospect.details.companyName}
          </p>
        </div>

        {message && (
          <div
            className={`rounded-lg p-4 mb-4 ${
              message.includes("sent")
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <p className="text-sm">{message}</p>
          </div>
        )}

        <button
          onClick={handleResendMagicLink}
          disabled={cooldown > 0 || isSending}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending
            ? "Sending..."
            : cooldown > 0
            ? `Resend in ${cooldown}s`
            : "Resend Magic Link"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Need help?{" "}
          <a href="mailto:support@acadianawebdesign.com" className="text-blue-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
