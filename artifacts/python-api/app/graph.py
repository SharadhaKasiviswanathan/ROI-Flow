"""
LangGraph stateful workflow for ROIFlow AI.
The graph models specialist "agents" that inspect the task, score ROI,
assemble a workflow, validate it, and write the final recommendation.
"""
from typing import Any, TypedDict, List
from langgraph.graph import StateGraph, END
from .classifier import (
    detect_apps, detect_trigger, detect_output, detect_actions,
    generate_task_summary, suggest_tool_stack,
)
from .roi_engine import calculate_roi
from .n8n_builder import build_n8n_workflow, validate_workflow
from .llm_provider import enhance_summary, generate_automation_recommendation


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


NODE_LABELS = {
    "intake_agent": "Intake agent captures the task",
    "process_analyst_agent": "Process analyst maps the trigger and output",
    "tool_discovery_agent": "Tool discovery agent identifies apps and actions",
    "roi_analyst_agent": "ROI analyst scores impact and complexity",
    "workflow_architect_agent": "Workflow architect drafts the n8n automation",
    "workflow_builder_agent": "Workflow builder renders the workflow JSON",
    "workflow_validator_agent": "Workflow validator checks the graph",
    "summary_agent": "Summary agent writes the recommendation",
}

NODE_SEQUENCE = list(NODE_LABELS.keys())


def build_agent_pipeline() -> list[dict[str, Any]]:
    return [
        {
            "node": node_name,
            "label": NODE_LABELS[node_name],
            "order": index + 1,
            "status": "completed",
        }
        for index, node_name in enumerate(NODE_SEQUENCE)
    ]


def intake_agent(state: GraphState) -> GraphState:
    state["raw_input"] = f"{state.get('title', '')} | {state.get('description', '')}"
    state["warnings"] = []
    state["validation_errors"] = []
    if not state.get("title"):
        state["warnings"].append("No title provided — using description as title")
        state["title"] = state.get("description", "Untitled Task")[:60]
    state["task_summary"] = state.get("task_summary", "")
    return state


def process_analyst_agent(state: GraphState) -> GraphState:
    state["trigger"] = detect_trigger(state["description"])
    state["output_action"] = detect_output(state["description"])
    return state


def tool_discovery_agent(state: GraphState) -> GraphState:
    state["apps_detected"] = detect_apps(state["description"])
    state["actions"] = detect_actions(state["description"])
    return state


def roi_analyst_agent(state: GraphState) -> GraphState:
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
    state["suggested_tool_stack"] = suggest_tool_stack(state["apps_detected"])
    return state


def workflow_architect_agent(state: GraphState) -> GraphState:
    state["task_summary"] = generate_task_summary(
        state["title"],
        state["trigger"],
        state["apps_detected"],
        state["output_action"],
    )
    return state


def workflow_builder_agent(state: GraphState) -> GraphState:
    state["workflow_json"] = build_n8n_workflow(
        state["title"],
        state["trigger"],
        state["apps_detected"],
    )
    return state


def workflow_validator_agent(state: GraphState) -> GraphState:
    errors = validate_workflow(state["workflow_json"])
    state["validation_errors"] = errors
    if errors:
        state["warnings"].append(f"Workflow validation: {len(errors)} issue(s) found")
    return state


def summary_agent(state: GraphState) -> GraphState:
    summary, summary_mode, summary_warning = enhance_summary(
        title=state["title"],
        description=state["description"],
        apps=state["apps_detected"],
        trigger=state["trigger"],
        output_action=state["output_action"],
    )
    recommendation, recommendation_mode, recommendation_warning = generate_automation_recommendation(
        title=state["title"],
        description=state["description"],
        apps=state["apps_detected"],
        trigger=state["trigger"],
        output=state["output_action"],
        priority=state["priority"],
    )
    state["summary"] = summary
    state["automation_recommendation"] = recommendation
    state["llm_mode_used"] = recommendation_mode if recommendation_mode != "rules" else summary_mode

    for warning in (summary_warning, recommendation_warning):
        if warning and warning not in state["warnings"]:
            state["warnings"].append(warning)
    return state


def build_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("intake_agent", intake_agent)
    workflow.add_node("process_analyst_agent", process_analyst_agent)
    workflow.add_node("tool_discovery_agent", tool_discovery_agent)
    workflow.add_node("roi_analyst_agent", roi_analyst_agent)
    workflow.add_node("workflow_architect_agent", workflow_architect_agent)
    workflow.add_node("workflow_builder_agent", workflow_builder_agent)
    workflow.add_node("workflow_validator_agent", workflow_validator_agent)
    workflow.add_node("summary_agent", summary_agent)

    workflow.set_entry_point("intake_agent")
    workflow.add_edge("intake_agent", "process_analyst_agent")
    workflow.add_edge("process_analyst_agent", "tool_discovery_agent")
    workflow.add_edge("tool_discovery_agent", "roi_analyst_agent")
    workflow.add_edge("roi_analyst_agent", "workflow_architect_agent")
    workflow.add_edge("workflow_architect_agent", "workflow_builder_agent")
    workflow.add_edge("workflow_builder_agent", "workflow_validator_agent")
    workflow.add_edge("workflow_validator_agent", "summary_agent")
    workflow.add_edge("summary_agent", END)

    return workflow.compile()


roiflow_graph = build_graph()
