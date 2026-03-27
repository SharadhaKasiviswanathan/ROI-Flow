"""
Dual storage: PostgreSQL (primary) + JSON file fallback.
AI tasks are saved to PostgreSQL so they appear alongside standard tasks in the dashboard.
"""
import json
import os
import psycopg2
import psycopg2.extras
from typing import Optional, List
from datetime import datetime, timezone

STORAGE_FILE = os.getenv("STORAGE_FILE", "/tmp/roiflow_tasks.json")
DATABASE_URL = os.getenv("DATABASE_URL")


def _get_conn():
    if not DATABASE_URL:
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception:
        return None


def save_task(task: dict) -> dict:
    """Save task to PostgreSQL (opportunities table) and return with assigned ID."""
    conn = _get_conn()
    if conn:
        try:
            with conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("""
                        INSERT INTO opportunities (
                            title, description, frequency_per_month, minutes_per_run,
                            people_involved, task_summary, trigger, apps_involved,
                            output_action, monthly_hours_lost, estimated_hours_saved,
                            roi_score, complexity_score, priority,
                            automation_recommendation, suggested_tool_stack,
                            n8n_workflow_json, source
                        ) VALUES (
                            %(title)s, %(description)s, %(frequencyPerMonth)s, %(minutesPerRun)s,
                            %(peopleInvolved)s, %(taskSummary)s, %(trigger)s, %(appsDetected)s,
                            %(outputAction)s, %(monthlyHoursLost)s, %(estimatedHoursSaved)s,
                            %(roiScore)s, %(complexityScore)s, %(priority)s,
                            %(automationRecommendation)s, %(suggestedToolStack)s,
                            %(n8nWorkflowJson)s, 'langgraph'
                        ) RETURNING id, created_at
                    """, task)
                    row = cur.fetchone()
                    task = {**task, "id": row["id"], "createdAt": row["created_at"].isoformat()}
            conn.close()
            return task
        except Exception as e:
            conn.close()
            # Fall through to JSON storage
            pass

    # Fallback: JSON file storage
    return _save_json(task)


def get_all_tasks() -> List[dict]:
    """Get all AI-source tasks from PostgreSQL."""
    conn = _get_conn()
    if conn:
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM opportunities
                    WHERE source = 'langgraph'
                    ORDER BY roi_score DESC
                """)
                rows = cur.fetchall()
            conn.close()
            return [_pg_to_api(dict(r)) for r in rows]
        except Exception:
            conn.close()
    return _load_json()


def get_task(task_id: int) -> Optional[dict]:
    """Get a single task by ID."""
    conn = _get_conn()
    if conn:
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM opportunities WHERE id = %s", (task_id,))
                row = cur.fetchone()
            conn.close()
            if row:
                return _pg_to_api(dict(row))
        except Exception:
            conn.close()
    # Fallback JSON
    tasks = _load_json()
    return next((t for t in tasks if t["id"] == task_id), None)


def delete_task(task_id: int) -> bool:
    conn = _get_conn()
    if conn:
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM opportunities WHERE id = %s", (task_id,))
                    deleted = cur.rowcount > 0
            conn.close()
            return deleted
        except Exception:
            conn.close()
    # Fallback JSON
    tasks = _load_json()
    new_tasks = [t for t in tasks if t["id"] != task_id]
    if len(new_tasks) == len(tasks):
        return False
    _save_json_list(new_tasks)
    return True


def _pg_to_api(row: dict) -> dict:
    """Convert PostgreSQL snake_case row to camelCase API response."""
    return {
        "id": row.get("id"),
        "title": row.get("title", ""),
        "description": row.get("description", ""),
        "frequencyPerMonth": row.get("frequency_per_month", 0),
        "minutesPerRun": row.get("minutes_per_run", 0),
        "peopleInvolved": row.get("people_involved", 0),
        "taskSummary": row.get("task_summary", ""),
        "trigger": row.get("trigger", ""),
        "appsDetected": row.get("apps_involved", []) or [],
        "outputAction": row.get("output_action", ""),
        "monthlyHoursLost": float(row.get("monthly_hours_lost", 0)),
        "estimatedHoursSaved": float(row.get("estimated_hours_saved", 0)),
        "roiScore": row.get("roi_score", 0),
        "complexityScore": row.get("complexity_score", 0),
        "priority": row.get("priority", "Low"),
        "automationRecommendation": row.get("automation_recommendation", ""),
        "suggestedToolStack": row.get("suggested_tool_stack", []) or [],
        "n8nWorkflowJson": row.get("n8n_workflow_json", ""),
        "source": row.get("source", "langgraph"),
        "llmModeUsed": "openai:gpt-5-mini",
        "validationErrors": [],
        "warnings": [],
        "createdAt": row.get("created_at", "").isoformat() if hasattr(row.get("created_at", ""), "isoformat") else str(row.get("created_at", "")),
    }


def _load_json() -> List[dict]:
    if not os.path.exists(STORAGE_FILE):
        return []
    try:
        with open(STORAGE_FILE) as f:
            return json.load(f)
    except Exception:
        return []


def _save_json(task: dict) -> dict:
    tasks = _load_json()
    task_id = (max((t["id"] for t in tasks), default=0) + 1)
    task = {**task, "id": task_id, "createdAt": datetime.now(timezone.utc).isoformat()}
    tasks.append(task)
    _save_json_list(tasks)
    return task


def _save_json_list(tasks: list) -> None:
    with open(STORAGE_FILE, "w") as f:
        json.dump(tasks, f, indent=2)
