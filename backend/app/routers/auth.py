from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status

from ..auth import Principal, require_user, token_digest, verify_password
from ..models import LoginRequest, User
from ..store import store

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=User)
def login(body: LoginRequest, response: Response) -> User:
    user = next((u for u in store.users.values() if u.email.lower() == body.email.lower()), None)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    token = store.issue_user_token(user.id)
    response.set_cookie("designinterview_session", token, httponly=True, secure=False, samesite="lax")
    response.headers["X-Access-Token"] = token
    return User(id=user.id, email=user.email, displayName=user.display_name)


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    principal: Principal = Depends(require_user),
    cookie: str | None = Cookie(default=None, alias="designinterview_session"),
    authorization: str | None = Header(default=None),
) -> None:
    bearer = authorization.partition(" ")[2] if authorization and authorization.lower().startswith("bearer ") else None
    for token in (cookie, bearer):
        if token:
            store.user_tokens.pop(token_digest(token), None)
    response.delete_cookie("designinterview_session")
