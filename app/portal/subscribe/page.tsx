"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

export default function SubscribePage() {
  const products = useQuery(api.polarSettings.getConfiguredProducts);
  const singleProduct = products?.subscription as { id: string } | undefined;
  const user = useQuery(api.auth.getCurrentUser);
  const generateCheckoutLink = useAction(api.polarSettings.generateCheckoutLink);
  const [loading, setLoading] = useState(false);

  if (!singleProduct) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in to subscribe.
    <Link href="/portal">Login</Link></div>;
  }

  return <div>
    <h1>Subscribe</h1>
    <div>{JSON.stringify(products)}</div>
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
    >
      {loading ? "Starting checkout..." : "Upgrade to Subscription"}
    </button>
  </div>;
}