"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AgreementContent() {
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const [isInitialized, setIsInitialized] = useState(false);

  const session = authClient.useSession();
  const findOrCreateProject = useMutation(api.projects.findOrCreateProjectForProspect);

  // Get prospect by sessionId
  const prospect = useQuery(
    api.prospects.getProspectBySessionId,
    sid ? { sessionId: sid } : "skip"
  );

  useEffect(() => {
    if (session.data && prospect && !isInitialized) {
      // Idempotent project creation
      findOrCreateProject({
        authUserId: session.data.user.id,
        prospectId: prospect._id,
      })
        .then(() => {
          console.log("[agreement] project initialized");
          setIsInitialized(true);
        })
        .catch((error) => {
          console.error("[agreement] failed to initialize project:", error);
        });
    }
  }, [session.data, prospect, isInitialized, findOrCreateProject]);

  if (!sid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Session</h1>
          <p className="text-gray-600">No session ID provided.</p>
        </div>
      </div>
    );
  }

  if (!session.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prospect data...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Agreement</h1>
        <p className="text-lg text-gray-700 mb-6">
          Welcome, {prospect.details.contactName}!
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Project Overview
          </h2>
          <p className="text-blue-800">
            Company: <span className="font-medium">{prospect.details.companyName}</span>
          </p>
        </div>
        <div className="text-gray-600">
          <p className="mb-4">Agreement UI will be implemented here.</p>
          <p className="text-sm text-gray-500">
            This is a placeholder page. The actual clickwrap agreement interface will be added in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

