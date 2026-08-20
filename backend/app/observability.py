"""OpenTelemetry setup for the API process."""

import os

from fastapi import FastAPI
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.semconv.resource import ResourceAttributes


def telemetry_resource() -> Resource:
    """Build deployment identity, while preserving OTEL_RESOURCE_ATTRIBUTES."""
    return Resource.create(
        {
            ResourceAttributes.SERVICE_NAME: os.getenv(
                "OTEL_SERVICE_NAME", "designinterview-backend"
            ),
            "deployment.environment.name": os.getenv(
                "DEPLOYMENT_ENVIRONMENT", "development"
            ),
            ResourceAttributes.SERVICE_VERSION: os.getenv("GIT_COMMIT", "unknown"),
        }
    )


def configure_telemetry(app: FastAPI) -> None:
    """Instrument FastAPI and export traces and metrics over OTLP/gRPC.

    Export is opt-in until a collector/backend endpoint exists. Setting the shared
    OTEL_EXPORTER_OTLP_ENDPOINT enables both signals; signal-specific endpoint
    variables are supported as well.
    """
    traces_endpoint = os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
    metrics_endpoint = os.getenv("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT")
    shared_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

    if os.getenv("OTEL_SDK_DISABLED", "false").lower() == "true":
        return
    if not (shared_endpoint or traces_endpoint or metrics_endpoint):
        return

    resource = telemetry_resource()

    if shared_endpoint or traces_endpoint:
        tracer_provider = TracerProvider(resource=resource)
        tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        trace.set_tracer_provider(tracer_provider)

    if shared_endpoint or metrics_endpoint:
        metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
        metrics.set_meter_provider(
            MeterProvider(resource=resource, metric_readers=[metric_reader])
        )

    FastAPIInstrumentor.instrument_app(app)
