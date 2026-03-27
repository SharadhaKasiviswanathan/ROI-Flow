import React, { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useGetOpportunity } from "@workspace/api-client-react";
import { CopyButton } from "@/components/copy-button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  ArrowLeft, Zap, Clock, TrendingUp, AlertTriangle,
  PlayCircle, Puzzle, BoxSelect, Layers, Sparkles, BrainCircuit,
  CheckCircle, XCircle, Info,
} from "lucide-react";
import { motion } from "framer-motion";

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
}

function normalizeAiResult(data: Record<string, unknown>): NormalizedResult {
  return {
    id: data.id as number,
    title: (data.title || data.task_title || "") as string,
    taskSummary: (data.taskSummary || data.task_summary || data.summary || "") as string,
    trigger: (data.trigger || "") as string,
    outputAction: (data.outputAction || data.output_action || "") as string,
    appsInvolved: (data.appsDetected || data.apps_detected || data.appsInvolved || []) as string[],
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
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="w-32 h-10 bg-muted/50 rounded-lg animate-pulse mb-8" />
      <div className="w-2/3 h-12 bg-muted/50 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
      <div className="h-96 bg-muted/50 rounded-2xl animate-pulse" />
    </div>
  );
}

function getPriorityColors(priority: string) {
  switch (priority) {
    case "High": return "bg-destructive text-destructive-foreground shadow-destructive/20";
    case "Medium": return "bg-yellow-500 text-white shadow-yellow-500/20";
    case "Low": return "bg-green-500 text-white shadow-green-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function getLlmBadge(mode?: string) {
  if (!mode) return null;
  if (mode.startsWith("ollama:")) {
    return { label: `Ollama (${mode.split(":")[1]})`, color: "bg-violet-500/10 text-violet-400 border-violet-500/20", icon: BrainCircuit };
  }
  if (mode === "rules") {
    return { label: "Rules-based", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Zap };
  }
  if (mode === "openai") {
    return { label: "OpenAI", color: "bg-green-500/10 text-green-400 border-green-500/20", icon: BrainCircuit };
  }
  return { label: mode, color: "bg-muted/50 text-muted-foreground border-border", icon: Info };
}

function ResultsView({ opp }: { opp: NormalizedResult }) {
  const llmBadge = getLlmBadge(opp.llmModeUsed);
  const isAiMode = opp.source === "langgraph";

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-8 group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Pipeline
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {isAiMode && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <BrainCircuit size={12} /> LangGraph AI
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

      {/* Warnings */}
      {(opp.warnings?.length ?? 0) > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-1">
          {opp.warnings!.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertTriangle size={14} className="shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      {/* Validation Errors */}
      {(opp.validationErrors?.length ?? 0) > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-1">
          <p className="text-sm font-semibold text-destructive mb-1">Workflow Validation Issues:</p>
          {opp.validationErrors!.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-destructive">
              <XCircle size={14} className="shrink-0" /> {e}
            </div>
          ))}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4 relative z-10">
            <Zap size={18} className="text-primary" /> ROI Score
          </div>
          <div className="relative z-10">
            <div className="text-4xl font-display font-bold text-foreground mb-2">
              {opp.roiScore}<span className="text-xl text-muted-foreground/50">/100</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, opp.roiScore))}%` }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4">
            <Clock size={18} className="text-destructive" /> Monthly Hours Lost
          </div>
          <div className="text-4xl font-display font-bold text-foreground">
            {opp.monthlyHoursLost.toFixed(1)}<span className="text-xl font-sans font-medium text-muted-foreground">h</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2">({opp.frequencyPerMonth} runs × {opp.minutesPerRun}m)</div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4">
            <TrendingUp size={18} className="text-green-500" /> Est. Hours Saved
          </div>
          <div className="text-4xl font-display font-bold text-green-500">
            {opp.estimatedHoursSaved.toFixed(1)}<span className="text-xl font-sans font-medium text-green-500/70">h</span>
          </div>
          <div className="text-sm text-green-600 dark:text-green-400 mt-2 font-medium">After automation</div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-4">
            <Puzzle size={18} className="text-muted-foreground" /> Complexity
          </div>
          <div className="text-4xl font-display font-bold text-foreground">
            {opp.complexityScore}<span className="text-xl text-muted-foreground/50">/10</span>
          </div>
          <div className="text-sm text-muted-foreground mt-2">Technical effort required</div>
        </div>
      </div>

      {/* Analysis Details */}
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
              {opp.appsInvolved.map(app => (
                <span key={app} className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-lg border border-secondary-border">{app}</span>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-md shadow-black/5">
            <h3 className="text-base font-display font-bold flex items-center gap-2 mb-4">
              <BrainCircuit size={18} className="text-primary" /> Suggested Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {opp.suggestedToolStack.map(tool => (
                <span key={tool} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-sm font-medium rounded-lg">{tool}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* n8n JSON */}
      <div className="bg-sidebar border border-sidebar-border rounded-2xl overflow-hidden shadow-xl shadow-black/10">
        <div className="flex items-center justify-between px-6 py-4 bg-sidebar-accent border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF6D5A] rounded flex items-center justify-center text-white font-bold text-xs shadow-inner">n8n</div>
            <h3 className="text-sidebar-foreground font-medium">Starter Workflow JSON</h3>
            {(opp.validationErrors?.length ?? 0) === 0 && (
              <span className="flex items-center gap-1 text-xs text-green-400 font-medium"><CheckCircle size={12} /> Valid</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-sidebar-foreground/50 hidden sm:inline-block">Paste directly into your n8n canvas</span>
            <CopyButton text={opp.n8nWorkflowJson} className="bg-sidebar text-sidebar-foreground hover:bg-sidebar-foreground hover:text-sidebar" />
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
  const isAiMode = rawId.startsWith("ai-");
  const numericId = isAiMode ? parseInt(rawId.replace("ai-", "")) : parseInt(rawId);

  // Standard mode — uses generated React Query hook
  const { data: stdData, isLoading: stdLoading, error: stdError } = useGetOpportunity(
    isAiMode ? 0 : numericId,
    { query: { enabled: !isAiMode && !isNaN(numericId) } }
  );

  // AI mode — direct fetch from Python API
  const [aiData, setAiData] = useState<NormalizedResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAiMode || isNaN(numericId)) return;
    setAiLoading(true);
    fetch(`/python-api/tasks/${numericId}`)
      .then(r => r.ok ? r.json() : Promise.reject("Not found"))
      .then(data => setAiData(normalizeAiResult(data)))
      .catch(() => setAiError("Could not load AI analysis result."))
      .finally(() => setAiLoading(false));
  }, [isAiMode, numericId]);

  const isLoading = isAiMode ? aiLoading : stdLoading;
  const hasError = isAiMode ? !!aiError : !!stdError;

  if (isLoading) return <LoadingSkeleton />;

  if (hasError || (!isAiMode && !stdData) || (isAiMode && !aiData)) {
    return (
      <div className="p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Analysis Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">{isAiMode ? aiError : "We couldn't find this analysis."}</p>
        <Link href="/" className="text-primary font-medium hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  let normalizedResult: NormalizedResult;
  if (isAiMode && aiData) {
    normalizedResult = aiData;
  } else if (stdData) {
    normalizedResult = normalizeAiResult(stdData as unknown as Record<string, unknown>);
  } else {
    return null;
  }

  return <ResultsView opp={normalizedResult} />;
}
