import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParticipantsPanel } from "@/components/interview/ParticipantsPanel";
import { PromptPanel } from "@/components/interview/PromptPanel";
import { auth, openSessionChannel, participantsApi, sessionsApi } from "@/lib/backend-client";
import type { InterviewSession, SessionParticipant, User } from "@/lib/domain";

export const Route = createFileRoute("/lobby/$sessionId")({
  head: () => ({
    meta: [
      { title: "Session lobby — DesignInterview" },
      {
        name: "description",
        content:
          "Share the candidate invitation link, watch participants arrive, review the prompt, and start the interview.",
      },
      { property: "og:title", content: "Session lobby — DesignInterview" },
      {
        property: "og:description",
        content: "Copy the join link and start the interview when your candidate arrives.",
      },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    const current = auth.currentUser();
    if (!current) {
      void navigate({ to: "/", replace: true });
      return;
    }
    setUser(current);
    void refresh();
  }, [navigate, refresh]);

  useEffect(() => openSessionChannel(sessionId, () => void refresh()), [sessionId, refresh]);
  useEffect(() => {
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const joinUrl =
    session && typeof window !== "undefined"
      ? new URL(`/join/${session.invitationToken}`, window.location.origin).toString()
      : "";

  const copy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Invitation link copied");
    setTimeout(() => setCopied(false), 2000);
  };

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
        <p className="p-8 text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{session.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: <span className="capitalize">{session.status}</span> · invitation expires{" "}
              {new Date(session.expiresAt).toLocaleString()}
            </p>
          </div>

          <div className="panel space-y-3 p-4">
            <Label htmlFor="join-link">Candidate invitation link</Label>
            <div className="flex gap-2">
              <Input id="join-link" readOnly value={joinUrl} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={copy}
                aria-label="Copy invitation link"
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidates join as guests with just a display name — no account required.
            </p>
          </div>

          <div className="panel">
            <PromptPanel prompt={session.prompt} />
          </div>

          <div className="flex gap-2">
            <Link to="/interview/$sessionId" params={{ sessionId: session.id }}>
              <Button>
                <Play className="mr-1.5 h-4 w-4" aria-hidden />
                Enter interview room
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={async () => {
                await sessionsApi.transition(session.id, "cancel");
                toast.success("Interview cancelled");
                void navigate({ to: "/dashboard" });
              }}
            >
              Cancel interview
            </Button>
          </div>
        </section>

        <aside className="panel h-fit">
          <ParticipantsPanel
            participants={participants}
            canManage
            onRemove={async (id) => {
              await participantsApi.remove(session.id, id);
              void refresh();
            }}
          />
        </aside>
      </main>
    </div>
  );
}
