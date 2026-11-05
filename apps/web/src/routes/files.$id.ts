import { attachment, createDb, post } from "@openheard/db";
import { env } from "@openheard/env/server";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";

import { getSessionContext } from "@/lib/session";
import { listStatuses } from "@/lib/status-db";

/**
 * Attachments inherit the visibility of the post they belong to. Anything still
 * under review is only readable by its author and by admins, and is never
 * cached; everything published is immutable for a year.
 */
export const Route = createFileRoute("/files/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { user, workspace } = await getSessionContext(request);
        const db = createDb();
        const [row] = await db
          .select()
          .from(attachment)
          .where(and(eq(attachment.id, params.id), eq(attachment.workspaceId, workspace.id)))
          .limit(1);
        if (!row || row.state !== "ready") return new Response("Not found", { status: 404 });

        let cacheControl = "public, max-age=31536000, immutable";
        if (row.postId) {
          const [p] = await db
            .select({ status: post.status, authorId: post.authorId })
            .from(post)
            .where(and(eq(post.id, row.postId), eq(post.workspaceId, workspace.id)))
            .limit(1);
          if (!p) return new Response("Not found", { status: 404 });
          if (workspace.requireApproval) {
            const statuses = await listStatuses(db, workspace.id);
            const kind = statuses.find((s) => s.key === p.status)?.kind;
            const allowed = user && (user.role === "admin" || user.id === p.authorId);
            if (kind === "review" && !allowed) return new Response("Not found", { status: 404 });
            if (kind === "review") cacheControl = "private, no-store";
          }
        }

        const bucket = (env as unknown as { ATTACHMENTS?: R2Bucket }).ATTACHMENTS;
        if (!bucket) return new Response("Not found", { status: 404 });
        const object = await bucket.get(row.r2Key);
        if (!object) return new Response("Not found", { status: 404 });

        const name = row.filename.replace(/[^\w.\- ]+/g, "_");
        return new Response(object.body, {
          headers: {
            "content-type": row.contentType,
            "content-length": String(row.sizeBytes),
            "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
            "x-content-type-options": "nosniff",
            "cache-control": cacheControl,
          },
        });
      },
    },
  },
});
