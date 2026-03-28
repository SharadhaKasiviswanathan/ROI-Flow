from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import gradio as gr

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PYTHON_API_ROOT = PROJECT_ROOT / "artifacts" / "python-api"

if str(PYTHON_API_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_API_ROOT))

from app.database import save_task
from app.llm_provider import get_llm_status
from app.routes import TaskInput, _run_agentic_analysis, _run_standard_analysis


def _build_status_markdown() -> str:
    status = get_llm_status()
    deployment = str(status.get("deployment", "local")).capitalize()
    lines = [
        f"**Endpoint**: `{status.get('baseUrl', 'unknown')}`",
        f"**Deployment**: {deployment}",
        f"**Model**: `{status.get('model', 'unknown')}`",
        f"**Status**: {status.get('message', 'Unavailable')}",
    ]
    hint = status.get("setupHint")
    if hint:
        lines.append(f"**Hint**: {hint}")
    return "\n\n".join(lines)


def _build_summary(result: dict) -> str:
    source = "AI Agent pipeline" if result.get("source") == "langgraph" else "Rules engine"
    return "\n".join(
        [
            f"## {result.get('title', 'Automation analysis')}",
            "",
            f"**Source**: {source}",
            f"**ROI Score**: {result.get('roiScore', 0)}/100",
            f"**Complexity**: {result.get('complexityScore', 0)}/10",
            f"**Priority**: {result.get('priority', 'Low')}",
            f"**Hours Saved**: {result.get('estimatedHoursSaved', 0)} per month",
            "",
            result.get("taskSummary", "No summary generated."),
        ]
    )


def _build_pipeline_markdown(result: dict) -> str:
    steps = result.get("agentPipeline") or []
    if not steps:
        return "Rules mode does not run the LangGraph agent pipeline."

    lines = ["## Agent Pipeline", ""]
    for index, step in enumerate(steps, start=1):
        label = step.get("label", f"Step {index}")
        lines.append(f"{index}. {label}")
    return "\n".join(lines)


def analyze_task(
    title: str,
    description: str,
    frequency_per_month: int,
    minutes_per_run: int,
    people_involved: int,
    mode: str,
):
    task = TaskInput(
        title=title,
        description=description,
        frequency_per_month=int(frequency_per_month),
        minutes_per_run=int(minutes_per_run),
        people_involved=int(people_involved),
    )

    if mode == "AI Agent pipeline":
        status = get_llm_status()
        if not status.get("available"):
            raise gr.Error(status.get("message", "Ollama is not ready."))
        result = _run_agentic_analysis(task)
    else:
        result = save_task(_run_standard_analysis(task))

    workflow_json = result.get("n8nWorkflowJson", "")
    try:
        formatted_workflow = json.dumps(json.loads(workflow_json), indent=2)
    except Exception:
        formatted_workflow = workflow_json

    return (
        _build_summary(result),
        result.get("automationRecommendation", "No recommendation generated."),
        formatted_workflow,
        _build_pipeline_markdown(result),
        result,
        _build_status_markdown(),
    )


with gr.Blocks(title="ROIFlow Share") as demo:
    gr.Markdown(
        """
        # ROIFlow Share
        Run the same ROIFlow analysis engine from a lightweight Gradio surface.
        Turn on `GRADIO_SHARE=true` when launching this app if you want a temporary public link.
        """
    )

    status_box = gr.Markdown(_build_status_markdown())

    with gr.Row():
        with gr.Column(scale=2):
            title = gr.Textbox(label="Task title", placeholder="Weekly CRM lead routing")
            description = gr.Textbox(
                label="Task description",
                lines=7,
                placeholder="Describe the repetitive process, trigger, tools involved, and expected outcome.",
            )
            with gr.Row():
                frequency_per_month = gr.Number(label="Runs per month", value=8, precision=0)
                minutes_per_run = gr.Number(label="Minutes per run", value=25, precision=0)
                people_involved = gr.Number(label="People involved", value=2, precision=0)
            mode = gr.Dropdown(
                label="Analysis mode",
                choices=["Standard", "AI Agent pipeline"],
                value="AI Agent pipeline",
            )
            analyze_button = gr.Button("Analyze task", variant="primary")
        with gr.Column(scale=3):
            summary = gr.Markdown()
            recommendation = gr.Textbox(label="Recommendation", lines=5)
            workflow = gr.Code(label="Starter Workflow JSON", language="json")
            pipeline = gr.Markdown()
            raw_result = gr.JSON(label="Raw result")

    analyze_button.click(
        fn=analyze_task,
        inputs=[title, description, frequency_per_month, minutes_per_run, people_involved, mode],
        outputs=[summary, recommendation, workflow, pipeline, raw_result, status_box],
    )


if __name__ == "__main__":
    demo.launch(
        server_name=os.getenv("GRADIO_HOST", "0.0.0.0"),
        server_port=int(os.getenv("GRADIO_PORT", "7861")),
        share=os.getenv("GRADIO_SHARE", "false").lower() == "true",
        theme=gr.themes.Soft(),
    )
