import os
import shutil
import socket
import subprocess
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import httpx
import pytest


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--run-compose",
        action="store_true",
        default=False,
        help="build docker-compose.yaml and run Compose integration tests",
    )


def _available_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@dataclass
class ComposeStack:
    root: Path
    project: str
    environment: dict[str, str]
    api_url: str
    command: tuple[str, ...]

    def compose(self, *arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [*self.command, "-f", "docker-compose.yaml", "-p", self.project, *arguments],
            cwd=self.root,
            env=self.environment,
            check=check,
            capture_output=True,
            text=True,
        )

    def wait_until_healthy(self, timeout: float = 30) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                response = httpx.get(f"{self.api_url}/health", timeout=0.5)
                if response.status_code == 200:
                    return
            except httpx.HTTPError:
                pass
            time.sleep(0.2)
        logs = self.compose("logs", "app", check=False).stdout
        pytest.fail(f"Compose API did not become healthy within {timeout:g} seconds:\n{logs}")

    def restart_app(self) -> None:
        self.compose("restart", "app")
        self.wait_until_healthy()


@pytest.fixture(scope="session")
def compose_stack(request: pytest.FixtureRequest) -> Iterator[ComposeStack]:
    if not request.config.getoption("--run-compose"):
        pytest.skip("pass --run-compose to run Docker Compose integration tests")

    root = Path(__file__).resolve().parents[2]
    compose_command = ("docker", "compose")
    compose_probe = subprocess.run(
        [*compose_command, "version"], capture_output=True, text=True, check=False
    )
    if compose_probe.returncode != 0:
        legacy_compose = shutil.which("docker-compose")
        if not legacy_compose:
            pytest.fail("Docker Compose is required (docker compose or docker-compose)")
        compose_command = (legacy_compose,)
    environment = os.environ.copy()
    reuse_stack = environment.get("TEST_COMPOSE_REUSE") == "1"
    environment["APP_PORT"] = environment.get("APP_PORT", str(_available_port()))
    environment["POSTGRES_PORT"] = environment.get("POSTGRES_PORT", str(_available_port()))
    project = environment.get("COMPOSE_PROJECT_NAME", f"interview-canvas-test-{uuid4().hex[:10]}")
    stack = ComposeStack(
        root,
        project,
        environment,
        f"http://127.0.0.1:{environment['APP_PORT']}",
        compose_command,
    )

    try:
        if not reuse_stack:
            stack.compose("up", "--build", "--detach", "--wait")
        stack.wait_until_healthy()
        yield stack
    except (FileNotFoundError, subprocess.CalledProcessError) as exc:
        output = getattr(exc, "stderr", "") or str(exc)
        pytest.fail(f"Could not start docker-compose.yaml:\n{output}")
    finally:
        if not reuse_stack:
            stack.compose("down", "--volumes", "--remove-orphans", check=False)


@pytest.fixture(scope="session")
def api_url(compose_stack: ComposeStack) -> str:
    return compose_stack.api_url


@pytest.fixture
def api(api_url: str) -> Iterator[httpx.Client]:
    with httpx.Client(base_url=api_url, timeout=5) as client:
        yield client
