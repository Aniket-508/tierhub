import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type ViteImportMeta = ImportMeta & {
  readonly env: Record<string, string | boolean | undefined>;
};

export const env = createEnv({
  client: {
    VITE_CONVEX_SITE_URL: z.url(),
    VITE_CONVEX_URL: z.url(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: (import.meta as ViteImportMeta).env,
});
