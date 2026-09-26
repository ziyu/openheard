import { createAuth } from "@openheard/auth";
import { expect, it, vi } from "vitest";

import { Route } from "../routes/api/sso/callback";

vi.mock("@openheard/auth", () => ({ createAuth: vi.fn() }));

it("returns the SSO session cookie to the browser", async () => {
  vi.mocked(createAuth).mockReturnValue({
    api: {
      signInExternal: async () => new Response(null, {
        headers: { "Set-Cookie": "openheard.session_token=example; HttpOnly; Path=/" },
      }),
    },
  } as unknown as ReturnType<typeof createAuth>);

  const state = "a".repeat(22);
  const verifier = "b".repeat(43);
  const request = new Request(`https://feedback.example/api/sso/callback?code=${"c".repeat(43)}&state=${state}`, {
    headers: { cookie: `external_sso_pending=${state}.${verifier}.%2F` },
  });
  const handlers = Route.options.server?.handlers;
  if (!handlers || typeof handlers === "function") throw new Error("SSO callback handlers missing");
  const handler = handlers.GET;
  if (!handler) throw new Error("SSO callback handler missing");
  const response = await handler({ request } as Parameters<typeof handler>[0]);
  if (!(response instanceof Response)) throw new Error("SSO callback returned no response");

  expect(response.status).toBe(303);
  expect(response.headers.getSetCookie()).toEqual([
    expect.stringContaining("external_sso_pending=;"),
    "openheard.session_token=example; HttpOnly; Path=/",
  ]);
});
