"use client";

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
export default function PortalPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
          <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
            <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          </div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <UnauthenticatedView />
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedPortalRedirect />
      </Authenticated>
    </>
  );
}

function UnauthenticatedView() {
  //const handleSignIn = async () => {
    // check if email is in db,
    // if not, show schedule call link
    // if yes, send magic link to email
 //};

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      email field here
    </div>
  );
}

function AuthenticatedPortalRedirect() {
  const user = useQuery(api.auth.getCurrentUserWithSubscription);

  console.log("user", user);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      {user?.subscription ? (
        <div>
          <p className="text-green-500">Subscription: {user.subscription.status}</p>
        </div>
      ) : (
        <div>
          <p className="text-red-500">No subscription</p>
        </div>
      )}
      <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
        <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
        <p>Redirect logic here {JSON.stringify(user)}</p>
      </div>
    </div>
  );
}

