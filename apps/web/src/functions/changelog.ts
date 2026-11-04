import { activity, changelogEntry, changelogPost, changelogTranslation, createDb, post } from "@openheard/db";
import { purgeWorkspaceCache } from "@/lib/cache";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { statusOfKind } from "@/lib/status-db";
import { requireAdmin, sessionMiddleware } from "@/lib/session";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/locale";

export const listChangelog = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    const db = createDb();
    const admin = context.user?.role === "admin";
    const locale = context.locale;
    const rows = await db
      .select({
        entry: changelogEntry,
        // Translation wins; a missing locale falls back to the baseline entry.
        title: sql<string>`coalesce(${changelogTranslation.title}, ${changelogEntry.title})`,
        body: sql<string>`coalesce(${changelogTranslation.body}, ${changelogEntry.body})`,
        translated: sql<number>`case when ${changelogTranslation.title} is null then 0 else 1 end`,
      })
      .from(changelogEntry)
      .leftJoin(changelogTranslation, and(eq(changelogTranslation.entryId, changelogEntry.id), eq(changelogTranslation.locale, locale)))
      .where(and(eq(changelogEntry.workspaceId, context.workspace.id), admin ? undefined : isNotNull(changelogEntry.publishedAt)))
      .orderBy(desc(sql`coalesce(${changelogEntry.publishedAt}, ${changelogEntry.createdAt})`));
    const entries = await db.query.changelogEntry.findMany({
      where: inArray(changelogEntry.id, rows.length ? rows.map((r) => r.entry.id) : [-1]),
      with: { posts: { with: { post: { columns: { id: true, title: true, voteCount: true } } } } },
    });
    const byId = new Map(entries.map((e) => [e.id, e.posts.map((p) => p.post)]));
    return rows.map((r) => ({ ...r.entry, title: r.title, body: r.body, translated: r.translated, posts: byId.get(r.entry.id) ?? [] }));
  });

export const saveChangelog = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((d: unknown) =>
    z
      .object({
        id: z.number().int().optional(),
        title: z.string().trim().min(3).max(140),
        body: z.string().trim().max(20000).default(""),
        version: z.string().trim().max(40).optional(),
        postIds: z.array(z.number().int()).max(50).default([]),
        publish: z.boolean().default(true),
        locale: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const u = requireAdmin(context.user);
    const db = createDb();
    const ws = context.workspace.id;
    const baseline = isLocale(context.workspace.defaultLocale) ? context.workspace.defaultLocale : DEFAULT_LOCALE;
    const locale: Locale = isLocale(data.locale) ? data.locale : context.locale;
    let id = data.id;
    const values = { workspaceId: ws, title: data.title, body: data.body, version: data.version || null, authorId: u.id, publishedAt: data.publish ? new Date() : null };
    // Entry and post ids are global. A scoped UPDATE that matches nothing is
    // silent, so prove ownership of everything this touches before writing.
    if (id) {
      const [owned] = await db.select({ id: changelogEntry.id }).from(changelogEntry).where(and(eq(changelogEntry.id, id), eq(changelogEntry.workspaceId, ws))).limit(1);
      if (!owned) throw new Error("Changelog entry not found");
    }
    const postIds = [...new Set(data.postIds)];
    if (postIds.length) {
      const owned = await db.select({ id: post.id }).from(post).where(and(eq(post.workspaceId, ws), inArray(post.id, postIds)));
      if (owned.length !== postIds.length) throw new Error("Post not found");
    }
    if (id) {
      if (locale === baseline) {
        await db.update(changelogEntry).set(values).where(and(eq(changelogEntry.id, id), eq(changelogEntry.workspaceId, ws)));
      } else {
        // Edits outside the baseline language leave the entry itself alone.
        await db
          .insert(changelogTranslation)
          .values({ entryId: id, locale, title: data.title, body: data.body })
          .onConflictDoUpdate({
            target: [changelogTranslation.entryId, changelogTranslation.locale],
            set: { title: data.title, body: data.body },
          });
      }
      await db.delete(changelogPost).where(eq(changelogPost.entryId, id));
    } else {
      [{ id }] = await db.insert(changelogEntry).values(values).returning({ id: changelogEntry.id });
      if (locale !== baseline) {
        await db.insert(changelogTranslation).values({ entryId: id!, locale, title: data.title, body: data.body }).onConflictDoNothing();
      }
    }
    if (postIds.length) {
      await db.insert(changelogPost).values(postIds.map((postId) => ({ entryId: id!, postId })));
      if (data.publish) {
        // Shipping closes the loop: linked posts move to done.
        const linked = await db.select({ id: post.id, status: post.status }).from(post).where(and(eq(post.workspaceId, ws), inArray(post.id, postIds)));
        const done = (await statusOfKind(db, ws, "done"))?.key ?? "done";
        const toShip = linked.filter((p) => p.status !== done);
        if (toShip.length) {
          await db.update(post).set({ status: done, statusChangedAt: new Date() }).where(inArray(post.id, toShip.map((p) => p.id)));
          await db.insert(activity).values(toShip.map((p) => ({ postId: p.id, actorId: u.id, type: "status" as const, fromStatus: p.status, toStatus: done, note: `shipped in ${data.version || data.title}` })));
        }
      }
    }
    purgeWorkspaceCache(new URL(getRequest().url).origin);
    return { id };
  });

export const deleteChangelog = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((d: unknown) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    requireAdmin(context.user);
    await createDb().delete(changelogEntry).where(and(eq(changelogEntry.id, data.id), eq(changelogEntry.workspaceId, context.workspace.id)));
    purgeWorkspaceCache(new URL(getRequest().url).origin);
    return { ok: true };
  });
