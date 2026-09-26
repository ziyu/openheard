import { env } from "@openheard/env/server";
import { ssoEndpoint } from "@openheard/auth/external-sso";
import { createFileRoute } from "@tanstack/react-router";

import { pendingCookie, safeReturnTo } from "@/lib/external-sso";

export const Route = createFileRoute("/api/sso/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const endpoint = (env as unknown as { SSO_AUTHORIZE_URL?: string }).SSO_AUTHORIZE_URL;
        if (!endpoint) return new Response("SSO sign-in unavailable", { status: 503 });
        const state = randomToken(16);
        const verifier = randomToken(32);
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
        const challenge = base64url(new Uint8Array(hash));
        const authorize = ssoEndpoint(endpoint);
        authorize.search = new URLSearchParams({
          state, code_challenge: challenge, code_challenge_method: "S256",
        }).toString();
        const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"), request.url);
        return new Response(null, {
          status: 302,
          headers: {
            Location: authorize.href,
            "Set-Cookie": pendingCookie(request, `${state}.${verifier}.${encodeURIComponent(returnTo)}`, 900),
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
      },
    },
  },
});

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomToken(size: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(size)));
}
