from fastapi import HTTPException, status

from .auth import Principal
from .models import InterviewSession
from .store import store, utcnow


def get_session(session_id: str) -> InterviewSession:
    session = store.sessions.get(session_id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return session


def authorize(session: InterviewSession, principal: Principal, *, owner_only: bool = False) -> None:
    allowed = principal.kind == "user" and principal.id == session.owner_user_id
    if not owner_only:
        allowed = allowed or (principal.kind == "participant" and principal.session_id == session.id)
    if not allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this session")


def ensure_invitation(session: InterviewSession) -> None:
    if session.expires_at <= utcnow() or session.status.value in {"expired", "completed", "cancelled"}:
        raise HTTPException(status.HTTP_410_GONE, "Invitation is no longer available")

