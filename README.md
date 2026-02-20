# Worker Factory

AI Agent Orchestrator — spawn isolated desktop environments and dispatch autonomous AI tasks to them. Each worker is a full KasmVNC Ubuntu container running OpenInterpreter powered by Gemini. Tasks are submitted via a dark-themed dashboard, and execution is monitored through live desktop screenshots and task logs.

---

## Overview

```
User → Dashboard → FastAPI → Celery → KasmVNC Container → OpenInterpreter (Gemini)
                                ↑                               ↓
                             PostgreSQL              scrot → S3 → presigned URL
```

- **Workers** are isolated Docker containers (KasmVNC Ubuntu) — up to 3 per user
- **Tasks** are Python scripts injected via base64 and executed by OpenInterpreter inside the container
- **Skills** are `.md` prompt files injected into the LLM system prompt to specialize task behavior
- **Screenshots** are captured with `scrot`, uploaded to S3, and surfaced as 10-hour presigned URLs
- **Frontend** polls workers every 10s and task logs on each refresh

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.129 + Uvicorn |
| ORM | SQLAlchemy 2 (async) + asyncpg |
| Migrations | Alembic |
| Task queue | Celery 5 + Redis 7 |
| Auth | JWT (access 120 min / refresh 7 days) via python-jose |
| Container management | Docker SDK for Python |
| Storage | AWS S3 via aioboto3 |
| AI | OpenInterpreter + Gemini 2.5 Flash |
| Runtime | Python 3.13 |

### Worker Containers
| Component | Details |
|-----------|---------|
| Base image | `kasmweb/core-ubuntu-jammy:1.16.0` |
| Desktop | KasmVNC (Xfce, accessible via browser on port 6901) |
| AI engine | OpenInterpreter with `gemini/gemini-2.5-flash` |
| Screenshot | `scrot` → tar extract → S3 upload |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS 4 |
| Routing | React Router |
| Auth | JWT stored in localStorage, auto-restored on mount |

---

## Project Structure

```
py-worker-factory/
├── app/
│   ├── main.py                    # FastAPI app entry point
│   ├── core/
│   │   ├── config.py              # Pydantic settings (env vars)
│   │   ├── celery_app.py          # Celery + Beat configuration
│   │   ├── s3.py                  # S3 upload / presigned URL
│   │   └── utils.py               # capture_desktop_screenshot()
│   ├── routers/
│   │   ├── user.py                # Auth: register, login, logout, password
│   │   ├── workers.py             # Worker lifecycle + screenshot + tasks
│   │   └── tasks.py               # Task detail + delete
│   ├── worker/
│   │   ├── docker_service.py      # Docker SDK: spawn / stop / exec containers
│   │   └── crud.py                # DB operations for workers and tasks
│   ├── celery_tasks/
│   │   └── worker_tasks.py        # run_oi_agent / execute_worker_task
│   ├── models/                    # SQLAlchemy models
│   └── schemas/                   # Pydantic schemas
├── frontend/                      # React app
│   └── src/
│       ├── components/            # UI components
│       ├── pages/                 # Route pages
│       ├── lib/                   # api.ts, skills.ts
│       ├── context/               # AuthContext
│       └── types/                 # Shared TypeScript types
├── agent_code_shared/
│   └── skills/                    # Skill .md files injected into LLM prompt
│       ├── auto_planning.md
│       ├── data_wizard.md
│       ├── diagram_builder.md
│       ├── document_generator.md
│       └── web_research.md
├── migrations/                    # Alembic migration versions
├── Dockerfile                     # Backend image
├── Dockerfile-worker              # KasmVNC worker image (pre-build required)
├── docker-compose.yml
└── .envsample
```

---

## Worker Lifecycle

```
OFFLINE → STARTING → IDLE ⟷ BUSY → OFFLINE
```

1. `POST /routers/v1/workers` — creates DB record, spawns KasmVNC container
2. Celery `run_oi_agent` — installs packages + initializes OpenInterpreter (~3–4 min)
3. Worker becomes **IDLE** — ready to accept tasks
4. `POST /routers/v1/workers/{id}/tasks` — queues `execute_worker_task`, worker → **BUSY**
5. Task completes → logs + result saved to DB, worker → **IDLE**

---

## Skills

Skills are `.md` files in `agent_code_shared/skills/`. They are injected into the OpenInterpreter system prompt at task execution time. The frontend prepends `use @<skill_file>` to the prompt when a skill is selected.

| Skill | File | Purpose |
|-------|------|---------|
| Planner | `auto_planning.md` | Strategic reasoning and multi-step planning |
| Data Wizard | `data_wizard.md` | Data extraction, parsing and analysis |
| Diagram Builder | `diagram_builder.md` | Charts, flowcharts and visualizations |
| Web Researcher | `web_research.md` | Web scraping, browsing and research |
| Doc Generator | `document_generator.md` | Reports, docs and structured output |

---

## Running in Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- AWS S3 bucket
- Gemini API key

### 1. Build the worker image

The worker image must exist before any workers can be spawned:

```bash
docker build -f Dockerfile-worker -t custom-kasm-worker:latest .
```

### 2. Configure environment

```bash
cp .envsample .env
```

Edit `.env`:

```env
# PostgreSQL
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_HOST=db
POSTGRES_DB_PORT=5432
POSTGRES_DB=worker_factory
DATABASE_URL_ASYNC=postgresql+asyncpg://user:password@db:5432/worker_factory

# JWT
SECRET_KEY_ACCESS=your-secret-access-key
SECRET_KEY_REFRESH=your-secret-refresh-key
JWT_SIGNING_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://redis:6379/0

# S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# Gemini
GEMINI_API_KEY=your-gemini-key

# Absolute path to this project on the host machine
# Used for volume mounts into worker containers via Docker-out-of-Docker
HOST_PROJECT_PATH=/absolute/path/to/py-worker-factory
```

> `HOST_PROJECT_PATH` must be the **host machine's** absolute path — it is used to mount `agent_code_shared/` into worker containers via Docker-out-of-Docker.

### 3. Start backend services

```bash
docker-compose up
```

This starts:

| Container | Role | Port |
|-----------|------|------|
| `worker_factory_app` | FastAPI + Uvicorn | 8000 |
| `worker_factory_db` | PostgreSQL | 5432 |
| `factory_redis` | Redis | 6379 |
| `factory_celery` | Celery worker | — |
| `factory_beat` | Celery Beat (scheduled jobs) | — |

Alembic migrations run automatically on startup.

API docs available at `http://localhost:8000/docs`

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

The Vite dev server proxies `/routers` → `http://localhost:8000`, so no CORS configuration is needed in development.

---

## API Reference

All endpoints are under `/routers/v1/`:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/user/register` | Register and receive JWT tokens |
| `POST` | `/user/login` | Login and receive JWT tokens |
| `POST` | `/user/logout` | Revoke refresh token |
| `GET` | `/user/me` | Current user info |
| `POST` | `/user/password-change` | Change password |
| `GET` | `/workers/` | List workers (summary) |
| `POST` | `/workers/` | Spawn a new worker |
| `GET` | `/workers/{id}` | Worker detail with task history |
| `DELETE` | `/workers/{id}` | Delete worker (`?force=true` to force) |
| `POST` | `/workers/{id}/stop` | Stop container |
| `POST` | `/workers/{id}/start` | Start stopped container |
| `GET` | `/workers/{id}/screenshot` | Capture screenshot (30s cooldown) |
| `GET` | `/workers/{id}/screenshots` | Screenshot history |
| `GET` | `/workers/{id}/tasks` | Task list for worker |
| `POST` | `/workers/{id}/tasks` | Submit a new task |
| `GET` | `/tasks/{id}` | Task detail (logs + result) |
| `DELETE` | `/tasks/{id}` | Delete task |
| `GET` | `/health` | Health check |

---

## Constraints

- **Max 3 workers per user**
- **Screenshot cooldown** — 30 seconds between captures per worker
- **Task timeout** — 5 minutes soft limit, 5 min 10 sec hard kill
- **Worker init time** — ~3–4 minutes for package installation on first spawn
- The `Dockerfile-worker` image must be **pre-built** and tagged `custom-kasm-worker:latest`
