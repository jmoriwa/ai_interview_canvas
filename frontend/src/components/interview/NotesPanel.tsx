import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { notesApi } from "@/lib/backend-client";

interface Props {
  sessionId: string;
  readOnly?: boolean | undefined;
}

/** Interviewer-only notes. Fetched from a separate endpoint from canvas data. */
export function NotesPanel({ sessionId, readOnly }: Props) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"loading" | "saved" | "saving">("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void notesApi.get(sessionId).then((note) => {
      if (!active) return;
      setContent(note.content);
      setStatus("saved");
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const onChange = (value: string) => {
    setContent(value);
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void notesApi.save(sessionId, value).then(() => setStatus("saved"));
    }, 600);
  };

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold">
          <Lock className="h-3.5 w-3.5 text-accent" aria-hidden />
          Private notes
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Loading…"}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Never sent to candidate clients. Stored apart from the shared canvas.
      </p>
      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        aria-label="Private interviewer notes"
        placeholder="Observations, follow-ups to probe, signals…"
        className="min-h-[240px] flex-1 resize-none font-mono text-[13px] leading-relaxed"
      />
    </div>
  );
}
