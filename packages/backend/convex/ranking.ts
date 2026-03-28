import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { TIERS, createEmptyTierBuckets, normalizeUsername } from "./tierhub";
import type { RankingCatalogResult, RepoSnapshot, Tier } from "./tierhub";

const nullableString = v.union(v.string(), v.null());
const tierValidator = v.union(
  v.literal("S"),
  v.literal("A"),
  v.literal("B"),
  v.literal("C"),
  v.literal("D")
);

const repoSnapshotValidator = v.object({
  description: nullableString,
  imageLabel: nullableString,
  isPrivate: v.boolean(),
  language: nullableString,
  languageColor: nullableString,
  name: v.string(),
  ownerUsername: v.string(),
  stars: v.number(),
  url: v.string(),
});

const getAuthUserId = (authUser: unknown) => {
  if (!authUser || typeof authUser !== "object") {
    return null;
  }

  const auth = authUser as Record<string, unknown>;
  if (typeof auth.userId === "string") {
    return auth.userId;
  }
  if (typeof auth.id === "string") {
    return auth.id;
  }
  if (typeof auth._id === "string") {
    return auth._id;
  }

  return null;
};

const mapRepoDoc = (repo: Doc<"rankableRepos">): RepoSnapshot => ({
  description: repo.description,
  imageLabel: repo.imageLabel,
  isPrivate: repo.isPrivate,
  language: repo.language,
  languageColor: repo.languageColor,
  name: repo.name,
  ownerUsername: repo.ownerUsername,
  stars: repo.stars,
  url: repo.url,
});

const sortRepos = (repos: RepoSnapshot[]) =>
  [...repos].toSorted(
    (left: RepoSnapshot, right: RepoSnapshot) =>
      right.stars - left.stars || left.name.localeCompare(right.name)
  );
const upsertProfileCatalog = async (
  ctx: unknown,
  input: {
    avatarUrl: string | null;
    catalogSource: "managed" | "pinned";
    displayName: string | null;
    displayUsername: string;
    repos: RepoSnapshot[];
    userId: string | null;
    username: string;
  }
) => {
  const now = Date.now();
  const { db } = ctx as {
    db: {
      delete: (id: string) => Promise<void>;
      insert: (table: string, data: Record<string, unknown>) => Promise<string>;
      patch: (id: string, data: Record<string, unknown>) => Promise<void>;
      query: (table: string) => {
        withIndex: (
          name: string,
          fn: (q: { eq: (field: string, value: unknown) => unknown }) => unknown
        ) => {
          collect: () => Promise<{ _id: string; [key: string]: unknown }[]>;
          unique: () => Promise<{ _id: string; [key: string]: unknown } | null>;
        };
      };
    };
  };
  const existingByUsername = await db
    .query("profiles")
    .withIndex("by_username", (q) => q.eq("username", input.username))
    .unique();
  const existingByUserId = input.userId
    ? await db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", input.userId))
        .unique()
    : null;
  const existingProfile = existingByUserId ?? existingByUsername;

  let profileId = existingProfile?._id;
  if (existingProfile) {
    await db.patch(existingProfile._id, {
      avatarUrl: input.avatarUrl,
      catalogSource: input.catalogSource,
      displayName: input.displayName,
      displayUsername: input.displayUsername,
      updatedAt: now,
      userId: input.userId,
      username: input.username,
    });
  } else {
    profileId = await db.insert("profiles", {
      avatarUrl: input.avatarUrl,
      catalogSource: input.catalogSource,
      createdAt: now,
      displayName: input.displayName,
      displayUsername: input.displayUsername,
      updatedAt: now,
      userId: input.userId,
      username: input.username,
    });
  }

  const existingRepos = await db
    .query("rankableRepos")
    .withIndex("by_username", (q) => q.eq("username", input.username))
    .collect();

  for (const repo of existingRepos) {
    await db.delete(repo._id);
  }

  const sortedRepos = sortRepos(input.repos);
  for (const [sortOrder, repo] of sortedRepos.entries()) {
    await db.insert("rankableRepos", {
      createdAt: now,
      description: repo.description,
      imageLabel: repo.imageLabel,
      isPrivate: repo.isPrivate,
      language: repo.language,
      languageColor: repo.languageColor,
      name: repo.name,
      ownerUsername: repo.ownerUsername,
      profileId,
      repo: repo.name,
      sortOrder,
      stars: repo.stars,
      updatedAt: now,
      url: repo.url,
      userId: input.userId,
      username: input.username,
    });
  }
};

const pickDominantTier = (counts: Record<Tier, number>) => {
  let dominantTier: Tier = "D";
  let dominantCount = -1;

  for (const tier of TIERS) {
    const count = counts[tier];
    if (count > dominantCount) {
      dominantTier = tier;
      dominantCount = count;
    }
  }

  return dominantTier;
};

export const getRankingCatalog = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args): Promise<RankingCatalogResult | null> => {
    const username = normalizeUsername(args.username);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!profile) {
      return null;
    }

    const repos = await ctx.db
      .query("rankableRepos")
      .withIndex("by_username", (q) => q.eq("username", username))
      .collect();
    repos.sort((left, right) => left.sortOrder - right.sortOrder);

    return {
      avatarUrl: profile.avatarUrl,
      displayName: profile.displayName,
      displayUsername: profile.displayUsername,
      ownerUserId: profile.userId,
      repos: repos.map(mapRepoDoc),
      source: profile.catalogSource,
      username: profile.username,
    };
  },
});

export const saveRankableRepos = mutation({
  args: {
    avatarUrl: nullableString,
    displayName: nullableString,
    displayUsername: v.string(),
    repos: v.array(repoSnapshotValidator),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    const userId = getAuthUserId(authUser);
    if (!userId) {
      throw new ConvexError("You must be signed in to manage repositories.");
    }

    const username = normalizeUsername(args.username);
    const uniqueRepos = new Map<string, RepoSnapshot>();
    for (const repo of args.repos) {
      if (normalizeUsername(repo.ownerUsername) !== username) {
        throw new ConvexError(
          "You can only save repositories owned by this profile."
        );
      }
      uniqueRepos.set(repo.name, repo);
    }

    await upsertProfileCatalog(ctx, {
      avatarUrl: args.avatarUrl,
      catalogSource: "managed",
      displayName: args.displayName,
      displayUsername: args.displayUsername,
      repos: [...uniqueRepos.values()],
      userId,
      username,
    });

    return {
      count: uniqueRepos.size,
      username,
    };
  },
});

export const submitRanking = mutation({
  args: {
    assignments: v.array(
      v.object({
        repo: v.string(),
        tier: tierValidator,
      })
    ),
    catalogSeed: v.optional(
      v.object({
        avatarUrl: nullableString,
        displayName: nullableString,
        displayUsername: v.string(),
        repos: v.array(repoSnapshotValidator),
      })
    ),
    username: v.string(),
    voterId: v.string(),
  },
  handler: async (ctx, args) => {
    const username = normalizeUsername(args.username);
    const assignmentMap = new Map(
      args.assignments.map((assignment) => [assignment.repo, assignment.tier])
    );
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!profile) {
      if (!args.catalogSeed) {
        throw new ConvexError(
          "This profile has not opened any repositories for ranking yet."
        );
      }

      await upsertProfileCatalog(ctx, {
        avatarUrl: args.catalogSeed.avatarUrl,
        catalogSource: "pinned",
        displayName: args.catalogSeed.displayName,
        displayUsername: args.catalogSeed.displayUsername,
        repos: args.catalogSeed.repos,
        userId: null,
        username,
      });

      profile = await ctx.db
        .query("profiles")
        .withIndex("by_username", (q) => q.eq("username", username))
        .unique();
    }

    if (!profile) {
      throw new ConvexError("Profile setup failed. Please try again.");
    }

    const rankableRepos = await ctx.db
      .query("rankableRepos")
      .withIndex("by_username", (q) => q.eq("username", username))
      .collect();

    const repoNames = new Set(rankableRepos.map((repo) => repo.repo));
    if (!repoNames.size) {
      throw new ConvexError("There are no repositories available to rank.");
    }

    if (assignmentMap.size !== repoNames.size) {
      throw new ConvexError(
        "Every visible repository must be assigned to a tier before submitting."
      );
    }

    for (const repoName of repoNames) {
      if (!assignmentMap.has(repoName)) {
        throw new ConvexError(
          "Missing assignment for one or more repositories."
        );
      }
    }

    for (const repoName of assignmentMap.keys()) {
      if (!repoNames.has(repoName)) {
        throw new ConvexError(
          "One or more assignments do not belong to this profile."
        );
      }
    }

    let inserted = 0;
    let skipped = 0;
    const createdAt = Date.now();

    for (const assignment of args.assignments) {
      const existingVote = await ctx.db
        .query("votes")
        .withIndex("by_username_repo_voterId", (q) =>
          q
            .eq("username", username)
            .eq("repo", assignment.repo)
            .eq("voterId", args.voterId)
        )
        .unique();

      if (existingVote) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("votes", {
        createdAt,
        repo: assignment.repo,
        tier: assignment.tier,
        username,
        voterId: args.voterId,
      });
      inserted += 1;
    }

    return {
      inserted,
      skipped,
      username,
    };
  },
});

export const getAggregatedResults = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const username = normalizeUsername(args.username);
    const rankableRepos = await ctx.db
      .query("rankableRepos")
      .withIndex("by_username", (q) => q.eq("username", username))
      .collect();
    rankableRepos.sort((left, right) => left.sortOrder - right.sortOrder);

    const activeRepoNames = new Set(rankableRepos.map((repo) => repo.repo));
    const buckets = createEmptyTierBuckets();
    if (!activeRepoNames.size) {
      return buckets;
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_username", (q) => q.eq("username", username))
      .collect();

    const voteCounts = new Map<string, Record<Tier, number>>();
    for (const vote of votes) {
      if (!activeRepoNames.has(vote.repo)) {
        continue;
      }

      const current = voteCounts.get(vote.repo) ?? {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        S: 0,
      };
      current[vote.tier] += 1;
      voteCounts.set(vote.repo, current);
    }

    for (const repo of rankableRepos) {
      const counts = voteCounts.get(repo.repo);
      if (!counts) {
        continue;
      }

      buckets[pickDominantTier(counts)].push(repo.repo);
    }

    return buckets;
  },
});
