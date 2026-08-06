"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorContent() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const error = searchParams.get("error");
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
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Invalid Request
          </h1>
          <p className="text-gray-600">No session ID provided.</p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-6">{getErrorMessage()}</p>
        </div>

        <Link
          href="/portal"
          className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded-lg shadow-md transition"
        >
          Return to sign in
        </Link>

        <p className="text-center text-sm text-gray-500 mt-6">
          Need help?{" "}
          <a
            href="mailto:support@acadianawebdesign.com"
            className="text-blue-600 hover:underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
