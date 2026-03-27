from typing import Optional, List
from pydantic import BaseModel, Field


class AutomationState(BaseModel):
    raw_input: str = ""
    title: str = ""
    description: str = ""
    frequency_per_month: int = 0
    minutes_per_run: int = 0
    people_involved: int = 0

    task_summary: str = ""
    trigger: str = ""
    apps_detected: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)
    output_action: str = ""

    monthly_hours_lost: float = 0.0
    estimated_hours_saved: float = 0.0
    roi_score: int = 0
    complexity_score: int = 0
    priority: str = ""

    automation_recommendation: str = ""
    suggested_tool_stack: List[str] = Field(default_factory=list)
    workflow_json: str = ""

    validation_errors: List[str] = Field(default_factory=list)
    summary: str = ""
    llm_mode_used: str = "rules"

    warnings: List[str] = Field(default_factory=list)
