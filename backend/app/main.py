import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .routers import auth, canvas, invitations, notes, participants, sessions

app = FastAPI(title="DesignInterview Backend API", version="1.0.0", root_path="")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Access-Token", "X-Participant-Token"],
)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"message": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"message": "Invalid request", "code": "validation_error"})


@app.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}


for api_router in (auth.router, sessions.router, invitations.router, participants.router, canvas.router, notes.router):
    app.include_router(api_router, prefix="/api")


class SPAStaticFiles(StaticFiles):
    """Serve static assets and fall back to index.html for client routes."""

    async def get_response(self, path: str, scope: dict):
        try:
            return await super().get_response(path, scope)
        except (HTTPException, StarletteHTTPException) as exc:
            request_path = scope["path"].lstrip("/")
            if exc.status_code != 404 or request_path == "api" or request_path.startswith("api/"):
                raise
            return await super().get_response("index.html", scope)


static_dir = Path(os.getenv("STATIC_DIR", Path(__file__).parent / "static"))
if static_dir.is_dir():
    app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="frontend")
