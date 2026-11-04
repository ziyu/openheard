import { SUPPORTED_LOCALES, localePath, stripLocale } from "./locale";

const PUBLIC_PATHS = ["/", "/roadmap", "/changelog"];
const PUBLIC_PATH_PREFIXES = ["/p/"];
const PRIVATE_PATHS = ["/dashboard", "/login", "/api", "/new", "/welcome", "/settings", "/demo"];

export function isPublicCacheable(pathname: string): boolean {
  // Public pages live under a locale prefix; the locale does not change cacheability.
  const bare = stripLocale(pathname);
  if (PUBLIC_PATHS.includes(bare)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => bare.startsWith(p));
}

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function hasSessionCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  // Both the site and demo use namespaced Better Auth session cookies.
  return cookie.includes(".session_token=");
}

function getCache(): Cache | null {
  try {
    return (caches as unknown as { default: Cache }).default;
  } catch {
    return null;
  }
}

export async function purgeWorkspaceCache(origin: string, postIds?: number[]): Promise<void> {
  const cache = getCache();
  if (!cache) return;
  const localePaths = SUPPORTED_LOCALES.flatMap((l) => PUBLIC_PATHS.map((p) => localePath(l, p)));
  const paths = [...localePaths, ...SUPPORTED_LOCALES.map((l) => `/changelog.rss?locale=${l}`)];
  if (postIds) {
    for (const id of postIds) {
      for (const l of SUPPORTED_LOCALES) paths.push(localePath(l, `/p/${id}`));
    }
  }
  await Promise.all(paths.map((p) => cache.delete(new Request(origin + p))));
}
