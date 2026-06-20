import math
from fastapi import APIRouter, Query, HTTPException

from ..database import get_db_ctx
from ..models import PhotoOut, PaginatedResponse, SimilarPhotoResult

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/similar/{photo_id}")
async def find_similar(
    photo_id: int,
    limit: int = Query(20, ge=1, le=100),
    threshold: float = Query(0.0, ge=0.0, le=1.0),
) -> list[SimilarPhotoResult]:
    try:
        from ..services.vector_store import vector_store
        from ..services.embedding import clip_manager
    except Exception:
        raise HTTPException(status_code=503, detail="Embedding service not available")

    results = vector_store.query_similar(str(photo_id), limit + 1)
    if not results:
        return []

    similar = []
    async with get_db_ctx() as db:
        for doc_id, distance in results:
            if doc_id == str(photo_id):
                continue
            similarity = 1.0 - distance
            if similarity < threshold:
                continue
            cursor = await db.execute(
                "SELECT * FROM photos WHERE id = ?", (int(doc_id),)
            )
            row = await cursor.fetchone()
            if row:
                similar.append(SimilarPhotoResult(
                    photo=PhotoOut(**dict(row)),
                    similarity=round(similarity, 4),
                ))
            if len(similar) >= limit:
                break

    return similar


@router.get("/by-text")
async def search_by_text(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
) -> list[SimilarPhotoResult]:
    try:
        from ..services.vector_store import vector_store
        from ..services.embedding import clip_manager
    except Exception:
        raise HTTPException(status_code=503, detail="Embedding service not available")

    text_embedding = clip_manager.embed_text(q)
    results = vector_store.query_by_embedding(text_embedding[0].tolist(), limit)

    similar = []
    async with get_db_ctx() as db:
        for doc_id, distance in results:
            similarity = 1.0 - distance
            cursor = await db.execute(
                "SELECT * FROM photos WHERE id = ?", (int(doc_id),)
            )
            row = await cursor.fetchone()
            if row:
                similar.append(SimilarPhotoResult(
                    photo=PhotoOut(**dict(row)),
                    similarity=round(similarity, 4),
                ))

    return similar


@router.get("/nearby/{photo_id}")
async def find_nearby(
    photo_id: int,
    time_window_hours: int = Query(24, ge=1),
    radius_km: float = Query(5.0, ge=0.1),
    limit: int = Query(20, ge=1, le=100),
) -> list[PhotoOut]:
    async with get_db_ctx() as db:
        cursor = await db.execute("SELECT * FROM photos WHERE id = ?", (photo_id,))
        photo = await cursor.fetchone()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        photo = dict(photo)

    results = []
    async with get_db_ctx() as db:
        # Time-based neighbors
        if photo["date_taken"]:
            cursor = await db.execute(
                """SELECT *, ABS(
                       julianday(COALESCE(date_taken, date_file)) -
                       julianday(?)
                   ) * 24 AS hours_diff
                   FROM photos
                   WHERE id != ?
                     AND ABS(
                       julianday(COALESCE(date_taken, date_file)) -
                       julianday(?)
                     ) * 24 <= ?
                   ORDER BY hours_diff ASC
                   LIMIT ?""",
                (photo["date_taken"], photo_id, photo["date_taken"],
                 time_window_hours, limit),
            )
            rows = await cursor.fetchall()
            for r in rows:
                results.append(PhotoOut(**dict(r)))

        # Location-based neighbors
        if photo["latitude"] is not None and photo["longitude"] is not None:
            from ..utils.geo_utils import haversine_distance

            cursor = await db.execute(
                """SELECT * FROM photos
                   WHERE id != ? AND latitude IS NOT NULL AND longitude IS NOT NULL""",
                (photo_id,),
            )
            rows = await cursor.fetchall()
            geo_results = []
            for r in rows:
                r_dict = dict(r)
                dist = haversine_distance(
                    photo["latitude"], photo["longitude"],
                    r_dict["latitude"], r_dict["longitude"],
                )
                if dist <= radius_km:
                    geo_results.append((dist, r_dict))

            geo_results.sort(key=lambda x: x[0])
            for _, r_dict in geo_results[:limit]:
                p = PhotoOut(**r_dict)
                if p.id not in {x.id for x in results}:
                    results.append(p)

    return results[:limit]


@router.get("/by-date")
async def search_by_date(
    date_from: str = Query(...),
    date_to: str = Query(...),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
) -> PaginatedResponse:
    offset = (page - 1) * per_page
    async with get_db_ctx() as db:
        cursor = await db.execute(
            """SELECT COUNT(*) FROM photos
               WHERE COALESCE(date_taken, date_file) BETWEEN ? AND ?""",
            (date_from, date_to),
        )
        total = (await cursor.fetchone())[0]

        cursor = await db.execute(
            """SELECT * FROM photos
               WHERE COALESCE(date_taken, date_file) BETWEEN ? AND ?
               ORDER BY COALESCE(date_taken, date_file) ASC
               LIMIT ? OFFSET ?""",
            (date_from, date_to, per_page, offset),
        )
        rows = await cursor.fetchall()

    return PaginatedResponse(
        items=[PhotoOut(**dict(r)) for r in rows],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/map-bounds")
async def photos_in_bounds(
    north: float = Query(...),
    south: float = Query(...),
    east: float = Query(...),
    west: float = Query(...),
    limit: int = Query(200, ge=1, le=1000),
) -> list[PhotoOut]:
    # Leaflet reports longitude as a continuous "world copy" coordinate when
    # the map is panned across the antimeridian, rather than wrapping it back
    # into -180..180. Normalize before comparing against stored EXIF longitudes.
    west = ((west + 180) % 360) - 180
    east = ((east + 180) % 360) - 180

    if west <= east:
        lon_clause = "longitude BETWEEN ? AND ?"
    else:
        lon_clause = "(longitude >= ? OR longitude <= ?)"

    async with get_db_ctx() as db:
        cursor = await db.execute(
            f"""SELECT * FROM photos
               WHERE latitude IS NOT NULL AND longitude IS NOT NULL
                 AND latitude BETWEEN ? AND ?
                 AND {lon_clause}
               LIMIT ?""",
            (south, north, west, east, limit),
        )
        rows = await cursor.fetchall()

    return [PhotoOut(**dict(r)) for r in rows]
