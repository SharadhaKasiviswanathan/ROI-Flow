"""
LLM provider using Replit AI Integrations (OpenAI proxy).
No API key required from the user — Replit provisions it automatically.
"""
import os
from openai import OpenAI

BASE_URL = os.getenv("AI_INTEGRATIONS_OPENAI_BASE_URL")
API_KEY = os.getenv("AI_INTEGRATIONS_OPENAI_API_KEY", "replit-ai")

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        if BASE_URL:
            _client = OpenAI(base_url=BASE_URL, api_key=API_KEY)
        else:
            # Fallback: try standard OpenAI if env var present
            _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "not-set"))
    return _client


def enhance_summary(title: str, description: str, apps: list, trigger: str, output_action: str) -> tuple[str, str]:
    """
    Generate an AI-enhanced summary using Replit's OpenAI integration.
    Falls back to rules-based if LLM is unavailable.
    Returns (summary, mode_used).
    """
    try:
        client = get_client()
        prompt = (
            f"You are an automation consultant writing a brief 2-sentence summary for an operations team.\n"
            f"Task: {title}\n"
            f"Description: {description[:400]}\n"
            f"Apps involved: {', '.join(apps)}\n"
            f"Trigger: {trigger}\n"
            f"Primary action: {output_action}\n\n"
            f"Write exactly 2 clear, professional sentences explaining what this automation does and why it's valuable."
        )
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=200,
        )
        summary = response.choices[0].message.content.strip()
        return summary, "openai:gpt-5-mini"
    except Exception as e:
        return _rules_summary(title, apps, trigger, output_action), f"rules (fallback: {str(e)[:60]})"


def generate_automation_recommendation(title: str, description: str, apps: list, trigger: str, output: str, priority: str) -> tuple[str, str]:
    """
    Generate an AI-enhanced automation recommendation.
    Falls back to rules-based if LLM is unavailable.
    Returns (recommendation, mode_used).
    """
    try:
        client = get_client()
        prompt = (
            f"You are an n8n automation expert. Write a concrete 2-3 sentence recommendation for automating this task.\n"
            f"Task: {title}\n"
            f"Priority: {priority}\n"
            f"Apps: {', '.join(apps)}\n"
            f"Trigger: {trigger}\n"
            f"Goal: {output}\n\n"
            f"Be specific about which n8n nodes to use and how to connect them. No markdown, plain text only."
        )
        response = client.chat.completions.create(
            model="gpt-5-mini",
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=300,
        )
        rec = response.choices[0].message.content.strip()
        return rec, "openai:gpt-5-mini"
    except Exception as e:
        return _rules_recommendation(apps, trigger, output, priority), f"rules (fallback: {str(e)[:60]})"


def _rules_summary(title: str, apps: list, trigger: str, output_action: str) -> str:
    app_list = ", ".join(apps[:3]) if apps else "the connected tools"
    return (
        f'"{title}" is a {trigger.lower()} automation connecting {app_list} to {output_action.lower()}. '
        f"Automating this eliminates all manual steps, saving significant time for your team each month."
    )


def _rules_recommendation(apps: list, trigger: str, output: str, priority: str) -> str:
    app_flow = " → ".join(apps[:3]) if apps else "your tools"
    if priority == "High":
        return (
            f"High-priority: Set up a {trigger.lower()} in n8n to connect {app_flow}. "
            f"Use a {trigger} node → IF node for validation → {output.lower()} via the relevant app node. "
            f"This single workflow eliminates all manual steps."
        )
    return (
        f"Connect {app_flow} using n8n's {trigger.lower()} to {output.lower()} automatically. "
        f"Start with the Webhook or Schedule Trigger node, add an IF node for conditional logic, then wire in your app nodes."
    )
