import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/mock-backend";

export function AppHeader({ user }: { user: { displayName: string } | null }) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
      <Link to="/dashboard" className="flex items-center gap-2">
        <Network className="h-5 w-5 text-primary" aria-hidden />
        <span className="font-display text-sm font-semibold tracking-tight">DesignInterview</span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Dashboard
        </Link>
        <Link to="/new">
          <Button size="sm">New interview</Button>
        </Link>
        {user ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await auth.logout();
              void navigate({ to: "/", replace: true });
            }}
            aria-label="Sign out"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {user.displayName}
          </Button>
        ) : null}
      </nav>
    </header>
  );
}