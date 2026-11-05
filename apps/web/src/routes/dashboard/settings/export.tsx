import { Button } from "@openheard/ui/components/button";
import { DownloadSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead } from "@/components/admin/panel";
import { exportPosts, importPosts } from "@/functions/settings";
import { parseCsv, toImportRows } from "@/lib/csv";
import type { ImportRow } from "@/lib/csv";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/export")({
  head: ({ matches }) => ({ meta: [{ title: translate(asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale), "dash.people.exportDocTitle") }] }),
  component: Export,
});

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function Export() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const { t } = useLocale();
  const [busy, setBusy] = useState<"json" | "csv" | "import" | null>(null);
  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    const rows = toImportRows(parseCsv(await file.text()));
    if (rows.length === 0) return toast.error(t("dash.people.noPostsFound"));
    setPreview(rows);
  }

  async function runImport() {
    if (!preview) return;
    setBusy("import");
    try {
      const { created } = await importPosts({ data: { rows: preview } });
      setPreview(null);
      await router.invalidate();
      toast.success(t("dash.people.imported").replace("{count}", String(created)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dash.people.importFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function run(kind: "json" | "csv") {
    setBusy(kind);
    try {
      const rows = await exportPosts();
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "json") download(`${root.workspace.id}-posts-${stamp}.json`, JSON.stringify(rows, null, 2), "application/json");
      else {
        const head = ["id", "title", "status", "board", "votes", "author", "email", "created", "tags", "body"];
        const lines = rows.map((p) => [p.id, p.title, p.status, p.board, p.votes, p.author?.name, p.author?.email, new Date(p.createdAt).toISOString(), p.tags.join("|"), p.body].map(csvCell).join(","));
        download(`${root.workspace.id}-posts-${stamp}.csv`, [head.join(","), ...lines].join("\n"), "text/csv");
      }
      toast.success(t("dash.people.exported").replace("{count}", String(rows.length)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dash.people.exportFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHead title={t("dash.people.importExport")} sub={t("dash.people.importExportSub")} />
      <SectionHead title={t("dash.people.posts")} />
      <Row label={t("dash.people.json")} help={t("dash.people.jsonHelp")}>
        <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("json")}>
          <DownloadSimpleIcon className="size-3.5" /> {busy === "json" ? t("dash.people.preparing") : t("dash.people.downloadJson")}
        </Button>
      </Row>
      <Row label={t("dash.people.csv")} help={t("dash.people.csvHelp")}>
        <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => run("csv")}>
          <DownloadSimpleIcon className="size-3.5" /> {busy === "csv" ? t("dash.people.preparing") : t("dash.people.downloadCsv")}
        </Button>
      </Row>
      <div className="pt-7">
        <SectionHead title={t("dash.people.import")} />
      </div>
      <Row label={t("dash.people.fromCsv")} help={t("dash.people.fromCsvHelp")}>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
          <UploadSimpleIcon className="size-3.5" /> {t("dash.people.chooseCsv")}
        </Button>
      </Row>
      {preview ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold">
              {t("dash.people.readySummary")
                .replace("{posts}", String(preview.length))
                .replace("{votes}", String(preview.reduce((n, r) => n + r.votes, 0)))
                .replace("{authors}", String(new Set(preview.map((r) => r.authorEmail).filter(Boolean)).size))}
            </span>
            <span className="text-xs text-faint">
              {t("dash.people.taxonomySummary")
                .replace("{boards}", String(new Set(preview.map((r) => r.board ?? "")).size))
                .replace("{statuses}", String(new Set(preview.map((r) => r.status ?? "")).size))}
            </span>
          </div>
          <div className="flex max-h-48 flex-col overflow-auto rounded-md border bg-background">
            {preview.slice(0, 12).map((r, i) => (
              <div key={i} className="flex items-center gap-3 border-b px-3 py-1.5 text-xs last:border-b-0">
                <span className="w-8 font-mono text-faint tabular-nums">{r.votes}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="text-faint">{r.status ?? "—"}</span>
                <span className="text-faint">{r.authorName ?? ""}</span>
              </div>
            ))}
            {preview.length > 12 ? <div className="px-3 py-1.5 text-xs text-faint">{t("dash.people.andMore").replace("{count}", String(preview.length - 12))}</div> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
              {t("dash.people.cancel")}
            </Button>
            <Button size="sm" arrow disabled={busy !== null} onClick={runImport}>
              {busy === "import" ? t("dash.people.importing") : t("dash.people.importCount").replace("{count}", String(preview.length))}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
