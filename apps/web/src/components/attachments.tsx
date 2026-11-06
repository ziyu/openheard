import { DownloadSimpleIcon, PaperclipIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@openheard/ui/components/dialog";
import { useEffect, useState } from "react";

import { useLocale } from "@/lib/locale-react";
import { cn } from "@openheard/ui/lib/utils";

export type AttachmentItem = { id: string; filename: string; contentType: string; sizeBytes?: number };

const urlFor = (id: string) => `/files/${id}`;

/**
 * Attachments open in a dialog instead of a new tab: images and video render
 * inline, PDFs stream in the browser's viewer, and text is fetched and shown
 * as text so nothing is ever treated as a page. Every view keeps a link to the
 * raw file for people who need to download it.
 */
export function AttachmentList({ items, variant = "post" }: { items: AttachmentItem[]; variant?: "post" | "comment" }) {
  const { t } = useLocale();
  const [open, setOpen] = useState<AttachmentItem | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(null);
    setTextError(false);
    if (!open.contentType.startsWith("text/")) return;
    let live = true;
    fetch(urlFor(open.id))
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((body) => { if (live) setText(body.slice(0, 20000)); })
      .catch(() => { if (live) setTextError(true); });
    return () => { live = false; };
  }, [open]);

  if (!items.length) return null;
  const isImage = (a: AttachmentItem) => a.contentType.startsWith("image/");
  const isVideo = (a: AttachmentItem) => a.contentType.startsWith("video/");

  return (
    <>
      <ul className={cn("flex flex-wrap gap-2", variant === "comment" ? "pt-1" : "")}>
        {items.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setOpen(a)}
              className={cn(
                "block overflow-hidden rounded-lg border border-input text-left transition-colors hover:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                isImage(a) && "cursor-zoom-in",
              )}
              aria-label={t("attachment.open")}
            >
              {isImage(a) ? (
                <img
                  src={urlFor(a.id)}
                  alt={a.filename}
                  loading="lazy"
                  className={cn("object-cover", variant === "post" ? "max-h-64 w-auto" : "max-h-40 w-auto")}
                />
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-muted-foreground">
                  <PaperclipIcon className="size-3.5 shrink-0" />
                  <span className="max-w-[200px] truncate">{a.filename}</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="max-w-4xl gap-3 p-4">
          <div className="flex items-center justify-between gap-4 pr-8">
            <DialogTitle className="truncate text-[13px] font-semibold text-muted-foreground">{open?.filename}</DialogTitle>
            {open ? (
              <a
                href={urlFor(open.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-faint hover:text-foreground"
                aria-label={t("attachment.openInTab")}
              >
                <DownloadSimpleIcon className="size-3.5" /> {t("attachment.openInTab")}
              </a>
            ) : null}
          </div>
          <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg bg-background">
            {open && isImage(open) ? <img src={urlFor(open.id)} alt={open.filename} className="max-h-[75vh] w-auto" /> : null}
            {open && isVideo(open) ? <video src={urlFor(open.id)} controls autoPlay className="max-h-[75vh] w-full" /> : null}
            {open && open.contentType === "application/pdf" ? (
              <iframe src={urlFor(open.id)} title={open.filename} className="h-[75vh] w-full rounded-lg border-0" />
            ) : null}
            {open && open.contentType.startsWith("text/") ? (
              textError ? (
                <p className="p-6 text-sm text-destructive">{t("attachment.previewFailed")}</p>
              ) : text === null ? (
                <p className="p-6 text-sm text-faint">{t("attachment.loading")}</p>
              ) : (
                <pre className="max-h-[70vh] w-full overflow-auto p-4 text-left text-[13px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{text}</pre>
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
