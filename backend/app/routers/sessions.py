from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from ..app_metrics import record_room_created
from ..auth import Principal, require_principal, require_user
from ..dependencies import authorize, get_session
from ..models import CanvasDocument, CreateSessionRequest, InterviewSession, SessionStatus, TimerCommandRequest, UpdateSessionRequest
from ..store import store, utcnow

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("", response_model=list[InterviewSession])
def list_sessions(user: Principal = Depends(require_user)) -> list[InterviewSession]:
    return [s for s in store.sessions.values() if s.owner_user_id == user.id]


@router.post("", response_model=InterviewSession, status_code=201)
def create_session(body: CreateSessionRequest, user: Principal = Depends(require_user)) -> InterviewSession:
    now, sid = utcnow(), f"session-{uuid4().hex[:12]}"
    session = InterviewSession(
        id=sid, ownerUserId=user.id, title=body.title, prompt=body.prompt,
        candidateReference=body.candidate_reference, status="waiting", durationSeconds=body.duration_seconds,
        timerStartedAt=None, timerAccumulatedSeconds=0,
        candidateEditingEnabled=body.candidate_editing_enabled, observerEditingEnabled=body.observer_editing_enabled,
        canvasPermission="candidate_and_interviewers", templateId=body.template_id,
        invitationToken=f"invite-{uuid4().hex}", startedAt=None, completedAt=None,
        expiresAt=now + timedelta(hours=body.expires_in_hours), createdAt=now, updatedAt=now,
    )
    store.sessions[sid] = session
    store.canvases[sid] = CanvasDocument(version=0, nodes=[], connectors=[], strokes=[])
    record_room_created()
    return session


@router.get("/{session_id}", response_model=InterviewSession)
def read_session(session_id: str, principal: Principal = Depends(require_principal)) -> InterviewSession:
    session = get_session(session_id)
    authorize(session, principal)
    return session


@router.patch("/{session_id}", response_model=InterviewSession)
def update_session(session_id: str, body: UpdateSessionRequest, user: Principal = Depends(require_user)) -> InterviewSession:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    changes = body.model_dump(exclude_unset=True)
    changes["updated_at"] = utcnow()
    updated = session.model_copy(update=changes)
    store.sessions[session_id] = updated
    return updated


def _transition(session_id: str, target: str, allowed: set[str], user: Principal) -> InterviewSession:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    if session.status.value not in allowed:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot {target} a {session.status.value} session")
    now = utcnow()
    changes: dict = {"status": SessionStatus(target), "updated_at": now}
    if target == "active":
        changes["started_at"] = session.started_at or now
        changes["timer_started_at"] = now
    if target == "paused":
        changes["timer_accumulated_seconds"] = _elapsed(session)
        changes["timer_started_at"] = None
    if target in {"completed", "cancelled"}:
        changes["timer_accumulated_seconds"] = _elapsed(session)
        changes["timer_started_at"] = None
        if target == "completed":
            changes["completed_at"] = now
    updated = session.model_copy(update=changes)
    store.sessions[session_id] = updated
    return updated


def _elapsed(session: InterviewSession) -> int:
    running = int((utcnow() - session.timer_started_at).total_seconds()) if session.timer_started_at else 0
    return session.timer_accumulated_seconds + max(running, 0)


@router.post("/{session_id}/start", response_model=InterviewSession)
def start(session_id: str, user: Principal = Depends(require_user)): return _transition(session_id, "active", {"draft", "waiting"}, user)

@router.post("/{session_id}/pause", response_model=InterviewSession)
def pause(session_id: str, user: Principal = Depends(require_user)): return _transition(session_id, "paused", {"active"}, user)

@router.post("/{session_id}/resume", response_model=InterviewSession)
def resume(session_id: str, user: Principal = Depends(require_user)): return _transition(session_id, "active", {"paused"}, user)

@router.post("/{session_id}/complete", response_model=InterviewSession)
def complete(session_id: str, user: Principal = Depends(require_user)): return _transition(session_id, "completed", {"active", "paused"}, user)

@router.post("/{session_id}/cancel", response_model=InterviewSession)
def cancel(session_id: str, user: Principal = Depends(require_user)): return _transition(session_id, "cancelled", {"draft", "waiting", "active", "paused"}, user)


@router.post("/{session_id}/timer", response_model=InterviewSession)
def timer(session_id: str, body: TimerCommandRequest, user: Principal = Depends(require_user)) -> InterviewSession:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    now, changes = utcnow(), {"updated_at": utcnow()}
    if body.command == "start" and session.timer_started_at is None:
        changes["timer_started_at"] = now
    elif body.command == "pause" and session.timer_started_at is not None:
        changes.update(timer_accumulated_seconds=_elapsed(session), timer_started_at=None)
    elif body.command == "reset":
        changes.update(timer_accumulated_seconds=0, timer_started_at=None)
    elif body.command == "add_time":
        changes["duration_seconds"] = (session.duration_seconds or 0) + body.seconds
    updated = session.model_copy(update=changes)
    store.sessions[session_id] = updated
    return updated


@router.post("/{session_id}/follow-ups/reveal", response_model=InterviewSession)
def reveal(session_id: str, user: Principal = Depends(require_user)) -> InterviewSession:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    prompt = session.prompt.model_copy(update={"revealed_follow_ups": min(session.prompt.revealed_follow_ups + 1, len(session.prompt.follow_ups))})
    updated = session.model_copy(update={"prompt": prompt, "updated_at": utcnow()})
    store.sessions[session_id] = updated
    return updated
