import { Button } from "@openheard/ui/components/button";
import { CheckIcon } from "@phosphor-icons/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SectionHead } from "@/components/admin/panel";
import { getBilling, openPortal, startCheckout } from "@/functions/billing";
import { asLocale, translate } from "@/lib/locale";
import { useLocale } from "@/lib/locale-react";
import { PLANS } from "@/lib/plans";
import { fullDate } from "@/lib/time";
import { PageHead } from "@/routes/dashboard/settings";
import { cn } from "@openheard/ui/lib/utils";

export const Route = createFileRoute("/dashboard/settings/billing")({
  validateSearch: (s: Record<string, unknown>) => ({ checkout: s.checkout === "success" ? ("success" as const) : undefined }),
  loader: () => getBilling(),
  head: ({ matches }) => ({ meta: [{ title: translate(asLocale((matches[0]?.loaderData as { locale?: string } | undefined)?.locale), "dash.billing.headBilling") }] }),
  component: Billing,
});

function Billing() {
  const b = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const { locale, t } = useLocale();
  const [interval, setBillingInterval] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);

  // Stripe redirects back before the webhook lands. Poll a few times so the page flips to Pro on its own.
  useEffect(() => {
    if (search.checkout !== "success" || b.plan === "pro") return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      router.invalidate();
      if (tries >= 10) clearInterval(timer);
    }, 1500);
    return () => clearInterval(timer);
  }, [search.checkout, b.plan, router]);

  async function go(fn: () => Promise<{ url: string }>) {
    setBusy(true);
    try {
      const { url } = await fn();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dash.billing.checkoutFailed"));
      setBusy(false);
    }
  }

  const pro = b.plan === "pro";
  const price = interval === "month" ? PLANS.pro.monthly : PLANS.pro.yearly;

  return (
    <>
      <PageHead title={t("dash.shell.billing")} sub={t("dash.billing.sub")} />

      <SectionHead title={t("dash.billing.sectionCurrentPlan")} />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[15px] font-semibold">{pro ? t("dash.billing.planPro") : t("dash.billing.planFree")}</div>
          <div className="text-[13px] text-muted-foreground">
            {t("dash.billing.workspacesUsed").replace("{owned}", String(b.owned)).replace("{limit}", String(b.limit))}
            {pro && b.renewsAt ? <span className="text-faint"> {t("dash.billing.renewsOn").replace("{date}", fullDate(b.renewsAt, locale))}</span> : null}
          </div>
        </div>
        {pro ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => go(() => openPortal())}>
            {t("dash.billing.manageSubscription")}
          </Button>
        ) : b.hasCustomer ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => go(() => openPortal())}>
            {t("dash.billing.billingHistory")}
          </Button>
        ) : null}
      </div>

      {!pro ? (
        <>
          <SectionHead
            title={t("dash.billing.upgradeToPro")}
            right={
              <div className="flex gap-0.5 rounded-md bg-secondary p-0.5">
                {(["month", "year"] as const).map((i) => (
                  <button key={i} type="button" onClick={() => setBillingInterval(i)} className={cn("rounded-md px-2.5 py-1 text-xs", interval === i ? "bg-accent text-foreground" : "text-faint hover:text-muted-foreground")}>
                    {i === "month" ? t("dash.billing.monthly") : t("dash.billing.yearlySave")}
                  </button>
                ))}
              </div>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Plan
              name={t("dash.billing.planFree")}
              price="$0"
              per={t("dash.billing.perForever")}
              current={b.plan === "free"}
              features={[
                t("dash.billing.featureWorkspaces").replace("{count}", String(PLANS.free.workspaces)),
                t("dash.billing.featureFreePosts"),
                t("dash.billing.featureFreePublic"),
                t("dash.billing.featureFreeApi"),
              ]}
            />
            <Plan
              name={t("dash.billing.planPro")}
              price={`$${price}`}
              per={interval === "month" ? t("dash.billing.perMonth") : t("dash.billing.perYear")}
              highlight
              features={[t("dash.billing.featureWorkspaces").replace("{count}", String(PLANS.pro.workspaces)), t("dash.billing.featureProEverything"), t("dash.billing.featureProSupport")]}
              action={
                <Button size="sm" full disabled={busy || !b.configured} onClick={() => go(() => startCheckout({ data: { interval } }))}>
                  {b.configured ? t("dash.billing.upgrade") : t("dash.billing.notConfigured")}
                </Button>
              }
            />
          </div>
        </>
      ) : null}
    </>
  );
}

function Plan({ name, price, per, features, current, highlight, action }: { name: string; price: string; per: string; features: string[]; current?: boolean; highlight?: boolean; action?: React.ReactNode }) {
  const { t } = useLocale();
  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border p-4", highlight ? "border-link/50 bg-link/[.04]" : "bg-card")}>
      <div className="flex items-baseline justify-between">
        <div className="text-[14px] font-semibold">{name}</div>
        {current ? <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t("dash.billing.current")}</span> : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] font-semibold tracking-[-0.02em]">{price}</span>
        <span className="text-[12px] text-faint">{per}</span>
      </div>
      <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <CheckIcon weight="bold" className="size-3 text-status-shipped" /> {f}
          </li>
        ))}
      </ul>
      {action ? <div className="mt-auto pt-1">{action}</div> : null}
    </div>
  );
}
