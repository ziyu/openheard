export const SITE_NAME = import.meta.env.VITE_SITE_NAME?.trim() || "openheard";
export const SITE_DOMAIN = import.meta.env.VITE_SITE_DOMAIN?.trim() || "openheard.com";
export const SITE_SOURCE_URL = import.meta.env.VITE_SITE_SOURCE_URL?.trim() || "https://github.com/Heilonng23/openheard";
export const SITE_LEGAL_BASE_URL = import.meta.env.VITE_SITE_LEGAL_BASE_URL?.trim().replace(/\/$/, "") || "";

export function displayWorkspaceName(name: string | null | undefined): string {
  return !name || name === "openheard" ? SITE_NAME : name;
}
