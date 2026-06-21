import math
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from ..database import get_db_ctx
from ..models import PhotoOut, PaginatedResponse, TagOut
from ..config import settings
from ..utils.tags import attach_tags

router = APIRouter(tags=["photos"])


async def _photo_with_tags(row) -> PhotoOut:
    photo = PhotoOut(**dict(row))
    async with get_db_ctx() as db:
        cursor = await db.execute(
            """SELECT t.id, t.name, t.source, t.color, t.created_at
               FROM tags t JOIN photo_tags pt ON t.id = pt.tag_id
               WHERE pt.photo_id = ?""",
            (photo.id,),
        )
        tags = await cursor.fetchall()
        photo.tags = [TagOut(**dict(t)) for t in tags]
    return photo


@router.get("/photos")
async def list_photos(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    sort_by: str = Query("date_taken", pattern="^(date_taken|created_at|filename)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    tag_ids: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    has_gps: bool | None = None,
) -> PaginatedResponse:
    conditions = []
    params: list = []

    if tag_ids:
        ids = [int(x) for x in tag_ids.split(",")]
        placeholders = ",".join("?" * len(ids))
        conditions.append(
            f"p.id IN (SELECT photo_id FROM photo_tags WHERE tag_id IN ({placeholders}) "
            f"GROUP BY photo_id HAVING COUNT(DISTINCT tag_id) = ?)"
        )
        params.extend(ids)
        params.append(len(ids))

    if date_from:
        conditions.append("COALESCE(p.date_taken, p.date_file) >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("COALESCE(p.date_taken, p.date_file) <= ?")
        params.append(date_to)
    if has_gps:
        conditions.append("p.latitude IS NOT NULL AND p.longitude IS NOT NULL")

    where = " AND ".join(conditions) if conditions else "1=1"
    sort_col = f"p.{sort_by}" if sort_by != "date_taken" else "COALESCE(p.date_taken, p.date_file)"
    offset = (page - 1) * per_page

    async with get_db_ctx() as db:
        cursor = await db.execute(
            f"SELECT COUNT(*) FROM photos p WHERE {where}", params
        )
        row = await cursor.fetchone()
        total = row[0]

        cursor = await db.execute(
            f"""SELECT p.* FROM photos p
                WHERE {where}
                ORDER BY {sort_col} {sort_order}
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        )
        rows = await cursor.fetchall()

        items = [PhotoOut(**dict(r)) for r in rows]
        await attach_tags(db, items)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/photos/{photo_id}")
async def get_photo(photo_id: int) -> PhotoOut:
    async with get_db_ctx() as db:
        cursor = await db.execute("SELECT * FROM photos WHERE id = ?", (photo_id,))
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Photo not found")
    return await _photo_with_tags(row)


@router.get("/photos/{photo_id}/thumbnail")
async def get_thumbnail(photo_id: int):
    async with get_db_ctx() as db:
        cursor = await db.execute(
            "SELECT thumbnail_path FROM photos WHERE id = ?", (photo_id,)
        )
        row = await cursor.fetchone()
    if not row or not row["thumbnail_path"]:
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    thumb_path = settings.thumbnail_dir / row["thumbnail_path"]
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail file missing")

    return FileResponse(
        str(thumb_path),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/photos/{photo_id}/full")
async def get_full_image(photo_id: int):
    async with get_db_ctx() as db:
        cursor = await db.execute(
            "SELECT file_path, mime_type FROM photos WHERE id = ?", (photo_id,)
        )
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Photo not found")

    file_path = Path(row["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file missing from disk")

    return FileResponse(
        str(file_path),
        media_type=row["mime_type"],
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.post("/photos/{photo_id}/retag")
async def retag_photo(photo_id: int):
    import asyncio
    import uuid

    async with get_db_ctx() as db:
        cursor = await db.execute(
            "SELECT id, thumbnail_path FROM photos WHERE id = ?", (photo_id,)
        )
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Photo not found")
    if not row["thumbnail_path"]:
        raise HTTPException(status_code=400, detail="Photo has no thumbnail yet")

    from ..services.pipeline import task_manager

    task_id = str(uuid.uuid4())
    task_manager.create_task(task_id, "retag")

    async def _retag():
        try:
            task_manager.update(task_id, status="running")
            loop = asyncio.get_event_loop()
            from ..services.ai_tagger import generate_tags

            thumb_path = str(settings.thumbnail_dir / row["thumbnail_path"])
            tag_result = await loop.run_in_executor(None, generate_tags, thumb_path)

            async with get_db_ctx() as db:
                # Clear existing AI tags for this photo
                await db.execute(
                    "DELETE FROM photo_tags WHERE photo_id = ? AND source = 'ai'",
                    (photo_id,),
                )
                for tag_name in tag_result.get("tags", []):
                    cursor = await db.execute(
                        "SELECT id FROM tags WHERE name = ? COLLATE NOCASE",
                        (tag_name,),
                    )
                    tag_row = await cursor.fetchone()
                    if tag_row:
                        tid = tag_row["id"]
                    else:
                        cursor = await db.execute(
                            "INSERT INTO tags (name, source) VALUES (?, 'ai')",
                            (tag_name,),
                        )
                        tid = cursor.lastrowid
                    await db.execute(
                        """INSERT OR IGNORE INTO photo_tags
                           (photo_id, tag_id, confidence, source)
                           VALUES (?, ?, 1.0, 'ai')""",
                        (photo_id, tid),
                    )
                await db.execute(
                    "UPDATE photos SET has_ai_tags = TRUE WHERE id = ?",
                    (photo_id,),
                )
                await db.commit()

            task_manager.update(task_id, status="completed")
        except Exception as e:
            task_manager.update(task_id, status="failed", error=str(e))

    asyncio.create_task(_retag())
    return {"task_id": task_id}


@router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: int):
    async with get_db_ctx() as db:
        cursor = await db.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Photo not found")
    return {"status": "deleted"}
