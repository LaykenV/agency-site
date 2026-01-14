import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { api, components, internal } from "./_generated/api";
import { DataModel, Id } from "./_generated/dataModel";
import { query, ActionCtx } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v, Infer } from "convex/values";
import { magicLink } from "better-auth/plugins";
import { 
  resend, 
  getEmailHeader, 
  getEmailFooter, 
  getCtaButton, 
  getEmailWrapper,
  EMAIL_STYLES,
  COMPANY_NAME
} from "./emails";
import { projectStatusValidator } from "./validators";
import authConfig from "./auth.config";
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
  const htmlContent = getEmailWrapper(`
    ${getEmailHeader('Sign In to Your Portal', 'Secure magic link access')}
    
    <div style="padding: 32px 24px;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${EMAIL_STYLES.textDark};">
        Hello,
      </p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; color: ${EMAIL_STYLES.textMuted}; line-height: 1.6;">
        Click the button below to securely sign in to your ${COMPANY_NAME} portal. This link is valid for 24 hours.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        ${getCtaButton('Sign In Now', url)}
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 14px; color: ${EMAIL_STYLES.textMuted}; line-height: 1.6; text-align: center;">
        If you didn't request this link, you can safely ignore this email.
      </p>
      
      <div style="margin: 32px 0 0 0; padding: 16px; background: ${EMAIL_STYLES.background}; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: ${EMAIL_STYLES.textLight}; line-height: 1.5;">
          For security, this link will expire in 24 hours.<br/>
          If the button doesn't work, copy and paste this URL into your browser:
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: ${EMAIL_STYLES.primaryColor}; word-break: break-all;">
          ${url}
        </p>
      </div>
    </div>
    
    ${getEmailFooter(new Date().getFullYear())}
  `);

  await resend.sendEmail(ctx, {
    from: "Acadiana Web Design <welcome@acadianawebdesign.com>",
    to,
    subject: "Your Secure Sign-In Link - Acadiana Web Design",
    html: htmlContent,
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
    session: {
      expiresIn: 60 * 60 * 24 * 365, // 1 year in seconds
      updateAge: 60 * 60 * 24, // Refresh session every 24 hours of activity
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // Cache valid for 5 minutes - reduces DB calls for session validation
      },
    },
    plugins: [
      convex({ authConfig }),
      magicLink({
        expiresIn: 60 * 60 * 24, // 24 hours
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


type UserWithSubscription = {
  subscription: {
    _id: string;
    userId: string;
    stripeCustomerId: string;
    subscriptionId: string;
    status: string;
    priceId: string;
    currentPeriodStartMs: number;
    currentPeriodEndMs: number;
    cancelAtPeriodEnd: boolean;
    paymentBrand?: string;
    paymentLast4?: string;
    updatedAtMs: number;
    _creationTime: number;
  } | null;
  [key: string]: unknown;
};

export const getCurrentUserWithSubscription = query({
  args: {},
  returns: v.union(v.any(), v.null()),
  handler: async (ctx): Promise<UserWithSubscription | null> => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user?._id) return null;
    const subscription: {
      _id: string;
      userId: string;
      stripeCustomerId: string;
      subscriptionId: string;
      status: string;
      priceId: string;
      currentPeriodStartMs: number;
      currentPeriodEndMs: number;
      cancelAtPeriodEnd: boolean;
      paymentBrand?: string;
      paymentLast4?: string;
      updatedAtMs: number;
      _creationTime: number;
    } | null = await ctx.runQuery(api.stripeHelpers.getMySubscription);
    return { ...user, subscription };
  },
});

type ProjectStatus = Infer<typeof projectStatusValidator>;

type PortalDecisionReturn = {
  authed: boolean;
  user: {
    _id: string;
    email: string;
    name?: string;
  } | null;
  primaryProject: {
    _id: Id<"projects">;
    projectId: string;
    projectStatus?: ProjectStatus;
  } | null;
  prospectSessionId: string | null;
  subscription: unknown;
  redirect: string | null;
};

export const getPortalDecision = query({
  args: {},
  returns: v.object({
    authed: v.boolean(),
    user: v.union(
      v.object({
        _id: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
      }),
      v.null(),
    ),
    primaryProject: v.union(
      v.object({
        _id: v.id("projects"),
        projectId: v.string(),
        projectStatus: v.optional(projectStatusValidator),
      }),
      v.null(),
    ),
    prospectSessionId: v.union(v.string(), v.null()),
    subscription: v.union(v.any(), v.null()),
    redirect: v.union(v.string(), v.null()),
  }),
  handler: async (ctx): Promise<PortalDecisionReturn> => {
    let user;
    try {
      user = await authComponent.getAuthUser(ctx);
    } catch (error) {
      console.warn("[auth] getPortalDecision unauthenticated", { error });
      user = null;
    }
    if (!user?._id) {
      return {
        authed: false,
        user: null,
        primaryProject: null,
        prospectSessionId: null,
        subscription: null,
        redirect: null,
      } as const;
    }

    const authUserId: string = user._id;

    const [primaryProject, prospect, subscription] = await Promise.all([
      ctx.runQuery(internal.projects.internalGetLatestProjectByAuthUser, {
        authUserId,
      }),
      user.email
        ? ctx.runQuery(api.prospects.findLatestByEmail, {
            email: user.email,
          })
        : Promise.resolve(null),
      ctx.runQuery(api.stripeHelpers.getMySubscription),
    ]);

    let redirect: string | null = null;

    if (!primaryProject && prospect) {
      redirect = `/portal/agreement?sid=${prospect.sessionId}`;
    }

    if (primaryProject) {
      const projectStatus = primaryProject.projectStatus ?? "AWAITING_AGREEMENT";
      if (projectStatus === "AWAITING_AGREEMENT") {
        const sessionId = prospect?.sessionId;
        if (sessionId) {
          redirect = `/portal/agreement?sid=${sessionId}`;
        }
      } else if (projectStatus === "AWAITING_PAYMENT") {
        redirect = "/portal/subscribe";
      } else {
        redirect = `/portal/${primaryProject.projectId}`;
      }
    }

    return {
      authed: true,
      user: {
        _id: authUserId,
        email: user.email ?? "",
        name: user.name ?? undefined,
      },
      primaryProject: primaryProject
        ? {
            _id: primaryProject._id,
            projectId: primaryProject.projectId,
            projectStatus: primaryProject.projectStatus,
          }
        : null,
      prospectSessionId: prospect?.sessionId ?? null,
      subscription,
      redirect,
    } as const;
  },
});