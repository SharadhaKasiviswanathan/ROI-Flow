import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from .graph import roiflow_graph, NODE_LABELS
from .database import save_task, get_all_tasks, get_task, delete_task

router = APIRouter()


class TaskInput(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=10)
    frequency_per_month: int = Field(..., ge=1, le=10000)
    minutes_per_run: int = Field(..., ge=1, le=10000)
    people_involved: int = Field(..., ge=1, le=1000)


def _build_initial_state(task: TaskInput) -> dict:
    return {
        "raw_input": "",
        "title": task.title,
        "description": task.description,
        "frequency_per_month": task.frequency_per_month,
        "minutes_per_run": task.minutes_per_run,
        "people_involved": task.people_involved,
        "task_summary": "",
        "trigger": "",
        "apps_detected": [],
        "actions": [],
        "output_action": "",
        "monthly_hours_lost": 0.0,
        "estimated_hours_saved": 0.0,
        "roi_score": 0,
        "complexity_score": 0,
        "priority": "",
        "automation_recommendation": "",
        "suggested_tool_stack": [],
        "workflow_json": "",
        "validation_errors": [],
        "summary": "",
        "llm_mode_used": "rules",
        "warnings": [],
    }


def _state_to_response(result: dict, task: TaskInput) -> dict:
    return {
        "title": result["title"],
        "description": result["description"] if result.get("description") else task.description,
        "frequencyPerMonth": result["frequency_per_month"],
        "minutesPerRun": result["minutes_per_run"],
        "peopleInvolved": result["people_involved"],
        "taskSummary": result["task_summary"],
        "trigger": result["trigger"],
        "appsDetected": result["apps_detected"],
        "actions": result["actions"],
        "outputAction": result["output_action"],
        "monthlyHoursLost": result["monthly_hours_lost"],
        "estimatedHoursSaved": result["estimated_hours_saved"],
        "roiScore": result["roi_score"],
        "complexityScore": result["complexity_score"],
        "priority": result["priority"],
        "automationRecommendation": result["automation_recommendation"],
        "suggestedToolStack": result["suggested_tool_stack"],
        "n8nWorkflowJson": result["workflow_json"],
        "validationErrors": result["validation_errors"],
        "summary": result["summary"],
        "llmModeUsed": result["llm_mode_used"],
        "warnings": result["warnings"],
        "source": "langgraph",
    }


@router.post("/analyze-task", status_code=201)
async def analyze_task(task: TaskInput):
    """Run full LangGraph pipeline and return result."""
    try:
        initial = _build_initial_state(task)
        result = roiflow_graph.invoke(initial)
        response = _state_to_response(result, task)
        saved = save_task(response)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-task/stream")
async def analyze_task_stream(task: TaskInput):
    """
    Stream agent progress via Server-Sent Events.
    Each LangGraph node emits a step event, then a final `done` event with the full result.
    """
    async def event_generator():
        try:
            initial = _build_initial_state(task)
            total_nodes = len(NODE_LABELS)
            completed = 0

            # Stream node-by-node using LangGraph's stream() API
            for step in roiflow_graph.stream(initial, stream_mode="updates"):
                for node_name, node_output in step.items():
                    completed += 1
                    label = NODE_LABELS.get(node_name, node_name.replace("_", " ").title())
                    event = {
                        "type": "step",
                        "node": node_name,
                        "label": label,
                        "completed": completed,
                        "total": total_nodes,
                    }
                    yield f"data: {json.dumps(event)}\n\n"
                    await asyncio.sleep(0.05)  # tiny delay for UI smoothness

            # After streaming completes, re-invoke to get final state
            # (stream() gives per-node diffs; we need full merged state)
            final_state = roiflow_graph.invoke(initial)
            response = _state_to_response(final_state, task)
            saved = save_task(response)

            done_event = {"type": "done", "result": saved}
            yield f"data: {json.dumps(done_event)}\n\n"

        except Exception as e:
            error_event = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/tasks")
async def list_tasks():
    return get_all_tasks()


@router.get("/tasks/{task_id}")
async def get_task_by_id(task_id: int):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task_by_id(task_id: int):
    if not delete_task(task_id):
        raise HTTPException(status_code=404, detail="Task not found")


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ROIFlow AI (LangGraph)",
        "llm": "Replit AI Integrations (OpenAI)",
        "storage": "PostgreSQL",
    }
