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

const BORDER_COLOR = "#30363d";
const BORDER_WIDTH = 2;

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
  repos,
  tiers,
}: {
  repos: RepoSnapshot[];
  tiers: TierBuckets;
}) => {
  const repoMap = new Map(repos.map((repo) => [repo.name, repo]));

  return (
    <div
      style={{
        backgroundColor: "#0d1117",
        borderColor: BORDER_COLOR,
        borderStyle: "solid",
        borderWidth: BORDER_WIDTH,
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        height: "100%",
        width: "100%",
      }}
    >
      {TIERS.map((tier) => (
        <div
          key={tier}
          style={{
            display: "flex",
            flex: 1,
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              backgroundColor: TIER_STYLES[tier].accent,
              display: "flex",
              height: "100%",
              justifyContent: "center",
              width: 160,
            }}
          >
            <span style={{ color: "#0f172a", fontSize: 64, fontWeight: 500 }}>
              {tier}
            </span>
          </div>
          <div
            style={{
              alignItems: "center",
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
                    backgroundColor: "#1e2329",
                    borderColor: "#2a2f36",
                    borderStyle: "solid",
                    borderWidth: 1,
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    minWidth: 320,
                    padding: "18px 22px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
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
          {tier !== "D" && (
            <div
              style={{
                backgroundColor: BORDER_COLOR,
                bottom: 0,
                height: BORDER_WIDTH,
                left: 0,
                position: "absolute",
                right: 0,
                width: "100%",
                zIndex: 1,
              }}
            />
          )}
        </div>
      ))}
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
          <TierImage repos={catalog.repos} tiers={tiers} />,
          {
            height: 1080,
            width: 1600,
          }
        );
      },
    },
  },
});
