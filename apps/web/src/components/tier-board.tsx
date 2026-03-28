import { TIERS, TIER_STYLES } from "@tierhub/backend/convex/tierhub";
import { cn } from "@tierhub/ui/lib/utils";

import RepoCard from "@/components/repo-card";
import { createRepoMap, getDefaultBoardTitle } from "@/lib/tierhub";
import type { RepoSnapshot, TierBuckets } from "@/lib/tierhub";

interface TierBoardProps {
  boardTitle?: string;
  className?: string;
  displayUsername: string;
  repos: RepoSnapshot[];
  tiers: TierBuckets;
}

export default function TierBoard({
  boardTitle,
  className,
  displayUsername,
  repos,
  tiers,
}: TierBoardProps) {
  const repoMap = createRepoMap(repos);

  return (
    <section
      className={cn(
        "rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950",
        className
      )}
    >
      <div className="space-y-4">
        <p className="text-2xl text-zinc-600 dark:text-zinc-300">
          {displayUsername} / README.md
        </p>
        <h2 className="text-6xl font-semibold tracking-tight">
          {boardTitle ?? getDefaultBoardTitle(displayUsername)}
        </h2>
        <div className="h-px bg-zinc-200 dark:bg-white/10" />
      </div>

      <div className="mt-8 overflow-hidden rounded-sm border border-black/50 bg-[#0d1117]">
        {TIERS.map((tier) => (
          <div
            key={tier}
            className="grid min-h-[148px] grid-cols-[148px_1fr] border-b border-white/10 last:border-b-0"
          >
            <div
              className="flex items-center justify-center border-r border-black/50 text-6xl font-semibold text-slate-900"
              style={{ backgroundColor: TIER_STYLES[tier].accent }}
            >
              {tier}
            </div>
            <div className="min-h-[148px] bg-[#0d1117] p-6">
              <div className="flex flex-wrap gap-5">
                {tiers[tier].map((repoName) => {
                  const repo = repoMap.get(repoName);
                  if (!repo) {
                    return null;
                  }

                  return (
                    <RepoCard
                      key={repo.name}
                      repo={repo}
                      variant="board"
                      className="min-w-[320px] flex-1"
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
