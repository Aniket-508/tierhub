import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { api } from "@tierhub/backend/convex/_generated/api";
import { Button } from "@tierhub/ui/components/button";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

import Loader from "@/components/loader";
import TierBoard from "@/components/tier-board";
import { getAuthUserId } from "@/lib/tierhub";

const ProfileRoute = () => {
  const { username } = useParams({ from: "/$username" });
  const catalog = useQuery(api.ranking.getRankingCatalog, { username });
  const tiers = useQuery(api.ranking.getAggregatedResults, { username });
  const currentUser = useQuery(api.auth.getCurrentUser);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (catalog === undefined || tiers === undefined) {
    return <Loader />;
  }

  if (!catalog) {
    return (
      <section className="space-y-4 rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-4xl font-semibold tracking-tight">
          No TierHub profile found for @{username}.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">
          This creator has not opened a ranking catalog yet. You can still try
          the ranking page to see if pinned repositories are available.
        </p>
        <Link to="/rank" search={{ username }}>
          <Button className="rounded-full px-5">Open ranking page</Button>
        </Link>
      </section>
    );
  }

  const imageUrl = `${origin || ""}/tier-image?username=${catalog.displayUsername}`;
  const markdownEmbed = `![Tier List](${imageUrl})`;
  const isOwner =
    getAuthUserId(currentUser) !== null &&
    getAuthUserId(currentUser) === catalog.ownerUserId;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
            Public profile
          </p>
          <h1 className="text-5xl font-semibold tracking-tight">
            @{catalog.displayUsername}
          </h1>
          <p className="max-w-3xl text-lg text-zinc-600 dark:text-zinc-300">
            Share this page, collect community rankings, and embed the live
            image in a README.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/rank" search={{ username: catalog.displayUsername }}>
            <Button className="h-12 rounded-full px-5 text-base">
              Rank these repos
            </Button>
          </Link>
          {isOwner ? (
            <Link to="/dashboard">
              <Button
                variant="outline"
                className="h-12 rounded-full px-5 text-base"
              >
                Manage repos
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      <TierBoard
        displayUsername={catalog.displayUsername}
        repos={catalog.repos}
        tiers={tiers}
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-2xl font-semibold tracking-tight">
            README image
          </h2>
          <img
            src={`/tier-image?username=${catalog.displayUsername}`}
            alt={`${catalog.displayUsername} tier list`}
            className="w-full rounded-2xl border border-zinc-200 dark:border-white/10"
          />
        </div>
        <div className="space-y-3 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-2xl font-semibold tracking-tight">
            Markdown embed
          </h2>
          <pre className="overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-black/30 dark:text-zinc-300">
            <code>{markdownEmbed}</code>
          </pre>
        </div>
      </section>
    </div>
  );
};

export const Route = createFileRoute("/$username")({
  component: ProfileRoute,
});
