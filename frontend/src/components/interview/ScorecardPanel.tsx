import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { evaluationsApi } from "@/lib/backend-client";
import {
  RECOMMENDATION_LABELS,
  SCORECARD_CATEGORIES,
  type Evaluation,
  type Recommendation,
  type ScorecardCategory,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  sessionId: string;
  readOnly?: boolean | undefined;
}

export function ScorecardPanel({ sessionId, readOnly }: Props) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void evaluationsApi.get(sessionId).then((e) => active && setEvaluation(e));
    return () => {
      active = false;
    };
  }, [sessionId]);

  const patch = (next: Partial<Evaluation>) => {
    setEvaluation((prev) => (prev ? { ...prev, ...next } : prev));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void evaluationsApi.save(sessionId, next), 500);
  };

  const setRating = (category: ScorecardCategory, value: number) => {
    if (!evaluation) return;
    patch({ ratings: { ...evaluation.ratings, [category]: value } });
  };

  const setComment = (category: ScorecardCategory, value: string) => {
    if (!evaluation) return;
    patch({ comments: { ...evaluation.comments, [category]: value } });
  };

  if (!evaluation) return <p className="p-4 text-sm text-muted-foreground">Loading scorecard…</p>;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-display text-sm font-semibold">Evaluation scorecard</h3>
        <p className="text-[11px] text-muted-foreground">Never visible to candidates.</p>
      </div>

      <div className="space-y-3">
        {SCORECARD_CATEGORIES.map((category) => (
          <div key={category} className="rounded-md border border-border bg-secondary/40 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium">{category}</span>
              <div className="flex gap-1" role="group" aria-label={`${category} rating`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setRating(category, n)}
                    aria-label={`${category}: ${n} of 5`}
                    aria-pressed={evaluation.ratings[category] === n}
                    className={cn(
                      "h-6 w-6 rounded border font-mono text-[11px] transition-colors",
                      evaluation.ratings[category] === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/60",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Input
              value={evaluation.comments[category] ?? ""}
              onChange={(e) => setComment(category, e.target.value)}
              readOnly={readOnly}
              placeholder="Comment (optional)"
              aria-label={`${category} comment`}
              className="mt-2 h-8 text-xs"
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Overall recommendation
        </label>
        <Select
          value={evaluation.overallRecommendation}
          onValueChange={(v) => patch({ overallRecommendation: v as Recommendation })}
          disabled={readOnly ?? false}
        >
          <SelectTrigger aria-label="Overall recommendation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RECOMMENDATION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!readOnly ? (
        <Button
          className="w-full"
          onClick={async () => {
            await evaluationsApi.save(sessionId, { submittedAt: new Date().toISOString() });
            setEvaluation((prev) =>
              prev ? { ...prev, submittedAt: new Date().toISOString() } : prev,
            );
            toast.success("Evaluation submitted");
          }}
        >
          {evaluation.submittedAt ? "Update evaluation" : "Submit evaluation"}
        </Button>
      ) : null}
      {evaluation.submittedAt ? (
        <p className="text-[11px] text-muted-foreground">
          Submitted {new Date(evaluation.submittedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
