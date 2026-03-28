import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export const takumiPackages = [
  "@takumi-rs/core",
  "@takumi-rs/helpers",
  "@takumi-rs/image-response",
  "@takumi-rs/core-linux-x64-gnu",
  "@takumi-rs/core-linux-arm64-gnu",
  "@takumi-rs/core-darwin-arm64",
  "@takumi-rs/core-darwin-x64",
];

export default defineConfig({
  nitro: {
    preset: "vercel",
    traceDeps: takumiPackages,
  },
  optimizeDeps: {
    exclude: takumiPackages,
  },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
  server: {
    port: 3001,
  },
  ssr: {
    external: takumiPackages,
    noExternal: ["@convex-dev/better-auth"],
  },
});
