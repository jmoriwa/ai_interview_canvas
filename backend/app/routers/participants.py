from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..auth import Principal, require_participant, require_principal, require_user
from ..dependencies import authorize, get_session
from ..models import SessionParticipant
from ..store import store, utcnow

router = APIRouter(tags=["Participants"])


@router.get("/sessions/{session_id}/participants", response_model=list[SessionParticipant])
def list_participants(session_id: str, principal: Principal = Depends(require_principal)) -> list[SessionParticipant]:
    session = get_session(session_id)
    authorize(session, principal)
    return [p for p in store.participants.values() if p.session_id == session_id]


@router.delete("/sessions/{session_id}/participants/{participant_id}", status_code=204)
def remove(session_id: str, participant_id: str, user: Principal = Depends(require_user)) -> None:
    session = get_session(session_id)
    authorize(session, user, owner_only=True)
    participant = store.participants.get(participant_id)
    if not participant or participant.session_id != session_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")
    del store.participants[participant_id]
    store.revoke_participant_tokens(participant_id)


@router.post("/participants/{participant_id}/heartbeat", status_code=204)
def heartbeat(participant_id: str, principal: Principal = Depends(require_participant)) -> None:
    participant = store.participants.get(participant_id)
    if not participant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")
    if principal.id != participant_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Credential does not belong to this participant")
    store.participants[participant_id] = participant.model_copy(update={"connected": True, "last_seen_at": utcnow()})
