import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InterviewPrompt } from "@/lib/domain";

interface Props {
  prompt: InterviewPrompt;
  canReveal?: boolean | undefined;
  onReveal?: (() => void) | undefined;
}

export function PromptPanel({ prompt, canReveal, onReveal }: Props) {
  const revealed = prompt.followUps.slice(0, prompt.revealedFollowUps);
  const hidden = prompt.followUps.length - prompt.revealedFollowUps;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-display text-base font-semibold">{prompt.title || "Interview prompt"}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{prompt.question}</p>
      </div>

      {prompt.requirements.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Requirements
          </h4>
          <ul className="mt-1.5 space-y-1 text-sm">
            {prompt.requirements.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="text-primary" aria-hidden>
                  •
                </span>
                {r}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {prompt.constraints.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Constraints
          </h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {prompt.constraints.map((c) => (
              <Badge key={c} variant="outline" className="font-mono text-[11px]">
                {c}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {prompt.followUps.length > 0 ? (
        <section>
          <h4 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Follow-up questions
          </h4>
          <ol className="mt-1.5 space-y-1.5 text-sm">
            {revealed.map((f, i) => (
              <li key={f} className="rounded-md border border-border bg-secondary/60 px-2.5 py-1.5">
                <span className="mr-1.5 font-mono text-xs text-primary">{i + 1}.</span>
                {f}
              </li>
            ))}
          </ol>
          {canReveal && hidden > 0 ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={onReveal}>
              <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Reveal next ({hidden} hidden)
            </Button>
          ) : null}
          {!canReveal && revealed.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your interviewer will share follow-up questions as you go.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}