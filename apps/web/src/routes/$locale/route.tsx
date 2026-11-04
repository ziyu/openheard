import { createFileRoute, notFound } from "@tanstack/react-router";

import { isLocale } from "@/lib/locale";

/**
 * Every public page lives under /<locale>/. The locale is a route param so the
 * server knows it before rendering, which is what makes SSR, hreflang and
 * shared links language-correct.
 */
export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.locale)) throw notFound();
  },
});
