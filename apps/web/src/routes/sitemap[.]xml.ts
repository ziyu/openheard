import { createDb, post } from "@openheard/db";
import { workspaceFromRequest } from "@/lib/session";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localePath } from "@/lib/locale";
import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const db = createDb();
        const origin = new URL(request.url).origin;
        const ws = await workspaceFromRequest(request);

        // One <url> per page and locale, each listing every alternate so a
        // crawler can pair the translations.
        const alternates = (path: string) =>
          SUPPORTED_LOCALES.map(
            (l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(origin + localePath(l, path))}"/>`,
          ).concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${esc(origin + localePath(DEFAULT_LOCALE, path))}"/>`).join("");
        const entry = (path: string, lastmod?: string) =>
          SUPPORTED_LOCALES.map(
            (l) => `  <url><loc>${esc(origin + localePath(l, path))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : "<changefreq>weekly</changefreq>"}${alternates(path)}</url>`,
          );

        const staticPages = ["/", "/roadmap", "/changelog", "/privacy", "/terms"];
        const urls: string[] = staticPages.flatMap((path) => entry(path));

        if (ws) {
          const posts = await db
            .select({ id: post.id, updatedAt: post.updatedAt })
            .from(post)
            .where(and(eq(post.workspaceId, ws.id), sql`${post.mergedIntoId} is null`))
            .limit(5000);

          for (const p of posts) {
            const lastmod = new Date(p.updatedAt).toISOString().split("T")[0];
            urls.push(...entry(`/p/${p.id}`, lastmod));
          }
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
