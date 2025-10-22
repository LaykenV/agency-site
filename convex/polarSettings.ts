// convex/example.ts
import { Polar } from "@convex-dev/polar";
import { api, components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

const products = {
  premiumMonthly: "4a129b6a-180b-4482-ae81-3463f64b0959",
} as const;

export const polar: Polar<DataModel, typeof products> = new Polar<DataModel, typeof products>(components.polar, {

  getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
    const user: { _id: string; email: string } | null = await ctx.runQuery(api.auth.getCurrentUser);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      userId: user._id,
      email: user.email,
    };
  },
  // Optional: Configure static keys for referencing your products.
  // Alternatively you can use the `listAllProducts` function to get
  // the product data and sort it out in your UI however you like
  // (eg., by price, name, recurrence, etc.).
  // Map your product keys to Polar product IDs (you can also use env vars for this)
  // Replace these keys with whatever is useful for your app (eg., "pro", "proMonthly",
  // whatever you want), and replace the values with the actual product IDs from your
  // Polar dashboard
  products,
  server: 'sandbox'
});

// Export API functions from the Polar client
export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();
