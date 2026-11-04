import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localePath, translate, type Locale, type MessageKey } from "./locale";

/** BCP 47 tags used for hreflang and og:locale. */
const HREFLANG: Record<Locale, string> = { en: "en", "zh-CN": "zh-CN" };

/**
 * Every public page states its language explicitly: canonical for itself,
 * alternates for every supported locale, and x-default for the baseline. A
 * crawler that lands on one language can always find the others.
 */
export function localeHead(locale: Locale, path: string, titleKey: MessageKey) {
  const title = translate(locale, titleKey);
  return {
    meta: [
      { title },
      { property: "og:title", content: title },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: HREFLANG[locale].replace("-", "_") },
      ...SUPPORTED_LOCALES.filter((l) => l !== locale).map((l) => ({ property: "og:locale:alternate", content: HREFLANG[l].replace("-", "_") })),
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: localePath(locale, path) },
      ...SUPPORTED_LOCALES.map((l) => ({ rel: "alternate", hreflang: HREFLANG[l], href: localePath(l, path) })),
      { rel: "alternate", hreflang: "x-default", href: localePath(DEFAULT_LOCALE, path) },
    ],
  };
}

/** Same alternates, for pages whose title is content (a post, a changelog entry). */
export function localeAlternates(locale: Locale, path: string) {
  return [
    { rel: "canonical", href: localePath(locale, path) },
    ...SUPPORTED_LOCALES.map((l) => ({ rel: "alternate", hreflang: HREFLANG[l], href: localePath(l, path) })),
    { rel: "alternate", hreflang: "x-default", href: localePath(DEFAULT_LOCALE, path) },
  ];
}
