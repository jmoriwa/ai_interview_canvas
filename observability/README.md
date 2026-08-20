# Local observability stack

This Compose project runs an OpenTelemetry Collector and local backends for
metrics (Prometheus), logs (Loki), traces (Tempo), and visualization (Grafana).

From the repository root:

```powershell
docker compose -f observability/compose.yaml up -d
$env:GIT_COMMIT = git rev-parse HEAD
docker compose up --build -d
```

The application Compose project sends OTLP/gRPC to the collector through the
published host port. For a backend started directly on the host, use:

```powershell
$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317"
uv run --directory backend uvicorn app.main:app --reload
```

Open Grafana at <http://localhost:3001>. Anonymous local access is enabled and
Prometheus, Loki, and Tempo are provisioned as data sources. Prometheus is also
available at <http://localhost:9090>.

Stop the stack without deleting its data:

```powershell
docker compose -f observability/compose.yaml down
```

Add `--volumes` only when you intentionally want to delete all local telemetry.
