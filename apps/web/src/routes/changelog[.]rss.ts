import { changelogEntry, changelogTranslation, createDb } from "@openheard/db";
import { workspaceFromRequest } from "@/lib/session";
import { displayWorkspaceName } from "@/lib/site-brand";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isLocale, localePath, translate } from "@/lib/locale";
import { requestLocale } from "@/lib/session";
import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

// Published changelog entries as RSS 2.0. Readers, Slack, and Zapier all eat this.
export const Route = createFileRoute("/changelog.rss")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const db = createDb();
        const ws = await workspaceFromRequest(request);
        if (!ws) return new Response("Not found", { status: 404 });
        // The feed follows ?locale=, then the saved choice, then the baseline.
        const requested = new URL(request.url).searchParams.get("locale");
        const locale = isLocale(requested)
          ? requested
          : requestLocale(request, isLocale(ws.defaultLocale) ? ws.defaultLocale : DEFAULT_LOCALE);
        const entries = await db
          .select({
            entry: changelogEntry,
            title: sql<string>`coalesce(${changelogTranslation.title}, ${changelogEntry.title})`,
            body: sql<string>`coalesce(${changelogTranslation.body}, ${changelogEntry.body})`,
          })
          .from(changelogEntry)
          .leftJoin(changelogTranslation, and(eq(changelogTranslation.entryId, changelogEntry.id), eq(changelogTranslation.locale, locale)))
          .where(and(eq(changelogEntry.workspaceId, ws.id), isNotNull(changelogEntry.publishedAt)))
          .orderBy(desc(changelogEntry.publishedAt))
          .limit(50);
        const origin = new URL(request.url).origin;
        const changelogHref = origin + localePath(locale, "/changelog");
        const name = displayWorkspaceName(ws.name);
        const items = entries
          .map(
            (e) => `    <item>
      <title>${esc(e.entry.version ? `${e.entry.version} · ${e.title}` : e.title)}</title>
      <link>${changelogHref}</link>
      <guid isPermaLink="false">changelog-${e.entry.id}</guid>
      <pubDate>${new Date(e.entry.publishedAt!).toUTCString()}</pubDate>
      <description>${esc(e.body)}</description>
    </item>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(name)} ${esc(translate(locale, "titleChangelog"))}</title>
    <link>${changelogHref}</link>
    <language>${locale}</language>
    <description>${esc(translate(locale, "titleChangelog"))}</description>
    ${SUPPORTED_LOCALES.map((l) => `<atom:link rel="alternate" hreflang="${l}" href="${origin}/changelog.rss?locale=${l}"/>`).join("\n    ")}
${items}
  </channel>
</rss>`;
        return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
      },
    },
  },
});
