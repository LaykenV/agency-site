import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { api, components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query, ActionCtx } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import { magicLink } from "better-auth/plugins";
import { resend } from "./emails";
const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

// Helper to convert GenericCtx to ActionCtx
const requireActionCtx = (ctx: GenericCtx<DataModel>): ActionCtx => {
  return ctx as unknown as ActionCtx;
};

// Helper function to send magic link email via Resend
const sendMagicLinkEmail = async (
  ctx: ActionCtx,
  {
    to,
    url,
  }: {
    to: string;
    url: string;
  }
) => {
  await resend.sendEmail(ctx, {
    from: "Acadiana Web Design <welcome@notifications.acadianawebdesign.com>",
    to,
    subject: "Your secure sign-in link",
    html: `
      <h2>Welcome to Acadiana Web Design</h2>
      <p>Click the button below to sign in. This link expires in 15 minutes.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">Sign in</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
};

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      /*google: {
        enabled: true,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scope: ["email", "profile"],
        prompt: "select_account",
      },*/
    },
    onAPIError: {
      throw: false,
      onError: (error) => {
        console.error("[auth] error", { error });
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/magic-link": { window: 60, max: 3 },
        "/magic-link/verify": { window: 60, max: 10 },
      },
      storage: "memory",
    },
    plugins: [
      convex(),
      magicLink({
        expiresIn: 900, // 15 minutes
        disableSignUp: false,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          console.log("[auth] sending magic link", { email, url });
          await sendMagicLinkEmail(requireActionCtx(ctx), {
            to: email,
            url,
          });
        },
      }),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  returns: v.union(v.any(), v.null()),
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});
