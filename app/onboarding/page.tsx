import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getToken } from "@/lib/auth-server";
import { OnboardingClient } from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const token = await getToken();

  if (token) {
    const profile = await fetchQuery(
      api.auth.getCurrentUserProfile,
      {},
      { token },
    );

    if (profile?.projectId) {
      redirect(`/portal/${profile.projectId}`);
    }
  }

  return <OnboardingClient />;
}
