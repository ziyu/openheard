import { externalSso, ssoEndpoint } from "@openheard/auth/external-sso";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, describe, expect, it, vi } from "vitest";

import { pendingFrom, safeReturnTo } from "./external-sso";

afterEach(() => vi.unstubAllGlobals());

describe("External SSO", () => {
  it("accepts provider endpoints only over HTTPS or loopback HTTP", () => {
    expect(ssoEndpoint("https://identity.example/authorize").href).toBe("https://identity.example/authorize");
    expect(ssoEndpoint("http://127.0.0.1:7001/api/sso/token").href).toBe("http://127.0.0.1:7001/api/sso/token");
    expect(() => ssoEndpoint("http://identity.example/token")).toThrow();
    expect(() => ssoEndpoint("https://identity.example/token?code=1")).toThrow();
    expect(() => externalSso({ tokenUrl: "https://identity.example/token", providerId: "../other", adminUserId: "admin" })).toThrow();
  });

  function makeAuth(providerId = "acme", adminUserId = "acme-admin") {
    const rows: Record<string, unknown[]> = { user: [], session: [], account: [], verification: [] };
    const auth = betterAuth({
      database: memoryAdapter(rows),
      secret: "test-secret-not-a-real-one-32chars",
      baseURL: "http://localhost:3001",
      user: { additionalFields: { role: { type: "string", input: false, defaultValue: "member" } } },
      plugins: [externalSso({ tokenUrl: "https://identity.example/token", providerId, adminUserId })],
    });
    return { auth, rows };
  }

  function exchange(users: Record<string, { id: string; email: string; name: string }>) {
    vi.stubGlobal("fetch", vi.fn(async (input: URL, init: RequestInit) => {
      expect(input.href).toBe("https://identity.example/token");
      const { code, code_verifier: verifier } = JSON.parse(String(init.body));
      expect(verifier).toBe("verifier");
      return users[code]
        ? Response.json({ user: users[code] })
        : new Response(null, { status: 400 });
    }));
  }

  it("binds sessions to an external subject and rejects email collisions", async () => {
    const { auth, rows } = makeAuth();
    exchange({
      first: { id: "acme-1", email: "one@example.com", name: "One" },
      again: { id: "acme-1", email: "new@example.com", name: "Renamed" },
      collision: { id: "acme-2", email: "new@example.com", name: "Other" },
    });
    const first = await auth.api.signInExternal({ body: { code: "first", verifier: "verifier" }, headers: new Headers() });
    const again = await auth.api.signInExternal({ body: { code: "again", verifier: "verifier" }, headers: new Headers() });
    expect(first.user.id).toBe(again.user.id);
    expect((rows.user[0] as { email: string; name: string }).email).toBe("new@example.com");
    expect((rows.user[0] as { email: string; name: string }).name).toBe("Renamed");
    expect(rows.user).toHaveLength(1);
    expect(rows.account).toHaveLength(1);
    expect(rows.account[0]).toMatchObject({ issuer: "acme", accountId: "acme-1", providerId: "acme" });
    await expect(auth.api.signInExternal({ body: { code: "collision", verifier: "verifier" }, headers: new Headers() })).rejects.toThrow();
    expect(rows.user).toHaveLength(1);
  });

  it("refuses a rejected provider code", async () => {
    const { auth } = makeAuth();
    exchange({});
    await expect(auth.api.signInExternal({ body: { code: "invalid", verifier: "verifier" }, headers: new Headers() })).rejects.toThrow();
  });

  it("refuses an email update that belongs to another external identity", async () => {
    const { auth, rows } = makeAuth();
    exchange({
      one: { id: "acme-1", email: "one@example.com", name: "One" },
      two: { id: "acme-2", email: "two@example.com", name: "Two" },
      changed: { id: "acme-1", email: "two@example.com", name: "One" },
    });
    for (const code of ["one", "two"]) {
      await auth.api.signInExternal({ body: { code, verifier: "verifier" }, headers: new Headers() });
    }
    await expect(auth.api.signInExternal({ body: { code: "changed", verifier: "verifier" }, headers: new Headers() })).rejects.toThrow();
    expect((rows.user[0] as { email: string }).email).toBe("one@example.com");
  });

  it("does not make the first visitor admin", async () => {
    const { auth, rows } = makeAuth("webox", "webox-admin");
    exchange({
      visitor: { id: "webox-visitor", email: "visitor@example.com", name: "Visitor" },
      admin: { id: "webox-admin", email: "admin@example.com", name: "Admin" },
    });
    await auth.api.signInExternal({ body: { code: "visitor", verifier: "verifier" }, headers: new Headers() });
    await auth.api.signInExternal({ body: { code: "admin", verifier: "verifier" }, headers: new Headers() });
    expect(rows.user.map((u) => (u as { role: string }).role)).toEqual(["member", "admin"]);
    expect(rows.account[0]).toMatchObject({ issuer: "webox", providerId: "webox" });
  });
});

describe("SSO callback state", () => {
  it("keeps only local return paths", () => {
    const request = "https://feedback.example/api/sso/login";
    expect(safeReturnTo("/p/1?tab=comments", request)).toBe("/p/1?tab=comments");
    expect(safeReturnTo("//evil.example", request)).toBe("/");
    expect(safeReturnTo("/\\evil.example", request)).toBe("/");
    expect(safeReturnTo("/%2f%2fevil.example", request)).toBe("/");
    expect(safeReturnTo("/api/sso/login", request)).toBe("/");
    expect(safeReturnTo("https://evil.example", request)).toBe("/");
  });

  it("reads a pending verifier only from the request cookie", () => {
    const state = "a".repeat(22);
    const verifier = "b".repeat(43);
    const request = new Request("https://feedback.example/api/sso/callback", {
      headers: { cookie: `external_sso_pending=${state}.${verifier}.%2Fp%2F1` },
    });
    expect(pendingFrom(request)).toEqual({ state, verifier, returnTo: "/p/1" });
    expect(pendingFrom(new Request(request.url))).toBeNull();
  });
});
