import { createDb } from "@openheard/db";
import * as schema from "@openheard/db/schema/auth";
import { DEFAULT_STATUSES, membership, status, workspace } from "@openheard/db/schema/feedback";
import { env } from "@openheard/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

import { cloudflareAccess } from "./cloudflare-access";
import { createKvSecondaryStorage, type KV } from "./kv-secondary-storage";
import { externalSso } from "./external-sso";

// The demo workspace signs everyone into one shared account. Its cookies get
// their own name and stay host-only, so entering the demo cannot overwrite a
// real login that spans the root domain.
export const DEMO_COOKIE_PREFIX = "openheard-demo";

export function createAuth(opts?: { demo?: boolean }) {
  const db = createDb();
  // Browsers refuse Domain=localhost cookies, so cross-subdomain sessions only
  // apply on a real root domain. Locally you sign in per subdomain.
  const raw = (env as unknown as { ROOT_DOMAIN?: string }).ROOT_DOMAIN;
  const rootDomain = raw && raw !== "localhost" ? raw : undefined;

  const { SSO_TOKEN_URL: tokenUrl, SSO_PROVIDER_ID: providerId, SSO_ADMIN_USER_ID: adminUserId } =
    env as unknown as { SSO_TOKEN_URL?: string; SSO_PROVIDER_ID?: string; SSO_ADMIN_USER_ID?: string };
  if (!opts?.demo && (!tokenUrl || !providerId || !adminUserId)) {
    throw new Error("SSO_TOKEN_URL, SSO_PROVIDER_ID and SSO_ADMIN_USER_ID are required");
  }

  const kvStore = (env as unknown as { CACHE?: KV }).CACHE;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    ...(kvStore ? { secondaryStorage: createKvSecondaryStorage(kvStore) } : {}),
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: kvStore ? "secondary-storage" : "memory",
      customRules: {
        "/sign-in/*": { window: 60, max: 5 },
        "/magic-link/*": { window: 60, max: 5 },
        "/sign-up/*": { window: 600, max: 3 },
      },
    },
    advanced: {
      cookiePrefix: opts?.demo ? DEMO_COOKIE_PREFIX : "openheard",
      ...(!opts?.demo && rootDomain ? { crossSubDomainCookies: { enabled: true, domain: "." + rootDomain } } : {}),
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 300,
      },
    },
    trustedOrigins: [env.BETTER_AUTH_URL, ...(raw ? [`https://*.${raw}`, `http://*.${raw}`, `http://*.${raw}:*`] : [])],
    emailAndPassword: { enabled: !!opts?.demo },
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "member" },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Public SSO sign-in never grants admin just for arriving first.
          before: async (u) => {
            if (!opts?.demo) return { data: { ...u, role: u.role === "admin" ? "admin" : "member" } };
            if (rootDomain) return { data: { ...u, role: "member" } };
            const existing = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
            return { data: { ...u, role: existing.length === 0 ? "admin" : "member" } };
          },
          after: async (u) => {
            const [ws] = await db.select({ id: workspace.id }).from(workspace).where(eq(workspace.id, "default")).limit(1);
            if (!ws) {
              await db.insert(workspace).values({ id: "default" }).onConflictDoNothing();
              await db.insert(status).values(DEFAULT_STATUSES.map((d, i) => ({ workspaceId: "default", ...d, position: i }))).onConflictDoNothing();
            }
            const role = !opts?.demo
              ? u.role === "admin" ? "admin" as const : "member" as const
              : rootDomain
              ? "member" as const
              : (await db.select({ userId: membership.userId }).from(membership).where(eq(membership.workspaceId, "default")).limit(1)).length === 0
                ? "admin" as const
                : "member" as const;
            await db
              .insert(membership)
              .values({ workspaceId: "default", userId: u.id, role })
              .onConflictDoNothing();
          },
        },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || undefined,
    plugins: [
      cloudflareAccess(null),
      ...(!opts?.demo && tokenUrl && providerId && adminUserId
        ? [externalSso({ tokenUrl, providerId, adminUserId })]
        : []),
      // Must stay last: it forwards cookies the plugins above set.
      tanstackStartCookies(),
    ],
  });
}

export { sessionForRequest } from "./cloudflare-access";
