from fastapi import APIRouter, HTTPException

from ..models import TaskStatus
from ..services.pipeline import task_manager

router = APIRouter(tags=["tasks"])


@router.get("/tasks/{task_id}")
async def get_task(task_id: str) -> TaskStatus:
    task = task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/tasks")
async def list_tasks() -> list[TaskStatus]:
    return task_manager.list_tasks()
