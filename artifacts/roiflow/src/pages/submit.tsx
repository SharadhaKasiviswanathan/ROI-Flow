import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOpportunity } from "@workspace/api-client-react";
import { ArrowRight, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().min(20, "Please provide more detail about the manual process"),
  frequencyPerMonth: z.coerce.number().min(1, "Must be at least 1"),
  minutesPerRun: z.coerce.number().min(1, "Must be at least 1"),
  peopleInvolved: z.coerce.number().min(1, "Must be at least 1"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Submit() {
  const [, setLocation] = useLocation();
  
  const createMutation = useCreateOpportunity({
    mutation: {
      onSuccess: (data) => {
        setLocation(`/results/${data.id}`);
      },
      onError: (error) => {
        console.error("Failed to create:", error);
      }
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      frequencyPerMonth: 10,
      minutesPerRun: 15,
      peopleInvolved: 1,
    }
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate({ data });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-slide-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
          Submit Manual Task
        </h1>
        <p className="text-muted-foreground text-lg">
          Describe the repetitive task. We'll analyze its ROI and generate an n8n automation template.
        </p>
      </div>

      {createMutation.isError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="font-medium">Failed to submit task. Please try again.</p>
        </div>
      )}

      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="bg-card border border-border/50 shadow-xl shadow-black/5 rounded-2xl p-6 md:p-8 space-y-8"
      >
        <div className="space-y-6">
          
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-semibold text-foreground">
              Task Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              {...register("title")}
              className={`
                w-full px-4 py-3 rounded-xl bg-background border-2 
                ${errors.title ? 'border-destructive focus:ring-destructive/10' : 'border-border focus:border-primary focus:ring-primary/10'}
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-4 transition-all duration-200
              `}
              placeholder="e.g., Transferring Lead Data from Typeform to Salesforce"
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-semibold text-foreground">
              Process Description <span className="text-destructive">*</span>
            </label>
            <p className="text-sm text-muted-foreground mb-2">
              Explain exactly what you do step-by-step. What triggers the task? What apps do you use?
            </p>
            <textarea
              id="description"
              {...register("description")}
              rows={5}
              className={`
                w-full px-4 py-3 rounded-xl bg-background border-2 
                ${errors.description ? 'border-destructive focus:ring-destructive/10' : 'border-border focus:border-primary focus:ring-primary/10'}
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-4 transition-all duration-200 resize-y
              `}
              placeholder="1. When a new form is submitted in Typeform...&#10;2. I open the email notification...&#10;3. I copy the details into our CRM...&#10;4. Then I send a welcome email via Gmail..."
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>

          {/* Numbers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <label htmlFor="frequencyPerMonth" className="block text-sm font-semibold text-foreground">
                Runs per month
              </label>
              <input
                id="frequencyPerMonth"
                type="number"
                {...register("frequencyPerMonth")}
                className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200"
              />
              {errors.frequencyPerMonth && <p className="text-sm text-destructive">{errors.frequencyPerMonth.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="minutesPerRun" className="block text-sm font-semibold text-foreground">
                Minutes per run
              </label>
              <input
                id="minutesPerRun"
                type="number"
                {...register("minutesPerRun")}
                className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200"
              />
              {errors.minutesPerRun && <p className="text-sm text-destructive">{errors.minutesPerRun.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="peopleInvolved" className="block text-sm font-semibold text-foreground">
                People involved
              </label>
              <input
                id="peopleInvolved"
                type="number"
                {...register("peopleInvolved")}
                className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-200"
              />
              {errors.peopleInvolved && <p className="text-sm text-destructive">{errors.peopleInvolved.message}</p>}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border/50 flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="
              flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg
              bg-gradient-to-r from-primary to-primary/90
              text-primary-foreground shadow-lg shadow-primary/25
              hover:shadow-xl hover:-translate-y-0.5
              active:translate-y-0 active:shadow-md
              disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
              transition-all duration-200 ease-out
            "
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Analyzing Task...
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
