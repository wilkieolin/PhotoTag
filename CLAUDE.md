# PhotoTag

A self-hosted photo browsing, tagging, and similarity search application.

## Quick reference

- **Backend**: Python FastAPI (`backend/`)
- **Frontend**: React 19 + TypeScript + Vite (`frontend/`)
- **Databases**: SQLite (metadata), ChromaDB (vector embeddings)
- **AI**: OpenCLIP for embeddings, Ollama + qwen3-vl for tagging

## Commands

### Setup
```bash
./scripts/setup.sh
```

### Run (backend + frontend together)
```bash
./scripts/start.sh
```

### Run individually
```bash
# Backend (port 8000)
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (port 5173, proxies /api to backend)
cd frontend && npm run dev
```

### Lint
```bash
cd frontend && npm run lint
```

### Type check
```bash
cd frontend && npx tsc --noEmit
```

## Architecture

The backend is a FastAPI app in `backend/app/`. Entry point is `main.py`. Routes are in `routers/`, business logic in `services/`. The ingestion pipeline in `services/pipeline.py` processes photos through 5 stages: scan, EXIF extraction, thumbnail generation, CLIP embedding, and AI tagging.

The frontend is a Vite + React app in `frontend/src/`. Pages are in `pages/`, reusable components in `components/`, API calls in `api/`, React Query hooks in `hooks/`.

All configuration is in `backend/app/config.py` and can be overridden with `PHOTOTAG_` prefixed environment variables.

Runtime data (SQLite DB, ChromaDB, thumbnails) lives in `data/` and is gitignored.
