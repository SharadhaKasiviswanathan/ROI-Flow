from typing import List, Tuple

APP_KEYWORDS = {
    "CRM": ["crm", "salesforce", "hubspot", "pipedrive", "contact", "lead", "deal", "customer"],
    "Slack": ["slack", "message", "notify", "notification", "channel", "dm"],
    "Gmail": ["gmail", "email", "mail", "inbox", "send email", "outlook"],
    "Google Sheets": ["google sheets", "spreadsheet", "sheet", "gsheet", "excel"],
    "QuickBooks": ["quickbooks", "invoice", "billing", "accounting", "payment", "payroll"],
    "SharePoint": ["sharepoint", "onedrive", "teams", "microsoft teams"],
    "LMS": ["lms", "learning management", "course", "training", "moodle", "teachable"],
    "Webhook": ["webhook", "api call", "http request", "endpoint"],
    "Google Forms": ["form", "survey", "response", "submission", "google forms", "typeform"],
    "Airtable": ["airtable", "base", "record"],
    "Notion": ["notion"],
    "Calendly": ["calendly", "schedule", "booking", "appointment", "calendar"],
}

TRIGGER_KEYWORDS = {
    "Webhook": [
        "form submission", "new response", "when someone submits",
        "on submission", "typeform", "new lead", "new contact",
        "webhook", "api receives", "triggered when"
    ],
    "Email Trigger": ["when email", "email arrives", "new email", "inbox"],
    "Schedule Trigger": [
        "every week", "weekly", "daily", "every day", "every month",
        "monthly", "every hour", "hourly", "every morning", "end of day",
        "recurring", "regular", "each friday", "each monday"
    ],
    "Manual": ["manually", "by hand", "someone opens", "ad hoc", "user action"],
}

OUTPUT_KEYWORDS = {
    "Send notification": ["notify", "alert", "send message", "inform", "ping"],
    "Update record": ["update", "change", "modify", "edit", "sync", "copy", "transfer", "move"],
    "Create record": ["create", "add", "insert", "new entry", "new row", "new contact"],
    "Send email": ["send email", "email the", "email to", "compose", "draft email"],
    "Generate report": ["report", "summary", "generate", "export", "produce"],
}


def detect_apps(text: str) -> List[str]:
    lower = text.lower()
    detected = []
    for app, keywords in APP_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            detected.append(app)
    return detected if detected else ["Webhook", "HTTP Request"]


def detect_trigger(text: str) -> str:
    lower = text.lower()
    for trigger, keywords in TRIGGER_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return trigger
    return "Schedule Trigger"


def detect_output(text: str) -> str:
    lower = text.lower()
    for output, keywords in OUTPUT_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return output
    return "Update record"


def detect_actions(text: str) -> List[str]:
    actions = []
    lower = text.lower()
    action_keywords = {
        "copy data": ["copy", "transfer", "move data"],
        "send notification": ["notify", "alert", "ping", "message"],
        "update record": ["update", "sync", "edit", "modify"],
        "create record": ["create", "add", "insert", "new"],
        "send email": ["send email", "email"],
        "generate report": ["report", "summary", "export"],
    }
    for action, keywords in action_keywords.items():
        if any(kw in lower for kw in keywords):
            actions.append(action)
    return actions if actions else ["process data"]


def generate_task_summary(title: str, trigger: str, apps: List[str], output: str) -> str:
    app_list = ", ".join(apps[:3]) if apps else "various tools"
    return (
        f'"{title}" is a {trigger.lower()} process involving {app_list}. '
        f'The core action is to {output.lower()} as part of the described workflow.'
    )


def generate_recommendation(apps: List[str], trigger: str, output: str, priority: str) -> str:
    app_flow = " → ".join(apps[:3]) if apps else "your tools"
    if priority == "High":
        return (
            f"High-priority automation candidate. Connect {app_flow} using n8n with a "
            f"{trigger.lower()} to {output.lower()} automatically — eliminating all manual steps."
        )
    elif priority == "Medium":
        return (
            f"Good automation candidate. Set up a {trigger.lower()} in n8n to connect "
            f"{app_flow} and {output.lower()}, reducing manual effort significantly."
        )
    else:
        return (
            f"Lower-priority automation. Connecting {app_flow} via n8n will still eliminate "
            f"repetitive work and is worth implementing alongside higher-priority automations."
        )


def suggest_tool_stack(apps: List[str]) -> List[str]:
    tools = {"n8n"}
    for app in apps:
        if "Gmail" in app or "Email" in app:
            tools.add("Gmail Node")
        if "Slack" in app:
            tools.add("Slack Node")
        if "Google Sheets" in app:
            tools.add("Google Sheets Node")
        if "CRM" in app:
            tools.add("HTTP Request Node")
        if "QuickBooks" in app:
            tools.add("QuickBooks Node")
        if "Webhook" in app:
            tools.add("Webhook Node")
    tools.add("IF Node")
    tools.add("Set Node")
    return sorted(tools)
