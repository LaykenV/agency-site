"use client";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SubscribePage() {
  const products = useQuery(api.polarSettings.getConfiguredProducts);
  const syncProducts = useAction(api.agreement.syncProducts);

  if (!products) {
    return <div>Loading...</div>;
  }

  return <div>
    <h1>Subscribe</h1>
    <button onClick={() => syncProducts()}>Sync Products</button>
    <div>{JSON.stringify(products)}</div>
  </div>;
}