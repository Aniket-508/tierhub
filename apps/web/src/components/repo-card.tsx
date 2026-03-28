import { cn } from "@tierhub/ui/lib/utils";
import { FolderGit2, GripVertical, Lock, Star } from "lucide-react";

import type { RepoSnapshot } from "@/lib/tierhub";
import { getRepoSubtitle } from "@/lib/tierhub";

type RepoCardVariant = "board" | "grid";

interface RepoCardProps {
  className?: string;
  isDragging?: boolean;
  repo: RepoSnapshot;
  showDragHandle?: boolean;
  variant: RepoCardVariant;
}

export default function RepoCard({
  className,
  isDragging = false,
  repo,
  showDragHandle = false,
  variant,
}: RepoCardProps) {
  const subtitle = getRepoSubtitle(repo);

  if (variant === "board") {
    return (
      <div
        className={cn(
          "min-h-[108px] rounded-sm border border-white/6 bg-white/12 p-5 text-white shadow-sm",
          isDragging && "opacity-60",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-2xl font-semibold tracking-tight">{repo.name}</p>
            <p className="max-w-xl text-sm text-zinc-300">{subtitle}</p>
          </div>
          {showDragHandle ? (
            <GripVertical className="mt-1 size-4 text-zinc-500" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition dark:border-white/10 dark:bg-zinc-950",
        isDragging && "opacity-60 shadow-lg",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FolderGit2 className="size-5 text-zinc-500" />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                {repo.name}
              </p>
              <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-300">
                {repo.isPrivate ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3.5" />
                    Private
                  </span>
                ) : (
                  "Public"
                )}
              </span>
            </div>
          </div>
          <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-300">
            {subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-5 text-base text-zinc-500 dark:text-zinc-400">
            {repo.language ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: repo.languageColor ?? "#64748b" }}
                />
                {repo.language}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <Star className="size-4" />
              {repo.stars}
            </span>
          </div>
        </div>
        {showDragHandle ? (
          <GripVertical className="mt-1 size-5 text-zinc-400" />
        ) : null}
      </div>
    </div>
  );
}
