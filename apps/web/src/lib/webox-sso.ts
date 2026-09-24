export function safeReturnTo(value: string | null, requestUrl: string): string {
  if (!value || value.length > 2048 || !value.startsWith("/") ||
      value.startsWith("//") || value.includes("\\") ||
      /%(?:2f|5c)/i.test(value) || /[\u0000-\u001f]/.test(value)) return "/";
  const target = new URL(value, requestUrl);
  if (target.origin !== new URL(requestUrl).origin ||
      /^\/(?:api|login|reset-password)(?:\/|$)/i.test(target.pathname)) return "/";
  return target.pathname + target.search + target.hash;
}

export function pendingCookie(request: Request, value: string, age: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `webox_sso_pending=${value}; HttpOnly; SameSite=Lax; Path=/api/webox; Max-Age=${age}${secure}`;
}

export function pendingFrom(request: Request): { state: string; verifier: string; returnTo: string } | null {
  const raw = /(?:^|;\s*)webox_sso_pending=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1];
  const match = /^([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})\.(.+)$/.exec(raw ?? "");
  if (!match) return null;
  try {
    return { state: match[1]!, verifier: match[2]!, returnTo: decodeURIComponent(match[3]!) };
  } catch {
    return null;
  }
}
