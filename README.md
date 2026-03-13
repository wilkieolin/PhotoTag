# PhotoTag

A self-hosted web application for browsing, tagging, and searching a personal photo library. All AI inference runs locally using open-source models -- no cloud services required.

## Features

- **Photo browsing** -- Virtualized grid view with infinite scroll, handles libraries of 50,000+ images
- **EXIF metadata** -- Automatically extracts date taken, GPS coordinates, camera info, lens data, and exposure settings
- **User-defined tags** -- Create, assign, and filter photos by custom tags
- **AI-generated tags** -- Automatic descriptive tagging via a local vision-language model (qwen3-vl through Ollama)
- **Visual similarity search** -- CLIP image embeddings stored in a vector database enable "find similar photos" and text-to-image search (e.g., "sunset over mountains")
- **Temporal neighbors** -- Browse photos taken around the same time
- **Spatial neighbors** -- Browse photos taken near the same GPS location
- **Map view** -- View geotagged photos on an interactive OpenStreetMap
- **Background processing** -- Scan directories and process photos asynchronously with real-time progress tracking

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, uvicorn |
| Metadata database | SQLite (WAL mode, via aiosqlite) |
| Vector database | ChromaDB (embedded, persistent) |
| Image embeddings | OpenCLIP ViT-B-32 (512-dim vectors) |
| AI tagging | Ollama + qwen3-vl |
| Map tiles | Leaflet + OpenStreetMap |

## Quick start with Docker

The fastest way to get running. Requires [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).

### CPU (works anywhere)

```bash
PHOTOTAG_PHOTOS_DIR=~/Pictures docker compose up -d

# Pull the vision model into the Ollama container (first run only)
docker compose exec ollama ollama pull qwen3-vl
```

### With NVIDIA GPU

Requires the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html). Enables GPU-accelerated CLIP inference and faster Ollama responses.

```bash
PHOTOTAG_PHOTOS_DIR=~/Pictures \
  docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d

docker compose exec ollama ollama pull qwen3-vl
```

Open **http://localhost:3000**, go to **Settings**, and scan `/photos` (your mounted directory).

### Mounting multiple photo directories

Edit `docker-compose.yml` and add extra volumes to the `backend` service:

```yaml
volumes:
  - phototag-data:/app/data
  - ~/Pictures:/photos/pictures:ro
  - /mnt/nas/photos:/photos/nas:ro
```

Then scan `/photos/pictures` and `/photos/nas` separately from the UI.

### Docker environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PHOTOTAG_PHOTOS_DIR` | `./data` | Host path to mount as `/photos` in the container |
| `PHOTOTAG_PORT` | `3000` | Port to expose the web UI on |
| `PHOTOTAG_CLIP_DEVICE` | `auto` | Force `cpu` or `cuda` for CLIP inference |

### Stopping and cleanup

```bash
docker compose down          # stop containers, keep data
docker compose down -v       # stop containers and delete all data
```

---

## Manual installation

If you prefer not to use Docker, or need more control over the setup.

### Prerequisites

- **Python 3.11+** (tested with 3.13)
- **Node.js 18+** (tested with 20.19)
- **Ollama** -- for AI tagging ([install instructions](https://ollama.com/download))
- **A vision model in Ollama** -- the default is `qwen3-vl`:
  ```bash
  ollama pull qwen3-vl
  ```
- **(Optional) NVIDIA GPU** -- CLIP embedding generation is significantly faster on GPU. The application works on CPU as well.

### Installation

### 1. Clone and install dependencies

```bash
cd PhotoTag
./scripts/setup.sh
```

Or manually:

```bash
# Backend
cd backend
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 2. PyTorch for GPU support (optional)

The `open-clip-torch` package in `requirements.txt` pulls PyTorch automatically. If you need GPU-accelerated inference, verify CUDA is available:

```bash
python3 -c "import torch; print(torch.cuda.is_available())"
```

If this prints `False` and you have an NVIDIA GPU, you may need to install a CUDA-enabled PyTorch build for your platform. See [pytorch.org/get-started](https://pytorch.org/get-started/locally/) for instructions.

CLIP inference works on CPU -- it is just slower (~50ms/image instead of ~10ms/image on GPU).

### 3. Verify Ollama is running

```bash
ollama list  # should show qwen3-vl
```

If Ollama is not running, start it with `ollama serve`.

### Usage

#### Starting the application

```bash
./scripts/start.sh
```

This starts both the backend (port 8000) and frontend dev server (port 5173). Open **http://localhost:5173** in your browser.

To start each component separately:

```bash
# Backend
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (in another terminal)
cd frontend
npm run dev
```

#### Scanning photos

1. Navigate to **Settings** in the sidebar
2. Enter the absolute path to a directory containing photos (e.g., `/home/user/Pictures`)
3. Click **Scan**
4. The progress bar shows the current processing stage:
   - **scanning** -- discovering image files and checking for duplicates
   - **exif** -- extracting metadata from each image
   - **thumbnails** -- generating display thumbnails
   - **embeddings** -- computing CLIP vectors for similarity search
   - **ai_tagging** -- generating descriptive tags via the vision model

Photos become browsable after the thumbnail stage completes. Embeddings and AI tags are generated in the background.

#### Browsing photos

- **Photos** page -- grid view with sorting and tag-based filtering
- Click any photo to open the detail panel showing EXIF data, tags, similar photos, and nearby photos
- Use the filter toggle (sliders icon) to sort by date/filename and filter by tags

#### Tagging

- In the photo detail panel, switch to the **Tags** tab
- Type a tag name and press Enter or click **New** to create and assign a tag
- Click the dropdown to assign existing tags
- AI-generated tags (purple badges) are created automatically during the scan pipeline
- Click **Re-tag with AI** on any photo to regenerate its AI tags

#### Searching

- **Search** page -- type a natural language description (e.g., "dog playing in snow") to find visually matching photos using CLIP text-to-image search
- **Similar** tab in photo detail -- find visually similar photos based on CLIP embedding distance
- **Nearby** tab in photo detail -- find photos taken around the same time or GPS location
- **Map** page -- browse geotagged photos on an interactive map

## Configuration

All settings can be overridden via environment variables with the `PHOTOTAG_` prefix, or by creating a `.env` file in the `backend/` directory.

| Variable | Default | Description |
|----------|---------|-------------|
| `PHOTOTAG_DATA_DIR` | `./data` | Directory for SQLite DB, ChromaDB, and thumbnails |
| `PHOTOTAG_CLIP_MODEL_NAME` | `ViT-B-32` | OpenCLIP model architecture |
| `PHOTOTAG_CLIP_PRETRAINED` | `laion2b_s34b_b79k` | Pretrained weights to use |
| `PHOTOTAG_CLIP_DEVICE` | `auto` | `auto`, `cuda`, or `cpu` |
| `PHOTOTAG_CLIP_BATCH_SIZE` | `32` | Images per CLIP inference batch |
| `PHOTOTAG_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `PHOTOTAG_OLLAMA_MODEL` | `qwen3-vl:latest` | Vision model for AI tagging |
| `PHOTOTAG_OLLAMA_TIMEOUT` | `120` | Seconds before Ollama request times out |
| `PHOTOTAG_THUMBNAIL_SMALL_SIZE` | `400` | Grid thumbnail longest edge in pixels |
| `PHOTOTAG_MAX_SCAN_WORKERS` | `4` | Parallel workers for EXIF/thumbnail processing |
| `PHOTOTAG_PORT` | `8000` | Backend server port |
| `PHOTOTAG_FRONTEND_URL` | `http://localhost:5173` | Frontend origin for CORS |

## Supported image formats

`.jpg`, `.jpeg`, `.png`, `.webp`, `.tiff`, `.tif`, `.heic`, `.heif`, `.avif`

## Project structure

```
PhotoTag/
├── docker-compose.yml           # Docker Compose (CPU, works anywhere)
├── docker-compose.gpu.yml       # GPU override (NVIDIA)
├── backend/
│   ├── Dockerfile               # Backend container image
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, health/stats endpoints
│   │   ├── config.py            # Settings (env vars, defaults)
│   │   ├── database.py          # SQLite connection management
│   │   ├── db_models.py         # Table schemas and initialization
│   │   ├── models.py            # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── photos.py        # Photo CRUD, thumbnail/image serving, retag
│   │   │   ├── tags.py          # Tag CRUD, assignment
│   │   │   ├── scan.py          # Directory scanning, watched directories
│   │   │   ├── search.py        # Similarity, text, time, geo, map search
│   │   │   └── tasks.py         # Background task status
│   │   ├── services/
│   │   │   ├── scanner.py       # Directory walking, file hashing, dedup
│   │   │   ├── exif_extractor.py  # EXIF metadata parsing
│   │   │   ├── thumbnail.py     # Thumbnail generation
│   │   │   ├── embedding.py     # CLIP model manager (singleton)
│   │   │   ├── ai_tagger.py     # Ollama vision model integration
│   │   │   ├── vector_store.py  # ChromaDB operations
│   │   │   └── pipeline.py      # 5-stage ingestion orchestrator
│   │   └── utils/
│   │       ├── geo_utils.py     # Haversine distance, GPS conversion
│   │       └── image_utils.py   # EXIF orientation, MIME detection
│   └── requirements.txt
├── frontend/
│   ├── Dockerfile               # Multi-stage build: Node → nginx
│   ├── nginx.conf               # Serves static files, proxies /api
│   ├── src/
│   │   ├── App.tsx              # Router and query client setup
│   │   ├── api/                 # API client modules
│   │   ├── components/          # React components (layout, photos, tags, search, scan)
│   │   ├── hooks/               # React Query hooks
│   │   ├── pages/               # Page-level route components
│   │   └── types/               # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts           # Dev server proxy to backend
├── data/                        # Runtime data (gitignored)
│   ├── phototag.db              # SQLite database
│   ├── chromadb/                # Vector embeddings
│   └── thumbnails/              # Generated thumbnails
├── scripts/
│   ├── setup.sh                 # One-time dependency installation
│   └── start.sh                 # Launch backend + frontend
└── .gitignore
```

## API documentation

When the backend is running, interactive API docs are available at:

- **Swagger UI** -- http://localhost:8000/docs (manual) or http://localhost:3000/docs (Docker)
- **ReDoc** -- http://localhost:8000/redoc (manual) or http://localhost:3000/redoc (Docker)

## How it works

### Ingestion pipeline

When you scan a directory, photos go through five processing stages:

1. **Scan** -- walks the directory tree, filters by file extension, computes a fast hash (SHA-256 of first 64KB + file size) for deduplication, and inserts new records into SQLite
2. **EXIF extraction** -- reads metadata using Pillow (parallelized across multiple workers), extracts dates, GPS coordinates, camera info, and image dimensions
3. **Thumbnail generation** -- creates orientation-corrected JPEG thumbnails at 400px, stored in bucketed subdirectories to avoid filesystem bottlenecks
4. **CLIP embedding** -- loads images through the CLIP vision encoder in batches of 32, producing 512-dimensional vectors that are stored in ChromaDB with metadata for filtered queries
5. **AI tagging** -- sends each thumbnail to the Ollama vision model with a structured prompt, parses the JSON tag response, and creates tag records in SQLite

### Similarity search

CLIP encodes both images and text into the same 512-dimensional vector space. This enables:

- **Image-to-image similarity** -- find the nearest neighbors of a photo's embedding in ChromaDB
- **Text-to-image search** -- encode a text description with CLIP's text encoder and query ChromaDB for the closest image embeddings

### Data storage

- **SQLite** stores all structured data (photo metadata, tags, tag assignments, scan history). WAL mode allows concurrent reads during background writes.
- **ChromaDB** stores CLIP embeddings with an HNSW index for fast approximate nearest neighbor queries. Photo metadata (date, GPS) is stored as ChromaDB metadata for filtered vector searches.
- **Thumbnails** are stored as JPEG files on disk, organized in subdirectories by `photo_id % 1000`.

Photos are never copied or moved -- the database references their original paths on disk.

## License

This project is provided as-is for personal use.
