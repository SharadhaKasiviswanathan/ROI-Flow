from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from .graph import roiflow_graph
from .database import save_task, get_all_tasks, get_task, delete_task

router = APIRouter()


class TaskInput(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=10)
    frequency_per_month: int = Field(..., ge=1, le=10000)
    minutes_per_run: int = Field(..., ge=1, le=10000)
    people_involved: int = Field(..., ge=1, le=1000)


DEMO_INPUTS = {
    "onboarding": TaskInput(
        title="Client Onboarding from Typeform to CRM and Slack",
        description="When a client submits our onboarding typeform, we manually copy their info into Salesforce CRM, create a Slack channel for them, and send a welcome email via Gmail.",
        frequency_per_month=20,
        minutes_per_run=15,
        people_involved=2,
    ),
    "invoice": TaskInput(
        title="Invoice Reminder Workflow",
        description="Every week we check QuickBooks for overdue invoices and manually send reminder emails via Gmail to clients who haven't paid. We also update a tracking Google Sheets spreadsheet.",
        frequency_per_month=4,
        minutes_per_run=45,
        people_involved=1,
    ),
    "feedback": TaskInput(
        title="Customer Feedback Classification",
        description="Daily we receive feedback submissions via Google Forms, manually read each one, tag them as positive/negative/neutral, and copy results to Google Sheets. We then send a Slack summary.",
        frequency_per_month=22,
        minutes_per_run=20,
        people_involved=2,
    ),
}


def _run_graph(task: TaskInput) -> dict:
    initial_state = {
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
    result = roiflow_graph.invoke(initial_state)
    return {
        "title": result["title"],
        "description": result["description"],
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
    try:
        result = _run_graph(task)
        saved = save_task(result)
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.get("/export/{task_id}")
async def export_task(task_id: int):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "n8nWorkflow": task.get("n8nWorkflowJson", ""),
        "task": task,
    }


@router.post("/demo/{demo_key}")
async def run_demo(demo_key: str):
    if demo_key not in DEMO_INPUTS:
        raise HTTPException(status_code=404, detail=f"Demo '{demo_key}' not found. Available: {list(DEMO_INPUTS.keys())}")
    task = DEMO_INPUTS[demo_key]
    result = _run_graph(task)
    return save_task(result)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ROIFlow AI (LangGraph)"}
