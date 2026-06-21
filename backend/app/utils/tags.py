from ..models import PhotoOut, TagOut


async def attach_tags(db, photos: list[PhotoOut]) -> None:
    """Batch-fetch and attach tags to a list of PhotoOut objects in place."""
    if not photos:
        return

    ids = [p.id for p in photos]
    placeholders = ",".join("?" * len(ids))
    cursor = await db.execute(
        f"""SELECT pt.photo_id, t.id, t.name, t.source, t.color, t.created_at
            FROM tags t JOIN photo_tags pt ON t.id = pt.tag_id
            WHERE pt.photo_id IN ({placeholders})""",
        ids,
    )
    rows = await cursor.fetchall()

    tags_by_photo: dict[int, list[TagOut]] = {}
    for row in rows:
        d = dict(row)
        photo_id = d.pop("photo_id")
        tags_by_photo.setdefault(photo_id, []).append(TagOut(**d))

    for photo in photos:
        photo.tags = tags_by_photo.get(photo.id, [])
