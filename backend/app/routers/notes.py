from fastapi import APIRouter, Depends

from ..auth import Principal, require_user
from ..dependencies import authorize, get_session
from ..models import Evaluation, InterviewerNote, SaveNoteRequest, UpdateEvaluationRequest
from ..store import store, utcnow

router = APIRouter(prefix="/sessions", tags=["Notes", "Evaluations"])


@router.get("/{session_id}/notes", response_model=InterviewerNote)
def get_notes(session_id: str, user: Principal = Depends(require_user)) -> InterviewerNote:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    return store.notes.get((session_id, user.id)) or InterviewerNote(sessionId=session_id, content="", updatedAt=session.updated_at)


@router.put("/{session_id}/notes", response_model=InterviewerNote)
def save_notes(session_id: str, body: SaveNoteRequest, user: Principal = Depends(require_user)) -> InterviewerNote:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    note = InterviewerNote(sessionId=session_id, content=body.content, updatedAt=utcnow())
    store.notes[(session_id, user.id)] = note
    return note


@router.get("/{session_id}/evaluation", response_model=Evaluation)
def get_evaluation(session_id: str, user: Principal = Depends(require_user)) -> Evaluation:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    return store.evaluations.get((session_id, user.id)) or Evaluation(
        sessionId=session_id, ratings={}, comments={}, overallRecommendation="not_evaluated", submittedAt=None, updatedAt=session.updated_at,
    )


@router.patch("/{session_id}/evaluation", response_model=Evaluation)
def save_evaluation(session_id: str, body: UpdateEvaluationRequest, user: Principal = Depends(require_user)) -> Evaluation:
    current = get_evaluation(session_id, user)
    changes = body.model_dump(exclude_unset=True)
    changes["updated_at"] = utcnow()
    saved = current.model_copy(update=changes)
    store.evaluations[(session_id, user.id)] = saved
    return saved
