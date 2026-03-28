import { ConvexError, v } from "convex/values";

import { action } from "./_generated/server";
import type { RepoSnapshot } from "./tierhub";

interface GitHubUserResponse {
  avatar_url: string;
  login: string;
  name: string | null;
}

interface GitHubRepoResponse {
  description: string | null;
  html_url: string;
  language: string | null;
  name: string;
  owner: {
    login: string;
  };
  private: boolean;
  stargazers_count: number;
}

interface GitHubGraphQlRepoNode {
  description: string | null;
  isPrivate: boolean;
  name: string;
  owner: {
    login: string;
  };
  primaryLanguage: null | {
    color: string | null;
    name: string;
  };
  stargazerCount: number;
  url: string;
}

interface PinnedReposResponse {
  avatarUrl: string | null;
  displayName: string | null;
  repos: RepoSnapshot[];
  username: string;
}

const getGitHubHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "User-Agent": "TierHub",
  "X-GitHub-Api-Version": "2022-11-28",
});

const getJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new ConvexError(
      `GitHub request failed (${response.status}): ${text}`
    );
  }

  return (await response.json()) as T;
};

const toRepoSnapshot = (
  repo: GitHubRepoResponse | GitHubGraphQlRepoNode
): RepoSnapshot => {
  const language =
    "primaryLanguage" in repo
      ? (repo.primaryLanguage?.name ?? null)
      : (repo.language ?? null);
  const languageColor =
    "primaryLanguage" in repo ? (repo.primaryLanguage?.color ?? null) : null;
  const stars =
    "stargazerCount" in repo ? repo.stargazerCount : repo.stargazers_count;
  const url = "url" in repo ? repo.url : repo.html_url;
  const isPrivate = "isPrivate" in repo ? repo.isPrivate : repo.private;

  return {
    description: repo.description,
    imageLabel: repo.description,
    isPrivate,
    language,
    languageColor,
    name: repo.name,
    ownerUsername: repo.owner.login,
    stars,
    url,
  };
};

export const fetchAuthenticatedRepos = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const user = await getJson<GitHubUserResponse>(
      "https://api.github.com/user",
      {
        headers: getGitHubHeaders(args.accessToken),
      }
    );

    const repos: GitHubRepoResponse[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const pageRepos = await getJson<GitHubRepoResponse[]>(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner`,
        {
          headers: getGitHubHeaders(args.accessToken),
        }
      );

      repos.push(...pageRepos);
      if (pageRepos.length < 100) {
        break;
      }
    }

    return {
      avatarUrl: user.avatar_url,
      displayName: user.name,
      repos: repos
        .map(toRepoSnapshot)
        .toSorted(
          (left, right) =>
            right.stars - left.stars || left.name.localeCompare(right.name)
        ),
      username: user.login,
    };
  },
});

export const getPinnedRepos = action({
  args: {
    username: v.string(),
  },
  handler: async (_ctx, args): Promise<PinnedReposResponse | null> => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new ConvexError(
        "GITHUB_TOKEN is required to fetch pinned repositories."
      );
    }

    const response = await fetch("https://api.github.com/graphql", {
      body: JSON.stringify({
        query: `
          query PinnedRepos($login: String!) {
            user(login: $login) {
              avatarUrl
              login
              name
              pinnedItems(first: 6, types: REPOSITORY) {
                nodes {
                  ... on Repository {
                    name
                    description
                    url
                    stargazerCount
                    isPrivate
                    owner {
                      login
                    }
                    primaryLanguage {
                      name
                      color
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          login: args.username,
        },
      }),
      headers: {
        ...getGitHubHeaders(token),
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ConvexError(
        `GitHub GraphQL request failed (${response.status}): ${text}`
      );
    }

    const json = (await response.json()) as {
      data?: {
        user: null | {
          avatarUrl: string | null;
          login: string;
          name: string | null;
          pinnedItems: {
            nodes: GitHubGraphQlRepoNode[];
          };
        };
      };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      throw new ConvexError(
        json.errors.map((error) => error.message).join(", ")
      );
    }

    if (!json.data?.user) {
      return null;
    }

    return {
      avatarUrl: json.data.user.avatarUrl,
      displayName: json.data.user.name,
      repos: json.data.user.pinnedItems.nodes.map(toRepoSnapshot),
      username: json.data.user.login,
    };
  },
});
