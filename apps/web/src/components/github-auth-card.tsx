import { Button } from "@tierhub/ui/components/button";
import { useCallback } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const GitHubAuthCard = ({
  redirectTo = "/dashboard",
  title = "Sign in with GitHub",
  description = "Connect your GitHub account to choose which repositories are open for ranking.",
}: {
  description?: string;
  redirectTo?: string;
  title?: string;
}) => {
  const handleSignIn = useCallback(async () => {
    try {
      await authClient.signIn.social({
        callbackURL: redirectTo,
        provider: "github",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "GitHub sign-in failed."
      );
    }
  }, [redirectTo]);

  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      </div>
      <Button
        className="mt-6 h-12 rounded-full px-6 text-base"
        onClick={handleSignIn}
      >
        Continue with GitHub
      </Button>
    </div>
  );
};

export default GitHubAuthCard;
