import { DownloadSimpleIcon, PaperclipIcon, PlayIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@openheard/ui/components/dialog";
import { useEffect, useState } from "react";

import { useLocale } from "@/lib/locale-react";
import { cn } from "@openheard/ui/lib/utils";

export type AttachmentItem = { id: string; filename: string; contentType: string; sizeBytes?: number };

const urlFor = (id: string) => `/files/${id}`;

/** A real frame beats a filename: sample a few timestamps and keep the least blank one. */
function VideoTile({ url, filename, durationLabel, height }: { url: string; filename: string; durationLabel?: string; height: number }) {
  const [poster, setPoster] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(durationLabel ?? null);
  // Portrait clips get a portrait tile instead of a letterboxed landscape one.
  const [ratio, setRatio] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    let live = true;
    let best: { score: number; dataUrl: string } | null = null;
    let index = 0;
    // A teaser often opens on a blank card, so try a few points and keep the
    // frame with the most variation instead of the very first one.
    const spots = [0.25, 0.5, 0.72];

    const draw = () => {
      if (!live) return;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const total = Math.round(video.duration);
        setDuration(`${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`);
      }
      if (video.videoWidth) {
        setRatio(`${video.videoWidth} / ${video.videoHeight}`);
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          let score = 0;
          try {
            const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let sum = 0;
            let sumSq = 0;
            const step = Math.max(4, Math.floor(data.length / 4096 / 4) * 4);
            let count = 0;
            for (let i = 0; i < data.length; i += step) {
              const luma = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
              sum += luma;
              sumSq += luma * luma;
              count++;
            }
            const mean = sum / Math.max(1, count);
            score = sumSq / Math.max(1, count) - mean * mean;
          } catch {
            score = 1; // unreadable pixels still make a usable poster
          }
          if (!best || score > best.score) {
            try { best = { score, dataUrl: canvas.toDataURL("image/jpeg", 0.72) }; } catch { /* tainted: keep the previous frame */ }
          }
        }
      }
      index += 1;
      if (index < spots.length) {
        try { video.currentTime = (video.duration || 1) * spots[index]!; } catch { finish(); }
      } else {
        finish();
      }
    };

    const finish = () => {
      if (!live) return;
      setPoster(best ? best.dataUrl : null);
    };

    const start = () => {
      try { video.currentTime = (video.duration || 1) * spots[0]!; } catch { finish(); }
    };

    video.addEventListener("loadeddata", start);
    video.addEventListener("seeked", draw);
    return () => {
      live = false;
      video.removeEventListener("loadeddata", start);
      video.removeEventListener("seeked", draw);
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);

  return (
    <span className="relative block overflow-hidden rounded-lg border border-input bg-black/40" style={{ height, aspectRatio: ratio ?? "16 / 9" }}>
      {poster ? (
        <img src={poster} alt={filename} className="h-full w-full object-contain" />
      ) : (
        <span className="block h-full w-full" aria-hidden />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <PlayIcon weight="fill" className="size-4 translate-x-[1px]" />
        </span>
      </span>
      {duration ? <span className="absolute right-1.5 bottom-1.5 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-white">{duration}</span> : null}
    </span>
  );
}

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
              ) : isVideo(a) ? (
                <VideoTile
                  url={urlFor(a.id)}
                  filename={a.filename}
                  height={variant === "post" ? 160 : 96}
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
