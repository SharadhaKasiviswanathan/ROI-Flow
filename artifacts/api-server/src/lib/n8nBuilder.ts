const SUPPORTED_NODES = [
  "CRM",
  "Slack",
  "Gmail",
  "Google Sheets",
  "QuickBooks",
  "SharePoint",
  "LMS",
  "Webhook",
  "HTTP Request",
  "Schedule Trigger",
  "Set",
  "IF",
  "Code",
] as const;

interface N8nNode {
  parameters: Record<string, unknown>;
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
}

interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  active: boolean;
  settings: Record<string, unknown>;
}

function getTriggerNodeType(trigger: string): { type: string; name: string; parameters: Record<string, unknown> } {
  switch (trigger) {
    case "Webhook":
      return {
        type: "n8n-nodes-base.webhook",
        name: "Webhook",
        parameters: { httpMethod: "POST", path: "automation-intake", responseMode: "onReceived" },
      };
    case "Email Trigger":
      return {
        type: "n8n-nodes-base.emailReadImap",
        name: "Email Trigger",
        parameters: { mailbox: "INBOX", postProcessAction: "read" },
      };
    case "Schedule Trigger":
    default:
      return {
        type: "n8n-nodes-base.scheduleTrigger",
        name: "Schedule Trigger",
        parameters: { rule: { interval: [{ field: "weeks", weeksInterval: 1 }] } },
      };
  }
}

function getAppNode(app: string, index: number): N8nNode | null {
  const validApp = SUPPORTED_NODES.find((n) => n.toLowerCase() === app.toLowerCase() || app.toLowerCase().includes(n.toLowerCase()));
  if (!validApp) return null;

  const nodeMap: Record<string, Omit<N8nNode, "id" | "position">> = {
    Slack: {
      parameters: { resource: "message", operation: "post", channel: "#general", text: "Automation update: {{$json.summary}}" },
      name: "Slack",
      type: "n8n-nodes-base.slack",
      typeVersion: 1,
    },
    Gmail: {
      parameters: { resource: "message", operation: "send", toList: "team@company.com", subject: "Automation Update", message: "{{$json.summary}}" },
      name: "Gmail",
      type: "n8n-nodes-base.gmail",
      typeVersion: 2,
    },
    "Google Sheets": {
      parameters: { resource: "spreadsheet", operation: "appendOrUpdate", sheetId: { value: "YOUR_SHEET_ID" }, columns: { mappingMode: "autoMapInputData" } },
      name: "Google Sheets",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4,
    },
    CRM: {
      parameters: { method: "POST", url: "https://your-crm.com/api/contacts", sendBody: true, bodyContentType: "json" },
      name: "CRM",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
    },
    QuickBooks: {
      parameters: { resource: "invoice", operation: "create" },
      name: "QuickBooks",
      type: "n8n-nodes-base.quickbooks",
      typeVersion: 1,
    },
    Webhook: {
      parameters: { method: "POST", url: "https://your-webhook-endpoint.com", sendBody: true },
      name: "HTTP Request",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
    },
    SharePoint: {
      parameters: { resource: "file", operation: "upload" },
      name: "SharePoint",
      type: "n8n-nodes-base.microsoftSharePoint",
      typeVersion: 1,
    },
    LMS: {
      parameters: { method: "POST", url: "https://your-lms.com/api/enrollments", sendBody: true },
      name: "LMS",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
    },
  };

  const nodeTemplate = nodeMap[validApp] || nodeMap["CRM"];
  return {
    ...nodeTemplate,
    id: `node-${index + 2}`,
    position: [800 + index * 250, 300],
  };
}

export function buildN8nWorkflow(
  title: string,
  trigger: string,
  apps: string[],
): string {
  const triggerConfig = getTriggerNodeType(trigger);
  const triggerNode: N8nNode = {
    parameters: triggerConfig.parameters,
    id: "node-1",
    name: triggerConfig.name,
    type: triggerConfig.type,
    typeVersion: 1,
    position: [300, 300],
  };

  const ifNode: N8nNode = {
    parameters: { conditions: { options: { caseSensitive: true }, conditions: [{ id: "check-1", leftValue: "={{$json.status}}", rightValue: "active", operator: { type: "string", operation: "equals" } }] } },
    id: "node-if",
    name: "IF",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [550, 300],
  };

  const setNode: N8nNode = {
    parameters: { mode: "manual", duplicateItem: false, assignments: { assignments: [{ id: "set-1", name: "processedAt", value: "={{new Date().toISOString()}}", type: "string" }, { id: "set-2", name: "source", value: "ROIFlow Automation", type: "string" }] } },
    id: "node-set",
    name: "Set",
    type: "n8n-nodes-base.set",
    typeVersion: 3,
    position: [800, 200],
  };

  const appNodes = apps
    .filter((app) => app !== "Webhook")
    .slice(0, 3)
    .map((app, i) => getAppNode(app, i))
    .filter(Boolean) as N8nNode[];

  const nodes: N8nNode[] = [triggerNode, ifNode, setNode, ...appNodes];

  const connections: Record<string, unknown> = {
    [triggerConfig.name]: { main: [[{ node: "IF", type: "main", index: 0 }]] },
    IF: { main: [[{ node: "Set", type: "main", index: 0 }], []] },
    Set: appNodes.length > 0 ? { main: [[{ node: appNodes[0].name, type: "main", index: 0 }]] } : { main: [[]] },
  };

  for (let i = 0; i < appNodes.length - 1; i++) {
    connections[appNodes[i].name] = { main: [[{ node: appNodes[i + 1].name, type: "main", index: 0 }]] };
  }

  const workflow: N8nWorkflow = {
    name: `ROIFlow: ${title}`,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
  };

  return JSON.stringify(workflow, null, 2);
}
