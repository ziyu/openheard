import { createFileRoute, redirect } from "@tanstack/react-router";

import { DEFAULT_LOCALE } from "@/lib/locale";

// Legacy unprefixed post URL.
export const Route = createFileRoute("/p/$id")({
  beforeLoad: ({ params, location }) => {
    throw redirect({ href: `/${DEFAULT_LOCALE}/p/${params.id}${location.searchStr}`, statusCode: 308 });
  },
});
