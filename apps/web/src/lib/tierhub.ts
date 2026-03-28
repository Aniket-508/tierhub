import { TIERS } from "@tierhub/backend/convex/tierhub";
import type {
  RankingCatalogResult,
  RepoSnapshot,
  Tier,
  TierBuckets,
} from "@tierhub/backend/convex/tierhub";

import { authClient } from "@/lib/auth-client";

const VOTER_ID_KEY = "tierhub:voter-id";

export { TIERS };
export type { RankingCatalogResult, RepoSnapshot, Tier, TierBuckets };

export const getVoterId = () => {
  if (typeof window === "undefined") {
    return "server-voter";
  }

  const existing = window.localStorage.getItem(VOTER_ID_KEY);
  if (existing) {
    return existing;
  }

  const voterId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tierhub-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(VOTER_ID_KEY, voterId);
  return voterId;
};

export const getAuthUserId = (authUser: unknown) => {
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

export const createCatalogSeed = (catalog: RankingCatalogResult) => ({
  avatarUrl: catalog.avatarUrl,
  displayName: catalog.displayName,
  displayUsername: catalog.displayUsername,
  repos: catalog.repos,
});

export const getRepoSubtitle = (repo: RepoSnapshot) => {
  if (repo.description) {
    return repo.description;
  }

  const parts = [
    repo.language,
    repo.stars > 0 ? `${repo.stars} stars` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" • ") : "No description available";
};

interface AuthAccount {
  accountId?: string;
  id?: string;
  provider?: string;
  providerId?: string;
}

interface AuthClient {
  getAccessToken?: (args: {
    accountId?: string;
    providerId: string;
  }) => Promise<{
    accessToken?: string;
    data?: { accessToken?: string; token?: string };
  }>;
  listAccounts?: () => Promise<{ data?: AuthAccount[] }>;
}

export const getGitHubAccessToken = async () => {
  const client = authClient as AuthClient;
  const accountsResponse = client.listAccounts
    ? await client.listAccounts()
    : null;
  const githubAccount = (accountsResponse?.data as AuthAccount[])?.find(
    (account) =>
      account.provider === "github" || account.providerId === "github"
  );

  const tokenResponse = await client.getAccessToken?.({
    accountId: githubAccount?.accountId ?? githubAccount?.id,
    providerId: "github",
  });

  const accessToken =
    tokenResponse?.data?.accessToken ??
    tokenResponse?.accessToken ??
    tokenResponse?.data?.token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error(
      "TierHub could not access your GitHub token. Please sign in again."
    );
  }

  return accessToken;
};

export const getDefaultBoardTitle = (displayUsername: string) =>
  `${displayUsername}'s project tier list`;

export const createRepoMap = (repos: RepoSnapshot[]) =>
  new Map(repos.map((repo) => [repo.name, repo]));

export const areAllReposRanked = (buckets: Record<Tier | "source", string[]>) =>
  buckets.source.length === 0 &&
  TIERS.every((tier) => (buckets[tier]?.length ?? 0) >= 0);
