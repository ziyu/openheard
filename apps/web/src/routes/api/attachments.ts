import { attachment, createDb } from "@openheard/db";
import { env } from "@openheard/env/server";
import { createFileRoute } from "@tanstack/react-router";

import { MAX_ATTACHMENT_BYTES, sniffAttachment as sniff } from "@/lib/attachment-rules";
import { getSessionContext } from "@/lib/session";

const MAX_BYTES = MAX_ATTACHMENT_BYTES;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export const Route = createFileRoute("/api/attachments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { user, workspace } = await getSessionContext(request);
        if (!user) return json({ error: "Sign in to upload files." }, 401);
        if (workspace.whoCanPost === "members" && user.role === "guest") return json({ error: "Only members can upload files." }, 403);

        const bucket = (env as unknown as { ATTACHMENTS?: R2Bucket }).ATTACHMENTS;
        if (!bucket) return json({ error: "Uploads are not configured." }, 503);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ error: "Expected a multipart upload." }, 400);
        }
        const file = form.get("file");
        if (!(file instanceof File)) return json({ error: "Attach a file." }, 400);
        if (file.size === 0) return json({ error: "That file is empty." }, 400);
        if (file.size > MAX_BYTES) return json({ error: "Files must be 5 MB or smaller." }, 413);

        const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
        const kind = sniff(head);
        if (!kind) return json({ error: "Only images, PDF, plain text and short videos are supported." }, 415);

        const id = crypto.randomUUID();
        const key = `ws/${workspace.id}/uploads/${id}.${kind.ext}`;
        await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: kind.mime } });

        await createDb().insert(attachment).values({
          id,
          workspaceId: workspace.id,
          uploaderId: user.id,
          r2Key: key,
          filename: file.name.slice(0, 200) || `file.${kind.ext}`,
          contentType: kind.mime,
          sizeBytes: file.size,
        });

        return json({ id, url: `/files/${id}`, contentType: kind.mime, sizeBytes: file.size, filename: file.name });
      },
    },
  },
});
