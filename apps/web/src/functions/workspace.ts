import { board, boardTranslation, createDb, membership, post, status, statusTranslation, tag, tagTranslation, workspace } from "@openheard/db";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, sql } from "drizzle-orm";

import { getCached, setCached } from "@/lib/kv-cache";
import { rootDomain, sessionMiddleware } from "@/lib/session";
import { displayWorkspaceName } from "@/lib/site-brand";
import type { Locale } from "@/lib/locale";
import type { STATUS_KINDS } from "@openheard/db/schema/feedback";

type WorkspaceCache = {
  boards: { id: string; name: string; description: string | null; translated: number; count: number }[];
  tags: { id: string; name: string; translated: number }[];
  statuses: {
    workspaceId: string;
    key: string;
    label: string;
    color: string;
    kind: (typeof STATUS_KINDS)[number];
    position: number;
    onRoadmap: boolean;
    translated: number;
  }[];
  statusCounts: Record<string, number>;
  total: number;
};

async function fetchWorkspaceData(wsId: string, locale: Locale): Promise<WorkspaceCache> {
  // The locale is part of the key: one cache entry per language, never mixed.
  const cacheKey = `workspace:${wsId}:${locale}`;
  const cached = await getCached<WorkspaceCache>(cacheKey);
  if (cached) return cached;

  const db = createDb();
  const [boards, tags, statuses, statusRows] = await db.batch([
    db
      .select({
        id: board.id,
        // Translation first, the workspace baseline when this locale is missing.
        name: sql<string>`coalesce(${boardTranslation.name}, ${board.name})`,
        description: sql<string | null>`coalesce(${boardTranslation.description}, ${board.description})`,
        translated: sql<number>`case when ${boardTranslation.name} is null then 0 else 1 end`,
        count: count(post.id),
      })
      .from(board)
      .leftJoin(boardTranslation, and(eq(boardTranslation.boardId, board.id), eq(boardTranslation.locale, locale)))
      .leftJoin(post, eq(post.boardId, board.id))
      .where(eq(board.workspaceId, wsId))
      .groupBy(board.id)
      .orderBy(asc(board.position)),
    db
      .select({
        id: tag.id,
        name: sql<string>`coalesce(${tagTranslation.name}, ${tag.name})`,
        translated: sql<number>`case when ${tagTranslation.name} is null then 0 else 1 end`,
      })
      .from(tag)
      .leftJoin(tagTranslation, and(eq(tagTranslation.tagId, tag.id), eq(tagTranslation.locale, locale)))
      .where(eq(tag.workspaceId, wsId))
      .orderBy(asc(tag.name)),
    db
      .select({
        workspaceId: status.workspaceId,
        key: status.key,
        label: sql<string>`coalesce(${statusTranslation.label}, ${status.label})`,
        translated: sql<number>`case when ${statusTranslation.label} is null then 0 else 1 end`,
        color: status.color,
        kind: status.kind,
        position: status.position,
        onRoadmap: status.onRoadmap,
      })
      .from(status)
      .leftJoin(statusTranslation, and(
        eq(statusTranslation.workspaceId, status.workspaceId),
        eq(statusTranslation.key, status.key),
        eq(statusTranslation.locale, locale),
      ))
      .where(eq(status.workspaceId, wsId))
      .orderBy(asc(status.position)),
    db.select({ status: post.status, count: count() }).from(post).where(eq(post.workspaceId, wsId)).groupBy(post.status),
  ] as const);
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, r.count])) as Record<string, number>;
  const total = statusRows.reduce((n, r) => n + r.count, 0);

  const data: WorkspaceCache = { boards, tags, statuses, statusCounts, total };
  void setCached(cacheKey, data);
  return data;
}

// Everything the shell needs on every page: workspace, boards with counts,
// tags, status counts, and who is looking.
export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    const ws = { ...context.workspace, name: displayWorkspaceName(context.workspace.name) };

    if (context.marketing) {
      const ownWorkspaces = context.user
        ? await createDb()
            .select({ id: workspace.id, name: workspace.name })
            .from(membership)
            .innerJoin(workspace, eq(workspace.id, membership.workspaceId))
            .where(eq(membership.userId, context.user.id))
            .orderBy(membership.createdAt)
            .then((rows: { id: string; name: string }[]) => rows.filter((r) => r.id !== "default"))
        : [];
      return {
        workspace: ws,
        rootDomain: await rootDomain(),
        locale: context.locale,
        marketing: true as const,
        boards: [] as WorkspaceCache["boards"],
        tags: [] as WorkspaceCache["tags"],
        statuses: [] as WorkspaceCache["statuses"],
        statusCounts: {} as Record<string, number>,
        total: 0,
        user: context.user,
        ownWorkspaces,
      };
    }

    const data = await fetchWorkspaceData(ws.id, context.locale);
    return {
      workspace: ws,
      rootDomain: await rootDomain(),
      locale: context.locale,
      marketing: context.marketing,
      ...data,
      user: context.user,
    };
  });
