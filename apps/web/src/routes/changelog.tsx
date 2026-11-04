import { createFileRoute, redirect } from "@tanstack/react-router";

import { DEFAULT_LOCALE } from "@/lib/locale";

// Legacy unprefixed URL: keep old share links and search results working.
export const Route = createFileRoute("/changelog")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/${DEFAULT_LOCALE}/changelog${location.searchStr}`, statusCode: 308 });
  },
});
