import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { CaretDownIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead, Toggle } from "@/components/admin/panel";
import { saveWorkspace } from "@/functions/settings";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/access")({
  head: ({ matches }) => {
    const locale = asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale);
    return { meta: [{ title: translate(locale, "dash.workspace.headAccess") }] };
  },
  component: Access,
});

function Access() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const { t } = useLocale();
  const ws = root.workspace;
  const [form, setForm] = useState({ whoCanPost: ws.whoCanPost, anonymousVoting: ws.anonymousVoting, requireApproval: ws.requireApproval, showRoadmap: ws.showRoadmap, showChangelog: ws.showChangelog });
  const dirty = Object.entries(form).some(([k, v]) => (ws as Record<string, unknown>)[k] !== v);

  function save() {
    saveWorkspace({ data: { name: ws.name, tagline: ws.tagline, theme: ws.theme === "light" ? "light" : "dark", poweredBy: ws.poweredBy, accent: ws.accent, ...form } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : t("dash.workspace.couldNotSave")));
  }

  return (
    <>
      <PageHead title={t("dash.shell.access")} sub={t("dash.workspace.accessSub")} />
      <SectionHead title={t("dash.workspace.sectionPosting")} />
      <Row label={t("dash.workspace.whoCanPost")} help={t("dash.workspace.whoCanPostHelp")}>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-[30px] items-center gap-2 rounded-md border border-input bg-card pr-2 pl-2.5 text-[13px] outline-none hover:bg-accent">
            {t(form.whoCanPost === "anyone" ? "dash.workspace.anyoneSignedIn" : "dash.workspace.teamMembersOnly")} <CaretDownIcon className="size-2.5 text-faint" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => setForm({ ...form, whoCanPost: "anyone" })}>{t("dash.workspace.anyoneSignedIn")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setForm({ ...form, whoCanPost: "members" })}>{t("dash.workspace.teamMembersOnly")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row label={t("dash.workspace.requireApproval")} help={t("dash.workspace.requireApprovalHelp")}>
        <Toggle on={form.requireApproval} onChange={(v) => setForm({ ...form, requireApproval: v })} label={t("dash.workspace.requireApproval")} />
      </Row>
      <Row label={t("dash.workspace.anonymousVoting")} help={t("dash.workspace.anonymousVotingHelp")}>
        <Toggle on={form.anonymousVoting} onChange={(v) => setForm({ ...form, anonymousVoting: v })} label={t("dash.workspace.anonymousVoting")} />
      </Row>
      <div className="pt-7">
        <SectionHead title={t("dash.workspace.sectionPublicTabs")} />
      </div>
      <Row label={t("dash.shell.roadmap")} help={t("dash.workspace.roadmapHelp")}>
        <Toggle on={form.showRoadmap} onChange={(v) => setForm({ ...form, showRoadmap: v })} label={t("dash.workspace.showRoadmap")} />
      </Row>
      <Row label={t("dash.shell.changelog")} help={t("dash.workspace.changelogHelp")}>
        <Toggle on={form.showChangelog} onChange={(v) => setForm({ ...form, showChangelog: v })} label={t("dash.workspace.showChangelog")} />
      </Row>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-xs text-faint">{dirty ? t("dash.workspace.unsaved") : t("dash.workspace.saved")}</span>
        <LoadingButton onAction={save} disabled={!dirty} errorLabel={t("dash.shell.tryAgain")} successLabel={t("dash.workspace.saved")} onError={(err) => toast.error(err instanceof Error ? err.message : t("dash.workspace.couldNotSave"))}>
          {t("dash.workspace.save")}
        </LoadingButton>
      </div>
    </>
  );
}
