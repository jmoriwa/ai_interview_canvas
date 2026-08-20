# AI Interview Canvas

AI Interview Canvas (also called DesignInterview) is a browser-based collaborative workspace for conducting system-design interviews. An interviewer can create a session, provide an interview prompt, and invite candidates or observers with a shareable link. Participants use a shared canvas to build and discuss an architecture with reusable system-design components, connections, labels, and free-form drawing.

The application also supports interview-focused workflows such as a session timer, participant management, private interviewer notes, evaluation scorecards, saved sessions, and post-interview review. Candidates can focus on the prompt and canvas while interviewer-only notes and evaluation content remain private.

## How it is built

The project consists of a TypeScript frontend and a Python FastAPI backend. Its multi-stage Docker build compiles the frontend and serves it together with the API from one container on port `8000`.

## Render environments

Production and development are independent, but only development is managed by
the root [`render.yaml`](render.yaml):

| Environment | Render web service | Database | Deployment policy |
| --- | --- | --- | --- |
| Production | `ai-interview-canvas` | Existing external Neon production project | Existing service remains unmanaged |
| Development | `ai-interview-canvas-dev` | External Neon development project | `main`, after GitHub CI passes |

The existing production service and its
<https://ai-interview-canvas.onrender.com> address are intentionally excluded
from the Blueprint, so syncing it cannot alter production. The Blueprint creates
only the Free dev web service, which receives its own `onrender.com` address.
Each service uses a different external Neon `DATABASE_URL`.

### One-time Render setup

1. Create a Blueprint for this repository using `render.yaml`. Its proposed
   changes must contain only `ai-interview-canvas-dev`. Cancel if the existing
   `ai-interview-canvas` production service appears anywhere in the plan.
2. When prompted for `DATABASE_URL`, enter the pooled connection string from the
   external Neon development project. Never enter the production connection
   string here.
3. Confirm the dev service uses the Free instance type, branch `main`, and
   **Auto-Deploy: After CI Checks Pass**.
4. Open the dev service after its first deploy and record its generated URL for
   the team. From then on, pushes to `main` run GitHub Actions and only a passing
   commit is automatically deployed to dev.

Production releases remain intentional manual deploys from the existing,
unmanaged `ai-interview-canvas` Render service. Use **Manual Deploy > Deploy a
specific commit** after the chosen commit has passed CI and has been verified in
dev. Do not add production to this Blueprint or reuse either environment's Neon
connection string in the other environment.

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

Docker requires container names to be unique. If `ai-interview-canvas-local` already exists, stop and remove that container before running the command again:

```sh
docker stop ai-interview-canvas-local
docker rm ai-interview-canvas-local
```

These commands remove only the container. Data stored in the `ai-interview-canvas-data` volume remains available to the replacement container.

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
