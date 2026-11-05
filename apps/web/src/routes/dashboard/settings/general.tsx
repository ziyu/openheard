import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead } from "@/components/admin/panel";
import { saveWorkspace } from "@/functions/settings";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/general")({
  head: ({ matches }) => {
    const locale = asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale);
    return { meta: [{ title: translate(locale, "dash.workspace.headGeneral") }] };
  },
  component: General,
});

const input = "h-8 w-[280px] rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-ring/60";

function General() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const { t } = useLocale();
  const ws = root.workspace;
  const [name, setName] = useState(ws.name);
  const [tagline, setTagline] = useState(ws.tagline);
  const dirty = name !== ws.name || tagline !== ws.tagline;

  function save() {
    saveWorkspace({ data: { name, tagline, theme: ws.theme === "light" ? "light" : "dark", poweredBy: ws.poweredBy, requireApproval: ws.requireApproval, accent: ws.accent } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : t("dash.workspace.couldNotSave")));
  }

  return (
    <>
      <PageHead title={t("dash.shell.general")} sub={t("dash.workspace.generalSub")} />
      <SectionHead title={t("dash.workspace.sectionWorkspace")} />
      <Row label={t("dash.workspace.name")} help={t("dash.workspace.nameHelp")}>
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t("dash.workspace.workspaceNameAria")} className={input} />
      </Row>
      <Row label={t("dash.workspace.tagline")} help={t("dash.workspace.taglineHelp")}>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} aria-label={t("dash.workspace.taglineAria")} className={input} />
      </Row>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-xs text-faint">{dirty ? t("dash.workspace.unsaved") : t("dash.workspace.saved")}</span>
        <LoadingButton onAction={save} disabled={!dirty} successLabel={t("dash.workspace.saved")} onError={(err) => toast.error(err instanceof Error ? err.message : t("dash.workspace.couldNotSave"))}>
          {t("dash.workspace.save")}
        </LoadingButton>
      </div>
    </>
  );
}
