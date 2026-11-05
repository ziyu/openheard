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
import { SITE_NAME } from "@/lib/site-brand";

export const Route = createFileRoute("/dashboard/settings/public-board")({
  head: ({ matches }) => {
    const locale = asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale);
    return { meta: [{ title: translate(locale, "dash.workspace.headPublicBoard") }] };
  },
  component: PublicBoard,
});

function PublicBoard() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const { t } = useLocale();
  const ws = root.workspace;
  const [theme, setTheme] = useState<"dark" | "light">(ws.theme === "light" ? "light" : "dark");
  const [poweredBy, setPoweredBy] = useState(ws.poweredBy);
  const dirty = theme !== (ws.theme === "light" ? "light" : "dark") || poweredBy !== ws.poweredBy;

  function save() {
    saveWorkspace({ data: { name: ws.name, tagline: ws.tagline, theme, poweredBy, requireApproval: ws.requireApproval, accent: ws.accent } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : t("dash.workspace.couldNotSave")));
  }

  return (
    <>
      <PageHead title={t("dash.shell.publicBoardSettings")} sub={t("dash.workspace.publicBoardSub")} />
      <SectionHead title={t("dash.workspace.sectionAppearance")} />
      <Row label={t("dash.workspace.theme")} help={t("dash.workspace.themeHelp")}>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-[30px] items-center gap-2 rounded-md border border-input bg-card pr-2 pl-2.5 text-[13px] capitalize outline-none hover:bg-accent">
            {t(theme === "light" ? "dash.workspace.themeLight" : "dash.workspace.themeDark")} <CaretDownIcon className="size-2.5 text-faint" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-32">
            {(["dark", "light"] as const).map((value) => (
              <DropdownMenuItem key={value} className="capitalize" onClick={() => setTheme(value)}>
                {t(value === "light" ? "dash.workspace.themeLight" : "dash.workspace.themeDark")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <div className="pt-7">
        <SectionHead title={t("dash.workspace.sectionFooter")} />
      </div>
      <Row label={t("dash.workspace.poweredBy").replace("{name}", SITE_NAME)} help={t("dash.workspace.poweredByHelp")}>
        <Toggle on={poweredBy} onChange={setPoweredBy} label={t("dash.workspace.poweredByLabel")} />
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
