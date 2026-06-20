import asyncio
import logging
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional

from ..config import settings
from ..database import get_db_ctx
from ..models import TaskStatus

logger = logging.getLogger(__name__)


@dataclass
class TaskState:
    id: str
    type: str
    status: str = "pending"
    progress: dict = field(default_factory=dict)
    error: Optional[str] = None


class TaskManager:
    def __init__(self):
        self._tasks: dict[str, TaskState] = {}

    def create_task(self, task_id: str, task_type: str) -> TaskState:
        state = TaskState(id=task_id, type=task_type)
        self._tasks[task_id] = state
        return state

    def get_task(self, task_id: str) -> TaskStatus | None:
        state = self._tasks.get(task_id)
        if not state:
            return None
        return TaskStatus(
            id=state.id,
            type=state.type,
            status=state.status,
            progress=state.progress,
            error=state.error,
        )

    def list_tasks(self) -> list[TaskStatus]:
        return [
            TaskStatus(
                id=s.id, type=s.type, status=s.status,
                progress=s.progress, error=s.error,
            )
            for s in self._tasks.values()
        ]

    def update(self, task_id: str, **kwargs):
        state = self._tasks.get(task_id)
        if state:
            for k, v in kwargs.items():
                setattr(state, k, v)


task_manager = TaskManager()


async def run_scan_pipeline(
    scan_id: int, directory: str, recursive: bool, task_id: str
):
    """Run the full ingestion pipeline for a directory scan."""
    task_manager.update(task_id, status="running", progress={"phase": "scanning"})

    try:
        # Update scan status
        async with get_db_ctx() as db:
            await db.execute(
                "UPDATE scans SET status = 'scanning', started_at = ? WHERE id = ?",
                (datetime.now(timezone.utc).isoformat(), scan_id),
            )
            await db.commit()

        # Stage 1: Scan directory
        from .scanner import scan_directory

        loop = asyncio.get_event_loop()
        files = await loop.run_in_executor(None, scan_directory, directory, recursive)

        task_manager.update(task_id, progress={
            "phase": "scanning", "total": len(files), "current": 0,
        })

        async with get_db_ctx() as db:
            await db.execute(
                "UPDATE scans SET total_files = ? WHERE id = ?",
                (len(files), scan_id),
            )
            await db.commit()

        # Insert new photos, skip existing
        new_photo_ids = []
        skipped = 0
        async with get_db_ctx() as db:
            for file_info in files:
                cursor = await db.execute(
                    "SELECT id FROM photos WHERE file_path = ?",
                    (file_info["file_path"],),
                )
                existing = await cursor.fetchone()
                if existing:
                    skipped += 1
                    continue

                cursor = await db.execute(
                    """INSERT INTO photos
                       (file_path, filename, file_size, file_hash, mime_type, date_file, scan_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        file_info["file_path"],
                        file_info["filename"],
                        file_info["file_size"],
                        file_info["file_hash"],
                        file_info["mime_type"],
                        file_info["date_file"],
                        scan_id,
                    ),
                )
                new_photo_ids.append(cursor.lastrowid)

            await db.commit()
            await db.execute(
                "UPDATE scans SET new_photos = ?, skipped_files = ? WHERE id = ?",
                (len(new_photo_ids), skipped, scan_id),
            )
            await db.commit()

        if not new_photo_ids:
            task_manager.update(task_id, status="completed", progress={
                "phase": "completed", "total": len(files), "current": len(files),
            })
            async with get_db_ctx() as db:
                await db.execute(
                    "UPDATE scans SET status = 'completed', completed_at = ? WHERE id = ?",
                    (datetime.now(timezone.utc).isoformat(), scan_id),
                )
                await db.commit()
            return

        # Stage 2: EXIF extraction
        task_manager.update(task_id, progress={
            "phase": "exif", "total": len(new_photo_ids), "current": 0,
        })
        async with get_db_ctx() as db:
            await db.execute(
                "UPDATE scans SET status = 'processing' WHERE id = ?", (scan_id,)
            )
            await db.commit()

        from .exif_extractor import extract_exif

        with ProcessPoolExecutor(max_workers=settings.max_scan_workers) as pool:
            # Get file paths for new photos
            photo_paths = {}
            async with get_db_ctx() as db:
                for pid in new_photo_ids:
                    cursor = await db.execute(
                        "SELECT id, file_path FROM photos WHERE id = ?", (pid,)
                    )
                    row = await cursor.fetchone()
                    if row:
                        photo_paths[row["id"]] = row["file_path"]

            futures = {}
            for pid, path in photo_paths.items():
                future = loop.run_in_executor(pool, extract_exif, path)
                futures[pid] = future

            processed = 0
            async with get_db_ctx() as db:
                for pid, future in futures.items():
                    try:
                        exif_data = await future
                        await db.execute(
                            """UPDATE photos SET
                               width=?, height=?, date_taken=?,
                               latitude=?, longitude=?, altitude=?,
                               camera_make=?, camera_model=?, lens_model=?,
                               focal_length=?, aperture=?, shutter_speed=?,
                               iso=?, orientation=?
                               WHERE id=?""",
                            (
                                exif_data["width"], exif_data["height"],
                                exif_data["date_taken"],
                                exif_data["latitude"], exif_data["longitude"],
                                exif_data["altitude"],
                                exif_data["camera_make"], exif_data["camera_model"],
                                exif_data["lens_model"],
                                exif_data["focal_length"], exif_data["aperture"],
                                exif_data["shutter_speed"],
                                exif_data["iso"], exif_data["orientation"],
                                pid,
                            ),
                        )
                    except Exception as e:
                        logger.warning(f"EXIF extraction failed for photo {pid}: {e}")

                    processed += 1
                    if processed % 10 == 0:
                        await db.commit()
                        task_manager.update(task_id, progress={
                            "phase": "exif", "total": len(new_photo_ids),
                            "current": processed,
                        })

                await db.commit()

        # Stage 3: Thumbnail generation
        task_manager.update(task_id, progress={
            "phase": "thumbnails", "total": len(new_photo_ids), "current": 0,
        })

        from .thumbnail import generate_thumbnails

        with ProcessPoolExecutor(max_workers=settings.max_scan_workers) as pool:
            thumb_futures = {}
            async with get_db_ctx() as db:
                for pid in new_photo_ids:
                    cursor = await db.execute(
                        "SELECT id, file_path, orientation FROM photos WHERE id = ?",
                        (pid,),
                    )
                    row = await cursor.fetchone()
                    if row:
                        future = loop.run_in_executor(
                            pool, generate_thumbnails,
                            row["file_path"], row["id"], row["orientation"] or 1,
                        )
                        thumb_futures[pid] = future

            processed = 0
            error_count = 0
            async with get_db_ctx() as db:
                for pid, future in thumb_futures.items():
                    try:
                        rel_path = await future
                        await db.execute(
                            "UPDATE photos SET thumbnail_path = ? WHERE id = ?",
                            (rel_path, pid),
                        )
                    except Exception as e:
                        logger.warning(f"Thumbnail generation failed for photo {pid}: {e}")
                        error_count += 1

                    processed += 1
                    if processed % 10 == 0:
                        await db.commit()
                        task_manager.update(task_id, progress={
                            "phase": "thumbnails", "total": len(new_photo_ids),
                            "current": processed,
                        })
                        await db.execute(
                            "UPDATE scans SET processed_files = ?, error_count = ? WHERE id = ?",
                            (processed, error_count, scan_id),
                        )

                await db.commit()

        # Stage 4: CLIP embeddings (if available)
        try:
            from .embedding import clip_manager
            from .vector_store import vector_store

            clip_manager.load()

            task_manager.update(task_id, progress={
                "phase": "embeddings", "total": len(new_photo_ids), "current": 0,
            })

            batch_size = settings.clip_batch_size
            for i in range(0, len(new_photo_ids), batch_size):
                batch_ids = new_photo_ids[i:i + batch_size]
                batch_paths = []
                async with get_db_ctx() as db:
                    for pid in batch_ids:
                        cursor = await db.execute(
                            "SELECT file_path FROM photos WHERE id = ?", (pid,)
                        )
                        row = await cursor.fetchone()
                        if row:
                            batch_paths.append(row["file_path"])

                if batch_paths:
                    embeddings = await loop.run_in_executor(
                        None, clip_manager.embed_images, batch_paths, batch_size
                    )

                    metadatas = []
                    async with get_db_ctx() as db:
                        for pid in batch_ids:
                            cursor = await db.execute(
                                "SELECT date_taken, latitude, longitude FROM photos WHERE id = ?",
                                (pid,),
                            )
                            row = await cursor.fetchone()
                            meta = {"photo_id": pid}
                            if row:
                                if row["date_taken"]:
                                    meta["date_taken"] = row["date_taken"]
                                if row["latitude"] is not None:
                                    meta["latitude"] = row["latitude"]
                                if row["longitude"] is not None:
                                    meta["longitude"] = row["longitude"]
                            metadatas.append(meta)

                    vector_store.upsert_batch(
                        batch_ids,
                        embeddings.tolist(),
                        metadatas,
                    )

                    async with get_db_ctx() as db:
                        for pid in batch_ids:
                            await db.execute(
                                "UPDATE photos SET has_embedding = TRUE WHERE id = ?",
                                (pid,),
                            )
                        await db.commit()

                task_manager.update(task_id, progress={
                    "phase": "embeddings", "total": len(new_photo_ids),
                    "current": min(i + batch_size, len(new_photo_ids)),
                })

        except ImportError:
            logger.info("CLIP model not available, skipping embeddings")

        # Stage 5: AI tagging (if Ollama available)
        try:
            from .ai_tagger import generate_tags

            task_manager.update(task_id, progress={
                "phase": "ai_tagging", "total": len(new_photo_ids), "current": 0,
            })

            processed = 0
            for pid in new_photo_ids:
                async with get_db_ctx() as db:
                    cursor = await db.execute(
                        "SELECT thumbnail_path FROM photos WHERE id = ?", (pid,)
                    )
                    row = await cursor.fetchone()

                if not row or not row["thumbnail_path"]:
                    processed += 1
                    continue

                thumb_path = str(settings.thumbnail_dir / row["thumbnail_path"])

                try:
                    tag_result = await loop.run_in_executor(
                        None, generate_tags, thumb_path
                    )

                    async with get_db_ctx() as db:
                        for tag_name in tag_result.get("tags", []):
                            # Get or create tag
                            cursor = await db.execute(
                                "SELECT id FROM tags WHERE name = ? COLLATE NOCASE",
                                (tag_name,),
                            )
                            tag_row = await cursor.fetchone()
                            if tag_row:
                                tag_id = tag_row["id"]
                            else:
                                cursor = await db.execute(
                                    "INSERT INTO tags (name, source) VALUES (?, 'ai')",
                                    (tag_name,),
                                )
                                tag_id = cursor.lastrowid

                            await db.execute(
                                """INSERT OR IGNORE INTO photo_tags
                                   (photo_id, tag_id, confidence, source)
                                   VALUES (?, ?, 1.0, 'ai')""",
                                (pid, tag_id),
                            )

                        await db.execute(
                            "UPDATE photos SET has_ai_tags = TRUE WHERE id = ?",
                            (pid,),
                        )
                        await db.commit()

                except Exception as e:
                    logger.warning(f"AI tagging failed for photo {pid}: {e}")

                processed += 1
                task_manager.update(task_id, progress={
                    "phase": "ai_tagging", "total": len(new_photo_ids),
                    "current": processed,
                })

        except ImportError:
            logger.info("Ollama not available, skipping AI tagging")

        # Done
        task_manager.update(task_id, status="completed", progress={
            "phase": "completed", "total": len(new_photo_ids),
            "current": len(new_photo_ids),
        })
        async with get_db_ctx() as db:
            await db.execute(
                """UPDATE scans SET status = 'completed',
                   processed_files = ?, completed_at = ?
                   WHERE id = ?""",
                (len(new_photo_ids), datetime.now(timezone.utc).isoformat(), scan_id),
            )
            await db.commit()

    except Exception as e:
        logger.exception(f"Pipeline failed for scan {scan_id}")
        task_manager.update(task_id, status="failed", error=str(e))
        async with get_db_ctx() as db:
            await db.execute(
                "UPDATE scans SET status = 'failed' WHERE id = ?", (scan_id,)
            )
            await db.commit()
