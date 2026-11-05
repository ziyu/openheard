import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_LOCALE, translate, type AnyMessageKey, type Locale } from "@/lib/locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** The server resolves the locale once per request; everything below reads it. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): { locale: Locale; t: (key: AnyMessageKey) => string } {
  const locale = useContext(LocaleContext);
  return { locale, t: (key: AnyMessageKey) => translate(locale, key) };
}
