from uuid import uuid4

import httpx


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
