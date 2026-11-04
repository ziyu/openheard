import { expect, it } from "vitest";

import { DEFAULT_LOCALE, isLocale, localeFromPath, localeHref, negotiateLocale } from "@/lib/locale";

it("reads a supported locale out of the path", () => {
  expect(localeFromPath("/zh-CN/roadmap")).toBe("zh-CN");
  expect(localeFromPath("/en/p/12")).toBe("en");
  expect(localeFromPath("/roadmap")).toBeNull();
  expect(localeFromPath("/zh-CN")).toBe("zh-CN");
  expect(localeFromPath("/")).toBeNull();
});

it("negotiates the browser language and falls back to the workspace default", () => {
  expect(negotiateLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh-CN");
  expect(negotiateLocale("en-GB,en;q=0.9")).toBe("en");
  expect(negotiateLocale("zh-TW")).toBe("zh-CN");
  expect(negotiateLocale("fr-FR")).toBe(DEFAULT_LOCALE);
  expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
  expect(negotiateLocale("fr-FR", "zh-CN")).toBe("zh-CN");
});

it("rejects unknown locale values", () => {
  expect(isLocale("en")).toBe(true);
  expect(isLocale("zh-CN")).toBe(true);
  expect(isLocale("zh")).toBe(false);
  expect(isLocale(undefined)).toBe(false);
});

it("rewrites the same page into another locale", () => {
  expect(localeHref("/zh-CN/roadmap", "?board=box", "", "en")).toBe("/en/roadmap?board=box");
  expect(localeHref("/en/p/12", "", "#comments", "zh-CN")).toBe("/zh-CN/p/12#comments");
  expect(localeHref("/en", "", "", "zh-CN")).toBe("/zh-CN");
  // A path without a locale keeps its tail.
  expect(localeHref("/roadmap", "", "", "zh-CN")).toBe("/zh-CN/roadmap");
});
