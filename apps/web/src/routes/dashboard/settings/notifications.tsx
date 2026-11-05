import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead, Toggle } from "@/components/admin/panel";
import { getNotificationPrefs, saveNotificationPrefs } from "@/functions/settings";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/notifications")({
  loader: () => getNotificationPrefs(),
  head: ({ matches }) => ({ meta: [{ title: translate(asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale), "dash.billing.headNotifications") }] }),
  component: Notifications,
});

function Notifications() {
  const saved = Route.useLoaderData();
  const router = useRouter();
  const { t } = useLocale();
  const [form, setForm] = useState(saved);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  function save() {
    saveNotificationPrefs({ data: form })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : t("dash.billing.couldNotSave")));
  }

  return (
    <>
      <PageHead title={t("dash.shell.notifications")} sub={t("dash.billing.notificationsSub")} />
      <SectionHead title={t("dash.billing.emailMeWhen")} />
      <Row label={t("dash.billing.whenNewPost")} help={t("dash.billing.whenNewPostHelp")}>
        <Toggle on={form.notifyNewPost} onChange={(v) => setForm({ ...form, notifyNewPost: v })} label={t("dash.billing.toggleNewPost")} />
      </Row>
      <Row label={t("dash.billing.whenComment")} help={t("dash.billing.whenCommentHelp")}>
        <Toggle on={form.notifyComment} onChange={(v) => setForm({ ...form, notifyComment: v })} label={t("dash.billing.toggleNewComment")} />
      </Row>
      <Row label={t("dash.billing.whenStatus")} help={t("dash.billing.whenStatusHelp")}>
        <Toggle on={form.notifyStatus} onChange={(v) => setForm({ ...form, notifyStatus: v })} label={t("dash.billing.toggleStatus")} />
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
