import math
from fastapi import APIRouter, Query, HTTPException

from ..database import get_db_ctx
from ..models import TagOut, TagCreate, TagUpdate, TagAssign, PhotoOut, PaginatedResponse

router = APIRouter(tags=["tags"])


@router.get("/tags")
async def list_tags(
    source: str | None = None,
    search: str | None = None,
) -> list[TagOut]:
    conditions = []
    params: list = []

    if source:
        conditions.append("source = ?")
        params.append(source)
    if search:
        conditions.append("name LIKE ?")
        params.append(f"%{search}%")

    where = " AND ".join(conditions) if conditions else "1=1"

    async with get_db_ctx() as db:
        cursor = await db.execute(
            f"SELECT * FROM tags WHERE {where} ORDER BY name", params
        )
        rows = await cursor.fetchall()

    return [TagOut(**dict(r)) for r in rows]


@router.post("/tags", status_code=201)
async def create_tag(tag: TagCreate) -> TagOut:
    async with get_db_ctx() as db:
        try:
            cursor = await db.execute(
                "INSERT INTO tags (name, color, source) VALUES (?, ?, 'user')",
                (tag.name.strip(), tag.color),
            )
            await db.commit()
            tag_id = cursor.lastrowid
        except Exception:
            raise HTTPException(status_code=409, detail="Tag already exists")

        cursor = await db.execute("SELECT * FROM tags WHERE id = ?", (tag_id,))
        row = await cursor.fetchone()
    return TagOut(**dict(row))


@router.patch("/tags/{tag_id}")
async def update_tag(tag_id: int, tag: TagUpdate) -> TagOut:
    updates = []
    params: list = []
    if tag.name is not None:
        updates.append("name = ?")
        params.append(tag.name.strip())
    if tag.color is not None:
        updates.append("color = ?")
        params.append(tag.color)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(tag_id)
    async with get_db_ctx() as db:
        cursor = await db.execute(
            f"UPDATE tags SET {', '.join(updates)} WHERE id = ?", params
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")

        cursor = await db.execute("SELECT * FROM tags WHERE id = ?", (tag_id,))
        row = await cursor.fetchone()
    return TagOut(**dict(row))


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: int):
    async with get_db_ctx() as db:
        cursor = await db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")
    return {"status": "deleted"}


@router.post("/photos/{photo_id}/tags")
async def assign_tags(photo_id: int, body: TagAssign):
    async with get_db_ctx() as db:
        # Verify photo exists
        cursor = await db.execute("SELECT id FROM photos WHERE id = ?", (photo_id,))
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Photo not found")

        for tag_id in body.tag_ids:
            await db.execute(
                """INSERT OR IGNORE INTO photo_tags (photo_id, tag_id, source)
                   VALUES (?, ?, 'user')""",
                (photo_id, tag_id),
            )
        await db.commit()
    return {"status": "ok"}


@router.delete("/photos/{photo_id}/tags/{tag_id}")
async def remove_tag(photo_id: int, tag_id: int):
    async with get_db_ctx() as db:
        cursor = await db.execute(
            "DELETE FROM photo_tags WHERE photo_id = ? AND tag_id = ?",
            (photo_id, tag_id),
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag assignment not found")
    return {"status": "removed"}


@router.get("/tags/{tag_id}/photos")
async def photos_with_tag(
    tag_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
) -> PaginatedResponse:
    offset = (page - 1) * per_page
    async with get_db_ctx() as db:
        cursor = await db.execute(
            """SELECT COUNT(*) FROM photos p
               JOIN photo_tags pt ON p.id = pt.photo_id
               WHERE pt.tag_id = ?""",
            (tag_id,),
        )
        total = (await cursor.fetchone())[0]

        cursor = await db.execute(
            """SELECT p.* FROM photos p
               JOIN photo_tags pt ON p.id = pt.photo_id
               WHERE pt.tag_id = ?
               ORDER BY COALESCE(p.date_taken, p.date_file) DESC
               LIMIT ? OFFSET ?""",
            (tag_id, per_page, offset),
        )
        rows = await cursor.fetchall()

    return PaginatedResponse(
        items=[PhotoOut(**dict(r)) for r in rows],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )
