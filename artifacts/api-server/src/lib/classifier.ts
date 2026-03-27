const APP_KEYWORDS: Record<string, string[]> = {
  CRM: ["crm", "salesforce", "hubspot", "pipedrive", "contact", "lead", "deal", "customer"],
  Slack: ["slack", "message", "notify", "notification", "channel", "dm", "direct message"],
  Gmail: ["gmail", "email", "mail", "inbox", "send email", "outlook", "smtp"],
  "Google Sheets": ["google sheets", "spreadsheet", "sheet", "gsheet", "excel", "csv"],
  QuickBooks: ["quickbooks", "invoice", "billing", "accounting", "payment", "payroll"],
  SharePoint: ["sharepoint", "onedrive", "teams", "microsoft teams", "office 365"],
  LMS: ["lms", "learning management", "course", "training", "canvas", "moodle", "teachable"],
  Webhook: ["webhook", "api call", "http request", "endpoint", "zapier", "make", "integromat"],
  "Google Forms": ["form", "survey", "response", "submission", "google forms", "typeform"],
  Airtable: ["airtable", "database", "base", "record", "airtable"],
  Notion: ["notion", "page", "database", "notion"],
  Trello: ["trello", "card", "board", "trello"],
  Asana: ["asana", "task", "project", "asana"],
  Calendly: ["calendly", "schedule", "booking", "appointment", "calendar"],
};

const TRIGGER_KEYWORDS: Record<string, string[]> = {
  "Schedule Trigger": ["every week", "weekly", "daily", "every day", "every month", "monthly", "every hour", "hourly", "every morning", "end of day", "recurring", "regular"],
  "Webhook": ["form submission", "new response", "when someone submits", "on submission", "trigger when", "api receives"],
  "Email Trigger": ["when email", "email arrives", "new email", "inbox", "receive email"],
  "Manual": ["manually", "by hand", "someone opens", "someone clicks", "user action", "ad hoc"],
};

const OUTPUT_KEYWORDS: Record<string, string[]> = {
  "Send notification": ["notify", "alert", "send message", "inform", "ping", "tell"],
  "Update record": ["update", "change", "modify", "edit", "sync", "copy", "transfer", "move"],
  "Create record": ["create", "add", "insert", "new entry", "new row", "new contact"],
  "Send email": ["send email", "email the", "email to", "compose", "draft email"],
  "Generate report": ["report", "summary", "generate", "export", "produce"],
};

export function detectApps(text: string): string[] {
  const lower = text.toLowerCase();
  const detected: string[] = [];
  for (const [app, keywords] of Object.entries(APP_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      detected.push(app);
    }
  }
  return detected.length > 0 ? detected : ["Webhook", "HTTP Request"];
}

export function detectTrigger(text: string): string {
  const lower = text.toLowerCase();
  for (const [trigger, keywords] of Object.entries(TRIGGER_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return trigger;
    }
  }
  return "Schedule Trigger";
}

export function detectOutput(text: string): string {
  const lower = text.toLowerCase();
  for (const [output, keywords] of Object.entries(OUTPUT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return output;
    }
  }
  return "Update record";
}

export function generateTaskSummary(
  title: string,
  description: string,
  trigger: string,
  apps: string[],
  output: string,
): string {
  const appList = apps.slice(0, 3).join(", ");
  return `"${title}" is a ${trigger.toLowerCase()} process involving ${appList}. The core action is to ${output.toLowerCase()} based on the described workflow.`;
}

export function generateRecommendation(
  apps: string[],
  trigger: string,
  output: string,
  priority: string,
): string {
  const appList = apps.slice(0, 3).join(" → ");
  if (priority === "High") {
    return `This is a high-priority automation candidate. Automate the ${trigger} using n8n to connect ${appList} and ${output.toLowerCase()} automatically. This will eliminate manual intervention entirely and deliver immediate time savings.`;
  } else if (priority === "Medium") {
    return `This process is a good candidate for automation. Use n8n to set up a ${trigger.toLowerCase()} that connects ${appList} and ${output.toLowerCase()}. Implementing this will reduce manual effort significantly.`;
  } else {
    return `While lower priority, automating this process with n8n (${appList}) will still reduce repetitive work. Consider batching this with higher-priority automations to streamline implementation.`;
  }
}

export function suggestToolStack(apps: string[]): string[] {
  const tools = new Set<string>(["n8n"]);
  for (const app of apps) {
    if (app === "Gmail" || app === "Email") tools.add("Gmail Node");
    if (app === "Slack") tools.add("Slack Node");
    if (app === "Google Sheets") tools.add("Google Sheets Node");
    if (app === "CRM") tools.add("CRM HTTP Node");
    if (app === "QuickBooks") tools.add("QuickBooks Node");
    if (app === "Webhook") tools.add("Webhook Node");
  }
  tools.add("IF Node");
  tools.add("Set Node");
  return Array.from(tools);
}
