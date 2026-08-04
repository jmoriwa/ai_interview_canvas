import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, sessionsApi } from "@/lib/backend-client";
import { TEMPLATES, getTemplate } from "@/lib/templates";
import type { User } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "Create an interview — DesignInterview" },
      {
        name: "description",
        content:
          "Set the prompt, duration, canvas permissions and starter template, then generate a candidate invitation link.",
      },
      { property: "og:title", content: "Create an interview — DesignInterview" },
      {
        property: "og:description",
        content: "Pick a template, write the prompt, and get a shareable candidate link.",
      },
    ],
  }),
  component: CreateInterviewPage,
});

const schema = z.object({
  title: z.string().trim().min(3, "Give the interview a title").max(120),
  question: z.string().trim().min(10, "Describe the system-design question").max(2000),
  candidateReference: z.string().trim().max(120),
});

const firstTemplate = TEMPLATES.find((t) => t.id !== "blank") ?? TEMPLATES[0]!;

function CreateInterviewPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [templateId, setTemplateId] = useState(firstTemplate.id);
  const [title, setTitle] = useState(firstTemplate.prompt.title);
  const [question, setQuestion] = useState(firstTemplate.prompt.question);
  const [requirements, setRequirements] = useState(firstTemplate.prompt.requirements.join("\n"));
  const [constraints, setConstraints] = useState(firstTemplate.prompt.constraints.join("\n"));
  const [followUps, setFollowUps] = useState(firstTemplate.prompt.followUps.join("\n"));
  const [candidate, setCandidate] = useState("");
  const [duration, setDuration] = useState(String(firstTemplate.defaultDurationSeconds));
  const [expiresIn, setExpiresIn] = useState("48");
  const [candidateEditing, setCandidateEditing] = useState(true);
  const [observerEditing, setObserverEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const current = auth.currentUser();
    if (!current) void navigate({ to: "/", replace: true });
    else setUser(current);
  }, [navigate]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = getTemplate(id);
    if (!t) return;
    setTitle(t.prompt.title);
    setQuestion(t.prompt.question);
    setRequirements(t.prompt.requirements.join("\n"));
    setConstraints(t.prompt.constraints.join("\n"));
    setFollowUps(t.prompt.followUps.join("\n"));
    setDuration(String(t.defaultDurationSeconds));
  };

  const lines = (value: string) =>
    value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ title, question, candidateReference: candidate });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        map[String(i.path[0])] = i.message;
      });
      setErrors(map);
      return;
    }
    setErrors({});
    setBusy(true);
    const session = await sessionsApi.create({
      title: parsed.data.title,
      candidateReference: parsed.data.candidateReference,
      prompt: {
        title: parsed.data.title,
        question: parsed.data.question,
        requirements: lines(requirements),
        constraints: lines(constraints),
        followUps: lines(followUps),
        revealedFollowUps: 0,
      },
      durationSeconds: duration === "none" ? null : Number(duration),
      candidateEditingEnabled: candidateEditing,
      observerEditingEnabled: observerEditing,
      expiresInHours: Number(expiresIn),
      templateId,
    });
    toast.success("Interview created — share the candidate link");
    void navigate({ to: "/lobby/$sessionId", params: { sessionId: session.id } });
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold">New interview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything here can be adjusted later from the session lobby.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-6">
          <section className="panel p-4">
            <h2 className="font-display text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Template
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id)}
                  aria-pressed={templateId === t.id}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    templateId === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.summary}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="panel grid gap-4 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Interview title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
              {errors["title"] ? (
                <p className="text-xs text-destructive">{errors["title"]}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="question">Interview prompt</Label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              {errors["question"] ? (
                <p className="text-xs text-destructive">{errors["question"]}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={5}
                />
                <p className="text-[11px] text-muted-foreground">One per line.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="constraints">Constraints</Label>
                <Textarea
                  id="constraints"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  rows={5}
                />
                <p className="text-[11px] text-muted-foreground">Scale, SLA, budget.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="followups">Follow-ups</Label>
                <Textarea
                  id="followups"
                  value={followUps}
                  onChange={(e) => setFollowUps(e.target.value)}
                  rows={5}
                />
                <p className="text-[11px] text-muted-foreground">Revealed one at a time.</p>
              </div>
            </div>
          </section>

          <section className="panel grid gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="candidate">Candidate name or reference</Label>
              <Input
                id="candidate"
                value={candidate}
                onChange={(e) => setCandidate(e.target.value)}
                placeholder="Optional"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Expected duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1800">30 minutes</SelectItem>
                  <SelectItem value="2700">45 minutes</SelectItem>
                  <SelectItem value="3600">60 minutes</SelectItem>
                  <SelectItem value="5400">90 minutes</SelectItem>
                  <SelectItem value="none">No limit (count up)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires">Invitation expires in</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <Label htmlFor="candidate-edit">Candidate can edit the canvas</Label>
                <Switch
                  id="candidate-edit"
                  checked={candidateEditing}
                  onCheckedChange={setCandidateEditing}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <Label htmlFor="observer-edit">Observers can edit the canvas</Label>
                <Switch
                  id="observer-edit"
                  checked={observerEditing}
                  onCheckedChange={setObserverEditing}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => void navigate({ to: "/dashboard" })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create interview"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
