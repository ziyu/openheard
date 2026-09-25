import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, getSessionFromCtx } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

const identity = z.object({
  user: z.object({ id: z.string().min(1), email: z.email(), name: z.string() }),
});

export function ssoEndpoint(value: string): URL {
  const url = new URL(value);
  const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((!local && url.protocol !== "https:") || url.username || url.password ||
      url.search || url.hash) throw new Error("Invalid SSO endpoint URL");
  return url;
}

export function externalSso({ tokenUrl, providerId, adminUserId }: {
  tokenUrl: string;
  providerId: string;
  adminUserId: string;
}) {
  const endpoint = ssoEndpoint(tokenUrl);
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(providerId)) throw new Error("Invalid SSO_PROVIDER_ID");
  return {
    id: "external-sso",
    endpoints: {
      signInExternal: createAuthEndpoint(
        "/external/sign-in",
        {
          method: "POST",
          requireHeaders: true,
          body: z.object({ code: z.string(), verifier: z.string() }),
          metadata: { SERVER_ONLY: true },
        },
        async (ctx) => {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: ctx.body.code, code_verifier: ctx.body.verifier }),
          });
          if (!response.ok) throw new APIError("UNAUTHORIZED");
          const parsed = identity.safeParse(await response.json());
          if (!parsed.success) throw new APIError("UNAUTHORIZED");
          const externalUser = parsed.data.user;
          const adapter = ctx.context.internalAdapter;
          const key = { issuer: providerId, accountId: externalUser.id };
          const owner = await adapter.findAccountOwnerByKey(key);
          if (owner?.kind === "orphaned") throw new APIError("UNAUTHORIZED");

          let user = owner?.user;
          if (!user) {
            // An email alone is not proof of ownership of an existing local account.
            if (await adapter.findUserByEmail(externalUser.email)) throw new APIError("CONFLICT");
            const userData = {
              email: externalUser.email,
              emailVerified: true,
              name: externalUser.name,
              role: externalUser.id === adminUserId ? "admin" : "member",
            };
            const created = await adapter.createOAuthUser(userData, { ...key, providerId });
            user = created.user;
          } else if (user.email !== externalUser.email || user.name !== externalUser.name) {
            const emailOwner = await adapter.findUserByEmail(externalUser.email);
            if (emailOwner && emailOwner.user.id !== user.id) throw new APIError("CONFLICT");
            const updated = await adapter.updateUser(user.id, {
              email: externalUser.email,
              name: externalUser.name,
            });
            if (!updated) throw new APIError("UNAUTHORIZED");
            user = updated;
          }

          const current = await getSessionFromCtx(ctx);
          if (current?.user.id === user.id) return ctx.json(current);
          if (current) await adapter.deleteSession(current.session.token);
          const session = await adapter.createSession(user.id);
          if (!session) throw new APIError("UNAUTHORIZED");
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ session, user });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
