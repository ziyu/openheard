// Dashboard strings live in per-area modules so each page family can grow its
// copy without editing one shared JSON file. locale.ts merges these into the
// same message map the public pages use.
import { billingMessages } from "./billing";
import { opsMessages } from "./ops";
import { peopleMessages } from "./people";
import { productMessages } from "./product";
import { shellMessages } from "./shell";
import { workspaceMessages } from "./workspace";

export const dashboardMessages = {
  en: { ...shellMessages.en, ...workspaceMessages.en, ...productMessages.en, ...peopleMessages.en, ...billingMessages.en, ...opsMessages.en },
  "zh-CN": { ...shellMessages["zh-CN"], ...workspaceMessages["zh-CN"], ...productMessages["zh-CN"], ...peopleMessages["zh-CN"], ...billingMessages["zh-CN"], ...opsMessages["zh-CN"] },
};
