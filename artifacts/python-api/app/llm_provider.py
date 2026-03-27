"""
LLM provider abstraction — free-first design.
Priority: 1. Ollama local  2. Rules-based  3. Optional cloud (env var only)
"""
import os
import httpx
import json
from typing import Optional

OLLAMA_BASE_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "auto")  # auto | ollama | rules | openai | gemini


def _ollama_available() -> bool:
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False


def _call_ollama(prompt: str) -> Optional[str]:
    try:
        r = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"num_predict": 256, "temperature": 0.1}},
            timeout=30.0,
        )
        if r.status_code == 200:
            data = r.json()
            return data.get("response", "").strip()
    except Exception:
        pass
    return None


def _call_openai(prompt: str) -> Optional[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        import httpx
        r = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": prompt}], "max_tokens": 256},
            timeout=15.0,
        )
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        pass
    return None


def enhance_summary(title: str, description: str, apps: list, trigger: str, output_action: str) -> tuple[str, str]:
    """
    Optionally enhance the summary using an LLM.
    Returns (summary, mode_used)
    """
    if LLM_PROVIDER == "rules":
        return _rules_summary(title, apps, trigger, output_action), "rules"

    if LLM_PROVIDER in ("auto", "ollama") and _ollama_available():
        prompt = (
            f"You are an automation expert. Write a concise 2-sentence summary for this workflow.\n"
            f"Task: {title}\n"
            f"Description: {description[:300]}\n"
            f"Apps: {', '.join(apps)}\n"
            f"Trigger: {trigger}\n"
            f"Action: {output_action}\n"
            f"Summary (2 sentences max, plain English, professional tone):"
        )
        result = _call_ollama(prompt)
        if result:
            return result, f"ollama:{OLLAMA_MODEL}"

    if LLM_PROVIDER == "openai" and os.getenv("OPENAI_API_KEY"):
        prompt = f"Write a 2-sentence automation summary for: {title}. Apps: {', '.join(apps)}. Trigger: {trigger}."
        result = _call_openai(prompt)
        if result:
            return result, "openai"

    return _rules_summary(title, apps, trigger, output_action), "rules"


def _rules_summary(title: str, apps: list, trigger: str, output_action: str) -> str:
    app_list = ", ".join(apps[:3]) if apps else "the connected tools"
    return (
        f'"{title}" is a rule-based automation triggered by {trigger.lower()}, '
        f'connecting {app_list} to {output_action.lower()} without manual intervention.'
    )
