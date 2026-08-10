# QZone Field Ops API

FastAPI backend for technician mobile sync and manager operations.

## Prerequisites

- Python 3.12+
- Docker (for Postgres and MinIO)

## Quick start

```bash
cd api

# Copy env and set JWT_SECRET
cp .env.example .env

# Start Postgres + MinIO
docker compose up -d

# Create virtualenv and install
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -e ".[dev]"

# Run migrations
alembic upgrade head

# Seed pilot data (sites, jobs, manager user)
python -m scripts.seed

# Start API
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for Swagger UI.

## Default login (after seed)

- Email: `ops@qzone.co.ke`
- Password: `Password@123!`

## Project layout

```
app/
  core/       config, security, dependencies
  db/         SQLAlchemy session
  models/     database tables
  schemas/    Pydantic request/response models
  api/v1/     route handlers
  services/   domain logic (reports, seed helpers)
scripts/      one-off CLI (seed)
alembic/      migrations
```

## Common commands

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
pytest
ruff check app tests
```
