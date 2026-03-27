import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOpportunity } from "@workspace/api-client-react";
import { ArrowRight, Loader2, Sparkles, AlertCircle, Mic, MicOff, BrainCircuit, Zap } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(20, "Please provide more detail about the manual process"),
  frequencyPerMonth: z.coerce.number().min(1, "Must be at least 1"),
  minutesPerRun: z.coerce.number().min(1, "Must be at least 1"),
  peopleInvolved: z.coerce.number().min(1, "Must be at least 1"),
});

type FormValues = z.infer<typeof formSchema>;

type AnalysisMode = "standard" | "ai";

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

export default function Submit() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AnalysisMode>("standard");
  const [isRecording, setIsRecording] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const createMutation = useCreateOpportunity({
    mutation: {
      onSuccess: (data) => setLocation(`/results/${data.id}`),
      onError: () => {},
    }
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { frequencyPerMonth: 10, minutesPerRun: 15, peopleInvolved: 1 }
  });

  const descriptionValue = watch("description");

  const loadDemo = (demo: typeof DEMO_EXAMPLES[0]) => {
    setValue("title", demo.title);
    setValue("description", demo.description);
    setValue("frequencyPerMonth", demo.frequencyPerMonth);
    setValue("minutesPerRun", demo.minutesPerRun);
    setValue("peopleInvolved", demo.peopleInvolved);
  };

  const startVoiceInput = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Voice input is not supported in your browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const current = descriptionValue || "";
      setValue("description", (current + " " + transcript).trim());
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
    createMutation.mutate({ data });
  };

  const onSubmitAI = async (data: FormValues) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/python-api/analyze-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          frequency_per_month: data.frequencyPerMonth,
          minutes_per_run: data.minutesPerRun,
          people_involved: data.peopleInvolved,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "AI analysis failed");
      }
      const result = await res.json();
      setLocation(`/results/ai-${result.id}`);
    } catch (err: any) {
      setAiError(err.message || "AI service unavailable. Try Standard mode.");
    } finally {
      setAiLoading(false);
    }
  };

  const onSubmit = mode === "ai" ? onSubmitAI : onSubmitStandard;
  const isPending = mode === "ai" ? aiLoading : createMutation.isPending;
  const isError = mode === "ai" ? !!aiError : createMutation.isError;
  const errorMsg = mode === "ai" ? aiError : "Failed to submit. Please try again.";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Submit Manual Task</h1>
        <p className="text-muted-foreground text-lg">Describe your repetitive task. We'll analyze ROI and generate an n8n automation template.</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-3 p-1 bg-muted rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setMode("standard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            mode === "standard" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
          AI Mode (LangGraph)
        </button>
      </div>

      {mode === "ai" && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-muted-foreground flex items-center gap-2">
          <BrainCircuit size={16} className="text-primary flex-shrink-0" />
          <span>AI Mode uses LangGraph + optional Ollama. Falls back to rules-based if no local model is available.</span>
        </div>
      )}

      {/* Demo Buttons */}
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

      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border/50 shadow-xl shadow-black/5 rounded-2xl p-6 md:p-8 space-y-8">
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-foreground">
              Task Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              {...register("title")}
              className={`w-full px-4 py-3 rounded-xl bg-background border-2 ${errors.title ? "border-destructive" : "border-border focus:border-primary"} text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200`}
              placeholder="e.g., Transferring Lead Data from Typeform to Salesforce"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description with Voice */}
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
            <p className="text-sm text-muted-foreground">Explain what triggers the task, which apps you use, and what actions are taken.</p>
            <textarea
              id="description"
              {...register("description")}
              rows={5}
              className={`w-full px-4 py-3 rounded-xl bg-background border-2 ${errors.description ? "border-destructive" : "border-border focus:border-primary"} text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200 resize-y`}
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

          {/* Numbers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
            {[
              { id: "frequencyPerMonth", label: "Runs per month", key: "frequencyPerMonth" as const },
              { id: "minutesPerRun", label: "Minutes per run", key: "minutesPerRun" as const },
              { id: "peopleInvolved", label: "People involved", key: "peopleInvolved" as const },
            ].map(({ id, label, key }) => (
              <div key={id} className="space-y-2">
                <label htmlFor={id} className="block text-sm font-semibold text-foreground">{label}</label>
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
            disabled={isPending}
            className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
          >
            {isPending ? (
              <><Loader2 className="animate-spin" size={20} />Analyzing…</>
            ) : mode === "ai" ? (
              <><BrainCircuit size={20} />Run AI Analysis<ArrowRight size={20} className="ml-1" /></>
            ) : (
              <><Sparkles size={20} />Generate Analysis<ArrowRight size={20} className="ml-1" /></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
