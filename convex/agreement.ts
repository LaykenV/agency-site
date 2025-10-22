import { action } from "./_generated/server";
import { polar } from "./polarSettings";

export const syncProducts = action({
    args: {},
    handler: async (ctx) => {
    console.log('syncProducts')
    const products = await polar.listProducts(ctx);
    console.log('products', products);
    await polar.syncProducts(ctx);
    console.log('synced products');
    },
  });
  