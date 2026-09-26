import { createFileRoute, redirect, useLoaderData } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth-form";
import Logo from "@/components/logo";
import { myWorkspaces } from "@/functions/admin";
import { getUser } from "@/functions/get-user";
import { getWorkspace } from "@/functions/workspace";
import { safeReturnTo } from "@/lib/external-sso";
import { workspaceUrl } from "@/lib/workspace-url";
import { SITE_NAME } from "@/lib/site-brand";

type Search = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const [user, root] = await Promise.all([getUser(), getWorkspace()]);
    if (!user) return;
    if ((search as Search).redirect) throw redirect({ to: safeReturnTo((search as Search).redirect!, "https://openheard.invalid/login") });
    if (!root.marketing) throw redirect({ to: "/" });
    const own = (await myWorkspaces()).filter((w) => w.id !== "default");
    if (own.length > 0) throw redirect({ href: workspaceUrl(own[own.length - 1]!.id, root.rootDomain, "/dashboard") });
    throw redirect({ to: user.role === "admin" ? "/new" : "/" });
  },
  head: () => ({ meta: [{ title: `Sign in · ${SITE_NAME}` }] }),
  component: LoginPage,
});

function LoginPage() {
  const root = useLoaderData({ from: "__root__" });
  const search = Route.useSearch();
  const callbackURL = search.redirect ?? (root.marketing ? "/new" : "/");

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="flex w-full max-w-[380px] flex-col items-center gap-6">
        <Logo size={32} />
        <AuthForm wsName={root.workspace?.name ?? SITE_NAME} callbackURL={callbackURL} />
      </div>
    </main>
  );
}
