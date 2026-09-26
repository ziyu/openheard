import { useLoaderData } from "@tanstack/react-router";

import { Kbd } from "./bits";
import { SITE_LEGAL_BASE_URL, SITE_NAME, SITE_SOURCE_URL } from "@/lib/site-brand";
import { useLocale } from "@/lib/locale";

export default function Footer() {
  const { locale, t } = useLocale();
  const data = useLoaderData({ from: "__root__" });
  return (
    <footer className="mx-auto flex w-full max-w-[1072px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-8 pt-4 pb-6 text-xs text-faint">
      <span className="hidden items-center gap-4 md:flex">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd> {t("move")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>v</Kbd> {t("vote")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>c</Kbd> {t("newPost")}
        </span>
      </span>
      {!data || data.workspace.poweredBy ? (
        <span className="md:pl-4">
          {t("poweredBy")}{" "}
          <a href={SITE_SOURCE_URL} className="font-semibold text-muted-foreground hover:text-foreground">
            {SITE_NAME}
          </a>
          {locale === "zh-CN" ? " 提供支持" : null}
        </span>
      ) : null}
      <a href={SITE_SOURCE_URL} className="text-faint hover:text-muted-foreground">
        {t("source")}
      </a>
      <a href={SITE_LEGAL_BASE_URL ? `${SITE_LEGAL_BASE_URL}/privacy` : "/privacy"} className="text-faint hover:text-muted-foreground">
        {t("privacy")}
      </a>
      <a href={SITE_LEGAL_BASE_URL ? `${SITE_LEGAL_BASE_URL}/terms` : "/terms"} className="text-faint hover:text-muted-foreground">
        {t("terms")}
      </a>
    </footer>
  );
}
