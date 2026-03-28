from __future__ import annotations

import os
from typing import Any

import httpx
from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "").strip()
OLLAMA_TIMEOUT_SECONDS = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "30"))

SUMMARY_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an automation consultant. Respond with exactly two concise, professional sentences.",
        ),
        (
            "human",
            (
                "Task: {title}\n"
                "Description: {description}\n"
                "Apps involved: {apps}\n"
                "Trigger: {trigger}\n"
                "Primary action: {output_action}\n\n"
                "Explain what the automation does and why it is valuable."
            ),
        ),
    ]
)

RECOMMENDATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an n8n workflow architect. Respond with two or three short sentences and no markdown.",
        ),
        (
            "human",
            (
                "Task: {title}\n"
                "Description: {description}\n"
                "Priority: {priority}\n"
                "Apps: {apps}\n"
                "Trigger: {trigger}\n"
                "Goal: {output}\n\n"
                "Recommend a practical automation using n8n nodes and flow order."
            ),
        ),
    ]
)


def get_llm_status() -> dict[str, Any]:
    deployment = _get_deployment()
    try:
        response = httpx.get(
            f"{OLLAMA_BASE_URL}/api/tags",
            headers=_get_headers(),
            timeout=5.0,
        )
        response.raise_for_status()
        payload = response.json()
        models = [item.get("name", "") for item in payload.get("models", []) if item.get("name")]
        resolved_model = _resolve_model_name(models)
        model_available = resolved_model is not None
        return {
            "provider": "ollama",
            "mode": "ollama",
            "baseUrl": OLLAMA_BASE_URL,
            "model": resolved_model or OLLAMA_MODEL,
            "requestedModel": OLLAMA_MODEL,
            "serverReachable": True,
            "modelAvailable": model_available,
            "available": model_available,
            "installedModels": models,
            "deployment": deployment,
            "authentication": "api-key" if OLLAMA_API_KEY else "none",
            "message": (
                f"{_deployment_label(deployment)} is ready with {resolved_model}."
                if model_available
                else f"{_deployment_label(deployment)} is reachable, but {OLLAMA_MODEL} is not available yet."
            ),
            "setupHint": _build_setup_hint(deployment, model_available),
        }
    except Exception as exc:
        return {
            "provider": "ollama",
            "mode": "ollama",
            "baseUrl": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
            "serverReachable": False,
            "modelAvailable": False,
            "available": False,
            "installedModels": [],
            "deployment": deployment,
            "authentication": "api-key" if OLLAMA_API_KEY else "none",
            "message": (
                "Ollama Cloud is not reachable yet. Double-check OLLAMA_BASE_URL and OLLAMA_API_KEY."
                if deployment == "cloud"
                else "Ollama AI mode is offline because your local Ollama server is not reachable."
            ),
            "setupHint": _build_setup_hint(deployment, False),
            "error": str(exc)[:160],
        }


def enhance_summary(
    title: str, description: str, apps: list[str], trigger: str, output_action: str
) -> tuple[str, str, str | None]:
    summary, model_name = _run_ollama_prompt(
        SUMMARY_PROMPT,
        title=title,
        description=description[:500],
        apps=", ".join(apps) if apps else "the connected tools",
        trigger=trigger,
        output_action=output_action,
    )
    return summary, f"ollama:{model_name}", None


def generate_automation_recommendation(
    title: str,
    description: str,
    apps: list[str],
    trigger: str,
    output: str,
    priority: str,
) -> tuple[str, str, str | None]:
    recommendation, model_name = _run_ollama_prompt(
        RECOMMENDATION_PROMPT,
        title=title,
        description=description[:500],
        apps=", ".join(apps) if apps else "the connected tools",
        trigger=trigger,
        output=output,
        priority=priority,
    )
    return recommendation, f"ollama:{model_name}", None


def _run_ollama_prompt(prompt: ChatPromptTemplate, **values: str) -> tuple[str, str]:
    status = get_llm_status()
    if not status["available"]:
        raise RuntimeError(status["message"])

    resolved_model = str(status["model"])
    messages = prompt.format_messages(**values)
    payload = {
        "model": resolved_model,
        "stream": False,
        "messages": [_message_to_ollama(message) for message in messages],
        "options": {"temperature": 0.2},
    }

    response = httpx.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json=payload,
        headers=_get_headers(),
        timeout=OLLAMA_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()
    content = (data.get("message") or {}).get("content", "").strip()
    if not content:
        raise RuntimeError("Ollama returned an empty response.")
    return content, resolved_model


def _message_to_ollama(message: BaseMessage) -> dict[str, str]:
    role = "user"
    message_type = getattr(message, "type", "human")
    if message_type == "system":
        role = "system"
    elif message_type in {"assistant", "ai"}:
        role = "assistant"
    return {
        "role": role,
        "content": str(message.content),
    }


def _get_headers() -> dict[str, str]:
    if not OLLAMA_API_KEY:
        return {}
    return {"Authorization": f"Bearer {OLLAMA_API_KEY}"}


def _get_deployment() -> str:
    lowered = OLLAMA_BASE_URL.lower()
    if lowered.startswith("https://ollama.com") or lowered.startswith("http://ollama.com"):
        return "cloud"
    return "local"


def _deployment_label(deployment: str) -> str:
    return "Ollama Cloud" if deployment == "cloud" else "Local Ollama"


def _build_setup_hint(deployment: str, model_available: bool) -> str:
    if deployment == "cloud":
        if model_available:
            return "Cloud-backed AI mode is ready for any machine that has the same Ollama Cloud credentials."
        return (
            "Set OLLAMA_BASE_URL=https://ollama.com, provide OLLAMA_API_KEY, "
            "and choose an available cloud model such as gpt-oss:120b."
        )
    if model_available:
        return "Local Ollama is ready."
    return f"Start Ollama, then run `ollama pull {OLLAMA_MODEL}` if needed."


def _resolve_model_name(installed_models: list[str]) -> str | None:
    if OLLAMA_MODEL in installed_models:
        return OLLAMA_MODEL

    requested_base = OLLAMA_MODEL.split(":", 1)[0]
    for model_name in installed_models:
        if model_name.split(":", 1)[0] == requested_base:
            return model_name

    return None
