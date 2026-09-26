import { expect, it } from "vitest";

import { localizedStatusLabel, selectLocale } from "./locale";

it("uses a saved language across navigation and falls back to the browser language", () => {
  expect(selectLocale("zh-CN", "en-US")).toBe("zh-CN");
  expect(selectLocale("en", "zh-CN")).toBe("en");
  expect(selectLocale(null, "zh-TW")).toBe("zh-CN");
  expect(selectLocale("invalid", "fr-FR")).toBe("en");
});

it("translates only default status labels", () => {
  expect(localizedStatusLabel("Planned", "zh-CN")).toBe("已规划");
  expect(localizedStatusLabel("Custom status", "zh-CN")).toBe("Custom status");
});
