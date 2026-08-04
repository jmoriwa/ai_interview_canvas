import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock, ClipboardCheck, Plus, Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, sessionsApi } from "@/lib/backend-client";
import type { InterviewSession, SessionStatus, User } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Interview dashboard — DesignInterview" },
      {
        name: "description",
        content:
          "See active, completed and draft system-design interviews, filter by candidate, and start a new session.",
      },
      { property: "og:title", content: "Interview dashboard — DesignInterview" },
      {
        property: "og:description",
        content: "Track your system-design interviews and evaluations in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

const STATUS_STYLE: Record<SessionStatus, string> = {
  draft: "border-border text-muted-foreground",
  waiting: "border-accent/60 text-accent",
  active: "border-success/60 text-success",
  paused: "border-accent/60 text-accent",
  completed: "border-primary/60 text-primary",
  expired: "border-border text-muted-foreground",
  cancelled: "border-destructive/60 text-destructive",
};

type Filter = "all" | "active" | "completed" | "draft";

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const current = auth.currentUser();
    if (!current) {
      void navigate({ to: "/", replace: true });
      return;
    }
    setUser(current);
    void sessionsApi.list().then((list) => {
      setSessions(list);
      setLoading(false);
    });
  }, [navigate]);

  const filtered = useMemo(
    () =>
      sessions.filter((s) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "active" &&
            (s.status === "active" || s.status === "waiting" || s.status === "paused")) ||
          (filter === "completed" && s.status === "completed") ||
          (filter === "draft" && s.status === "draft");
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q || s.title.toLowerCase().includes(q) || s.candidateReference.toLowerCase().includes(q);
        return matchesFilter && matchesQuery;
      }),
    [sessions, filter, query],
  );

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Interviews</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a session, share the candidate link, and review completed interviews.
            </p>
          </div>
          <Link to="/new">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              New interview
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(["all", "active", "completed", "draft"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                filter === f
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by candidate or title"
            aria-label="Filter interviews"
            className="ml-auto h-9 w-full max-w-xs"
          />
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading interviews…</p>
        ) : filtered.length === 0 ? (
          <div className="panel mt-6 p-10 text-center">
            <p className="text-sm text-muted-foreground">No interviews match this view yet.</p>
            <Link to="/new">
              <Button variant="outline" className="mt-4">
                Create your first interview
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {filtered.map((s) => (
              <li key={s.id} className="panel flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{s.title}</h2>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] capitalize", STATUS_STYLE[s.status])}
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {s.candidateReference || "No candidate name"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                      {s.status === "completed" ? "Evaluation ready" : "Not evaluated"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {s.status === "completed" || s.status === "cancelled" ? (
                    <Link to="/review/$sessionId" params={{ sessionId: s.id }}>
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/lobby/$sessionId" params={{ sessionId: s.id }}>
                        <Button size="sm" variant="outline">
                          Lobby
                        </Button>
                      </Link>
                      <Link to="/interview/$sessionId" params={{ sessionId: s.id }}>
                        <Button size="sm">Open canvas</Button>
                      </Link>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
