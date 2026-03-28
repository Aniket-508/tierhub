export const TIERS = ["S", "A", "B", "C", "D"] as const;

export type Tier = (typeof TIERS)[number];
export type RankingCatalogSource = "managed" | "pinned";

export interface RepoSnapshot {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  languageColor: string | null;
  stars: number;
  isPrivate: boolean;
  ownerUsername: string;
  imageLabel: string | null;
}

export interface RankingCatalogResult {
  source: RankingCatalogSource;
  username: string;
  displayUsername: string;
  displayName: string | null;
  avatarUrl: string | null;
  ownerUserId: string | null;
  repos: RepoSnapshot[];
}

export type TierBuckets = Record<Tier, string[]>;

export const TIER_STYLES: Record<Tier, { accent: string; panel: string }> = {
  A: { accent: "#fdba74", panel: "#f97316" },
  B: { accent: "#fde68a", panel: "#eab308" },
  C: { accent: "#bef264", panel: "#84cc16" },
  D: { accent: "#d4d4d8", panel: "#71717a" },
  S: { accent: "#f87171", panel: "#ef4444" },
};

export const createEmptyTierBuckets = (): TierBuckets => ({
  A: [],
  B: [],
  C: [],
  D: [],
  S: [],
});

export const normalizeUsername = (username: string) =>
  username.trim().toLowerCase();
