import { Button } from "@openheard/ui/components/button";

export function AuthForm({
  wsName,
  callbackURL,
}: {
  wsName: string;
  callbackURL: string;
}) {
  const login = `/api/sso/login?${new URLSearchParams({ returnTo: callbackURL })}`;
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Sign in to {wsName}</h1>
        <p className="text-sm text-muted-foreground">Use your connected account to vote and comment.</p>
      </div>
      <Button full arrow size="lg" onClick={() => { window.location.href = login; }}>
        Continue with SSO
      </Button>
    </div>
  );
}
