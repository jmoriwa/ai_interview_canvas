# AI Interview Canvas

AI Interview Canvas (also called DesignInterview) is a browser-based collaborative workspace for conducting system-design interviews. An interviewer can create a session, provide an interview prompt, and invite candidates or observers with a shareable link. Participants use a shared canvas to build and discuss an architecture with reusable system-design components, connections, labels, and free-form drawing.

The application also supports interview-focused workflows such as a session timer, participant management, private interviewer notes, evaluation scorecards, saved sessions, and post-interview review. Candidates can focus on the prompt and canvas while interviewer-only notes and evaluation content remain private.

## How it is built

The project consists of a TypeScript frontend and a Python FastAPI backend. Its multi-stage Docker build compiles the frontend and serves it together with the API from one container on port `8000`.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or another running Docker Engine)
- Port `8000` available on your computer

Run all commands below from the repository root, where the `Dockerfile` is located.

## Build the image

```sh
docker build -t ai-interview-canvas:local .
```

The first build downloads the Node, Python, and application dependencies, so it can take a few minutes. Later builds can reuse Docker's cache.

## Run the container

Use a Docker named volume to keep the SQLite database when the container is stopped, removed, or replaced:

```sh
docker run --name ai-interview-canvas-local -p 8000:8000 -e DATABASE_URL=sqlite:////app/data/designinterview.db -v ai-interview-canvas-data:/app/data ai-interview-canvas:local
```

Open <http://localhost:8000> in a browser. The backend health endpoint is available at <http://localhost:8000/health>.

The `ai-interview-canvas-data` volume stores the application's database outside the container. Reuse the same volume name each time you run a replacement container to retain users, sessions, canvases, notes, and evaluations. Removing the container with `docker rm` does not remove this named volume.

The final argument is the image name (`ai-interview-canvas:local`). A build context such as `.` is accepted by `docker build`, but it cannot be used as the image argument to `docker run`.

The command runs in the foreground so logs remain visible. Press `Ctrl+C` to stop it, then remove the stopped container with:

```sh
docker rm ai-interview-canvas-local
```

To run in the background instead:

```sh
docker run -d --name ai-interview-canvas-local -p 8000:8000 -e DATABASE_URL=sqlite:////app/data/designinterview.db -v ai-interview-canvas-data:/app/data ai-interview-canvas:local
docker logs -f ai-interview-canvas-local
```

Stop and remove a background container with:

```sh
docker stop ai-interview-canvas-local
docker rm ai-interview-canvas-local
```

## Rebuild after code changes

The source is copied into the image, so rebuild and recreate the container after changing the application:

```sh
docker stop ai-interview-canvas-local
docker rm ai-interview-canvas-local
docker build -t ai-interview-canvas:local .
docker run -d --name ai-interview-canvas-local -p 8000:8000 -e DATABASE_URL=sqlite:////app/data/designinterview.db -v ai-interview-canvas-data:/app/data ai-interview-canvas:local
```

If port `8000` is already in use, map a different host port, for example `-p 8080:8000`, and open <http://localhost:8080>.

To intentionally erase all persisted application data, first remove the container and then remove its named volume:

```sh
docker volume rm ai-interview-canvas-data
```
