// Client-side upload helper shared by the post composer and the comment box.
export type UploadedAttachment = {
  id: string;
  url: string;
  contentType: string;
  filename: string;
  sizeBytes?: number;
};

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_PER_POST = 4;
export const MAX_PER_COMMENT = 2;

/** Upload one file; the caller decides how many it keeps and what to show on error. */
export async function uploadAttachment(file: File): Promise<{ attachment?: UploadedAttachment; error?: string }> {
  if (file.size === 0) return { error: "empty" };
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: "tooLarge" };
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch("/api/attachments", { method: "POST", body: form });
    const data = (await res.json()) as { id?: string; url?: string; contentType?: string; filename?: string; sizeBytes?: number; error?: string };
    if (!res.ok || !data.id || !data.url) return { error: data.error ?? "failed" };
    return { attachment: { id: data.id, url: data.url, contentType: data.contentType ?? file.type, filename: data.filename ?? file.name, sizeBytes: data.sizeBytes ?? file.size } };
  } catch {
    return { error: "failed" };
  }
}
