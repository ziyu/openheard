import { expect, it, vi } from "vitest";

it("uses a configured site name for the default workspace only", async () => {
  vi.stubEnv("VITE_SITE_NAME", "webox feedback");
  try {
    const { displayWorkspaceName } = await import("./site-brand");
    expect(displayWorkspaceName("openheard")).toBe("webox feedback");
    expect(displayWorkspaceName("Acme")).toBe("Acme");
  } finally {
    vi.unstubAllEnvs();
  }
});
