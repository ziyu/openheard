import { useSyncExternalStore } from "react";

import en from "@/messages/en.json";
import zhCN from "@/messages/zh-CN.json";

export type Locale = "en" | "zh-CN";
type MessageKey = keyof typeof en;

const STORAGE_KEY = "feedback.locale";
const CHANGE_EVENT = "feedback:locale-change";
const messages: Record<Locale, Record<MessageKey, string>> = { en, "zh-CN": zhCN };

export function selectLocale(saved: string | null, browserLanguage: string): Locale {
  if (saved === "en" || saved === "zh-CN") return saved;
  return browserLanguage.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function currentLocale(): Locale {
  return selectLocale(window.localStorage.getItem(STORAGE_KEY), window.navigator.language);
}

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function setLocale(locale: Locale) {
  window.localStorage.setItem(STORAGE_KEY, locale);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, currentLocale, () => "en" as Locale);
  return { locale, t: (key: MessageKey) => messages[locale][key] };
}

const defaultStatusLabels: Record<string, string> = {
  Pending: "待处理",
  "Under review": "审核中",
  Planned: "已规划",
  "In progress": "进行中",
  Shipped: "已发布",
  Closed: "已关闭",
};

export function localizedStatusLabel(label: string, locale: Locale): string {
  return locale === "zh-CN" ? defaultStatusLabels[label] ?? label : label;
}
