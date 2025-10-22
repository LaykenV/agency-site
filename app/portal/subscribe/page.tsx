"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

export default function SubscribePage() {
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
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to subscribe</h1>
            <Link 
              href="/portal"
              className="text-[var(--primary)] hover:underline"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedSubscribeView />
      </Authenticated>
    </>
  );
}

function AuthenticatedSubscribeView() {
  const products = useQuery(api.polarSettings.getConfiguredProducts);
  const singleProduct = products?.subscription as { id: string } | undefined;
  const generateCheckoutLink = useAction(api.polarSettings.generateCheckoutLink);
  const [loading, setLoading] = useState(false);

  if (!singleProduct) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--secondary)]">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <h1 className="text-2xl font-bold mb-4">Subscribe</h1>
      <div className="mb-4">{JSON.stringify(products)}</div>
      <button
        disabled={loading}
        onClick={async () => {
          try {
            setLoading(true);
            const { url } = await generateCheckoutLink({
              productIds: [singleProduct.id],
              origin: window.location.origin,
              successUrl: window.location.href,
            });
            window.location.href = url;
          } catch (err) {
            console.error(err);
            alert("Could not start checkout. Please sign in and try again.");
          } finally {
            setLoading(false);
          }
        }}
        className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Starting checkout..." : "Upgrade to Subscription"}
      </button>
    </div>
  );
}