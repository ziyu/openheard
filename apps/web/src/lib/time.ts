import type { Locale } from "./locale";

const units: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.35, "week"],
  [12, "month"],
  [Infinity, "year"],
];

const SHORT_EN: Record<string, string> = { second: "s", minute: "m", hour: "h", day: "d", week: "w", month: "mo", year: "y" };
const SHORT_ZH: Record<string, string> = { second: "秒", minute: "分钟", hour: "小时", day: "天", week: "周", month: "个月", year: "年" };

// Short relative time for meta rows: "2d" in English, "2天" in Chinese.
export function ago(date: Date | number | string, locale: Locale = "en"): string {
  let diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 45) return locale === "zh-CN" ? "刚刚" : "now";
  const short = locale === "zh-CN" ? SHORT_ZH : SHORT_EN;
  for (const [size, unit] of units) {
    if (diff < size) return locale === "zh-CN" ? `${Math.max(1, Math.round(diff))}${short[unit]}` : `${Math.max(1, Math.round(diff))}${short[unit]}`;
    diff /= size;
  }
  return "";
}

const tag = (locale: Locale) => (locale === "zh-CN" ? "zh-CN" : "en-US");

export function longDate(date: Date | number | string, locale: Locale = "en"): string {
  return new Date(date).toLocaleDateString(tag(locale), { month: "short", day: "numeric" });
}

export function fullDate(date: Date | number | string, locale: Locale = "en"): string {
  return new Date(date).toLocaleDateString(tag(locale), { month: "short", day: "numeric", year: "numeric" });
}

// Sentence form: "3d ago" / "3天前", "just now" / "刚刚".
export function since(date: Date | number | string, locale: Locale = "en"): string {
  const a = ago(date, locale);
  const fresh = locale === "zh-CN" ? "刚刚" : "now";
  if (a === fresh) return locale === "zh-CN" ? "刚刚" : "just now";
  return locale === "zh-CN" ? `${a}前` : `${a} ago`;
}
