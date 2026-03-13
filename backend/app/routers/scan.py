import asyncio
import uuid
from fastapi import APIRouter, HTTPException
from pathlib import Path

from ..database import get_db_ctx
from ..models import ScanRequest, ScanStatus, DirectoryCreate, DirectoryOut
from ..services.pipeline import run_scan_pipeline, task_manager

router = APIRouter(tags=["scan"])


@router.post("/scan")
async def start_scan(req: ScanRequest):
    directory = Path(req.directory).resolve()
    if not directory.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory not found: {directory}")

    async with get_db_ctx() as db:
        cursor = await db.execute(
            "INSERT INTO scans (directory, status) VALUES (?, 'pending')",
            (str(directory),),
        )
        await db.commit()
        scan_id = cursor.lastrowid

    task_id = str(uuid.uuid4())
    task_manager.create_task(task_id, "scan")

    asyncio.create_task(
        run_scan_pipeline(scan_id, str(directory), req.recursive, task_id)
    )

    return {"scan_id": scan_id, "task_id": task_id}


@router.get("/scan/{scan_id}/status")
async def scan_status(scan_id: int) -> ScanStatus:
    async with get_db_ctx() as db:
        cursor = await db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,))
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanStatus(**dict(row))


@router.get("/scan/history")
async def scan_history() -> list[ScanStatus]:
    async with get_db_ctx() as db:
        cursor = await db.execute("SELECT * FROM scans ORDER BY created_at DESC LIMIT 50")
        rows = await cursor.fetchall()
    return [ScanStatus(**dict(r)) for r in rows]


@router.post("/directories", status_code=201)
async def add_directory(body: DirectoryCreate) -> DirectoryOut:
    directory = Path(body.directory).resolve()
    if not directory.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory not found: {directory}")

    async with get_db_ctx() as db:
        try:
            cursor = await db.execute(
                "INSERT INTO watched_directories (directory, recursive) VALUES (?, ?)",
                (str(directory), body.recursive),
            )
            await db.commit()
            dir_id = cursor.lastrowid
        except Exception:
            raise HTTPException(status_code=409, detail="Directory already watched")

        cursor = await db.execute(
            "SELECT * FROM watched_directories WHERE id = ?", (dir_id,)
        )
        row = await cursor.fetchone()
    return DirectoryOut(**dict(row))


@router.get("/directories")
async def list_directories() -> list[DirectoryOut]:
    async with get_db_ctx() as db:
        cursor = await db.execute("SELECT * FROM watched_directories ORDER BY directory")
        rows = await cursor.fetchall()
    return [DirectoryOut(**dict(r)) for r in rows]


@router.delete("/directories/{dir_id}")
async def remove_directory(dir_id: int):
    async with get_db_ctx() as db:
        cursor = await db.execute(
            "DELETE FROM watched_directories WHERE id = ?", (dir_id,)
        )
        await db.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Directory not found")
    return {"status": "deleted"}
