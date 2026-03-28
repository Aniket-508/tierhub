import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { Toaster } from "@tierhub/ui/components/sonner";

import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import Header from "../components/header";

import appCss from "../index.css?url";

const getAuth = createServerFn({ method: "GET" }).handler(
  async () => await getToken()
);

export interface RouterAppContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

const RootDocument = () => {
  const context = useRouteContext({ from: "__root__" });
  return (
    <ConvexBetterAuthProvider
      client={context.convexQueryClient.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <html lang="en" className="dark">
        <head>
          <HeadContent />
        </head>
        <body>
          <div className="grid min-h-svh grid-rows-[auto_1fr] bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,1))] dark:bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.12),_transparent_28%),linear-gradient(180deg,_rgba(9,9,11,1),_rgba(3,7,18,1))]">
            <Header />
            <main className="mx-auto w-full max-w-7xl px-6 py-8">
              <Outlet />
            </main>
          </div>
          <Toaster richColors />
          <TanStackRouterDevtools position="bottom-left" />
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  beforeLoad: async (ctx) => {
    const token = await getAuth();
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return {
      isAuthenticated: !!token,
      token,
    };
  },

  component: RootDocument,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "TierHub",
      },
    ],
  }),
});
