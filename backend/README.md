# DesignInterview backend

FastAPI implementation of the repository's `openapi.yaml`, backed by a seeded in-memory store.

```powershell
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

The API is available under `/api`. Seed interviewer credentials are
`alex@example.com` / `password123` and `sam@example.com` / `password123`.
Login establishes the `designinterview_session` cookie and also exposes the
same opaque credential in the `X-Access-Token` header for bearer clients.
Joining an invitation exposes a session-scoped token in
`X-Participant-Token`.

Run tests with `uv run pytest`.

