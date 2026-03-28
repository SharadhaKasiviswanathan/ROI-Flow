import React, { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Zap,
} from "lucide-react";
import { AgentPipeline, type AgentPipelineItem } from "@/components/analysis/agent-pipeline";
import { createOpportunity, getAiHealth, streamAnalyzeTask, type AgentStepEvent } from "@/lib/api";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(20, "Please provide more detail about the manual process"),
  frequencyPerMonth: z.coerce.number().min(1, "Must be at least 1"),
  minutesPerRun: z.coerce.number().min(1, "Must be at least 1"),
  peopleInvolved: z.coerce.number().min(1, "Must be at least 1"),
});

type FormValues = z.infer<typeof formSchema>;
type AnalysisMode = "standard" | "ai";
type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};
type BrowserSpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognitionInstance;

const DEMO_EXAMPLES = [
  {
    title: "CRM Lead Sync from Typeform",
    description: "Every week we manually copy form responses from Google Forms into our CRM (Salesforce) and notify the assigned coach by Slack message with the lead details.",
    frequencyPerMonth: 8,
    minutesPerRun: 25,
    peopleInvolved: 2,
  },
  {
    title: "Monthly Invoice Reminders",
    description: "Every week we check QuickBooks for overdue invoices and manually send reminder emails via Gmail to clients. We also update our Google Sheets tracking sheet.",
    frequencyPerMonth: 4,
    minutesPerRun: 45,
    peopleInvolved: 1,
  },
  {
    title: "Customer Feedback Classification",
    description: "Daily we receive feedback submissions via Google Forms, manually read each one, tag them in Google Sheets, and send a Slack summary to the team.",
    frequencyPerMonth: 22,
    minutesPerRun: 20,
    peopleInvolved: 2,
  },
];

function upsertStep(previous: AgentStepEvent[], nextStep: AgentStepEvent) {
  const existingIndex = previous.findIndex((step) => step.node === nextStep.node);
  if (existingIndex === -1) {
    return [...previous, nextStep];
  }

  const updated = [...previous];
  updated[existingIndex] = nextStep;
  return updated;
}

export default function Submit() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AnalysisMode>("standard");
  const [isRecording, setIsRecording] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentStepEvent[]>([]);
  const [currentAgentLabel, setCurrentAgentLabel] = useState<string>("");
  const [agentProgress, setAgentProgress] = useState({ completed: 0, total: 0 });
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);

  const standardMutation = useMutation({
    mutationFn: createOpportunity,
    onSuccess: (data) => setLocation(`/results/${data.id}`),
  });

  const { data: aiHealth, isLoading: aiHealthLoading } = useQuery({
    queryKey: ["ai-health"],
    queryFn: getAiHealth,
    enabled: mode === "ai",
    staleTime: 10000,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { frequencyPerMonth: 10, minutesPerRun: 15, peopleInvolved: 1 },
  });

  const descriptionValue = watch("description");
  const aiReady = Boolean(aiHealth?.llm.available);

  const loadDemo = (demo: typeof DEMO_EXAMPLES[0]) => {
    setValue("title", demo.title);
    setValue("description", demo.description);
    setValue("frequencyPerMonth", demo.frequencyPerMonth);
    setValue("minutesPerRun", demo.minutesPerRun);
    setValue("peopleInvolved", demo.peopleInvolved);
  };

  const resetAgentRun = () => {
    setAiError(null);
    setAgentSteps([]);
    setCurrentAgentLabel("");
    setAgentProgress({ completed: 0, total: 0 });
  };

  const startVoiceInput = () => {
    const speechWindow = window as Window &
      typeof globalThis & {
        webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
        SpeechRecognition?: BrowserSpeechRecognitionCtor;
      };
    const SpeechRecognitionAPI = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Voice input is not supported in your browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const current = descriptionValue || "";
      setValue("description", `${current} ${transcript}`.trim());
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    setIsRecording(true);
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const onSubmitStandard = (data: FormValues) => {
    resetAgentRun();
    standardMutation.mutate(data);
  };

  const onSubmitAI = async (data: FormValues) => {
    if (!aiReady) {
      setAiError(aiHealth?.llm.message || "Ollama-only AI mode is not ready yet.");
      return;
    }

    setAiLoading(true);
    resetAgentRun();

    try {
      const result = await streamAnalyzeTask(data, {
        onStep: (event) => {
          setCurrentAgentLabel(event.label);
          setAgentProgress({ completed: event.completed, total: event.total });
          setAgentSteps((previous) => upsertStep(previous, event));
        },
      });
      setLocation(`/results/${result.id}`);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = mode === "ai" ? onSubmitAI : onSubmitStandard;
  const isPending = mode === "ai" ? aiLoading : standardMutation.isPending;
  const isError = mode === "ai" ? !!aiError : standardMutation.isError;
  const errorMsg =
    mode === "ai"
      ? aiError
      : standardMutation.error instanceof Error
        ? standardMutation.error.message
        : "Failed to submit. Please try again.";
  const progressPercent =
    agentProgress.total > 0 ? Math.round((agentProgress.completed / agentProgress.total) * 100) : 0;
  const liveAgentItems: AgentPipelineItem[] = [...agentSteps]
    .sort((left, right) => left.completed - right.completed)
    .map((step) => ({
      node: step.node,
      label: step.label,
      order: step.completed,
      state: aiLoading && step.completed === agentProgress.completed ? "active" : "completed",
    }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Submit Manual Task</h1>
        <p className="text-muted-foreground text-lg">
          Describe your repetitive task. We&apos;ll analyze ROI and generate an n8n automation template.
        </p>
      </div>

      <div className="flex items-center gap-3 p-1 bg-muted rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setMode("standard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            mode === "standard"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap size={16} />
          Standard
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            mode === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BrainCircuit size={16} />
          AI Mode (Ollama Host)
        </button>
      </div>

      {mode === "ai" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <BrainCircuit size={18} className="text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Ollama-powered AI mode with FastAPI + LangGraph
              </p>
              <p className="text-sm text-muted-foreground">
                AI mode can run against a local Ollama daemon or an Ollama Cloud endpoint. If the configured Ollama host is
                offline, standard mode still works.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-sm">
            {aiHealthLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin" size={14} />
                Checking local AI status...
              </div>
            ) : aiHealth ? (
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">{aiHealth.llm.message}</p>
                <p className="text-muted-foreground">
                  Model: <span className="font-medium text-foreground">{aiHealth.llm.model}</span>
                  {" · "}
                  Deployment: <span className="font-medium capitalize text-foreground">{aiHealth.llm.deployment || "local"}</span>
                  {" · "}
                  Storage: <span className="font-medium text-foreground">{aiHealth.storage.mode}</span>
                </p>
                <p className="text-muted-foreground">
                  Endpoint: <span className="font-medium text-foreground">{aiHealth.llm.baseUrl}</span>
                </p>
                {!aiHealth.llm.available && (
                  <p className="text-amber-700 dark:text-amber-400">{aiHealth.llm.setupHint}</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">Unable to read AI status right now.</p>
            )}
          </div>
        </div>
      )}

      {(aiLoading || agentSteps.length > 0) && mode === "ai" && (
        <AgentPipeline
          title={aiLoading ? "Agents Running" : "Latest Agent Run"}
          subtitle={currentAgentLabel || "Waiting for the first agent to start..."}
          progressPercent={progressPercent}
          completed={agentProgress.completed}
          total={agentProgress.total}
          items={liveAgentItems}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center">Try a demo:</span>
        {DEMO_EXAMPLES.map((demo, i) => (
          <button
            key={i}
            type="button"
            onClick={() => loadDemo(demo)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {demo.title.split(" ").slice(0, 3).join(" ")}…
          </button>
        ))}
      </div>

      {isError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card border border-border/50 shadow-xl shadow-black/5 rounded-2xl p-6 md:p-8 space-y-8"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-foreground">
              Task Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              {...register("title")}
              className={`w-full px-4 py-3 rounded-xl bg-background border-2 ${
                errors.title ? "border-destructive" : "border-border focus:border-primary"
              } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200`}
              placeholder="e.g., Transferring Lead Data from Typeform to Salesforce"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="description" className="block text-sm font-semibold text-foreground">
                Process Description <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={isRecording ? stopVoiceInput : startVoiceInput}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isRecording
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                {isRecording ? "Stop Recording" : "Voice Input"}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Explain what triggers the task, which apps you use, and what actions are taken.
            </p>
            <textarea
              id="description"
              {...register("description")}
              rows={5}
              className={`w-full px-4 py-3 rounded-xl bg-background border-2 ${
                errors.description ? "border-destructive" : "border-border focus:border-primary"
              } text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200 resize-y`}
              placeholder={`1. When a new form is submitted in Typeform...\n2. I open the email notification...\n3. I copy the details into our CRM...\n4. Then I send a welcome email via Gmail...`}
            />
            {isRecording && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <span className="w-2 h-2 bg-destructive rounded-full animate-pulse inline-block" />
                Listening… speak your process description
              </p>
            )}
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
            {[
              { id: "frequencyPerMonth", label: "Runs per month", key: "frequencyPerMonth" as const },
              { id: "minutesPerRun", label: "Minutes per run", key: "minutesPerRun" as const },
              { id: "peopleInvolved", label: "People involved", key: "peopleInvolved" as const },
            ].map(({ id, label, key }) => (
              <div key={id} className="space-y-2">
                <label htmlFor={id} className="block text-sm font-semibold text-foreground">
                  {label}
                </label>
                <input
                  id={id}
                  type="number"
                  min="1"
                  {...register(key)}
                  className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200"
                />
                {errors[key] && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-border/50 flex justify-end">
          <button
            type="submit"
            disabled={isPending || (mode === "ai" && !aiReady)}
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing…
              </>
            ) : mode === "ai" ? (
              <>
                <BrainCircuit size={20} />
                Run Ollama Agents
                <ArrowRight size={20} className="ml-1" />
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Analysis
                <ArrowRight size={20} className="ml-1" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
