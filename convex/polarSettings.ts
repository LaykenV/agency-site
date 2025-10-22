// convex/example.ts
import { Polar } from "@convex-dev/polar";
import { api, components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

const products = {
  subscription: "088b8669-3a9d-48d4-ad44-927a75aa70dd",
} as const;

// Debug: Log environment variable availability
console.log("[Polar Config] Checking environment variables...");
console.log("[Polar Config] POLAR_ORGANIZATION_TOKEN exists:", !!process.env.POLAR_ORGANIZATION_TOKEN);
console.log("[Polar Config] POLAR_WEBHOOK_SECRET exists:", !!process.env.POLAR_WEBHOOK_SECRET);
console.log("[Polar Config] POLAR_ORGANIZATION_TOKEN starts with:", process.env.POLAR_ORGANIZATION_TOKEN?.substring(0, 15));

export const polar: Polar<DataModel, typeof products> = new Polar<DataModel, typeof products>(components.polar, {

  getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
    const user: { _id: string; email: string } | null = await ctx.runQuery(api.auth.getCurrentUser);
    console.log("[Polar] getUserInfo called, user:", JSON.stringify(user));
    if (!user) {
      throw new Error("User not found - user is not authenticated");
    }
    if (!user.email) {
      console.error("[Polar] User object missing email:", user);
      throw new Error("User email not found");
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
  server: 'production',
  organizationToken: process.env.POLAR_ORGANIZATION_TOKEN,
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,
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
