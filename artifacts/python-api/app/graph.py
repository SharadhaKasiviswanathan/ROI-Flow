"""
LangGraph stateful workflow for ROIFlow AI.
Nodes: ingest_input → parse_task → extract_entities → estimate_roi →
        choose_workflow_template → generate_n8n_json → validate_output → summarize_result
"""
from typing import TypedDict, List, Annotated
from langgraph.graph import StateGraph, END
from .classifier import (
    detect_apps, detect_trigger, detect_output, detect_actions,
    generate_task_summary, generate_recommendation, suggest_tool_stack,
)
from .roi_engine import calculate_roi
from .n8n_builder import build_n8n_workflow, validate_workflow
from .llm_provider import enhance_summary


class GraphState(TypedDict):
    raw_input: str
    title: str
    description: str
    frequency_per_month: int
    minutes_per_run: int
    people_involved: int

    task_summary: str
    trigger: str
    apps_detected: List[str]
    actions: List[str]
    output_action: str

    monthly_hours_lost: float
    estimated_hours_saved: float
    roi_score: int
    complexity_score: int
    priority: str

    automation_recommendation: str
    suggested_tool_stack: List[str]
    workflow_json: str

    validation_errors: List[str]
    summary: str
    llm_mode_used: str
    warnings: List[str]


def ingest_input(state: GraphState) -> GraphState:
    state["raw_input"] = f"{state.get('title', '')} | {state.get('description', '')}"
    state["warnings"] = []
    state["validation_errors"] = []
    if not state.get("title"):
        state["warnings"].append("No title provided — using description as title")
        state["title"] = state.get("description", "Untitled Task")[:60]
    return state


def parse_task(state: GraphState) -> GraphState:
    state["trigger"] = detect_trigger(state["description"])
    state["output_action"] = detect_output(state["description"])
    return state


def extract_entities(state: GraphState) -> GraphState:
    state["apps_detected"] = detect_apps(state["description"])
    state["actions"] = detect_actions(state["description"])
    return state


def estimate_roi(state: GraphState) -> GraphState:
    result = calculate_roi(
        frequency_per_month=state["frequency_per_month"],
        minutes_per_run=state["minutes_per_run"],
        people_involved=state["people_involved"],
        apps_count=len(state["apps_detected"]),
    )
    state["monthly_hours_lost"] = result.monthly_hours_lost
    state["estimated_hours_saved"] = result.estimated_hours_saved
    state["roi_score"] = result.roi_score
    state["complexity_score"] = result.complexity_score
    state["priority"] = result.priority

    state["automation_recommendation"] = generate_recommendation(
        state["apps_detected"],
        state["trigger"],
        state["output_action"],
        result.priority,
    )
    state["suggested_tool_stack"] = suggest_tool_stack(state["apps_detected"])
    return state


def choose_workflow_template(state: GraphState) -> GraphState:
    state["task_summary"] = generate_task_summary(
        state["title"],
        state["trigger"],
        state["apps_detected"],
        state["output_action"],
    )
    return state


def generate_n8n_json(state: GraphState) -> GraphState:
    state["workflow_json"] = build_n8n_workflow(
        state["title"],
        state["trigger"],
        state["apps_detected"],
    )
    return state


def validate_output(state: GraphState) -> GraphState:
    errors = validate_workflow(state["workflow_json"])
    state["validation_errors"] = errors
    if errors:
        state["warnings"].append(f"Workflow validation: {len(errors)} issue(s) found")
    return state


def summarize_result(state: GraphState) -> GraphState:
    summary, mode = enhance_summary(
        title=state["title"],
        description=state["description"],
        apps=state["apps_detected"],
        trigger=state["trigger"],
        output_action=state["output_action"],
    )
    state["summary"] = summary
    state["llm_mode_used"] = mode
    return state


def build_graph():
    workflow = StateGraph(GraphState)

    workflow.add_node("ingest_input", ingest_input)
    workflow.add_node("parse_task", parse_task)
    workflow.add_node("extract_entities", extract_entities)
    workflow.add_node("estimate_roi", estimate_roi)
    workflow.add_node("choose_workflow_template", choose_workflow_template)
    workflow.add_node("generate_n8n_json", generate_n8n_json)
    workflow.add_node("validate_output", validate_output)
    workflow.add_node("summarize_result", summarize_result)

    workflow.set_entry_point("ingest_input")
    workflow.add_edge("ingest_input", "parse_task")
    workflow.add_edge("parse_task", "extract_entities")
    workflow.add_edge("extract_entities", "estimate_roi")
    workflow.add_edge("estimate_roi", "choose_workflow_template")
    workflow.add_edge("choose_workflow_template", "generate_n8n_json")
    workflow.add_edge("generate_n8n_json", "validate_output")
    workflow.add_edge("validate_output", "summarize_result")
    workflow.add_edge("summarize_result", END)

    return workflow.compile()


roiflow_graph = build_graph()
