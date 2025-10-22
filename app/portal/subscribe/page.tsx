"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckoutLink } from "@convex-dev/polar/react";

export default function SubscribePage() {
  const products = useQuery(api.polarSettings.getConfiguredProducts);
  const singleProduct = products?.subscription as { id: string };

  if (!products) {
    return <div>Loading...</div>;
  }

  return <div>
    <h1>Subscribe</h1>
    <div>{JSON.stringify(products)}</div>
    <CheckoutLink polarApi={api.polarSettings} productIds={[singleProduct.id]}>
      <button>Upgrade to Subscription</button>
    </CheckoutLink>
  </div>;
}