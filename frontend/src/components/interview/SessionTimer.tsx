import { useEffect, useState } from "react";
import { Pause, Play, Plus, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { elapsedSeconds, formatClock, type InterviewSession } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface Props {
  session: InterviewSession;
  canControl?: boolean | undefined;
  onCommand?: ((command: "start" | "pause" | "reset" | "add_time") => void) | undefined;
  compact?: boolean | undefined;
}

/**
 * Timer display derived from server-authoritative fields
 * (timerStartedAt + timerAccumulatedSeconds), never a local-only clock.
 */
export function SessionTimer({ session, canControl, onCommand, compact }: Props) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = elapsedSeconds(session);
  const countdown = session.durationSeconds !== null;
  const remaining = countdown ? session.durationSeconds! - elapsed : elapsed;
  const running = Boolean(session.timerStartedAt);
  const overtime = countdown && remaining < 0;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 py-1",
          overtime && "border-destructive/60 text-destructive",
          running && !overtime && "border-primary/50",
        )}
        role="timer"
        aria-live="off"
      >
        <Timer className="h-3.5 w-3.5" aria-hidden />
        <span className="font-mono text-sm tabular-nums">
          {overtime ? "-" : ""}
          {formatClock(Math.abs(remaining))}
        </span>
        {!compact ? (
          <span className="text-[11px] text-muted-foreground">
            {countdown ? "remaining" : "elapsed"}
          </span>
        ) : null}
      </div>
      {canControl ? (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onCommand?.(running ? "pause" : "start")}
            aria-label={running ? "Pause timer" : "Start timer"}
          >
            {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onCommand?.("reset")}
            aria-label="Reset timer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onCommand?.("add_time")}
            aria-label="Add five minutes"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </>
      ) : null}
    </div>
  );
}