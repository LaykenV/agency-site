"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckoutLink } from "@convex-dev/polar/react";

export default function SubscribePage() {
  const products = useQuery(api.polarSettings.getConfiguredProducts);
  const singleProduct = products?.subscription as { id: string };
  const syncProducts = useAction(api.agreement.syncProducts);

  if (!products) {
    return <div>Loading...</div>;
  }

  return <div>
    <h1>Subscribe</h1>
    <button onClick={() => syncProducts()}>Sync Products</button>
    <div>{JSON.stringify(products)}</div>
    <CheckoutLink polarApi={api.polarSettings} productIds={[singleProduct.id]}></CheckoutLink>
  </div>;
}