import { env } from "@openheard/env/server";
import { weboxOrigin } from "@openheard/auth/webox-sso";
import { createFileRoute } from "@tanstack/react-router";

import { pendingCookie, safeReturnTo } from "@/lib/webox-sso";

export const Route = createFileRoute("/api/webox/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = (env as unknown as { WEBOX_SSO_ORIGIN?: string }).WEBOX_SSO_ORIGIN;
        if (!origin) return new Response("Webox sign-in unavailable", { status: 503 });
        const state = randomToken(16);
        const verifier = randomToken(32);
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
        const challenge = base64url(new Uint8Array(hash));
        const authorize = new URL("/api/sso/authorize", weboxOrigin(origin));
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
