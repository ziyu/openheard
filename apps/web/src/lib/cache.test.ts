import { describe, expect, it } from "vitest";

import { hasSessionCookie } from "./cache";

describe("hasSessionCookie", () => {
  it("keeps pages private for site and demo sessions", () => {
    for (const name of ["openheard.session_token", "openheard-demo.session_token"]) {
      const request = new Request("http://localhost/", { headers: { cookie: `${name}=token` } });
      expect(hasSessionCookie(request)).toBe(true);
    }
  });
});
