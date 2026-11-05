import { STATUS_KINDS } from "@openheard/db/schema/feedback";
import type { StatusKind } from "@openheard/db/schema/feedback";
import { Button } from "@openheard/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { CaretDownIcon, CaretUpIcon, CheckIcon, DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { SectionHead, Toggle } from "@/components/admin/panel";
import { deleteStatus, reorderStatuses, saveStatus } from "@/functions/statuses";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import type { StatusInfo } from "@/lib/status";
import { PageHead } from "@/routes/dashboard/settings";
import { cn } from "@openheard/ui/lib/utils";

export const Route = createFileRoute("/dashboard/settings/statuses")({
  head: ({ matches }) => {
    const locale = asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale);
    return { meta: [{ title: translate(locale, "dash.product.headStatuses") }] };
  },
  component: Statuses,
});

const SWATCHES = ["#f2b53d", "#b08cff", "#6e8bff", "#3ecf8e", "#e0705f", "#5fc8e0", "#ff8fab", "#7a7a85"];

// Kind descriptions live here rather than in lib/status so the page can
// translate them; the kind keys themselves stay untranslated.
const KIND_KEY: Record<StatusKind, string> = {
  open: "dash.product.kindOpen",
  review: "dash.product.kindReview",
  planned: "dash.product.kindPlanned",
  progress: "dash.product.kindProgress",
  done: "dash.product.kindDone",
  closed: "dash.product.kindClosed",
};

function Statuses() {
  const root = useLoaderData({ from: "__root__" });
  const { t } = useLocale();
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  function fire<T>(fn: () => Promise<T>, ok?: string) {
    if (ok) toast.success(ok);
    fn()
      .then(() => router.invalidate())
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : t("dash.product.failed"));
        router.invalidate();
      });
  }

  function move(key: string, dir: -1 | 1) {
    const keys = root.statuses.map((s) => s.key);
    const i = keys.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
    fire(() => reorderStatuses({ data: { keys } }));
  }

  return (
    <>
      <PageHead title={t("dash.product.statusesTitle")} sub={t("dash.product.statusesSub")} />

      <LocaleTabs baseline={root.workspace.defaultLocale} missing={root.statuses.filter((s) => !s.translated).length} />
      <SectionHead
        title={t("dash.product.statuses")}
        right={
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <PlusIcon weight="bold" className="size-3" /> {t("dash.product.newStatus")}
          </Button>
        }
      />
      {root.statuses.map((s, i) => (
        <StatusRow
          key={s.key}
          status={s}
          count={root.statusCounts[s.key] ?? 0}
          first={i === 0}
          last={i === root.statuses.length - 1}
          onMove={(d) => move(s.key, d)}
          onSave={(patch) => fire(() => saveStatus({ data: { key: s.key, ...patch } }), t("dash.product.statusSaved"))}
          onDelete={() => confirm(t("dash.product.deleteStatusConfirm").replace("{name}", () => s.label)) && fire(() => deleteStatus({ data: { key: s.key } }), t("dash.product.statusDeleted"))}
        />
      ))}
      {adding ? (
        <StatusRow
          status={{ key: "", label: "", color: "#6e8bff", kind: "planned", position: 99, onRoadmap: true }}
          count={0}
          editing
          onSave={(patch) => { fire(() => saveStatus({ data: patch }), t("dash.product.statusAdded")); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
      <p className="pt-4 text-xs text-faint">{t("dash.product.statusesHint")}</p>
    </>
  );
}

type Patch = { label: string; color: string; kind: StatusKind; onRoadmap: boolean };

function StatusRow({
  status,
  count,
  first,
  last,
  editing: initialEditing,
  onMove,
  onSave,
  onDelete,
  onCancel,
}: {
  status: StatusInfo;
  count: number;
  first?: boolean;
  last?: boolean;
  editing?: boolean;
  onMove?: (d: -1 | 1) => void;
  onSave: (p: Patch) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(!!initialEditing);
  const [label, setLabel] = useState(status.label);
  const [color, setColor] = useState(status.color);
  const [kind, setKind] = useState<StatusKind>(status.kind);
  const [onRoadmap, setOnRoadmap] = useState(status.onRoadmap);

  // Switching the content language re-renders this row with the other label;
  // seeding on open keeps the form from saving the previous language's text.
  function startEdit() {
    setLabel(status.label);
    setColor(status.color);
    setKind(status.kind);
    setOnRoadmap(status.onRoadmap);
    setEditing(true);
  }

  if (editing) {
    return (
      <form
        className="flex flex-col gap-3 border-t py-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ label, color, kind, onRoadmap });
          if (!initialEditing) setEditing(false);
        }}
      >
        <div className="flex items-center gap-2">
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("dash.product.label")} className="h-8 w-48 rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-ring/60" />
          <span className="flex gap-1.5">
            {SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className={cn("inline-flex size-[22px] items-center justify-center rounded-full", color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background")} style={{ background: c }}>
                {color === c ? <CheckIcon weight="bold" className="size-2.5 text-[#0d0d0f]" /> : null}
              </button>
            ))}
          </span>
          <input value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-24 rounded-lg border border-input bg-card px-2.5 font-mono text-[12px] outline-none focus:border-ring/60" />
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-2 rounded-lg border border-input bg-card pr-2 pl-2.5 text-[13px] outline-none hover:bg-accent">
              <span className="text-faint">{t("dash.product.kind")}</span> {kind} <CaretDownIcon className="size-2.5 text-faint" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-64">
              {STATUS_KINDS.map((k) => (
                <DropdownMenuItem key={k} onClick={() => setKind(k)}>
                  <span className="w-16 font-semibold">{k}</span>
                  <span className="text-xs text-muted-foreground">{t(KIND_KEY[k])}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <label className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <Toggle on={onRoadmap} onChange={setOnRoadmap} label={t("dash.product.showOnRoadmap")} /> {t("dash.product.showOnRoadmap")}
          </label>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" type="button" onClick={() => (onCancel ? onCancel() : setEditing(false))}>
            {t("dash.product.cancel")}
          </Button>
          <Button size="sm" type="submit" disabled={!label.trim()}>
            {t("dash.product.save")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 border-t py-2.5">
      <span className="flex flex-col">
        <button type="button" disabled={first} onClick={() => onMove?.(-1)} className="text-faint hover:text-foreground disabled:opacity-30">
          <CaretUpIcon className="size-3" />
        </button>
        <button type="button" disabled={last} onClick={() => onMove?.(1)} className="text-faint hover:text-foreground disabled:opacity-30">
          <CaretDownIcon className="size-3" />
        </button>
      </span>
      <span className="size-2.5 rounded-full" style={{ background: status.color }} />
      <span className="w-40 text-[13px] font-semibold">{status.label}</span>
      <span className="font-mono text-[11px] text-faint">{status.kind}</span>
      {status.onRoadmap ? <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-faint">{t("dash.product.roadmapChip")}</span> : null}
      <span className="flex-1" />
      <span className="text-xs text-faint tabular-nums">
        {count} {count === 1 ? t("dash.product.post") : t("dash.product.posts")}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex size-[26px] items-center justify-center rounded-md text-faint outline-none hover:bg-accent hover:text-foreground">
          <DotsThreeIcon weight="bold" className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          <DropdownMenuItem onClick={startEdit}>{t("dash.product.edit")}</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            {t("dash.product.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
