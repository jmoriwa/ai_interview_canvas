import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DesignCanvas, type Viewport } from "@/components/canvas/DesignCanvas";
import { NotesPanel } from "@/components/interview/NotesPanel";
import { PromptPanel } from "@/components/interview/PromptPanel";
import { ScorecardPanel } from "@/components/interview/ScorecardPanel";
import { canvasApi, auth, sessionsApi } from "@/lib/mock-backend";
import {
  emptyCanvasDocument,
  elapsedSeconds,
  formatClock,
  type CanvasDocument,
  type InterviewSession,
  type User,
} from "@/lib/domain";

export const Route = createFileRoute("/review/$sessionId")({
  head: () => ({
    meta: [
      { title: "Interview review — DesignInterview" },
      {
        name: "description",
        content:
          "Review the final architecture diagram, private notes and scorecard, then submit your hiring recommendation.",
      },
      { property: "og:title", content: "Interview review — DesignInterview" },
      {
        property: "og:description",
        content: "Read-only diagram replay with notes and a structured evaluation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [doc, setDoc] = useState<CanvasDocument>(emptyCanvasDocument);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([sessionsApi.get(sessionId), canvasApi.get(sessionId)]);
      setSession(s);
      setDoc(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this interview.");
    }
  }, [sessionId]);

  useEffect(() => {
    const current = auth.currentUser();
    if (!current) {
      void navigate({ to: "/", replace: true });
      return;
    }
    setUser(current);
    void load();
  }, [navigate, load]);

  if (error) {
    return (
      <div className="min-h-screen">
        <AppHeader user={user} />
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-xl font-semibold">{error}</h1>
          <Link to="/dashboard">
            <Button variant="outline" className="mt-4">
              Back to dashboard
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen">
        <AppHeader user={user} />
        <p className="p-8 text-sm text-muted-foreground">Loading review…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{session.title}</h1>
          <Badge variant="outline" className="capitalize">
            {session.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {session.candidateReference || "No candidate name"} · duration{" "}
            {formatClock(elapsedSeconds(session))}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section className="panel overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-xs tracking-wide uppercase text-muted-foreground">
              Final diagram (read only)
            </div>
            <div ref={wrapRef} className="relative h-[520px]">
              <DesignCanvas
                document={doc}
                onChange={() => {}}
                tool="pan"
                onToolChange={() => {}}
                readOnly
                showGrid
                viewport={viewport}
                onViewportChange={setViewport}
                selection={[]}
                onSelectionChange={() => {}}
                className="absolute inset-0"
              />
            </div>
          </section>

          <div className="grid gap-4">
            <section className="panel">
              <PromptPanel prompt={session.prompt} />
            </section>
            <section className="panel">
              <NotesPanel sessionId={session.id} readOnly />
            </section>
          </div>
        </div>

        <section className="panel mt-4">
          <ScorecardPanel sessionId={session.id} />
        </section>
      </main>
    </div>
  );
}