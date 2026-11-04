import { useRouter } from "@tanstack/react-router";

import { LOCALE_COOKIE, SUPPORTED_LOCALES, isLocale, type Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { cn } from "@openheard/ui/lib/utils";

const LABELS: Record<Locale, string> = { en: "English", "zh-CN": "中文" };

/**
 * Settings pages are not locale-prefixed, so the tab writes the saved choice
 * and re-runs the loaders: every server function then reads and writes the
 * selected language, and the board preview on the page follows it too.
 */
export function LocaleTabs({ baseline, missing }: { baseline: string; missing?: number }) {
  const { locale } = useLocale();
  const router = useRouter();
  const base: Locale = isLocale(baseline) ? baseline : "en";
  const ordered = [base, ...SUPPORTED_LOCALES.filter((l) => l !== base)];

  function pick(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    void router.invalidate();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b pb-3" role="tablist" aria-label="Content language">
      {ordered.map((l) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={l === locale}
          onClick={() => pick(l)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
            l === locale ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          {LABELS[l]}
          {l === base ? <span className="font-mono text-[10px] text-faint uppercase">base</span> : null}
          {l === locale && l !== base && missing ? (
            <span className="rounded-full bg-status-planned/15 px-1.5 font-mono text-[10px] text-status-planned">{missing}</span>
          ) : null}
        </button>
      ))}
      <span className="ml-auto text-xs text-faint">
        {locale === base ? "Editing the base language" : `Editing ${LABELS[locale]} · falls back to ${LABELS[base]} when empty`}
      </span>
    </div>
  );
}
