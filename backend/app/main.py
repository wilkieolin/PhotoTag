from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import get_db
from .db_models import init_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure data directories exist
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.thumbnail_dir.mkdir(parents=True, exist_ok=True)
    settings.chromadb_path.mkdir(parents=True, exist_ok=True)

    # Initialize database
    db = await get_db()
    await init_database(db)
    await db.close()

    yield

    # Shutdown


app = FastAPI(title="PhotoTag", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/stats")
async def stats():
    from .database import get_db_ctx
    from .models import StatsOut

    async with get_db_ctx() as db:
        row = await (await db.execute("SELECT COUNT(*) FROM photos")).fetchone()
        total_photos = row[0]
        row = await (await db.execute("SELECT COUNT(*) FROM tags")).fetchone()
        total_tags = row[0]
        row = await (await db.execute(
            "SELECT COUNT(*) FROM photos WHERE has_embedding = TRUE"
        )).fetchone()
        photos_with_embeddings = row[0]
        row = await (await db.execute(
            "SELECT COUNT(*) FROM photos WHERE has_ai_tags = TRUE"
        )).fetchone()
        photos_with_ai_tags = row[0]
        row = await (await db.execute(
            "SELECT COUNT(*) FROM photos WHERE latitude IS NOT NULL"
        )).fetchone()
        photos_with_gps = row[0]
        row = await (await db.execute(
            "SELECT COALESCE(SUM(file_size), 0) FROM photos"
        )).fetchone()
        total_storage = row[0]

    return StatsOut(
        total_photos=total_photos,
        total_tags=total_tags,
        photos_with_embeddings=photos_with_embeddings,
        photos_with_ai_tags=photos_with_ai_tags,
        photos_with_gps=photos_with_gps,
        total_storage_bytes=total_storage,
    )


# Import routers
from .routers import photos, tags, scan, search, tasks  # noqa: E402

app.include_router(photos.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(scan.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
