from uuid import uuid4

import httpx
import pytest

from conftest import ComposeStack


pytestmark = pytest.mark.compose


def _account() -> dict[str, str]:
    suffix = uuid4().hex
    return {
        "email": f"integration-{suffix}@example.com",
        "password": "integration-password",
        "displayName": "Integration User",
    }


def _signup(api: httpx.Client) -> dict[str, str]:
    account = _account()
    response = api.post("/api/auth/signup", json=account)
    assert response.status_code == 201
    assert response.json()["email"] == account["email"]
    return account


def _login(api: httpx.Client, account: dict[str, str]) -> dict[str, str]:
    response = api.post("/api/auth/login", json={"email": account["email"], "password": account["password"]})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.headers['X-Access-Token']}"}


def _create_session(api: httpx.Client, headers: dict[str, str]) -> dict:
    response = api.post(
        "/api/sessions",
        headers=headers,
        json={
            "title": "Integration interview",
            "prompt": {
                "title": "Queue",
                "question": "Design a durable queue",
                "requirements": [],
                "constraints": [],
                "followUps": ["How would you handle poison messages?"],
                "revealedFollowUps": 0,
            },
            "candidateReference": "candidate-integration",
            "durationSeconds": 1800,
            "candidateEditingEnabled": True,
            "observerEditingEnabled": False,
            "expiresInHours": 12,
            "templateId": "system-design",
        },
    )
    assert response.status_code == 201
    return response.json()


def test_sign_up(api: httpx.Client):
    account = _account()
    response = api.post("/api/auth/signup", json=account)

    assert response.status_code == 201
    assert response.json()["displayName"] == account["displayName"]
    assert "password" not in response.json()
    assert api.post("/api/auth/signup", json=account).status_code == 409


def test_log_in_with_signed_up_account(api: httpx.Client):
    account = _signup(api)

    response = api.post("/api/auth/login", json={"email": account["email"], "password": account["password"]})

    assert response.status_code == 200
    assert response.headers["X-Access-Token"]
    assert response.json()["email"] == account["email"]


def test_submit_score(api: httpx.Client):
    account = _signup(api)
    headers = _login(api, account)
    session_response = api.post(
        "/api/sessions",
        headers=headers,
        json={
            "title": "Integration interview",
            "prompt": {
                "title": "Queue",
                "question": "Design a durable queue",
                "requirements": [],
                "constraints": [],
                "followUps": [],
                "revealedFollowUps": 0,
            },
            "candidateReference": "candidate-integration",
            "durationSeconds": 1800,
            "candidateEditingEnabled": True,
            "observerEditingEnabled": False,
            "expiresInHours": 12,
            "templateId": "system-design",
        },
    )
    assert session_response.status_code == 201
    session_id = session_response.json()["id"]

    score_response = api.patch(
        f"/api/sessions/{session_id}/evaluation",
        headers=headers,
        json={
            "ratings": {"Scalability": 5, "Communication": 4},
            "comments": {"Scalability": "Handled partitioning well."},
            "overallRecommendation": "strong_hire",
        },
    )

    assert score_response.status_code == 200
    assert score_response.json()["ratings"] == {"Scalability": 5, "Communication": 4}
    saved = api.get(f"/api/sessions/{session_id}/evaluation", headers=headers)
    assert saved.status_code == 200
    assert saved.json()["overallRecommendation"] == "strong_hire"


def test_session_lifecycle_and_invalid_transition(api: httpx.Client):
    account = _signup(api)
    headers = _login(api, account)
    session = _create_session(api, headers)
    session_id = session["id"]

    assert api.post(f"/api/sessions/{session_id}/start", headers=headers).json()["status"] == "active"
    assert api.post(f"/api/sessions/{session_id}/pause", headers=headers).json()["status"] == "paused"
    assert api.post(f"/api/sessions/{session_id}/resume", headers=headers).json()["status"] == "active"
    assert api.post(f"/api/sessions/{session_id}/complete", headers=headers).json()["status"] == "completed"
    assert api.post(f"/api/sessions/{session_id}/start", headers=headers).status_code == 409


def test_invitation_participant_permissions_and_canvas_conflict(api: httpx.Client):
    owner = _signup(api)
    owner_headers = _login(api, owner)
    session = _create_session(api, owner_headers)
    session_id = session["id"]

    joined = api.post(
        f"/api/invitations/{session['invitationToken']}/join",
        json={"displayName": "Candidate", "role": "candidate"},
    )
    assert joined.status_code == 201
    candidate_headers = {"Authorization": f"Bearer {joined.headers['X-Participant-Token']}"}
    assert api.get(f"/api/sessions/{session_id}", headers=candidate_headers).status_code == 200
    assert api.get(f"/api/sessions/{session_id}/notes", headers=candidate_headers).status_code == 403

    canvas = api.get(f"/api/sessions/{session_id}/canvas", headers=candidate_headers).json()
    saved = api.put(f"/api/sessions/{session_id}/canvas", headers=candidate_headers, json=canvas)
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    assert api.put(f"/api/sessions/{session_id}/canvas", headers=candidate_headers, json=canvas).status_code == 409

    duplicate = api.post(
        f"/api/invitations/{session['invitationToken']}/join",
        json={"displayName": "Second candidate", "role": "candidate"},
    )
    assert duplicate.status_code == 400


def test_owner_data_isolation(api: httpx.Client):
    first = _signup(api)
    second = _signup(api)
    first_headers = _login(api, first)
    second_headers = _login(api, second)
    session = _create_session(api, first_headers)

    assert api.get(f"/api/sessions/{session['id']}", headers=second_headers).status_code == 403
    assert api.patch(f"/api/sessions/{session['id']}", headers=second_headers, json={"title": "stolen"}).status_code == 403


def test_postgres_data_survives_app_restart(api: httpx.Client, compose_stack: ComposeStack):
    account = _signup(api)
    headers = _login(api, account)
    session = _create_session(api, headers)

    compose_stack.restart_app()

    response = api.get(f"/api/sessions/{session['id']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["title"] == session["title"]
