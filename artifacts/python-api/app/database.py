"""Simple JSON-file storage for tasks (no external DB needed)."""
import json
import os
from typing import Optional, List
from datetime import datetime, timezone

STORAGE_FILE = os.getenv("STORAGE_FILE", "/tmp/roiflow_tasks.json")


def _load() -> List[dict]:
    if not os.path.exists(STORAGE_FILE):
        return []
    try:
        with open(STORAGE_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def _save(tasks: List[dict]) -> None:
    with open(STORAGE_FILE, "w") as f:
        json.dump(tasks, f, indent=2)


def save_task(task: dict) -> dict:
    tasks = _load()
    task_id = (max((t["id"] for t in tasks), default=0) + 1)
    task = {**task, "id": task_id, "createdAt": datetime.now(timezone.utc).isoformat()}
    tasks.append(task)
    _save(tasks)
    return task


def get_all_tasks() -> List[dict]:
    return sorted(_load(), key=lambda t: t.get("roiScore", 0), reverse=True)


def get_task(task_id: int) -> Optional[dict]:
    tasks = _load()
    return next((t for t in tasks if t["id"] == task_id), None)


def delete_task(task_id: int) -> bool:
    tasks = _load()
    new_tasks = [t for t in tasks if t["id"] != task_id]
    if len(new_tasks) == len(tasks):
        return False
    _save(new_tasks)
    return True
