import { Button } from "@openheard/ui/components/button";
import { ArrowLeftIcon, ArrowSquareOutIcon, CheckCircleIcon, CircleDashedIcon, ImageIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/admin/panel";
import { Avatar } from "@/components/bits";
import { DashboardErrorState, DashboardPanelSkeleton } from "@/components/states";
import { deleteChangelog, listChangelog, saveChangelog } from "@/functions/changelog";
import { searchPosts } from "@/functions/posts";
import { ago, fullDate } from "@/lib/time";
import { cn } from "@openheard/ui/lib/utils";
import { SITE_NAME } from "@/lib/site-brand";
import { DEFAULT_LOCALE, translate, type Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";

type Entry = Awaited<ReturnType<typeof listChangelog>>[number];
type Search = { entry?: number | "new" };

export const Route = createFileRoute("/dashboard/changelog")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    entry: s.entry === "new" ? "new" : typeof s.entry === "number" ? s.entry : typeof s.entry === "string" && /^\d+$/.test(s.entry) ? Number(s.entry) : undefined,
  }),
  loaderDeps: () => ({}),
  loader: () => listChangelog(),
  head: ({ matches }) => {
    const locale = (matches[0]?.loaderData as { locale?: Locale } | undefined)?.locale ?? DEFAULT_LOCALE;
    return { meta: [{ title: `${translate(locale, "dash.shell.changelog")} · ${SITE_NAME}` }] };
  },
  component: ChangelogPage,
  errorComponent: ({ error }) => <DashboardErrorState message={(error as Error)?.message} retry="/dashboard/changelog" />,
  pendingComponent: DashboardPanelSkeleton,
});

// A plain list, and a document-style editor when you open an entry.
function ChangelogPage() {
  const entries = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/changelog" });
  const root = useLoaderData({ from: "__root__" });
  const { locale, t } = useLocale();
  const open = search.entry === "new" ? "new" : entries.find((e) => e.id === search.entry);

  if (open) {
    return <Editor key={open === "new" ? "new" : open.id} entry={open === "new" ? null : open} onClose={() => navigate({ search: {} })} />;
  }

  return (
    <Panel
      title={t("dash.shell.changelog")}
      actions={
        <Button size="sm" arrow onClick={() => navigate({ search: { entry: "new" } })}>
          {t("dash.ops.changelog.newEntry")}
        </Button>
      }
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
          <p className="text-[15px] font-semibold">{t("nothingShippedYet")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("dash.ops.changelog.emptyBody")}</p>
          <Button size="sm" arrow className="mt-2" onClick={() => navigate({ search: { entry: "new" } })}>
            {t("dash.ops.changelog.newEntry")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col">
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => navigate({ search: { entry: e.id } })}
              className="flex h-13 shrink-0 items-center gap-3.5 border-b px-5 text-left hover:bg-card/60"
            >
              {e.publishedAt ? <CheckCircleIcon weight="fill" className="size-5 shrink-0 text-status-shipped" /> : <CircleDashedIcon className="size-5 shrink-0 text-status-planned" />}
              <span className="min-w-0 truncate text-[16px] font-medium">{e.title}</span>
              {e.version ? <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 font-mono text-[12px] text-muted-foreground">{e.version}</span> : null}
              {!e.publishedAt ? <span className="shrink-0 rounded-md bg-status-planned/15 px-2 py-0.5 text-[12px] font-medium text-status-planned">{t("dash.ops.changelog.draft")}</span> : null}
              {e.posts.length ? (
                <span className="shrink-0 text-[12px] text-faint">
                  {e.posts.length} {t(e.posts.length === 1 ? "post" : "posts")}
                </span>
              ) : null}
              <span className="flex-1" />
              <span className="text-[12px] text-faint tabular-nums" title={fullDate(e.publishedAt ?? e.createdAt, locale)}>
                {ago(e.publishedAt ?? e.createdAt, locale)}
              </span>
              <Avatar name={root.user?.name ?? "?"} image={root.user?.image} size={24} />
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Editor({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [version, setVersion] = useState(entry?.version ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [posts, setPosts] = useState<{ id: number; title: string }[]>(entry?.posts ?? []);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: number; title: string }[]>([]);
  const [linking, setLinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const published = !!entry?.publishedAt;
  const dirty = title !== (entry?.title ?? "") || version !== (entry?.version ?? "") || body !== (entry?.body ?? "") || posts.map((p) => p.id).join() !== (entry?.posts ?? []).map((p) => p.id).join();

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => searchPosts({ data: { q } }).then((r) => setResults(r.filter((x) => !posts.some((p) => p.id === x.id)))), 150);
    return () => clearTimeout(t);
  }, [q, posts]);

  async function save(publish: boolean) {
    if (title.trim().length < 3) return toast(t("titleRequired"));
    setBusy(true);
    try {
      const { id } = await saveChangelog({ data: { id: entry?.id, title, version, body, postIds: posts.map((p) => p.id), publish } });
      await router.invalidate();
      toast.success(publish ? (published ? t("dash.ops.changelog.saved") : t("dash.ops.changelog.publishedToast")) : published ? t("dash.ops.changelog.unpublished") : t("dash.ops.changelog.draftSaved"));
      if (!entry && id) router.navigate({ to: "/dashboard/changelog", search: { entry: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dash.ops.changelog.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!entry || !confirm(t("dash.ops.changelog.confirmDelete").replace("{title}", entry.title))) return;
    await deleteChangelog({ data: { id: entry.id } });
    await router.invalidate();
    onClose();
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col py-3 pr-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background animate-in fade-in-0 duration-150 motion-reduce:animate-none">
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b pr-3 pl-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" title={t("dash.ops.changelog.back")}>
              <ArrowLeftIcon className="size-4" />
            </button>
            <span className="text-[15px] font-semibold">{entry ? entry.title : t("dash.ops.changelog.newEntry")}</span>
            <span className={cn("ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium", published ? "bg-status-shipped/15 text-status-shipped" : "bg-status-planned/15 text-status-planned")}>
              {published ? t("dash.ops.changelog.publishedAgo").replace("{ago}", ago(entry!.publishedAt!, locale)) : t("dash.ops.changelog.draft")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {entry ? (
              <Button size="sm" variant="ghost" onClick={remove} title={t("dash.ops.changelog.delete")}>
                <TrashIcon className="size-3.5" />
              </Button>
            ) : null}
            {published ? (
              <a href="/changelog" target="_blank" rel="noreferrer" className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                <ArrowSquareOutIcon className="size-3.5" /> {t("dash.ops.changelog.view")}
              </a>
            ) : null}
            {published ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => save(false)}>
                {t("dash.ops.changelog.unpublish")}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled={busy || !dirty} onClick={() => save(false)}>
                {t("dash.ops.changelog.saveDraft")}
              </Button>
            )}
            <Button size="sm" arrow disabled={busy || (published && !dirty)} onClick={() => save(true)}>
              {published ? t("dash.ops.changelog.save") : t("dash.ops.changelog.publish")}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-6 py-10">
            <div className="flex items-center gap-2">
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0"
                aria-label={t("dash.ops.changelog.version")}
                className="h-7 w-24 rounded-md border border-transparent bg-transparent px-2 font-mono text-[12px] text-muted-foreground outline-none placeholder:text-faint hover:border-input focus:border-ring/60"
              />
              <button type="button" onClick={() => toast(t("dash.ops.changelog.coversToast"))} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-faint hover:bg-accent hover:text-foreground">
                <ImageIcon className="size-3.5" /> {t("dash.ops.changelog.addCover")}
              </button>
            </div>
            <input
              autoFocus={!entry}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  bodyRef.current?.focus();
                }
              }}
              placeholder={t("dash.ops.changelog.titlePlaceholder")}
              aria-label={t("dash.ops.changelog.titleLabel")}
              className="w-full bg-transparent text-[32px] font-semibold tracking-[-0.02em] outline-none placeholder:text-faint"
            />
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("dash.ops.changelog.bodyPlaceholder")}
              aria-label={t("dash.ops.changelog.bodyLabel")}
              className="min-h-[280px] w-full resize-none bg-transparent text-[16px] leading-[1.65] text-foreground/90 outline-none placeholder:text-faint"
            />

            <div className="flex flex-col gap-3 border-t pt-6">
              <div className="text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">{t("dash.ops.changelog.shipsThese")}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {posts.map((p) => (
                  <span key={p.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-input pr-1.5 pl-2.5 text-[13px] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-status-shipped" />
                    {p.title}
                    <button type="button" onClick={() => setPosts((ps) => ps.filter((x) => x.id !== p.id))} className="inline-flex size-5 items-center justify-center rounded-full text-faint hover:bg-accent hover:text-foreground" title={t("dash.ops.changelog.remove")}>
                      <XIcon className="size-2.5" />
                    </button>
                  </span>
                ))}
                {linking ? (
                  <div className="relative">
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onBlur={() => setTimeout(() => setLinking(false), 150)}
                      onKeyDown={(e) => e.key === "Escape" && setLinking(false)}
                      placeholder={t("searchPosts")}
                      aria-label={t("dash.ops.changelog.searchLabel")}
                      className="h-7 w-56 rounded-full border border-input bg-card px-3 text-[13px] outline-none placeholder:text-faint focus:border-ring/60"
                    />
                    {results.length ? (
                      <div className="absolute top-8 left-0 z-10 flex w-80 flex-col overflow-hidden rounded-lg border bg-popover shadow-md animate-in fade-in-0 zoom-in-95 duration-100">
                        {results.slice(0, 6).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setPosts((ps) => [...ps, r]);
                              setQ("");
                              setLinking(false);
                            }}
                            className="truncate px-3 py-2 text-left text-[13px] hover:bg-accent"
                          >
                            {r.title}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button type="button" onClick={() => setLinking(true)} className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-input px-2.5 text-[13px] text-faint hover:border-foreground/40 hover:text-foreground">
                    <PlusIcon className="size-3" /> {t("dash.ops.changelog.linkPost")}
                  </button>
                )}
              </div>
              <p className="text-[12px] text-faint">{t("dash.ops.changelog.footer")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
