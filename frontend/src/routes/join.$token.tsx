import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { participantsApi, sessionsApi } from "@/lib/mock-backend";
import type { InterviewSession } from "@/lib/domain";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [
      { title: "Join your interview — DesignInterview" },
      {
        name: "description",
        content:
          "Enter your display name to join the collaborative system-design interview. No account or install needed.",
      },
      { property: "og:title", content: "Join your interview — DesignInterview" },
      {
        property: "og:description",
        content: "Enter a display name and join the shared design canvas.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JoinPage,
});

const PARTICIPANT_KEY = "designinterview.participant";

function JoinPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void sessionsApi
      .getByToken(token)
      .then(setSession)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "This invitation link is not valid."),
      );
  }, [token]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name.trim().slice(0, 60);
    if (!session || displayName.length < 2) return;
    setBusy(true);
    const participant = await participantsApi.join(session.id, displayName, "candidate");
    window.localStorage.setItem(
      `${PARTICIPANT_KEY}.${session.id}`,
      JSON.stringify({ id: participant.id, role: participant.role, displayName }),
    );
    void navigate({ to: "/interview/$sessionId", params: { sessionId: session.id }, replace: true });
  };

  return (
    <main className="hero-surface flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-md p-6">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" aria-hidden />
          <span className="font-display text-sm font-semibold">DesignInterview</span>
        </div>

        {error ? (
          <div className="mt-6">
            <h1 className="text-lg font-semibold">{error}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask your interviewer for a fresh invitation link.
            </p>
          </div>
        ) : !session ? (
          <p className="mt-6 text-sm text-muted-foreground">Checking your invitation…</p>
        ) : (
          <form onSubmit={join} className="mt-6 space-y-4">
            <div>
              <h1 className="text-xl font-semibold">{session.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You have been invited to a system-design interview. Enter the name your interviewer
                should see.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                required
                minLength={2}
                maxLength={60}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Joining…" : "Join interview"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Works best on a laptop with a mouse or trackpad.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}