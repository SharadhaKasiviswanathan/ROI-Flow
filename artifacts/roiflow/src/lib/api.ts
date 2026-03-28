export type SortField = "roi_score" | "priority" | "created_at";
export type SortOrder = "asc" | "desc";

export interface AgentPipelineStep {
  node: string;
  label: string;
  order: number;
  status: "completed" | "active" | "pending";
}

export interface TaskInputPayload {
  title: string;
  description: string;
  frequencyPerMonth: number;
  minutesPerRun: number;
  peopleInvolved: number;
}

export interface Opportunity {
  id: number;
  title: string;
  description: string;
  frequencyPerMonth: number;
  minutesPerRun: number;
  peopleInvolved: number;
  taskSummary: string;
  trigger: string;
  appsInvolved: string[];
  actions?: string[];
  outputAction: string;
  monthlyHoursLost: number;
  estimatedHoursSaved: number;
  roiScore: number;
  complexityScore: number;
  priority: string;
  automationRecommendation: string;
  suggestedToolStack: string[];
  n8nWorkflowJson: string;
  validationErrors?: string[];
  summary?: string;
  llmModeUsed?: string;
  warnings?: string[];
  source?: string;
  agentPipeline?: AgentPipelineStep[];
  createdAt: string;
}

export interface AgentStepEvent {
  type: "step";
  node: string;
  label: string;
  completed: number;
  total: number;
}

interface StreamDoneEvent {
  type: "done";
  result: Opportunity;
}

interface StreamErrorEvent {
  type: "error";
  message: string;
}

type StreamEvent = AgentStepEvent | StreamDoneEvent | StreamErrorEvent;

export interface HealthResponse {
  status: string;
  service: string;
  engine: string;
  llm: {
    provider: string;
    mode: string;
    baseUrl: string;
    model: string;
    requestedModel?: string;
    serverReachable: boolean;
    modelAvailable: boolean;
    available: boolean;
    installedModels: string[];
    message: string;
    setupHint: string;
    deployment?: "local" | "cloud";
    authentication?: "none" | "api-key";
    error?: string;
  };
  storage: {
    mode: string;
    path: string;
    tasksStored: number;
  };
}

const API_PREFIX = "/python-api";

function toBackendPayload(input: TaskInputPayload) {
  return {
    title: input.title,
    description: input.description,
    frequency_per_month: input.frequencyPerMonth,
    minutes_per_run: input.minutesPerRun,
    people_involved: input.peopleInvolved,
  };
}

async function parseError(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const data = JSON.parse(raw);
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.error === "string") return data.error;
  } catch {
    if (raw.trim()) return raw.trim();
  }
  return `Request failed with status ${response.status}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listOpportunities(params: {
  sort?: SortField;
  order?: SortOrder;
} = {}) {
  const query = new URLSearchParams();
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  const suffix = query.toString() ? `?${query}` : "";
  return fetchJson<Opportunity[]>(`/opportunities${suffix}`);
}

export function createOpportunity(input: TaskInputPayload) {
  return fetchJson<Opportunity>("/opportunities", {
    method: "POST",
    body: JSON.stringify(toBackendPayload(input)),
  });
}

export function getOpportunity(id: number) {
  return fetchJson<Opportunity>(`/opportunities/${id}`);
}

export function deleteOpportunity(id: number) {
  return fetchJson<void>(`/opportunities/${id}`, { method: "DELETE" });
}

export function getAiHealth() {
  return fetchJson<HealthResponse>("/health", {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function streamAnalyzeTask(
  input: TaskInputPayload,
  callbacks: {
    onStep?: (event: AgentStepEvent) => void;
    onDone?: (result: Opportunity) => void;
  } = {},
): Promise<Opportunity> {
  const response = await fetch(`${API_PREFIX}/analyze-task/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toBackendPayload(input)),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (!response.body) {
    throw new Error("Streaming is not available in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: Opportunity | null = null;

  const processChunk = (chunk: string) => {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"));

    for (const line of lines) {
      const payload = line.slice(5).trim();
      if (!payload) continue;
      const event = JSON.parse(payload) as StreamEvent;

      if (event.type === "step") {
        callbacks.onStep?.(event);
      } else if (event.type === "done") {
        finalResult = event.result;
        callbacks.onDone?.(event.result);
      } else if (event.type === "error") {
        throw new Error(event.message || "AI analysis failed.");
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const chunk = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      processChunk(chunk);
      separatorIndex = buffer.indexOf("\n\n");
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    processChunk(buffer);
  }

  if (!finalResult) {
    throw new Error("AI analysis completed without returning a result.");
  }

  return finalResult;
}
