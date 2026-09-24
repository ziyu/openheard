import { Dialog, DialogContent } from "@openheard/ui/components/dialog";
import { useLoaderData, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthForm } from "@/components/auth-form";
import { closeSignIn, consumePendingAction, useSignInDialog } from "@/lib/pending-action";
import { toggleVote, addComment } from "@/functions/posts";

export function SignInDialog() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const { open } = useSignInDialog();

  useEffect(() => {
    if (!root.user) return;
    replayPendingAction(router);
  }, [root.user, router]);

  const wsName = root.workspace?.name ?? "openheard";
  const callbackURL = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeSignIn(); }}>
      <DialogContent className="max-w-[380px]">
        <AuthForm
          wsName={wsName}
          callbackURL={callbackURL}
        />
      </DialogContent>
    </Dialog>
  );
}

async function replayPendingAction(router: ReturnType<typeof useRouter>) {
  const action = consumePendingAction();
  if (!action) return;
  try {
    if (action.type === "vote") {
      await toggleVote({ data: { postId: action.postId } });
      router.invalidate();
    } else if (action.type === "comment" && action.body) {
      await addComment({ data: { postId: action.postId, body: action.body } });
      router.invalidate();
    } else if (action.type === "compose") {
      window.dispatchEvent(new CustomEvent("openheard:open-composer"));
    }
  } catch {
    // action replay failed — user is still signed in
  }
}
