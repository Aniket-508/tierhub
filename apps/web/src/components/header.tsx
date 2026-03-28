import { Link } from "@tanstack/react-router";
import { api } from "@tierhub/backend/convex/_generated/api";
import { Button } from "@tierhub/ui/components/button";
import { useQuery } from "convex/react";

import UserMenu from "@/components/user-menu";

export default function Header() {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const links = [
    { label: "Home", to: "/" },
    { label: "Dashboard", to: "/dashboard" },
  ] as const;

  return (
    <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-semibold tracking-tight">
            TierHub
          </Link>
          <nav className="flex gap-5 text-base text-zinc-600 dark:text-zinc-300">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="[&.active]:font-medium [&.active]:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <UserMenu />
          ) : (
            <Link to="/dashboard">
              <Button className="rounded-full px-4">Sign in with GitHub</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
