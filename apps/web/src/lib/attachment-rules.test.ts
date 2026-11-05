import { expect, it } from "vitest";

import { MAX_ATTACHMENT_BYTES, sniffAttachment } from "@/lib/attachment-rules";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);

it("recognises the accepted formats from their first bytes", () => {
  expect(sniffAttachment(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe("png");
  expect(sniffAttachment(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext).toBe("jpg");
  expect(sniffAttachment(ascii("GIF89a..."))?.ext).toBe("gif");
  expect(sniffAttachment(new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")]))?.ext).toBe("webp");
  expect(sniffAttachment(ascii("%PDF-1.7"))?.ext).toBe("pdf");
  expect(sniffAttachment(new Uint8Array([0, 0, 0, 0x18, ...ascii("ftypisom")]))?.ext).toBe("mp4");
  expect(sniffAttachment(bytes(0x1a, 0x45, 0xdf, 0xa3))?.ext).toBe("webm");
  expect(sniffAttachment(ascii("hello, notes"))?.mime).toBe("text/plain; charset=utf-8");
});

it("never gives markup an image or document type, and refuses binaries", () => {
  // Markup is stored only as text/plain, which the download route serves with
  // nosniff, so it can never be rendered as a page.
  expect(sniffAttachment(ascii("<html><script>alert(1)</script>"))?.mime).toBe("text/plain; charset=utf-8");
  expect(sniffAttachment(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  expect(sniffAttachment(bytes(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
});

it("keeps the documented size ceiling", () => {
  expect(MAX_ATTACHMENT_BYTES).toBe(5 * 1024 * 1024);
});
