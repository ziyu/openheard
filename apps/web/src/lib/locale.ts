import en from "@/messages/en.json";
import zhCN from "@/messages/zh-CN.json";
import { dashboardMessages } from "@/messages/dashboard";

export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
// Public pages read the base JSON; the dashboard adds its own per-area modules.
const base = { en: { ...en }, "zh-CN": { ...zhCN } };
const all = {
  en: { ...base.en, ...dashboardMessages.en },
  "zh-CN": { ...base["zh-CN"], ...dashboardMessages["zh-CN"] },
};

export type MessageKey = keyof typeof all.en;

const messages: Record<Locale, Record<MessageKey, string>> = all as Record<Locale, Record<MessageKey, string>>;

/** Cookie keeps a visitor's choice for unprefixed surfaces (dashboard, auth). */
export const LOCALE_COOKIE = "feedback.locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Narrow an untrusted value, falling back to the default locale. */
export function asLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** First supported locale tag wins; region tags map onto the base language. */
export function negotiateLocale(acceptLanguage: string | null | undefined, fallback: Locale = DEFAULT_LOCALE): Locale {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0]!.trim().toLowerCase();
    if (!tag) continue;
    if (tag === "zh" || tag.startsWith("zh-")) return "zh-CN";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return fallback;
}

/** The locale a path carries, if any. Public pages are its only source. */
export function localeFromPath(pathname: string): Locale | null {
  const first = pathname.split("?")[0]!.split("/")[1] ?? "";
  return isLocale(first) ? first : null;
}

/** Absolute path for a public page in one locale. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/** The path with its locale prefix removed, for layout decisions. */
export function stripLocale(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (!locale) return pathname;
  const rest = pathname.slice(locale.length + 1);
  return rest.startsWith("/") ? rest || "/" : `/${rest}`;
}

/** The same page in another locale, search and hash preserved. */
export function localeHref(pathname: string, search: string, hash: string, target: Locale): string {
  const current = localeFromPath(pathname);
  const rest = pathname.split("/").filter(Boolean).slice(current ? 1 : 0).join("/");
  return `/${target}${rest ? `/${rest}` : ""}${search}${hash}`;
}

/** Any key is accepted; a missing entry renders as the key so QA can spot it. */
export type AnyMessageKey = MessageKey | (string & {});

export function translate(locale: Locale, key: AnyMessageKey): string {
  const table = messages[locale] as Record<string, string | undefined>;
  const fallback = messages[DEFAULT_LOCALE] as Record<string, string | undefined>;
  return table[key] ?? fallback[key] ?? key;
}
