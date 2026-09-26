import { createAuth } from "@openheard/auth";
import { createFileRoute } from "@tanstack/react-router";

import { pendingCookie, pendingFrom, safeReturnTo } from "@/lib/external-sso";

export const Route = createFileRoute("/api/sso/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const pending = pendingFrom(request);
        const code = url.searchParams.get("code");
        const headers = new Headers({
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "Set-Cookie": pendingCookie(request, "", 0),
        });
        if (!pending || !code || !/^[A-Za-z0-9_-]{43}$/.test(code) ||
            url.searchParams.get("state") !== pending.state) {
          return new Response("SSO sign-in failed", { status: 400, headers });
        }
        try {
          const signedIn = await createAuth().api.signInExternal({
            body: { code, verifier: pending.verifier },
            headers: request.headers,
            asResponse: true,
          });
          if (!signedIn.ok) return new Response("SSO sign-in failed", { status: 400, headers });
          for (const cookie of signedIn.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
          headers.set("Location", safeReturnTo(pending.returnTo, request.url));
          return new Response(null, { status: 303, headers });
        } catch {
          return new Response("SSO sign-in failed", { status: 400, headers });
        }
      },
    },
  },
});
