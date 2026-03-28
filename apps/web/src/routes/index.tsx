import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@tierhub/ui/components/button";
import { Input } from "@tierhub/ui/components/input";
import { useCallback, useState } from "react";

const HomeComponent = () => {
  const navigate = useNavigate({ from: "/" });
  const [username, setUsername] = useState("");

  const handleUsernameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(event.target.value);
    },
    []
  );

  const handleRankProjects = useCallback(() => {
    const nextUsername = username.trim();
    if (!nextUsername) {
      return;
    }

    navigate({
      search: {
        username: nextUsername,
      },
      to: "/rank",
    });
  }, [navigate, username]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section className="space-y-8">
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-300">
            Rank GitHub projects with a shareable README image
          </p>
          <h1 className="max-w-4xl text-6xl font-semibold tracking-tight sm:text-7xl">
            Turn a GitHub profile into a living tier list.
          </h1>
          <p className="max-w-2xl text-xl text-zinc-600 dark:text-zinc-300">
            TierHub lets creators choose the repositories they want feedback on,
            collect public rankings, and publish a dynamic tier list image
            directly inside a README.
          </p>
        </div>

        <div className="flex max-w-2xl flex-col gap-4 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:flex-row">
          <Input
            value={username}
            onChange={handleUsernameChange}
            placeholder="Enter a GitHub username"
            className="h-12 flex-1 rounded-full px-5 text-base"
          />
          <Button
            className="h-12 rounded-full px-6 text-base"
            onClick={handleRankProjects}
          >
            Rank projects
          </Button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="space-y-4">
          <p className="text-xl text-zinc-600 dark:text-zinc-300">
            README image flow
          </p>
          <div className="overflow-hidden rounded-sm border border-black/60 bg-[#0d1117]">
            {[
              { color: "#f87171", items: ["react-from-scratch"], tier: "S" },
              {
                color: "#fdba74",
                items: ["rust-systems", "react-locator"],
                tier: "A",
              },
              { color: "#fde68a", items: ["personal-site"], tier: "B" },
            ].map((row) => (
              <div
                key={row.tier}
                className="grid min-h-[110px] grid-cols-[112px_1fr] border-b border-white/10 last:border-b-0"
              >
                <div
                  className="flex items-center justify-center text-5xl font-semibold text-slate-900"
                  style={{ backgroundColor: row.color }}
                >
                  {row.tier}
                </div>
                <div className="flex flex-wrap gap-4 bg-[#0d1117] p-4">
                  {row.items.map((item) => (
                    <div
                      key={item}
                      className="min-w-[220px] rounded-sm border border-white/6 bg-white/12 px-4 py-3 text-white"
                    >
                      <p className="text-lg font-semibold">{item}</p>
                      <p className="text-sm text-zinc-300">
                        Community-ranked from live votes
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-black/30 dark:text-zinc-300">
            ![Tier List](https://yourapp.com/tier-image?username=your-handle)
          </pre>
        </div>
      </section>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
