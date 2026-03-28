import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@tierhub/backend/convex/_generated/api";
import { Button } from "@tierhub/ui/components/button";
import { Checkbox } from "@tierhub/ui/components/checkbox";
import { cn } from "@tierhub/ui/lib/utils";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import GitHubAuthCard from "@/components/github-auth-card";
import Loader from "@/components/loader";
import RepoCard from "@/components/repo-card";
import { getGitHubAccessToken } from "@/lib/tierhub";
import type { RepoSnapshot } from "@/lib/tierhub";

const RepoToggleButton = ({
  repo,
  checked,
  onToggle,
}: {
  repo: RepoSnapshot;
  checked: boolean;
  onToggle: (repoName: string, checked: boolean) => void;
}) => {
  const handleClick = useCallback(() => {
    onToggle(repo.name, checked);
  }, [onToggle, repo.name, checked]);

  return (
    <button type="button" className="text-left" onClick={handleClick}>
      <div
        className={cn(
          "rounded-[2rem] border p-2 transition",
          checked
            ? "border-zinc-900 dark:border-zinc-100"
            : "border-transparent"
        )}
      >
        <div className="mb-3 flex items-center gap-3 px-3 pt-3">
          <Checkbox checked={checked} />
          <span className="text-sm uppercase tracking-[0.18em] text-zinc-500">
            Open for ranking
          </span>
        </div>
        <RepoCard repo={repo} variant="grid" />
      </div>
    </button>
  );
};

const OwnerWorkspace = () => {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const fetchRepos = useAction(api.github.fetchAuthenticatedRepos);
  const saveRankableRepos = useMutation(api.ranking.saveRankableRepos);
  const [ownerCatalog, setOwnerCatalog] = useState<null | {
    avatarUrl: string | null;
    displayName: string | null;
    repos: RepoSnapshot[];
    username: string;
  }>(null);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoLoadAttempted = useRef(false);
  const hydratedSelectionFor = useRef<string | null>(null);

  const savedCatalog = useQuery(
    api.ranking.getRankingCatalog,
    ownerCatalog ? { username: ownerCatalog.username } : "skip"
  );

  const loadRepositories = useCallback(async () => {
    setIsFetching(true);
    try {
      const accessToken = await getGitHubAccessToken();
      const repos = await fetchRepos({ accessToken });
      setOwnerCatalog(repos);
      if (hydratedSelectionFor.current !== repos.username) {
        setSelectedRepos([]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TierHub could not load your GitHub repositories."
      );
    } finally {
      setIsFetching(false);
    }
  }, [fetchRepos]);

  const saveSelection = useCallback(async () => {
    if (!ownerCatalog) {
      return;
    }

    setIsSaving(true);
    try {
      await saveRankableRepos({
        avatarUrl: ownerCatalog.avatarUrl,
        displayName: ownerCatalog.displayName,
        displayUsername: ownerCatalog.username,
        repos: ownerCatalog.repos.filter((repo) =>
          selectedRepos.includes(repo.name)
        ),
        username: ownerCatalog.username,
      });
      toast.success("Your ranking catalog is live.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "TierHub could not save your ranking catalog."
      );
    } finally {
      setIsSaving(false);
    }
  }, [ownerCatalog, saveRankableRepos, selectedRepos]);

  useEffect(() => {
    if (!currentUser || ownerCatalog || autoLoadAttempted.current) {
      return;
    }

    autoLoadAttempted.current = true;
    loadRepositories();
  }, [currentUser, loadRepositories, ownerCatalog]);

  useEffect(() => {
    if (
      !ownerCatalog ||
      savedCatalog === undefined ||
      hydratedSelectionFor.current === ownerCatalog.username
    ) {
      return;
    }

    hydratedSelectionFor.current = ownerCatalog.username;
    setSelectedRepos(savedCatalog?.repos.map((repo) => repo.name) ?? []);
  }, [ownerCatalog, savedCatalog]);

  const handleToggleRepo = useCallback((repoName: string, checked: boolean) => {
    setSelectedRepos((current) =>
      checked
        ? current.filter((name) => name !== repoName)
        : [...current, repoName]
    );
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Owner workspace
            </p>
            <h1 className="text-5xl font-semibold tracking-tight">
              Choose the repositories people can rank.
            </h1>
            <p className="max-w-3xl text-lg text-zinc-600 dark:text-zinc-300">
              TierHub uses your GitHub access token to load your full repository
              list, including private projects. Save the exact set you want to
              open for ranking.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-full px-5 text-base"
              onClick={loadRepositories}
              disabled={isFetching}
            >
              {isFetching ? "Refreshing..." : "Refresh GitHub repos"}
            </Button>
            {ownerCatalog ? (
              <Link
                to="/$username"
                params={{ username: ownerCatalog.username }}
              >
                <Button className="h-12 rounded-full px-5 text-base">
                  View public page
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {ownerCatalog ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                @{ownerCatalog.username}
              </h2>
              <p className="text-base text-zinc-500 dark:text-zinc-400">
                {selectedRepos.length} of {ownerCatalog.repos.length}{" "}
                repositories selected
              </p>
            </div>
            <Button
              className="h-12 rounded-full px-6 text-base"
              onClick={saveSelection}
              disabled={!selectedRepos.length || isSaving}
            >
              {isSaving ? "Saving..." : "Save open-for-ranking repos"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {ownerCatalog.repos.map((repo) => {
              const checked = selectedRepos.includes(repo.name);

              return (
                <RepoToggleButton
                  key={repo.name}
                  repo={repo}
                  checked={checked}
                  onToggle={handleToggleRepo}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-zinc-300 bg-white/70 p-8 text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-300">
          {isFetching
            ? "Loading repositories from GitHub..."
            : "Connect your GitHub account to start managing your TierHub catalog."}
        </section>
      )}
    </div>
  );
};

const DashboardRoute = () => (
  <>
    <Authenticated>
      <OwnerWorkspace />
    </Authenticated>
    <Unauthenticated>
      <GitHubAuthCard />
    </Unauthenticated>
    <AuthLoading>
      <Loader />
    </AuthLoading>
  </>
);

export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute,
});
