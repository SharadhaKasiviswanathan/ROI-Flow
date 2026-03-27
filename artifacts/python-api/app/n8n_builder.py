import json
from typing import List

SUPPORTED_NODES = [
    "CRM", "Slack", "Gmail", "Google Sheets", "QuickBooks",
    "SharePoint", "LMS", "Webhook", "HTTP Request",
    "Schedule Trigger", "Set", "IF", "Code",
]


def get_trigger_node(trigger: str) -> dict:
    if trigger == "Webhook":
        return {
            "parameters": {"httpMethod": "POST", "path": "automation-intake", "responseMode": "onReceived"},
            "id": "node-1",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [300, 300],
        }
    elif trigger == "Email Trigger":
        return {
            "parameters": {"mailbox": "INBOX", "postProcessAction": "read"},
            "id": "node-1",
            "name": "Email Trigger",
            "type": "n8n-nodes-base.emailReadImap",
            "typeVersion": 1,
            "position": [300, 300],
        }
    else:
        return {
            "parameters": {"rule": {"interval": [{"field": "weeks", "weeksInterval": 1}]}},
            "id": "node-1",
            "name": "Schedule Trigger",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1,
            "position": [300, 300],
        }


APP_NODE_TEMPLATES = {
    "Slack": {
        "parameters": {"resource": "message", "operation": "post", "channel": "#general", "text": "Automation update: {{$json.summary}}"},
        "name": "Slack",
        "type": "n8n-nodes-base.slack",
        "typeVersion": 1,
    },
    "Gmail": {
        "parameters": {"resource": "message", "operation": "send", "toList": "team@company.com", "subject": "Automation Update", "message": "{{$json.summary}}"},
        "name": "Gmail",
        "type": "n8n-nodes-base.gmail",
        "typeVersion": 2,
    },
    "Google Sheets": {
        "parameters": {"resource": "spreadsheet", "operation": "appendOrUpdate", "sheetId": {"value": "YOUR_SHEET_ID"}},
        "name": "Google Sheets",
        "type": "n8n-nodes-base.googleSheets",
        "typeVersion": 4,
    },
    "CRM": {
        "parameters": {"method": "POST", "url": "https://your-crm.com/api/contacts", "sendBody": True},
        "name": "CRM",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
    },
    "QuickBooks": {
        "parameters": {"resource": "invoice", "operation": "create"},
        "name": "QuickBooks",
        "type": "n8n-nodes-base.quickbooks",
        "typeVersion": 1,
    },
    "SharePoint": {
        "parameters": {"resource": "file", "operation": "upload"},
        "name": "SharePoint",
        "type": "n8n-nodes-base.microsoftSharePoint",
        "typeVersion": 1,
    },
}

IF_NODE = {
    "parameters": {
        "conditions": {
            "options": {"caseSensitive": True},
            "conditions": [{"id": "check-1", "leftValue": "={{$json.status}}", "rightValue": "active", "operator": {"type": "string", "operation": "equals"}}],
        }
    },
    "id": "node-if",
    "name": "IF",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2,
    "position": [550, 300],
}

SET_NODE = {
    "parameters": {
        "mode": "manual",
        "duplicateItem": False,
        "assignments": {
            "assignments": [
                {"id": "set-1", "name": "processedAt", "value": "={{new Date().toISOString()}}", "type": "string"},
                {"id": "set-2", "name": "source", "value": "ROIFlow AI Automation", "type": "string"},
            ]
        },
    },
    "id": "node-set",
    "name": "Set",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3,
    "position": [800, 200],
}


def build_n8n_workflow(title: str, trigger: str, apps: List[str]) -> str:
    trigger_node = get_trigger_node(trigger)
    app_nodes = []

    for i, app in enumerate([a for a in apps if a not in ("Webhook", "HTTP Request")][:3]):
        template = APP_NODE_TEMPLATES.get(app, APP_NODE_TEMPLATES["CRM"]).copy()
        node = {**template, "id": f"node-app-{i + 1}", "position": [800 + i * 250, 350]}
        app_nodes.append(node)

    nodes = [trigger_node, IF_NODE, SET_NODE] + app_nodes

    connections: dict = {
        trigger_node["name"]: {"main": [[{"node": "IF", "type": "main", "index": 0}]]},
        "IF": {"main": [[{"node": "Set", "type": "main", "index": 0}], []]},
    }

    if app_nodes:
        connections["Set"] = {"main": [[{"node": app_nodes[0]["name"], "type": "main", "index": 0}]]}
        for i in range(len(app_nodes) - 1):
            connections[app_nodes[i]["name"]] = {"main": [[{"node": app_nodes[i + 1]["name"], "type": "main", "index": 0}]]}
    else:
        connections["Set"] = {"main": [[]]}

    workflow = {
        "name": f"ROIFlow AI: {title}",
        "nodes": nodes,
        "connections": connections,
        "active": False,
        "settings": {"executionOrder": "v1"},
    }
    return json.dumps(workflow, indent=2)


def validate_workflow(workflow_json: str) -> list:
    errors = []
    try:
        wf = json.loads(workflow_json)
    except json.JSONDecodeError as e:
        return [f"Invalid JSON: {e}"]

    if "nodes" not in wf:
        errors.append("Missing 'nodes' field")
    if "connections" not in wf:
        errors.append("Missing 'connections' field")

    node_names = {n.get("name") for n in wf.get("nodes", [])}
    for src, conns in wf.get("connections", {}).items():
        if src not in node_names:
            errors.append(f"Connection source '{src}' not found in nodes")
        for branch in conns.get("main", []):
            for target in branch:
                if target.get("node") not in node_names:
                    errors.append(f"Connection target '{target.get('node')}' not found in nodes")

    return errors
