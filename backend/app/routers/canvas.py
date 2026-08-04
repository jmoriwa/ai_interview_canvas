from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import Principal, require_principal
from ..dependencies import authorize, get_session
from ..models import CanvasDocument, ParticipantRole
from ..store import store

router = APIRouter(prefix="/sessions", tags=["Canvas"])


def can_edit(session, principal: Principal) -> bool:
    if principal.kind == "user":
        return principal.id == session.owner_user_id
    participant = store.participants.get(principal.id)
    if not participant:
        return False
    if session.canvas_permission.value in {"owner_only", "interviewers_only"}:
        return False
    if participant.role == ParticipantRole.candidate:
        return session.candidate_editing_enabled
    if participant.role == ParticipantRole.observer:
        return session.canvas_permission.value == "everyone" and session.observer_editing_enabled
    return session.canvas_permission.value in {"everyone", "candidate_and_interviewers"}


@router.get("/{session_id}/canvas", response_model=CanvasDocument)
def get_canvas(session_id: str, principal: Principal = Depends(require_principal)) -> CanvasDocument:
    session = get_session(session_id)
    authorize(session, principal)
    return store.canvases[session_id]


@router.put("/{session_id}/canvas", response_model=CanvasDocument)
def save_canvas(session_id: str, body: CanvasDocument, principal: Principal = Depends(require_principal)) -> CanvasDocument:
    session = get_session(session_id)
    authorize(session, principal)
    if not can_edit(session, principal):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Canvas is read-only for this participant")
    current = store.canvases[session_id]
    if body.version != current.version:
        raise HTTPException(status.HTTP_409_CONFLICT, "Canvas version conflict")
    saved = body.model_copy(update={"version": current.version + 1})
    store.canvases[session_id] = saved
    return saved

