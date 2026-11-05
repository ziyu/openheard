import { Button } from "@openheard/ui/components/button";
import { DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { LocaleTabs } from "@/components/admin/locale-tabs";
import { SectionHead } from "@/components/admin/panel";
import { deleteBoard, deleteTag, saveBoard, saveTag } from "@/functions/settings";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PageHead } from "@/routes/dashboard/settings";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";

export const Route = createFileRoute("/dashboard/settings/boards")({
  head: ({ matches }) => {
    const locale = asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale);
    return { meta: [{ title: translate(locale, "dash.product.headBoards") }] };
  },
  component: Boards,
});

const input = "h-8 rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-ring/60";

function Boards() {
  const root = useLoaderData({ from: "__root__" });
  const { t } = useLocale();
  const missing = root.boards.filter((b) => !b.translated).length;
  const router = useRouter();
  const [newBoard, setNewBoard] = useState<{ name: string; description: string } | null>(null);
  const [newTag, setNewTag] = useState<string | null>(null);

  function fire<T>(fn: () => Promise<T>, ok?: string) {
    if (ok) toast.success(ok);
    fn()
      .then(() => router.invalidate())
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : t("dash.product.failed"));
        router.invalidate();
      });
  }

  return (
    <>
      <PageHead title={t("dash.product.boardsTitle")} sub={t("dash.product.boardsSub")} />

      <LocaleTabs baseline={root.workspace.defaultLocale} missing={missing} />

      <SectionHead
        title={t("dash.product.boards")}
        right={
          <Button variant="secondary" size="sm" onClick={() => setNewBoard({ name: "", description: "" })}>
            <PlusIcon weight="bold" className="size-3" /> {t("dash.product.newBoard")}
          </Button>
        }
      />
      {root.boards.map((b) => (
        <BoardRow
          key={b.id}
          board={b}
          onSave={(name, description) => fire(() => saveBoard({ data: { id: b.id, name, description } }), t("dash.product.boardUpdated"))}
          onDelete={() => confirm(t("dash.product.deleteBoardConfirm").replace("{name}", () => b.name)) && fire(() => deleteBoard({ data: { id: b.id } }), t("dash.product.boardDeleted"))}
        />
      ))}
      {newBoard ? (
        <form
          className="flex items-center gap-2 border-t py-3"
          onSubmit={(e) => {
            e.preventDefault();
            fire(() => saveBoard({ data: newBoard }), t("dash.product.boardAdded"));
            setNewBoard(null);
          }}
        >
          <input autoFocus placeholder={t("dash.product.boardName")} value={newBoard.name} onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })} className={`${input} w-48`} />
          <input placeholder={t("dash.product.boardDescription")} value={newBoard.description} onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })} className={`${input} flex-1`} />
          <Button size="sm" type="submit" disabled={!newBoard.name.trim()}>
            {t("dash.product.add")}
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setNewBoard(null)}>
            {t("dash.product.cancel")}
          </Button>
        </form>
      ) : null}

      <div className="pt-8">
        <SectionHead
          title={t("dash.product.tags")}
          right={
            <Button variant="secondary" size="sm" onClick={() => setNewTag("")}>
              <PlusIcon weight="bold" className="size-3" /> {t("dash.product.newTag")}
            </Button>
          }
        />
      </div>
      {root.tags.length === 0 && newTag === null ? <p className="border-t py-4 text-sm text-faint">{t("dash.product.noTagsYet")}</p> : null}
      {root.tags.map((tag) => (
        <div key={tag.id} className="flex items-center gap-3 border-t py-2.5">
          <span className="inline-flex h-[22px] items-center rounded-md border border-input bg-secondary px-2 text-xs">{tag.name}</span>
          <span className="flex-1" />
          <More onDelete={() => fire(() => deleteTag({ data: { id: tag.id } }), t("dash.product.tagDeleted"))} />
        </div>
      ))}
      {newTag !== null ? (
        <form
          className="flex items-center gap-2 border-t py-3"
          onSubmit={(e) => {
            e.preventDefault();
            fire(() => saveTag({ data: { name: newTag } }), t("dash.product.tagAdded"));
            setNewTag(null);
          }}
        >
          <input autoFocus placeholder={t("dash.product.tagName")} value={newTag} onChange={(e) => setNewTag(e.target.value)} className={`${input} w-48`} />
          <Button size="sm" type="submit" disabled={!newTag.trim()}>
            {t("dash.product.add")}
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setNewTag(null)}>
            {t("dash.product.cancel")}
          </Button>
        </form>
      ) : null}
    </>
  );
}

function BoardRow({ board, onSave, onDelete }: { board: { id: string; name: string; description: string | null; count: number }; onSave: (name: string, description: string) => void; onDelete: () => void }) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  // The row can re-render with a different language while it is mounted, so
  // the form seeds from the current values every time it opens.
  function startEdit() {
    setName(board.name);
    setDescription(board.description ?? "");
    setEditing(true);
  }
  if (editing) {
    return (
      <form
        className="flex items-center gap-2 border-t py-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name, description);
          setEditing(false);
        }}
      >
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-48`} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("dash.product.boardDescription")} className={`${input} flex-1`} />
        <Button size="sm" type="submit" disabled={!name.trim()}>
          {t("dash.product.save")}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
          {t("dash.product.cancel")}
        </Button>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-3.5 border-t py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold">{board.name}</span>
        <span className="text-xs text-faint">{board.description || t("dash.product.noDescription")}</span>
      </div>
      <span className="text-xs text-faint tabular-nums">
        {board.count} {board.count === 1 ? t("dash.product.post") : t("dash.product.posts")}
      </span>
      <More onEdit={startEdit} onDelete={onDelete} />
    </div>
  );
}

function More({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  const { t } = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-[26px] items-center justify-center rounded-md text-faint outline-none hover:bg-accent hover:text-foreground">
        <DotsThreeIcon weight="bold" className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {onEdit ? <DropdownMenuItem onClick={onEdit}>{t("dash.product.edit")}</DropdownMenuItem> : null}
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          {t("dash.product.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
