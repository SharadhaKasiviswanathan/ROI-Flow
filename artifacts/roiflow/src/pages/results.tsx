import React from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  AlertTriangle,
  ArrowLeft,
  BoxSelect,
  BrainCircuit,
  CheckCircle,
  Clock,
  Info,
  Layers,
  PlayCircle,
  Puzzle,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { AgentPipeline } from "@/components/analysis/agent-pipeline";
import { RoiGauge } from "@/components/analysis/roi-gauge";
import { CopyButton } from "@/components/copy-button";
import { getOpportunity, type AgentPipelineStep } from "@/lib/api";

interface NormalizedResult {
  id: number | string;
  title: string;
  taskSummary: string;
  trigger: string;
  outputAction: string;
  appsInvolved: string[];
  monthlyHoursLost: number;
  estimatedHoursSaved: number;
  roiScore: number;
  complexityScore: number;
  priority: string;
  automationRecommendation: string;
  suggestedToolStack: string[];
  n8nWorkflowJson: string;
  frequencyPerMonth: number;
  minutesPerRun: number;
  llmModeUsed?: string;
  validationErrors?: string[];
  warnings?: string[];
  source?: string;
  agentPipeline: AgentPipelineStep[];
}

function normalizeResult(data: Record<string, unknown>): NormalizedResult {
  return {
    id: data.id as number,
    title: (data.title || data.task_title || "") as string,
    taskSummary: (data.taskSummary || data.task_summary || data.summary || "") as string,
    trigger: (data.trigger || "") as string,
    outputAction: (data.outputAction || data.output_action || "") as string,
    appsInvolved: (data.appsInvolved || data.appsDetected || data.apps_detected || []) as string[],
    monthlyHoursLost: (data.monthlyHoursLost || data.monthly_hours_lost || 0) as number,
    estimatedHoursSaved: (data.estimatedHoursSaved || data.estimated_hours_saved || 0) as number,
    roiScore: (data.roiScore || data.roi_score || 0) as number,
    complexityScore: (data.complexityScore || data.complexity_score || 0) as number,
    priority: (data.priority || "Low") as string,
    automationRecommendation: (data.automationRecommendation || data.automation_recommendation || "") as string,
    suggestedToolStack: (data.suggestedToolStack || data.suggested_tool_stack || []) as string[],
    n8nWorkflowJson: (data.n8nWorkflowJson || data.workflow_json || "") as string,
    frequencyPerMonth: (data.frequencyPerMonth || data.frequency_per_month || 0) as number,
    minutesPerRun: (data.minutesPerRun || data.minutes_per_run || 0) as number,
    llmModeUsed: (data.llmModeUsed || data.llm_mode_used || "rules") as string,
    validationErrors: (data.validationErrors || data.validation_errors || []) as string[],
    warnings: (data.warnings || []) as string[],
    source: (data.source || "standard") as string,
    agentPipeline: ((data.agentPipeline || data.agent_pipeline || []) as AgentPipelineStep[]).map((step, index) => ({
      node: step.node,
      label: step.label,
      order: step.order || index + 1,
      status: step.status || "completed",
    })),
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="w-32 h-10 bg-muted/50 rounded-lg animate-pulse mb-8" />
      <div className="w-2/3 h-12 bg-muted/50 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
      <div className="h-96 bg-muted/50 rounded-2xl animate-pulse" />
    </div>
  );
}

function getPriorityColors(priority: string) {
  switch (priority) {
    case "High":
      return "bg-destructive text-destructive-foreground shadow-destructive/20";
    case "Medium":
      return "bg-yellow-500 text-white shadow-yellow-500/20";
    case "Low":
      return "bg-green-500 text-white shadow-green-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getLlmBadge(mode?: string) {
  if (!mode) return null;
  if (mode.startsWith("ollama:")) {
    return {
      label: `Ollama (${mode.split(":")[1]})`,
      color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      icon: BrainCircuit,
    };
  }
  if (mode === "rules") {
    return { label: "Rules-based", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Zap };
  }
  return { label: mode, color: "bg-muted/50 text-muted-foreground border-border", icon: Info };
}

function ResultsView({ opp }: { opp: NormalizedResult }) {
  const llmBadge = getLlmBadge(opp.llmModeUsed);
  const isAiMode = opp.source === "langgraph";

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Pipeline
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {isAiMode && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <BrainCircuit size={12} /> LangGraph + Ollama
              </span>
            )}
            {llmBadge && (
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${llmBadge.color}`}>
                <llmBadge.icon size={12} /> {llmBadge.label}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground leading-tight">{opp.title}</h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-3xl">{opp.taskSummary}</p>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold text-sm tracking-wide uppercase shadow-lg shrink-0 ${getPriorityColors(opp.priority)}`}>
          {opp.priority} Priority
        </div>
      </div>

      {(opp.warnings?.length ?? 0) > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-1">
          {opp.warnings!.map((warning, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertTriangle size={14} className="shrink-0" /> {warning}
            </div>
          ))}
        </div>
      )}

      {(opp.validationErrors?.length ?? 0) > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-1">
          <p className="text-sm font-semibold text-destructive mb-1">Workflow Validation Issues:</p>
          {opp.validationErrors!.map((error, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-destructive">
              <XCircle size={14} className="shrink-0" /> {error}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4 relative z-10">
            <Zap size={18} className="text-primary" /> ROI Score
          </div>
          <div className="relative z-10 flex items-end justify-between gap-4">
            <div className="text-4xl font-display font-bold text-foreground mb-2">
              {opp.roiScore}
              <span className="text-xl text-muted-foreground/50">/100</span>
            </div>
            <RoiGauge score={opp.roiScore} className="opacity-95" />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4">
            <Clock size={18} className="text-destructive" /> Monthly Hours Lost
          </div>
          <div className="text-4xl font-display font-bold text-foreground">
            {opp.monthlyHoursLost.toFixed(1)}
            <span className="text-xl font-sans font-medium text-muted-foreground">h</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            ({opp.frequencyPerMonth} runs × {opp.minutesPerRun}m)
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4">
            <TrendingUp size={18} className="text-green-500" /> Est. Hours Saved
          </div>
          <div className="text-4xl font-display font-bold text-green-500">
            {opp.estimatedHoursSaved.toFixed(1)}
            <span className="text-xl font-sans font-medium text-green-500/70">h</span>
          </div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">After automation</div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4">
            <Puzzle size={18} className="text-muted-foreground" /> Complexity
          </div>
          <div className="text-4xl font-display font-bold text-foreground">
            {opp.complexityScore}
            <span className="text-xl text-muted-foreground/50">/10</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2">Technical effort required</div>
        </div>
      </div>

      {isAiMode && opp.agentPipeline.length > 0 && (
        <div className="mb-8">
          <AgentPipeline
            title="AI Agent Pipeline"
            subtitle="Completed by the LangGraph workflow and saved with this result."
            progressPercent={100}
            completed={opp.agentPipeline.length}
            total={opp.agentPipeline.length}
            items={[...opp.agentPipeline]
              .sort((left, right) => left.order - right.order)
              .map((step) => ({
                node: step.node,
                label: step.label,
                order: step.order,
                state: "completed",
              }))}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-8 shadow-md shadow-black/5 space-y-8">
          <div>
            <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-4 border-b border-border/50 pb-2">
              <BoxSelect size={20} className="text-primary" /> Process Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <PlayCircle size={14} /> Trigger
                </div>
                <div className="font-medium text-foreground">{opp.trigger}</div>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowLeft size={14} className="rotate-180" /> Output Action
                </div>
                <div className="font-medium text-foreground">{opp.outputAction}</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-4 border-b border-border/50 pb-2">
              <Sparkles size={20} className="text-primary" /> Automation Strategy
            </h3>
            <p className="text-foreground leading-relaxed">{opp.automationRecommendation}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5">
            <h3 className="text-base font-display font-bold flex items-center gap-2 mb-4">
              <Layers size={18} className="text-primary" /> Detected Apps
            </h3>
            <div className="flex flex-wrap gap-2">
              {opp.appsInvolved.map((app) => (
                <span
                  key={app}
                  className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg border border-secondary-border"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5">
            <h3 className="text-base font-display font-bold flex items-center gap-2 mb-4">
              <BrainCircuit size={18} className="text-primary" /> Suggested Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {opp.suggestedToolStack.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-sm font-medium rounded-lg"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-sidebar border border-sidebar-border rounded-2xl overflow-hidden shadow-xl shadow-black/10">
        <div className="flex items-center justify-between px-6 py-4 bg-sidebar-accent border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF6D5A] rounded flex items-center justify-center text-white font-bold text-xs shadow-inner">
              n8n
            </div>
            <h3 className="text-sidebar-foreground font-medium">Starter Workflow JSON</h3>
            {(opp.validationErrors?.length ?? 0) === 0 && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                <CheckCircle size={12} /> Valid
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-sidebar-foreground/50 hidden sm:inline-block">
              Paste directly into your n8n canvas
            </span>
            <CopyButton
              text={opp.n8nWorkflowJson}
              className="bg-sidebar text-sidebar-foreground hover:bg-sidebar-foreground hover:text-sidebar"
            />
          </div>
        </div>
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: "1.5rem", background: "transparent", fontSize: "13px", lineHeight: "1.6" }}
          className="custom-scrollbar max-h-[500px]"
        >
          {opp.n8nWorkflowJson}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function Results() {
  const params = useParams();
  const rawId = params.id || "";
  const numericId = parseInt(rawId.replace(/^ai-/, ""));

  const { data, isLoading, error } = useQuery({
    queryKey: ["opportunity", numericId],
    queryFn: () => getOpportunity(numericId),
    enabled: !Number.isNaN(numericId),
  });

  if (isLoading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Analysis Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">We couldn&apos;t find this analysis.</p>
        <Link href="/" className="text-primary font-medium hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return <ResultsView opp={normalizeResult(data as unknown as Record<string, unknown>)} />;
}
