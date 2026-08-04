from uuid import uuid4

from fastapi import APIRouter, HTTPException, Response, status

from ..dependencies import ensure_invitation
from ..models import InterviewSession, JoinInvitationRequest, SessionParticipant
from ..store import store, utcnow

router = APIRouter(prefix="/invitations", tags=["Invitations"])


def by_token(token: str) -> InterviewSession:
    session = next((s for s in store.sessions.values() if s.invitation_token == token), None)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitation not found")
    ensure_invitation(session)
    return session


@router.get("/{token}", response_model=InterviewSession)
def resolve(token: str) -> InterviewSession:
    return by_token(token)


@router.post("/{token}/join", response_model=SessionParticipant, status_code=201)
def join(token: str, body: JoinInvitationRequest, response: Response) -> SessionParticipant:
    session = by_token(token)
    if body.role == "candidate" and any(p.session_id == session.id and p.role == "candidate" for p in store.participants.values()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This session already has a candidate")
    now, pid = utcnow(), f"participant-{uuid4().hex[:12]}"
    colors = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981"]
    participant = SessionParticipant(
        id=pid, sessionId=session.id, displayName=body.display_name, role=body.role,
        presenceColor=colors[len(store.participants) % len(colors)], connected=True, joinedAt=now, lastSeenAt=now,
    )
    store.participants[pid] = participant
    bearer = store.issue_participant_token(pid)
    response.headers["X-Participant-Token"] = bearer
    return participant

