import { Dialog, DialogContent, DialogTitle } from "@openheard/ui/components/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { CaretDownIcon, ImageIcon, LightningIcon, PaperclipIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createPost, searchPosts } from "@/functions/posts";
import { useLocale } from "@/lib/locale-react";
import { openSignIn } from "@/lib/pending-action";
import { findStatus, useStatuses } from "@/lib/status";

import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { Kbd } from "./bits";

type Board = { id: string; name: string };
type Similar = Awaited<ReturnType<typeof searchPosts>>;

export type OptimisticPost = {
  id: number;
  title: string;
  excerpt: string | null;
  body: string;
  boardId: string;
  board: { name: string };
  status: string;
  pinned: boolean;
  commentCount: number;
  voteCount: number;
  voted: boolean;
  author: { name: string; image?: string | null } | null;
  createdAt: string;
  tags: [];
  trending: boolean;
  _optimistic: true;
};

export function NewPostDialog({
  open,
  onOpenChange,
  boards,
  defaultBoard,
  signedIn,
  onOptimisticPost,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  boards: Board[];
  defaultBoard?: string;
  signedIn: boolean;
  onOptimisticPost?: (post: OptimisticPost | null) => void;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<{ id: string; url: string; contentType: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [boardId, setBoardId] = useState(defaultBoard ?? boards[0]?.id ?? "");
  const [similar, setSimilar] = useState<Similar>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const statuses = useStatuses();
  const { locale, t } = useLocale();
  const board = boards.find((b) => b.id === boardId) ?? boards[0];

  useEffect(() => {
    if (defaultBoard) setBoardId(defaultBoard);
  }, [defaultBoard]);

  useEffect(() => {
    const q = title.trim();
    if (q.length < 6) return setSimilar([]);
    const t = setTimeout(() => searchPosts({ data: { q } }).then(setSimilar).catch(() => setSimilar([])), 200);
    return () => clearTimeout(t);
  }, [title]);

  async function upload(list: FileList | File[]) {
    setUploadError(null);
    const room = 4 - files.length;
    const picked = Array.from(list).slice(0, Math.max(0, room));
    if (!picked.length) {
      setUploadError(t("attachment.limit"));
      return;
    }
    setUploading(true);
    for (const file of picked) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(t("attachment.tooLarge"));
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/attachments", { method: "POST", body: form });
        const data = (await res.json()) as { id?: string; url?: string; contentType?: string; filename?: string; error?: string };
        if (!res.ok || !data.id || !data.url) {
          setUploadError(data.error ?? t("attachment.failed"));
          continue;
        }
        setFiles((current) => [...current, { id: data.id!, url: data.url!, contentType: data.contentType ?? file.type, filename: data.filename ?? file.name }]);
      } catch {
        setUploadError(t("attachment.failed"));
      }
    }
    setUploading(false);
  }

  function submit() {
    if (!signedIn) {
      onOpenChange(false);
      openSignIn({ type: "compose" });
      return;
    }
    if (title.trim().length < 4) {
      toast(t("titleRequired"));
      return;
    }
    const postTitle = title.trim();
    const postBody = body;
    const postBoardId = board?.id ?? "";
    const postBoardName = board?.name ?? "";

    const tempPost: OptimisticPost = {
      id: -Date.now(),
      title: postTitle,
      excerpt: postBody.slice(0, 200) || null,
      body: postBody,
      boardId: postBoardId,
      board: { name: postBoardName },
      status: "open",
      pinned: false,
      commentCount: 0,
      voteCount: 1,
      voted: true,
      author: null,
      createdAt: new Date().toISOString(),
      tags: [],
      trending: false,
      _optimistic: true,
    };

    onOptimisticPost?.(tempPost);
    onOpenChange(false);
    setTitle("");
    setBody("");
    setFiles([]);

    createPost({ data: { boardId: postBoardId, title: postTitle, body: postBody, tags: [], attachmentIds: files.map((f) => f.id) } })
      .then((result) => {
        onOptimisticPost?.(null);
        router.invalidate();
        toast.success(result.pending ? t("submittedPending") : t("postedFirstVote"));
        navigate({ to: "/$locale/p/$id", params: { locale, id: String(result.id) } });
      })
      .catch((err) => {
        onOptimisticPost?.(null);
        toast.error(err instanceof Error ? err.message : t("couldNotPost"));
      });
  }

  function onKey(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false} className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl border-input bg-card p-0 shadow-[0_24px_64px_rgba(0,0,0,.6)] sm:max-w-[560px]">
        <div className="flex items-center justify-between pt-3.5 pr-3.5 pl-4 sm:pl-5">
          <DialogTitle className="text-[13px] font-semibold text-muted-foreground">{t("composeTitle")}</DialogTitle>
          <button type="button" onClick={() => onOpenChange(false)} className="inline-flex size-10 items-center justify-center rounded-md text-faint hover:bg-accent hover:text-foreground sm:size-[26px]">
            <XIcon className="size-[13px]" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 px-4 pt-2.5 pb-4 sm:px-5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                bodyRef.current?.focus();
              }
              onKey(e);
            }}
            maxLength={140}
            placeholder={t("postTitlePlaceholder")}
            aria-label={t("postTitleLabel")}
            className="w-full bg-transparent text-xl font-semibold tracking-[-0.02em] text-foreground outline-none placeholder:text-faint"
          />
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKey}
            rows={3}
            placeholder={t("postDetailsPlaceholder")}
            aria-label={t("postDetailsLabel")}
            className="w-full resize-none bg-transparent text-[14px] leading-[1.55] text-muted-foreground outline-none placeholder:text-faint"
          />
        </div>

        {similar.length ? (
          <div className="flex flex-col gap-1 px-4 pb-3 sm:px-5">
            <div className="flex items-center gap-1.5 pt-1 pb-1.5 font-mono text-[11px] tracking-[0.06em] text-faint uppercase">
              <LightningIcon weight="fill" className="size-3 text-status-planned" /> {t("similarHint")}
            </div>
            {similar.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                to="/$locale/p/$id"
                params={{ locale, id: String(s.id) }}
                onClick={() => onOpenChange(false)}
                className="flex min-h-11 items-center gap-2.5 rounded-lg bg-secondary px-2 py-2 text-[13px] transition-colors hover:bg-accent"
              >
                <span className="inline-flex h-[22px] items-center gap-1 rounded-md border border-input px-1.5 font-mono text-[11px] text-muted-foreground">
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1.5 7 5 3l3.5 4" />
                  </svg>
                  {s.voteCount}
                </span>
                <span className="flex-1 truncate">{s.title}</span>
                {findStatus(statuses, s.status).kind !== "open" ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-faint">
                    <span className="size-1.5 rounded-full" style={{ background: findStatus(statuses, s.status).color }} />
                    {findStatus(statuses, s.status).label}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}

        <div
          className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => e.target.files && void upload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading || files.length >= 4}
            className="inline-flex h-11 w-16 items-center justify-center rounded-md border border-input bg-secondary text-faint hover:text-foreground disabled:opacity-50"
            aria-label={t("attachment.add")}
            title={t("attachment.add")}
          >
            <ImageIcon className="size-3.5" />
          </button>
          <span className="inline-flex h-11 w-16 items-center justify-center rounded-md border border-dashed border-input text-faint">
            <PlusIcon className="size-3.5" />
          </span>
          <span className="ml-1 text-xs text-faint">{uploading ? t("attachment.uploading") : t("attachment.hint")}</span>
          {uploadError ? <span className="text-xs text-destructive">{uploadError}</span> : null}
          {files.length ? (
            <ul className="flex w-full flex-wrap gap-2 pt-1">
              {files.map((f) => (
                <li key={f.id} className="relative overflow-hidden rounded-md border border-input">
                  {f.contentType.startsWith("image/") ? (
                    <img src={f.url} alt={f.filename} className="h-16 w-24 object-cover" />
                  ) : (
                    <span className="flex h-16 w-40 items-center gap-1.5 px-2 text-[12px] text-muted-foreground">
                      <PaperclipIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{f.filename}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((x) => x.id !== f.id))}
                    className="absolute top-0.5 right-0.5 inline-flex size-5 items-center justify-center rounded-full bg-background/80 text-faint hover:text-foreground"
                    aria-label={t("attachment.remove")}
                  >
                    <XIcon className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t bg-background px-4 py-3 pr-3 sm:px-5">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-secondary pr-2 pl-2.5 text-[13px] text-foreground outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring">
                <span className="size-1.5 rounded-full bg-link" />
                {board?.name ?? t("boardFallback")}
                <CaretDownIcon className="size-2.5 text-faint" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-40">
                {boards.map((b) => (
                  <DropdownMenuItem key={b.id} onClick={() => setBoardId(b.id)}>
                    {b.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="hidden items-center gap-1.5 text-xs text-faint sm:inline-flex">
              <Kbd>⌘ ↵</Kbd> {t("postShortcut")}
            </span>
          </div>
          <LoadingButton
            onAction={submit}
            pendingLabel={t("posting")}
            successLabel={t("done")}
            errorLabel={t("tryAgain")}
            onError={(err) => toast.error(err instanceof Error ? err.message : t("couldNotPost"))}
          >
            {t("postIdea")}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
