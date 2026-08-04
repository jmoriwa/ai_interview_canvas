# DesignInterview backend

FastAPI implementation of the repository's `openapi.yaml`, backed by SQLAlchemy.

```powershell
make setup
make run
```

The API is available under `/api`. Seed interviewer credentials are
`alex@example.com` / `password123` and `sam@example.com` / `password123`.
Login establishes the `designinterview_session` cookie and also exposes the
same opaque credential in the `X-Access-Token` header for bearer clients.
Joining an invitation exposes a session-scoped token in
`X-Participant-Token`.

Run tests from the repository root with `make test`.

Integration tests live in `tests_integration/`. They launch the API in a separate
process and use a temporary SQLite database:

```powershell
uv run pytest tests_integration -q
```

## Database configuration

Set `DATABASE_URL` to any SQLAlchemy database URL supported by an installed driver.
It defaults to a persistent SQLite database at `backend/designinterview.db`:

```powershell
$env:DATABASE_URL = "sqlite:///./local.db"
uv run uvicorn app.main:app --reload
```

The persistence layer uses portable SQLAlchemy types and queries so another database,
such as PostgreSQL, can be selected later by changing the URL and adding its driver.
