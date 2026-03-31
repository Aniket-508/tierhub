import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TIERS, TIER_STYLES } from "@tierhub/backend/convex/tierhub";
import { Button } from "@tierhub/ui/components/button";
import { cn } from "@tierhub/ui/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

import RepoCard from "@/components/repo-card";
import type { RankingCatalogResult, RepoSnapshot, Tier } from "@/lib/tierhub";

type ContainerId = Tier | "source";
type BoardState = Record<ContainerId, string[]>;

const createInitialState = (repos: RepoSnapshot[]): BoardState => ({
  A: [],
  B: [],
  C: [],
  D: [],
  S: [],
  source: repos.map((repo) => repo.name),
});

const findContainer = (state: BoardState, id: string): ContainerId | null => {
  if (id in state) {
    return id as ContainerId;
  }

  for (const [containerId, repoNames] of Object.entries(state) as [
    ContainerId,
    string[],
  ][]) {
    if (repoNames.includes(id)) {
      return containerId;
    }
  }

  return null;
};

const SortableRepoItem = ({
  container,
  repo,
  variant,
}: {
  container: ContainerId;
  repo: RepoSnapshot;
  variant: "board" | "grid";
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: repo.name,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <RepoCard
        repo={repo}
        variant={variant}
        isDragging={isDragging}
        showDragHandle
        className={cn(container !== "source" && "h-full")}
      />
    </div>
  );
};

const DroppableTier = ({
  id,
  items,
  repoMap,
}: {
  id: Tier;
  items: string[];
  repoMap: Map<string, RepoSnapshot>;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="grid min-h-[148px] grid-cols-[148px_1fr] border-b border-white/10 last:border-b-0">
      <div
        className="flex items-center justify-center border-r border-black/50 text-6xl font-semibold text-slate-900"
        style={{ backgroundColor: TIER_STYLES[id].accent }}
      >
        {id}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[148px] bg-[#0d1117] p-6",
          isOver && "bg-[#121826]"
        )}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="flex min-h-[100px] flex-wrap gap-5">
            {items.length ? (
              items.map((repoName) => {
                const repo = repoMap.get(repoName);
                return repo ? (
                  <SortableRepoItem
                    key={repo.name}
                    container={id}
                    repo={repo}
                    variant="board"
                  />
                ) : null;
              })
            ) : (
              <div className="flex min-h-[100px] items-center text-sm text-zinc-500">
                Drop a repository here.
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

const DroppableSource = ({
  id,
  items,
  label,
  repoMap,
}: {
  id: "source";
  items: string[];
  label: string;
  repoMap: Map<string, RepoSnapshot>;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-semibold tracking-tight">{label}</h3>
        <p className="text-base text-zinc-500 dark:text-zinc-400">
          Drag cards into S, A, B, C, or D
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-[2rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950/40",
          isOver && "border-zinc-400 dark:border-zinc-500"
        )}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2">
            {items.length ? (
              items.map((repoName) => {
                const repo = repoMap.get(repoName);
                return repo ? (
                  <SortableRepoItem
                    key={repo.name}
                    container={id}
                    repo={repo}
                    variant="grid"
                  />
                ) : null;
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-zinc-500 dark:border-white/10 dark:text-zinc-400 md:col-span-2">
                All repositories are assigned. Drag a card back here to unrank
                it.
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  );
};

const RankingWorkspace = ({
  catalog,
  isSubmitting,
  onSubmit,
}: {
  catalog: RankingCatalogResult;
  isSubmitting: boolean;
  onSubmit: (assignments: { repo: string; tier: Tier }[]) => Promise<void>;
}) => {
  const repoMap = useMemo(
    () => new Map(catalog.repos.map((repo) => [repo.name, repo])),
    [catalog.repos]
  );
  const [state, setState] = useState<BoardState>(() =>
    createInitialState(catalog.repos)
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setState(createInitialState(catalog.repos));
  }, [catalog.repos]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sourceLabel =
    catalog.source === "managed" ? "Open for ranking" : "Pinned";
  const isComplete = state.source.length === 0 && catalog.repos.length > 0;
  const activeRepo = activeId ? (repoMap.get(activeId) ?? null) : null;

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveId(null);
      if (!over) {
        return;
      }

      const activeIdValue = String(active.id);
      const overIdValue = String(over.id);
      const activeContainer = findContainer(state, activeIdValue);
      const overContainer = findContainer(state, overIdValue);

      if (!activeContainer || !overContainer) {
        return;
      }

      if (activeContainer === overContainer) {
        if (activeIdValue === overIdValue) {
          return;
        }

        setState((current) => {
          const currentItems = current[activeContainer];
          const oldIndex = currentItems.indexOf(activeIdValue);
          const newIndex =
            overIdValue === overContainer
              ? currentItems.length - 1
              : currentItems.indexOf(overIdValue);

          if (oldIndex === -1 || newIndex === -1) {
            return current;
          }

          return {
            ...current,
            [activeContainer]: arrayMove(currentItems, oldIndex, newIndex),
          };
        });
        return;
      }

      setState((current) => {
        const sourceItems = current[activeContainer].filter(
          (item) => item !== activeIdValue
        );
        const destinationItems = [...current[overContainer]];
        const destinationIndex =
          overIdValue === overContainer
            ? destinationItems.length
            : destinationItems.indexOf(overIdValue);

        destinationItems.splice(
          destinationIndex === -1 ? destinationItems.length : destinationIndex,
          0,
          activeIdValue
        );

        return {
          ...current,
          [activeContainer]: sourceItems,
          [overContainer]: destinationItems,
        };
      });
    },
    [state]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleApplyRanking = useCallback(async () => {
    const assignments = TIERS.flatMap((tier) =>
      state[tier].map((repo) => ({
        repo,
        tier,
      }))
    );
    await onSubmit(assignments);
  }, [onSubmit, state]);

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-hidden rounded-2xl border border-black/50 bg-[#0d1117]">
          {TIERS.map((tier) => (
            <DroppableTier
              key={tier}
              id={tier}
              items={state[tier]}
              repoMap={repoMap}
            />
          ))}
        </div>

        <DragOverlay>
          {activeRepo ? (
            <RepoCard repo={activeRepo} variant="grid" showDragHandle />
          ) : null}
        </DragOverlay>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-medium">
              {isComplete
                ? "Ready to submit"
                : "Assign every repository to continue"}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {catalog.repos.length - state.source.length} of{" "}
              {catalog.repos.length} repositories ranked
            </p>
          </div>
          <Button
            disabled={!isComplete || isSubmitting}
            className="h-12 rounded-full px-6 text-base"
            onClick={handleApplyRanking}
          >
            {isSubmitting ? "Submitting..." : "Submit ranking"}
          </Button>
        </div>

        <DroppableSource
          id="source"
          items={state.source}
          label={sourceLabel}
          repoMap={repoMap}
        />
      </DndContext>
    </section>
  );
};

export default RankingWorkspace;
