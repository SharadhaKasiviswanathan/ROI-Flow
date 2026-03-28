from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_STORAGE_FILE = PROJECT_ROOT / ".local" / "state" / "roiflow_tasks.json"
STORAGE_FILE = Path(os.getenv("ROIFLOW_STORAGE_FILE", DEFAULT_STORAGE_FILE))

SORT_FIELD_MAP = {
    "roi_score": "roiScore",
    "priority": "priority",
    "created_at": "createdAt",
}
PRIORITY_ORDER = {"Low": 0, "Medium": 1, "High": 2}


def _ensure_storage_dir() -> None:
    STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)


def get_storage_status() -> dict[str, Any]:
    tasks = _load_json()
    return {
        "mode": "json-file",
        "path": str(STORAGE_FILE),
        "tasksStored": len(tasks),
    }


def save_task(task: dict[str, Any]) -> dict[str, Any]:
    tasks = _load_json()
    task_id = max((int(item.get("id", 0)) for item in tasks), default=0) + 1
    normalized = _normalize_task(task)
    normalized["id"] = task_id
    normalized["createdAt"] = datetime.now(timezone.utc).isoformat()
    tasks.append(normalized)
    _save_json_list(tasks)
    return normalized


def get_all_tasks(sort: str = "roi_score", order: str = "desc") -> list[dict[str, Any]]:
    tasks = _load_json()
    sort_key = SORT_FIELD_MAP.get(sort, SORT_FIELD_MAP["roi_score"])
    reverse = order != "asc"
    return sorted(tasks, key=lambda task: _sort_value(task, sort_key), reverse=reverse)


def get_task(task_id: int) -> dict[str, Any] | None:
    tasks = _load_json()
    return next((task for task in tasks if int(task.get("id", 0)) == task_id), None)


def delete_task(task_id: int) -> bool:
    tasks = _load_json()
    remaining = [task for task in tasks if int(task.get("id", 0)) != task_id]
    if len(remaining) == len(tasks):
        return False
    _save_json_list(remaining)
    return True


def _sort_value(task: dict[str, Any], sort_key: str) -> Any:
    if sort_key == "priority":
        return PRIORITY_ORDER.get(str(task.get("priority", "Low")), len(PRIORITY_ORDER))
    if sort_key == "createdAt":
        value = str(task.get("createdAt", ""))
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)
    return float(task.get(sort_key, 0))


def _load_json() -> list[dict[str, Any]]:
    if not STORAGE_FILE.exists():
        return []
    try:
        with STORAGE_FILE.open() as handle:
            data = json.load(handle)
    except Exception:
        return []

    if not isinstance(data, list):
        return []

    return [_normalize_task(item) for item in data if isinstance(item, dict)]


def _save_json_list(tasks: list[dict[str, Any]]) -> None:
    _ensure_storage_dir()
    with STORAGE_FILE.open("w") as handle:
        json.dump(tasks, handle, indent=2)


def _normalize_task(task: dict[str, Any]) -> dict[str, Any]:
    apps = task.get("appsInvolved") or task.get("appsDetected") or []
    tools = task.get("suggestedToolStack") or task.get("suggested_tool_stack") or []
    validation_errors = task.get("validationErrors") or task.get("validation_errors") or []
    warnings = task.get("warnings") or []
    agent_pipeline = task.get("agentPipeline") or task.get("agent_pipeline") or []

    return {
        "id": int(task.get("id", 0)) if task.get("id") is not None else 0,
        "title": str(task.get("title", "")).strip(),
        "description": str(task.get("description", "")).strip(),
        "frequencyPerMonth": int(task.get("frequencyPerMonth", task.get("frequency_per_month", 0)) or 0),
        "minutesPerRun": int(task.get("minutesPerRun", task.get("minutes_per_run", 0)) or 0),
        "peopleInvolved": int(task.get("peopleInvolved", task.get("people_involved", 0)) or 0),
        "taskSummary": str(task.get("taskSummary", task.get("task_summary", task.get("summary", "")))).strip(),
        "trigger": str(task.get("trigger", "")).strip(),
        "appsInvolved": list(apps) if isinstance(apps, list) else [],
        "outputAction": str(task.get("outputAction", task.get("output_action", ""))).strip(),
        "monthlyHoursLost": float(task.get("monthlyHoursLost", task.get("monthly_hours_lost", 0)) or 0),
        "estimatedHoursSaved": float(task.get("estimatedHoursSaved", task.get("estimated_hours_saved", 0)) or 0),
        "roiScore": int(task.get("roiScore", task.get("roi_score", 0)) or 0),
        "complexityScore": int(task.get("complexityScore", task.get("complexity_score", 0)) or 0),
        "priority": str(task.get("priority", "Low")).strip() or "Low",
        "automationRecommendation": str(
            task.get("automationRecommendation", task.get("automation_recommendation", ""))
        ).strip(),
        "suggestedToolStack": list(tools) if isinstance(tools, list) else [],
        "n8nWorkflowJson": str(task.get("n8nWorkflowJson", task.get("workflow_json", ""))).strip(),
        "validationErrors": list(validation_errors) if isinstance(validation_errors, list) else [],
        "summary": str(task.get("summary", "")).strip(),
        "llmModeUsed": str(task.get("llmModeUsed", task.get("llm_mode_used", "rules"))).strip() or "rules",
        "warnings": list(warnings) if isinstance(warnings, list) else [],
        "source": str(task.get("source", "standard")).strip() or "standard",
        "agentPipeline": [
            {
                "node": str(step.get("node", "")).strip(),
                "label": str(step.get("label", "")).strip(),
                "order": int(step.get("order", index + 1) or index + 1),
                "status": str(step.get("status", "completed")).strip() or "completed",
            }
            for index, step in enumerate(agent_pipeline)
            if isinstance(step, dict)
        ],
        "createdAt": str(task.get("createdAt", datetime.now(timezone.utc).isoformat())),
    }
