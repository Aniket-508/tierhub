import { ImageResponse } from "@takumi-rs/image-response";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@tierhub/backend/convex/_generated/api";
import { TIERS, TIER_STYLES } from "@tierhub/backend/convex/tierhub";
import type {
  RepoSnapshot,
  TierBuckets,
} from "@tierhub/backend/convex/tierhub";
import { env } from "@tierhub/env/server";
import { ConvexHttpClient } from "convex/browser";

const getRepoSubtitle = (repo: RepoSnapshot) => {
  if (repo.description) {
    return repo.description;
  }

  const parts = [
    repo.language,
    repo.stars > 0 ? `${repo.stars} stars` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" • ") : "No description available";
};

const TierImage = ({
  displayUsername,
  repos,
  tiers,
}: {
  displayUsername: string;
  repos: RepoSnapshot[];
  tiers: TierBuckets;
}) => {
  const repoMap = new Map(repos.map((repo) => [repo.name, repo]));

  return (
    <div
      style={{
        background: "#f8fafc",
        color: "#18181b",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        height: "100%",
        padding: 36,
        width: "100%",
      }}
    >
      <div
        style={{
          background: "white",
          border: "1px solid rgba(24, 24, 27, 0.12)",
          borderRadius: 28,
          display: "flex",
          flexDirection: "column",
          gap: 22,
          padding: 30,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#52525b", fontSize: 28 }}>
            {displayUsername} / README.md
          </div>
          <div
            style={{ fontSize: 62, fontWeight: 700, letterSpacing: "-0.04em" }}
          >
            {displayUsername}&apos;s project tier list
          </div>
          <div
            style={{
              background: "rgba(24, 24, 27, 0.12)",
              height: 1,
              width: "100%",
            }}
          />
        </div>

        <div
          style={{
            background: "#0d1117",
            border: "1px solid rgba(0,0,0,0.65)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {TIERS.map((tier) => (
            <div
              key={tier}
              style={{
                borderBottom:
                  tier === "D" ? "none" : "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                minHeight: 160,
                width: "100%",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  background: TIER_STYLES[tier].accent,
                  borderRight: "1px solid rgba(0,0,0,0.65)",
                  color: "#0f172a",
                  display: "flex",
                  fontSize: 64,
                  fontWeight: 700,
                  justifyContent: "center",
                  width: 160,
                }}
              >
                {tier}
              </div>
              <div
                style={{
                  alignItems: "flex-start",
                  display: "flex",
                  flex: 1,
                  flexWrap: "wrap",
                  gap: 18,
                  padding: 24,
                }}
              >
                {tiers[tier].map((repoName) => {
                  const repo = repoMap.get(repoName);
                  if (!repo) {
                    return null;
                  }

                  return (
                    <div
                      key={repo.name}
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "white",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        minHeight: 108,
                        minWidth: 320,
                        padding: "18px 22px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          lineHeight: 1.1,
                        }}
                      >
                        {repo.name}
                      </div>
                      <div
                        style={{
                          color: "#d4d4d8",
                          fontSize: 18,
                          lineHeight: 1.35,
                        }}
                      >
                        {getRepoSubtitle(repo)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/tier-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const username = url.searchParams.get("username")?.trim();
        if (!username) {
          return new Response("Missing username", { status: 400 });
        }

        const client = new ConvexHttpClient(env.CONVEX_URL);
        const [catalog, tiers] = await Promise.all([
          client.query(api.ranking.getRankingCatalog, { username }),
          client.query(api.ranking.getAggregatedResults, { username }),
        ]);

        if (!catalog) {
          return new Response("TierHub profile not found", { status: 404 });
        }

        return new ImageResponse(
          <TierImage
            displayUsername={catalog.displayUsername}
            repos={catalog.repos}
            tiers={tiers}
          />,
          {
            height: 1080,
            width: 1600,
          }
        );
      },
    },
  },
});
