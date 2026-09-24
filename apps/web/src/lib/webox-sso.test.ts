import { weboxOrigin, weboxSso } from "@openheard/auth/webox-sso";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, describe, expect, it, vi } from "vitest";

import { pendingFrom, safeReturnTo } from "./webox-sso";

afterEach(() => vi.unstubAllGlobals());

describe("Webox SSO", () => {
  it("requires HTTPS outside loopback", () => {
    expect(weboxOrigin("https://webox.example").origin).toBe("https://webox.example");
    expect(weboxOrigin("http://127.0.0.1:7001").origin).toBe("http://127.0.0.1:7001");
    expect(() => weboxOrigin("http://webox.example")).toThrow();
    expect(() => weboxOrigin("https://webox.example/other")).toThrow();
  });

  function makeAuth(adminUserId = "webox-admin") {
    const rows: Record<string, unknown[]> = { user: [], session: [], account: [], verification: [] };
    const auth = betterAuth({
      database: memoryAdapter(rows),
      secret: "test-secret-not-a-real-one-32chars",
      baseURL: "http://localhost:3001",
      user: { additionalFields: { role: { type: "string", input: false, defaultValue: "member" } } },
      plugins: [weboxSso("https://webox.example", adminUserId)],
    });
    return { auth, rows };
  }

  function exchange(users: Record<string, { id: string; email: string; name: string }>) {
    vi.stubGlobal("fetch", vi.fn(async (input: URL, init: RequestInit) => {
      expect(input.href).toBe("https://webox.example/api/sso/token");
      const { code, code_verifier: verifier } = JSON.parse(String(init.body));
      expect(verifier).toBe("verifier");
      return users[code]
        ? Response.json({ user: users[code] })
        : new Response(null, { status: 400 });
    }));
  }

  it("binds sessions to the immutable Webox user ID and rejects email collisions", async () => {
    const { auth, rows } = makeAuth();
    exchange({
      first: { id: "webox-1", email: "one@example.com", name: "One" },
      again: { id: "webox-1", email: "new@example.com", name: "Renamed" },
      collision: { id: "webox-2", email: "new@example.com", name: "Other" },
    });
    const first = await auth.api.signInWebox({ body: { code: "first", verifier: "verifier" }, headers: new Headers() });
    const again = await auth.api.signInWebox({ body: { code: "again", verifier: "verifier" }, headers: new Headers() });
    expect(first.user.id).toBe(again.user.id);
    expect((rows.user[0] as { email: string; name: string }).email).toBe("new@example.com");
    expect((rows.user[0] as { email: string; name: string }).name).toBe("Renamed");
    expect(rows.user).toHaveLength(1);
    expect(rows.account).toHaveLength(1);
    await expect(auth.api.signInWebox({ body: { code: "collision", verifier: "verifier" }, headers: new Headers() })).rejects.toThrow();
    expect(rows.user).toHaveLength(1);
  });

  it("refuses a rejected Webox code", async () => {
    const { auth } = makeAuth();
    exchange({});
    await expect(auth.api.signInWebox({ body: { code: "invalid", verifier: "verifier" }, headers: new Headers() })).rejects.toThrow();
  });

  it("refuses an email update that belongs to another Webox identity", async () => {
    const { auth, rows } = makeAuth();
    exchange({
      one: { id: "webox-1", email: "one@example.com", name: "One" },
      two: { id: "webox-2", email: "two@example.com", name: "Two" },
      changed: { id: "webox-1", email: "two@example.com", name: "One" },
    });
    for (const code of ["one", "two"]) {
      await auth.api.signInWebox({ body: { code, verifier: "verifier" }, headers: new Headers() });
    }
    await expect(auth.api.signInWebox({ body: { code: "changed", verifier: "verifier" }, headers: new Headers() })).rejects.toThrow();
    expect((rows.user[0] as { email: string }).email).toBe("one@example.com");
  });

  it("does not make the first visitor admin", async () => {
    const { auth, rows } = makeAuth();
    exchange({
      visitor: { id: "webox-visitor", email: "visitor@example.com", name: "Visitor" },
      admin: { id: "webox-admin", email: "admin@example.com", name: "Admin" },
    });
    await auth.api.signInWebox({ body: { code: "visitor", verifier: "verifier" }, headers: new Headers() });
    await auth.api.signInWebox({ body: { code: "admin", verifier: "verifier" }, headers: new Headers() });
    expect(rows.user.map((u) => (u as { role: string }).role)).toEqual(["member", "admin"]);
  });
});

describe("SSO callback state", () => {
  it("keeps only local return paths", () => {
    const request = "https://feedback.example/api/webox/login";
    expect(safeReturnTo("/p/1?tab=comments", request)).toBe("/p/1?tab=comments");
    expect(safeReturnTo("//evil.example", request)).toBe("/");
    expect(safeReturnTo("/\\evil.example", request)).toBe("/");
    expect(safeReturnTo("/%2f%2fevil.example", request)).toBe("/");
    expect(safeReturnTo("/api/webox/login", request)).toBe("/");
    expect(safeReturnTo("https://evil.example", request)).toBe("/");
  });

  it("reads a pending verifier only from the request cookie", () => {
    const state = "a".repeat(22);
    const verifier = "b".repeat(43);
    const request = new Request("https://feedback.example/api/webox/callback", {
      headers: { cookie: `webox_sso_pending=${state}.${verifier}.%2Fp%2F1` },
    });
    expect(pendingFrom(request)).toEqual({ state, verifier, returnTo: "/p/1" });
    expect(pendingFrom(new Request(request.url))).toBeNull();
  });
});
