import { action } from "./_generated/server";
import { polar } from "./polarSettings";

export const syncProducts = action({
    args: {},
    handler: async (ctx) => {
      await polar.syncProducts(ctx);
    },
  });
  