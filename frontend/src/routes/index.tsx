import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Network, PenLine, Share2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/backend-client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — DesignInterview" },
      {
        name: "description",
        content:
          "Sign in to create collaborative system-design interviews with a shared canvas, timer, private notes and scorecards.",
      },
      { property: "og:title", content: "Sign in — DesignInterview" },
      {
        property: "og:description",
        content: "Create an interview in under 30 seconds and share one link with your candidate.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("alex@example.com");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.currentUser()) void navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setBusy(true);
    try {
      await auth.login(email, password);
      void navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="hero-surface grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-center gap-8 px-8 py-16 lg:px-16">
        <div className="flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" aria-hidden />
          <span className="font-display text-lg font-semibold">DesignInterview</span>
        </div>
        <div className="max-w-lg">
          <h1 className="text-4xl leading-tight font-semibold lg:text-5xl">
            System-design interviews on one shared canvas.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Create a session, send one link, and diagram architecture together in real time — with a
            server-authoritative timer, private notes, and a structured scorecard.
          </p>
        </div>
        <ul className="grid max-w-lg gap-3 text-sm">
          <Feature icon={Share2} title="One link to join">
            Candidates join as guests. No account, no install.
          </Feature>
          <Feature icon={PenLine} title="Components, arrows and freehand">
            Seventy system-design components plus pen, shapes, and sticky notes in one document
            model.
          </Feature>
          <Feature icon={Timer} title="Interview controls built in">
            Timer, canvas permissions, private notes, and a ten-dimension scorecard.
          </Feature>
        </ul>
      </section>

      <section className="flex items-center justify-center px-8 py-16">
        <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Interviewer sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your interviewer account.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Demo credentials are prefilled for local development.
          </p>
        </form>
      </section>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Share2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card/60 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}
