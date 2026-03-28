import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { api } from "@tierhub/backend/convex/_generated/api";
import { Button } from "@tierhub/ui/components/button";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import Loader from "@/components/loader";
import RankingWorkspace from "@/components/ranking-workspace";
import { createCatalogSeed, getVoterId } from "@/lib/tierhub";
import type { RankingCatalogResult, Tier } from "@/lib/tierhub";

const RankRoute = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/rank" });
  const username = search.username?.trim() ?? "";
  const catalog = useQuery(
    api.ranking.getRankingCatalog,
    username ? { username } : "skip"
  );
  const fetchPinnedRepos = useAction(api.github.getPinnedRepos);
  const submitRanking = useMutation(api.ranking.submitRanking);
  const [fallbackCatalog, setFallbackCatalog] =
    useState<RankingCatalogResult | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestedFallbackFor = useRef<string | null>(null);

  useEffect(() => {
    setFallbackCatalog(null);
    setFallbackError(null);
    requestedFallbackFor.current = null;
  }, [username]);

  useEffect(() => {
    if (
      !username ||
      catalog !== null ||
      requestedFallbackFor.current === username
    ) {
      return;
    }

    const loadPinned = async () => {
      requestedFallbackFor.current = username;
      setIsFetchingFallback(true);
      try {
        const result = await fetchPinnedRepos({ username });
        if (!result) {
          setFallbackCatalog(null);
          setFallbackError(
            "TierHub could not find a saved profile or pinned repositories for this username."
          );
          return;
        }

        setFallbackCatalog({
          avatarUrl: result.avatarUrl,
          displayName: result.displayName,
          displayUsername: result.username,
          ownerUserId: null,
          repos: result.repos,
          source: "pinned",
          username: result.username.toLowerCase(),
        });
      } catch (error) {
        setFallbackError(
          error instanceof Error
            ? error.message
            : "TierHub could not load pinned repositories."
        );
      } finally {
        setIsFetchingFallback(false);
      }
    };

    loadPinned();
  }, [catalog, fetchPinnedRepos, username]);

  const resolvedCatalog = catalog ?? fallbackCatalog;

  const handleViewPublicProfile = useCallback(() => {
    if (resolvedCatalog) {
      navigate({
        params: { username: resolvedCatalog.displayUsername },
        to: "/$username",
      });
    }
  }, [navigate, resolvedCatalog]);

  const handleSubmit = useCallback(
    async (assignments: { repo: string; tier: Tier }[]) => {
      if (!resolvedCatalog) {
        return;
      }
      setIsSubmitting(true);
      try {
        const result = await submitRanking({
          assignments,
          catalogSeed: catalog ? undefined : createCatalogSeed(resolvedCatalog),
          username: resolvedCatalog.username,
          voterId: getVoterId(),
        });

        if (result.inserted > 0) {
          toast.success("Your ranking was submitted.");
        } else {
          toast.message(
            "You have already ranked these repositories from this browser."
          );
        }

        navigate({
          params: { username: resolvedCatalog.displayUsername },
          to: "/$username",
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "TierHub could not submit your ranking."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [catalog, navigate, resolvedCatalog, submitRanking]
  );

  if (!username) {
    return (
      <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-4xl font-semibold tracking-tight">
          Choose a GitHub username to rank.
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">
          Open this page with <code>?username=&lt;github-user&gt;</code> or
          start from the TierHub home page.
        </p>
      </section>
    );
  }

  if (catalog === undefined || isFetchingFallback) {
    return <Loader />;
  }

  if (!resolvedCatalog || !resolvedCatalog.repos.length) {
    return (
      <section className="space-y-4 rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-4xl font-semibold tracking-tight">
          Nothing to rank yet for @{username}.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">
          {fallbackError ??
            "This user has not opened any repositories for ranking and there are no pinned repositories to fall back to."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Public ranking
          </p>
          <h1 className="text-5xl font-semibold tracking-tight">
            Rank {resolvedCatalog.displayUsername}&apos;s repositories
          </h1>
        </div>
        <Button
          variant="outline"
          className="h-12 rounded-full px-5 text-base"
          onClick={handleViewPublicProfile}
        >
          View public profile
        </Button>
      </div>

      <RankingWorkspace
        catalog={resolvedCatalog}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export const Route = createFileRoute("/rank")({
  component: RankRoute,
  validateSearch: z.object({
    username: z.string().optional(),
  }),
});
