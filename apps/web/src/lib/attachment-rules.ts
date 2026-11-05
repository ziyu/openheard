// Rules for the files people attach to a post or comment. Kept out of the
// route so the accept list can be tested without a Worker.

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_POST = 4;

export type AttachmentKind = { mime: string; ext: string };

/**
 * The declared type is a hint, never the decision: the first bytes decide what
 * the file really is, so an HTML page renamed .png cannot be stored as an image.
 */
export function sniffAttachment(bytes: Uint8Array): AttachmentKind | null {
  const at = (offset: number, signature: number[]) => signature.every((value, i) => bytes[offset + i] === value);
  const ascii = (offset: number, text: string) => text.split("").every((c, i) => bytes[offset + i] === c.charCodeAt(0));
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (at(0, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (ascii(0, "GIF8")) return { mime: "image/gif", ext: "gif" };
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return { mime: "image/webp", ext: "webp" };
  if (ascii(0, "%PDF")) return { mime: "application/pdf", ext: "pdf" };
  if (ascii(4, "ftyp")) return { mime: "video/mp4", ext: "mp4" };
  if (at(0, [0x1a, 0x45, 0xdf, 0xa3])) return { mime: "video/webm", ext: "webm" };
  // Plain text has no magic number: accept it only when it decodes as UTF-8 and
  // contains no NUL byte, which keeps binaries out.
  if (!bytes.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { mime: "text/plain; charset=utf-8", ext: "txt" };
    } catch {
      return null;
    }
  }
  return null;
}
