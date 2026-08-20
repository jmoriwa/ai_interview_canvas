from datetime import UTC, datetime

from sqlalchemy.engine import make_url

from app.models import CanvasDocument
from app.observability import telemetry_resource
from app.store import DATABASE_URL, DatabaseMapping, _database_url, engine


def test_telemetry_resource_contains_deployment_identity(monkeypatch):
    monkeypatch.setenv("OTEL_SERVICE_NAME", "interview-api")
    monkeypatch.setenv("DEPLOYMENT_ENVIRONMENT", "staging")
    monkeypatch.setenv("GIT_COMMIT", "abc123")

    attributes = telemetry_resource().attributes

    assert attributes["service.name"] == "interview-api"
    assert attributes["deployment.environment.name"] == "staging"
    assert attributes["service.version"] == "abc123"


def test_database_configuration_and_persistence():
    assert engine.url.drivername == make_url(DATABASE_URL).drivername
    canvases = DatabaseMapping("canvases", CanvasDocument)
    canvases["persistence-check"] = CanvasDocument(version=7, nodes=[], connectors=[], strokes=[])
    independently_created_mapping = DatabaseMapping("canvases", CanvasDocument)
    assert independently_created_mapping["persistence-check"].version == 7


def test_postgres_urls_select_psycopg(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://sdip:sdip@localhost:5432/sdip")
    assert _database_url() == "postgresql+psycopg://sdip:sdip@localhost:5432/sdip"

    monkeypatch.setenv("DATABASE_URL", "postgres://sdip:sdip@localhost:5432/sdip")
    assert _database_url() == "postgresql+psycopg://sdip:sdip@localhost:5432/sdip"


def test_login_logout_and_auth(client):
    assert client.get("/api/sessions").status_code == 401
    bad = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "wrong"})
    assert bad.status_code == 401
    login = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "password123"})
    assert login.json()["displayName"] == "Alex Rivera"
    assert login.headers["X-Access-Token"]
    assert client.get("/api/sessions").status_code == 200
    assert client.post("/api/auth/logout").status_code == 204


def test_local_frontend_cors_preflight(client):
    response = client.options(
        "/api/sessions",
        headers={
            "Origin": "http://localhost:4173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:4173"


def test_seeded_sessions_and_evaluation(client, auth):
    sessions = client.get("/api/sessions", headers=auth).json()
    assert {s["status"] for s in sessions} >= {"active", "waiting", "completed"}
    evaluation = client.get("/api/sessions/session-completed/evaluation", headers=auth).json()
    assert evaluation["ratings"]["Communication"] == 5


def test_create_update_and_lifecycle(client, auth):
    payload = {
        "title": "New design interview",
        "prompt": {"title": "Cache", "question": "Design a cache", "requirements": [], "constraints": [], "followUps": ["Eviction?"], "revealedFollowUps": 0},
        "candidateReference": "candidate-x", "durationSeconds": 1800,
        "candidateEditingEnabled": True, "observerEditingEnabled": False,
        "expiresInHours": 12, "templateId": "blank",
    }
    created = client.post("/api/sessions", json=payload, headers=auth)
    assert created.status_code == 201
    sid = created.json()["id"]
    assert client.patch(f"/api/sessions/{sid}", json={"title": "Updated"}, headers=auth).json()["title"] == "Updated"
    assert client.post(f"/api/sessions/{sid}/start", headers=auth).json()["status"] == "active"
    assert client.post(f"/api/sessions/{sid}/pause", headers=auth).json()["status"] == "paused"
    assert client.post(f"/api/sessions/{sid}/resume", headers=auth).json()["status"] == "active"
    revealed = client.post(f"/api/sessions/{sid}/follow-ups/reveal", headers=auth).json()
    assert revealed["prompt"]["revealedFollowUps"] == 1
    assert client.post(f"/api/sessions/{sid}/complete", headers=auth).json()["status"] == "completed"
    assert client.post(f"/api/sessions/{sid}/start", headers=auth).status_code == 409


def test_timer_commands(client, auth):
    reset = client.post("/api/sessions/session-active/timer", json={"command": "reset"}, headers=auth).json()
    assert reset["timerAccumulatedSeconds"] == 0
    added = client.post("/api/sessions/session-active/timer", json={"command": "add_time", "seconds": 60}, headers=auth).json()
    assert added["durationSeconds"] == 2760


def test_invitation_join_participant_access_and_heartbeat(client):
    invitation = client.get("/api/invitations/invite-session-waiting")
    assert invitation.status_code == 200
    joined = client.post("/api/invitations/invite-session-waiting/join", json={"displayName": "Jamie", "role": "candidate"})
    assert joined.status_code == 201
    participant = joined.json()
    headers = {"Authorization": f"Bearer {joined.headers['X-Participant-Token']}"}
    assert client.get("/api/sessions/session-waiting", headers=headers).status_code == 200
    assert client.get("/api/sessions/session-active", headers=headers).status_code == 403
    assert client.post(f"/api/participants/{participant['id']}/heartbeat", headers=headers).status_code == 204


def test_canvas_versioning_and_permissions(client, auth):
    canvas = client.get("/api/sessions/session-active/canvas", headers=auth).json()
    canvas["nodes"].append({"id": "n1", "kind": "text", "componentType": "", "label": "Hello", "x": 0, "y": 0, "width": 100, "height": 40, "color": "#fff"})
    saved = client.put("/api/sessions/session-active/canvas", json=canvas, headers=auth)
    assert saved.json()["version"] == 2
    assert client.put("/api/sessions/session-active/canvas", json=canvas, headers=auth).status_code == 409


def test_notes_and_evaluation(client, auth):
    note = client.put("/api/sessions/session-active/notes", json={"content": "Strong clarification"}, headers=auth)
    assert note.json()["content"] == "Strong clarification"
    result = client.patch("/api/sessions/session-active/evaluation", json={
        "ratings": {"Scalability": 4}, "comments": {"Scalability": "Solid"}, "overallRecommendation": "hire",
        "submittedAt": datetime.now(UTC).isoformat(),
    }, headers=auth)
    assert result.status_code == 200
    assert result.json()["ratings"]["Scalability"] == 4


def test_owner_authorization_and_validation(client, auth):
    other = client.post("/api/auth/login", json={"email": "sam@example.com", "password": "password123"})
    other_auth = {"Authorization": f"Bearer {other.headers['X-Access-Token']}"}
    assert client.get("/api/sessions/session-active", headers=other_auth).status_code == 403
    assert client.patch("/api/sessions/session-active", json={}, headers=auth).status_code == 400
    assert client.patch("/api/sessions/session-active/evaluation", json={"ratings": {"Security": 6}}, headers=auth).status_code == 400
