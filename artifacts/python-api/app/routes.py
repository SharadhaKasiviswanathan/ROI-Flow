import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Literal
from .graph import roiflow_graph, NODE_LABELS, build_agent_pipeline
from .database import (
    delete_task,
    get_all_tasks,
    get_storage_status,
    get_task,
    save_task,
)
from .classifier import (
    detect_actions,
    detect_apps,
    detect_output,
    detect_trigger,
    generate_task_summary,
    suggest_tool_stack,
)
from .llm_provider import get_llm_status
from .n8n_builder import build_n8n_workflow, validate_workflow
from .roi_engine import calculate_roi

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
        "taskSummary": result["summary"] or result["task_summary"],
        "trigger": result["trigger"],
        "appsInvolved": result["apps_detected"],
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
        "agentPipeline": build_agent_pipeline(),
    }


def _run_standard_analysis(task: TaskInput) -> dict:
    apps = detect_apps(task.description)
    trigger = detect_trigger(task.description)
    output_action = detect_output(task.description)
    actions = detect_actions(task.description)
    task_summary = generate_task_summary(task.title, trigger, apps, output_action)
    roi = calculate_roi(
        frequency_per_month=task.frequency_per_month,
        minutes_per_run=task.minutes_per_run,
        people_involved=task.people_involved,
        apps_count=len(apps),
    )
    workflow_json = build_n8n_workflow(task.title, trigger, apps)

    return {
        "title": task.title,
        "description": task.description,
        "frequencyPerMonth": task.frequency_per_month,
        "minutesPerRun": task.minutes_per_run,
        "peopleInvolved": task.people_involved,
        "taskSummary": task_summary,
        "trigger": trigger,
        "appsInvolved": apps,
        "actions": actions,
        "outputAction": output_action,
        "monthlyHoursLost": roi.monthly_hours_lost,
        "estimatedHoursSaved": roi.estimated_hours_saved,
        "roiScore": roi.roi_score,
        "complexityScore": roi.complexity_score,
        "priority": roi.priority,
        "automationRecommendation": (
            "Rules-based mode generated this workflow. Switch to AI mode to let the LangGraph agents refine the summary and workflow guidance."
        ),
        "suggestedToolStack": suggest_tool_stack(apps),
        "n8nWorkflowJson": workflow_json,
        "validationErrors": validate_workflow(workflow_json),
        "summary": task_summary,
        "llmModeUsed": "rules",
        "warnings": [],
        "source": "standard",
    }


def _run_agentic_analysis(task: TaskInput) -> dict:
    initial = _build_initial_state(task)
    result = roiflow_graph.invoke(initial)
    response = _state_to_response(result, task)
    return save_task(response)


def _require_ollama_ai() -> dict:
    llm_status = get_llm_status()
    if not llm_status.get("available"):
        raise HTTPException(
            status_code=503,
            detail=(
                "AI mode requires a reachable Ollama host. "
                f"{llm_status.get('message', 'Ollama is not ready.')} "
                f"{llm_status.get('setupHint', '')}".strip()
            ),
        )
    return llm_status


@router.post("/opportunities", status_code=201)
async def create_opportunity(task: TaskInput):
    try:
        result = _run_standard_analysis(task)
        return save_task(result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/opportunities")
async def list_opportunities(
    sort: Literal["roi_score", "priority", "created_at"] = "roi_score",
    order: Literal["asc", "desc"] = "desc",
):
    return get_all_tasks(sort=sort, order=order)


@router.get("/opportunities/{task_id}")
async def get_opportunity(task_id: int):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return task


@router.delete("/opportunities/{task_id}", status_code=204)
async def delete_opportunity(task_id: int):
    if not delete_task(task_id):
        raise HTTPException(status_code=404, detail="Opportunity not found")


@router.post("/analyze-task", status_code=201)
async def analyze_task(task: TaskInput):
    try:
        _require_ollama_ai()
        return _run_agentic_analysis(task)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/analyze-task/stream")
async def analyze_task_stream(task: TaskInput):
    _require_ollama_ai()

    async def event_generator():
        try:
            initial = _build_initial_state(task)
            total_nodes = len(NODE_LABELS)
            completed = 0
            latest_state = dict(initial)

            for step in roiflow_graph.stream(initial, stream_mode="updates"):
                for node_name, node_output in step.items():
                    if isinstance(node_output, dict):
                        latest_state.update(node_output)
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
                    await asyncio.sleep(0.05)

            response = _state_to_response(latest_state, task)
            saved = save_task(response)

            done_event = {"type": "done", "result": saved}
            yield f"data: {json.dumps(done_event)}\n\n"

        except Exception as exc:
            error_event = {"type": "error", "message": str(exc)}
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
    llm_status = get_llm_status()
    storage_status = get_storage_status()
    return {
        "status": "ok",
        "service": "ROIFlow AI by Sharadha  Kasiviswanathan",
        "engine": "FastAPI + LangGraph + Ollama local or cloud",
        "aiMode": "ollama",
        "llm": llm_status,
        "storage": storage_status,
    }
