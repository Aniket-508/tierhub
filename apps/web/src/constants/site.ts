const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : (process.env.SITE_URL ?? "https://tierhub.vercel.app");

export const SITE = {
  AUTHOR: {
    NAME: "Aniket Pawar",
    TWITTER: "@alaymanguy",
  },
  DESCRIPTION: {
    LONG: "TierHub lets creators pick the GitHub repositories they want feedback on, collect public rankings, and publish a dynamic tier list image directly in a README—turn a profile into a living tier list.",
    SHORT:
      "Rank GitHub projects with community votes and embed a shareable tier list image in your README.",
  },
  KEYWORDS: [
    "tierhub",
    "github",
    "tier list",
    "readme",
    "rankings",
    "open source",
  ],
  NAME: "TierHub",
  OG_IMAGE: `${baseUrl}/og`,
  URL: baseUrl,
} as const;
