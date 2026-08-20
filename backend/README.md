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

Integration tests live in `tests_integration/`. They build and launch the complete
`docker-compose.yaml` stack on available host ports, exercise the API against
PostgreSQL, and remove their isolated Compose project and volume afterward:

```powershell
make integration-test
```

## Database configuration

Set `DATABASE_URL` to choose the database. It defaults to a persistent SQLite
database at `backend/designinterview.db`:

```powershell
$env:DATABASE_URL = "sqlite:///./local.db"
uv run uvicorn app.main:app --reload
```

For PostgreSQL, start the local container (if it is not already running), then
launch the backend with its connection URL:

```powershell
docker compose up -d postgres
$env:DATABASE_URL = "postgresql://sdip:sdip@localhost:5432/sdip"
uv run uvicorn app.main:app --reload
```

The backend uses psycopg 3 and accepts `postgresql://`, `postgres://`, or the
explicit SQLAlchemy `postgresql+psycopg://` URL scheme. Tables and seed data are
created automatically on first startup.

## OpenTelemetry

FastAPI request traces and HTTP server metrics are exported with OTLP/gRPC when
an endpoint is configured. Until a collector or observability backend is
available, leaving the endpoint unset keeps telemetry disabled:

```powershell
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317"
$env:OTEL_SERVICE_NAME = "designinterview-backend"
$env:DEPLOYMENT_ENVIRONMENT = "production"
$env:GIT_COMMIT = "$(git rev-parse HEAD)"
uv run uvicorn app.main:app --reload
```

`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and
`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` can configure the signals independently.
Standard OTLP variables such as `OTEL_EXPORTER_OTLP_HEADERS` and
`OTEL_EXPORTER_OTLP_INSECURE` are passed through to the exporters. Set
`OTEL_SDK_DISABLED=true` to explicitly disable telemetry.
