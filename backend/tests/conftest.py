import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store


@pytest.fixture(autouse=True)
def reset_store():
    store.reset()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def token(client):
    response = client.post("/api/auth/login", json={"email": "alex@example.com", "password": "password123"})
    assert response.status_code == 200
    return response.headers["X-Access-Token"]


@pytest.fixture
def auth(token):
    return {"Authorization": f"Bearer {token}"}

