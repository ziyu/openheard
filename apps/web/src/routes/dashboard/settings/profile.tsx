import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead } from "@/components/admin/panel";
import { Avatar } from "@/components/bits";
import { saveProfile } from "@/functions/settings";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/profile")({
  head: ({ matches }) => ({ meta: [{ title: translate(asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale), "dash.billing.headProfile") }] }),
  component: Profile,
});

function Profile() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const { t } = useLocale();
  const me = root.user!;
  const [name, setName] = useState(me.name);
  const dirty = name.trim() !== me.name;

  function save() {
    saveProfile({ data: { name } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : t("dash.billing.couldNotSave")));
  }

  return (
    <>
      <PageHead title={t("dash.shell.profile")} sub={t("dash.billing.profileSub")} />
      <SectionHead title={t("dash.billing.sectionYou")} />
      <Row label={t("dash.billing.picture")} help={t("dash.billing.pictureHelp")}>
        <Avatar name={me.name} image={me.image} size={36} />
      </Row>
      <Row label={t("dash.billing.name")} help={t("dash.billing.nameHelp")}>
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t("dash.billing.displayName")} className="h-8 w-[280px] rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none focus:border-ring/60" />
      </Row>
      <Row label={t("dash.billing.email")} help={t("dash.billing.emailHelp")}>
        <span className="text-[13px] text-muted-foreground">{me.email}</span>
      </Row>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-xs text-faint">{dirty ? t("dash.billing.unsavedChanges") : t("dash.billing.saved")}</span>
        <LoadingButton onAction={save} disabled={!dirty} successLabel={t("dash.billing.saved")} onError={(err) => toast.error(err instanceof Error ? err.message : t("dash.billing.couldNotSave"))}>
          {t("dash.billing.save")}
        </LoadingButton>
      </div>
    </>
  );
}
