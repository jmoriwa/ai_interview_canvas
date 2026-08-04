import hashlib
import secrets
from dataclasses import dataclass

from fastapi import Cookie, Depends, Header, HTTPException, status
from pwdlib import PasswordHash


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@dataclass(frozen=True)
class Principal:
    kind: str
    id: str
    session_id: str | None = None


def _bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    return token if scheme.lower() == "bearer" and token else None


def optional_principal(
    authorization: str | None = Header(default=None),
    session_cookie: str | None = Cookie(default=None, alias="designinterview_session"),
) -> Principal | None:
    from .store import store

    token = _bearer(authorization) or session_cookie
    if not token:
        return None
    digest = token_digest(token)
    if user_id := store.user_tokens.get(digest):
        return Principal("user", user_id)
    if participant_id := store.participant_tokens.get(digest):
        participant = store.participants.get(participant_id)
        if participant:
            return Principal("participant", participant_id, participant.session_id)
    return None


def require_principal(principal: Principal | None = Depends(optional_principal)) -> Principal:
    if principal is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication is required")
    return principal


def require_user(principal: Principal = Depends(require_principal)) -> Principal:
    if principal.kind != "user":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Interviewer access is required")
    return principal


def require_participant(principal: Principal = Depends(require_principal)) -> Principal:
    if principal.kind != "participant":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Participant access is required")
    return principal

