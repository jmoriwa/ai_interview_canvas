import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParticipantRole, SessionParticipant } from "@/lib/domain";

const ROLE_LABEL: Record<ParticipantRole, string> = {
  interviewer: "Interviewer",
  candidate: "Candidate",
  observer: "Observer",
};

interface Props {
  participants: SessionParticipant[];
  currentParticipantId?: string | undefined;
  canManage?: boolean | undefined;
  onRemove?: ((participantId: string) => void) | undefined;
}

export function ParticipantsPanel({ participants, currentParticipantId, canManage, onRemove }: Props) {
  return (
    <div className="space-y-2 p-4">
      <h3 className="font-display text-sm font-semibold">Participants ({participants.length})</h3>
      <ul className="space-y-1.5">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-2"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: p.presenceColor }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">
                {p.displayName}
                {p.id === currentParticipantId ? " (you)" : ""}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {ROLE_LABEL[p.role]} · {p.connected ? "connected" : "disconnected"}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {p.connected ? "live" : "away"}
            </Badge>
            {canManage && p.id !== currentParticipantId ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onRemove?.(p.id)}
                aria-label={`Remove ${p.displayName}`}
              >
                <UserMinus className="h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : null}
          </li>
        ))}
        {participants.length === 0 ? (
          <li className="text-sm text-muted-foreground">Nobody has joined yet.</li>
        ) : null}
      </ul>
    </div>
  );
}