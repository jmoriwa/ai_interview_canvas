import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Cloud, CloudOff, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  DesignCanvas,
  type CanvasTool,
  type Viewport,
} from "@/components/canvas/DesignCanvas";
import { CanvasToolbar } from "@/components/interview/CanvasToolbar";
import { ComponentLibraryPanel } from "@/components/interview/ComponentLibraryPanel";
import { NotesPanel } from "@/components/interview/NotesPanel";
import { ParticipantsPanel } from "@/components/interview/ParticipantsPanel";
import { PromptPanel } from "@/components/interview/PromptPanel";
import { ScorecardPanel } from "@/components/interview/ScorecardPanel";
import { SessionTimer } from "@/components/interview/SessionTimer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCanvasDocument } from "@/hooks/useCanvasDocument";
import { auth, openSessionChannel, participantsApi, sessionsApi } from "@/lib/mock-backend";
import type { InterviewSession, ParticipantRole, SessionParticipant } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interview/$sessionId")({
  head: () => ({
    meta: [
      { title: "Interview room — DesignInterview" },
      {
        name: "description",
        content:
          "The shared design canvas: drop components, draw connectors, track the timer, and capture private notes and scores.",
      },
      { property: "og:title", content: "Interview room — DesignInterview" },
      {
        property: "og:description",
        content: "Diagram the architecture together on a live shared canvas.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterviewRoom,
});

const PARTICIPANT_KEY = "designinterview.participant";

interface LocalParticipant {
  id: string;
  role: ParticipantRole;
  displayName: string;
}

function readLocalParticipant(sessionId: string): LocalParticipant | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${PARTICIPANT_KEY}.${sessionId}`);
  return raw ? (JSON.parse(raw) as LocalParticipant) : null;
}

function InterviewRoom() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [me, setMe] = useState<LocalParticipant | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tool, setTool] = useState<CanvasTool>("select");
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [selection, setSelection] = useState<string[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [strokeColor, setStrokeColor] = useState("oklch(0.95 0.01 250)");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [recent, setRecent] = useState<string[]>([]);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const { doc, setDocument, saveState, undo, redo } = useCanvasDocument(sessionId);

  const refresh = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        sessionsApi.get(sessionId),
        participantsApi.list(sessionId),
      ]);
      setSession(s);
      setParticipants(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this session.");
    }
  }, [sessionId]);

  useEffect(() => {
    const local = readLocalParticipant(sessionId);
    const user = auth.currentUser();
    if (local) setMe(local);
    else if (user)
      setMe({ id: `owner_${user.id}`, role: "interviewer", displayName: user.displayName });
    else {
      void navigate({ to: "/", replace: true });
      return;
    }
    void refresh();
  }, [sessionId, navigate, refresh]);

  useEffect(() => openSessionChannel(sessionId, () => void refresh()), [sessionId, refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
      if (me && !me.id.startsWith("owner_")) participantsApi.heartbeat(me.id);
    }, 5000);
    return () => clearInterval(id);
  }, [refresh, me]);

  const isInterviewer = me?.role === "interviewer";
  const canEdit = useMemo(() => {
    if (!session || !me) return false;
    if (session.status === "completed" || session.status === "cancelled") return false;
    if (me.role === "interviewer") return true;
    if (me.role === "candidate") return session.candidateEditingEnabled;
    return session.observerEditingEnabled;
  }, [session, me]);

  const zoomBy = (delta: number) =>
    setViewport((v) => {
      const rect = canvasWrapRef.current?.getBoundingClientRect();
      const cx = (rect?.width ?? 800) / 2;
      const cy = (rect?.height ?? 600) / 2;
      const next = Math.min(3, Math.max(0.2, v.zoom * (1 + delta)));
      const k = next / v.zoom;
      return { x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k, zoom: next };
    });

  const zoomToFit = () => {
    const rect = canvasWrapRef.current?.getBoundingClientRect();
    if (!rect || doc.nodes.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const minX = Math.min(...doc.nodes.map((n) => n.x));
    const minY = Math.min(...doc.nodes.map((n) => n.y));
    const maxX = Math.max(...doc.nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...doc.nodes.map((n) => n.y + n.height));
    const pad = 80;
    const zoom = Math.min(
      3,
      Math.max(0.2, Math.min(rect.width / (maxX - minX + pad), rect.height / (maxY - minY + pad))),
    );
    setViewport({
      x: rect.width / 2 - ((minX + maxX) / 2) * zoom,
      y: rect.height / 2 - ((minY + maxY) / 2) * zoom,
      zoom,
    });
  };

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">{error}</h1>
        <Link to="/dashboard">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </main>
    );
  }

  if (!session || !me) {
    return <p className="p-8 text-sm text-muted-foreground">Joining interview room…</p>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-2">
        <Link to={isInterviewer ? "/dashboard" : "/"} className="font-display text-sm font-semibold">
          DesignInterview
        </Link>
        <span className="truncate text-sm text-muted-foreground">{session.title}</span>
        <Badge variant="outline" className="text-[10px] capitalize">
          {me.role}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1 text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            {saveState === "error" ? (
              <CloudOff className="h-3.5 w-3.5 text-destructive" aria-hidden />
            ) : (
              <Cloud className="h-3.5 w-3.5" aria-hidden />
            )}
            {saveState === "pending" ? "Saving…" : saveState === "error" ? "Save failed" : "Saved"}
          </span>
          <SessionTimer
            session={session}
            canControl={isInterviewer}
            compact
            onCommand={async (command) => {
              const next = await sessionsApi.timer(session.id, command);
              setSession(next);
            }}
          />
          {isInterviewer ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const next = await sessionsApi.setPermission(
                    session.id,
                    session.candidateEditingEnabled ? "interviewers_only" : "candidate_and_interviewers",
                  );
                  setSession(next);
                }}
              >
                {session.candidateEditingEnabled ? (
                  <Unlock className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                )}
                Candidate editing
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await sessionsApi.transition(session.id, "complete");
                  toast.success("Interview completed");
                  void navigate({ to: "/review/$sessionId", params: { sessionId: session.id } });
                }}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                End interview
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
          <ComponentLibraryPanel
            disabled={!canEdit}
            recent={recent}
            onUse={(def) => {
              if (!canEdit) return;
              const rect = canvasWrapRef.current?.getBoundingClientRect();
              const cx = ((rect?.width ?? 900) / 2 - viewport.x) / viewport.zoom;
              const cy = ((rect?.height ?? 600) / 2 - viewport.y) / viewport.zoom;
              setDocument({
                ...doc,
                nodes: [
                  ...doc.nodes,
                  {
                    id: `n_${Math.random().toString(36).slice(2, 9)}`,
                    kind: "component",
                    componentType: def.type,
                    label: def.label,
                    x: Math.round(cx - 84),
                    y: Math.round(cy - 46),
                    width: 168,
                    height: 92,
                    color: "oklch(0.79 0.13 195)",
                  },
                ],
              });
              setRecent((r) => [def.type, ...r.filter((t) => t !== def.type)].slice(0, 8));
            }}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <CanvasToolbar
            tool={tool}
            onToolChange={setTool}
            disabled={!canEdit}
            strokeColor={strokeColor}
            onStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            onStrokeWidth={setStrokeWidth}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((v) => !v)}
            onUndo={undo}
            onRedo={redo}
            onZoom={zoomBy}
            onZoomToFit={zoomToFit}
            zoom={viewport.zoom}
          />
          <div ref={canvasWrapRef} className="relative min-h-0 flex-1">
            <DesignCanvas
              document={doc}
              onChange={setDocument}
              tool={tool}
              onToolChange={setTool}
              readOnly={!canEdit}
              showGrid={showGrid}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              viewport={viewport}
              onViewportChange={setViewport}
              selection={selection}
              onSelectionChange={setSelection}
              className="absolute inset-0"
            />
            {!canEdit ? (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground">
                View only — the interviewer controls canvas editing
              </div>
            ) : null}
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 border-l border-border bg-card xl:block">
          <Tabs defaultValue="prompt" className="flex h-full flex-col">
            <TabsList className={cn("m-2 grid", isInterviewer ? "grid-cols-4" : "grid-cols-2")}>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
              {isInterviewer ? <TabsTrigger value="notes">Notes</TabsTrigger> : null}
              {isInterviewer ? <TabsTrigger value="score">Score</TabsTrigger> : null}
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="prompt">
                <PromptPanel
                  prompt={session.prompt}
                  canReveal={isInterviewer}
                  onReveal={async () => {
                    const next = await sessionsApi.revealFollowUp(session.id);
                    setSession(next);
                  }}
                />
              </TabsContent>
              <TabsContent value="people">
                <ParticipantsPanel
                  participants={participants}
                  currentParticipantId={me.id}
                  canManage={isInterviewer}
                  onRemove={async (id) => {
                    await participantsApi.remove(session.id, id);
                    void refresh();
                  }}
                />
              </TabsContent>
              {isInterviewer ? (
                <>
                  <TabsContent value="notes">
                    <NotesPanel sessionId={session.id} />
                  </TabsContent>
                  <TabsContent value="score">
                    <ScorecardPanel sessionId={session.id} />
                  </TabsContent>
                </>
              ) : null}
            </div>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}