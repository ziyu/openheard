import { Button } from "@openheard/ui/components/button";
import { CheckIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead } from "@/components/admin/panel";
import Logo from "@/components/logo";
import { saveWorkspace } from "@/functions/settings";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PageHead } from "@/routes/dashboard/settings";
import { cn } from "@openheard/ui/lib/utils";

export const Route = createFileRoute("/dashboard/settings/branding")({
  head: ({ matches }) => {
    const locale = asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale);
    return { meta: [{ title: translate(locale, "dash.workspace.headBranding") }] };
  },
  component: Branding,
});

const DEFAULT = "#6e8bff";
const SWATCHES = [DEFAULT, "#3ecf8e", "#f2b53d", "#e0705f", "#b08cff", "#5fc8e0", "#ff8fab", "#ededf0"];

function Branding() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const { t } = useLocale();
  const ws = root.workspace;
  const [accent, setAccent] = useState(ws.accent ?? DEFAULT);
  const [busy, setBusy] = useState(false);
  const dirty = accent !== (ws.accent ?? DEFAULT);

  async function save() {
    setBusy(true);
    try {
      await saveWorkspace({ data: { name: ws.name, tagline: ws.tagline, theme: ws.theme === "light" ? "light" : "dark", poweredBy: ws.poweredBy, requireApproval: ws.requireApproval, accent: accent === DEFAULT ? null : accent } });
      await router.invalidate();
      toast.success(t("dash.workspace.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dash.workspace.couldNotSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title={t("dash.shell.branding")} sub={t("dash.workspace.brandingSub")} />
      <SectionHead title={t("dash.workspace.sectionAppearance")} />
      <Row label={t("dash.workspace.accent")} help={t("dash.workspace.accentHelp")}>
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            {SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => setAccent(c)} aria-label={c} className={cn("inline-flex size-[22px] items-center justify-center rounded-full", accent === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background")} style={{ background: c }}>
                {accent === c ? <CheckIcon weight="bold" className="size-2.5 text-[#0d0d0f]" /> : null}
              </button>
            ))}
          </span>
          <input value={accent} onChange={(e) => setAccent(e.target.value)} aria-label={t("dash.workspace.accentColorAria")} className="h-8 w-24 rounded-lg border border-input bg-card px-2.5 font-mono text-[12px] outline-none focus:border-ring/60" />
        </div>
      </Row>
      <Row label={t("dash.workspace.preview")} help={t("dash.workspace.previewHelp")}>
        <span className="flex h-14 w-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-[#0d0d0f]" style={{ background: accent, borderColor: accent }}>
          <span className="text-[13px] leading-none">▲</span>
          <span className="font-mono text-[13px] leading-none font-semibold">128</span>
        </span>
      </Row>
      <Row label={t("dash.workspace.logo")} help={t("dash.workspace.logoHelp")}>
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <Button variant="secondary" size="sm" disabled>
            {t("dash.workspace.replace")}
          </Button>
        </div>
      </Row>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-xs text-faint">{dirty ? t("dash.workspace.unsaved") : t("dash.workspace.saved")}</span>
        <Button arrow size="sm" disabled={!dirty || busy} onClick={save}>
          {t("dash.workspace.save")}
        </Button>
      </div>
    </>
  );
}
