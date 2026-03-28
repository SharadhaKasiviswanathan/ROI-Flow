import { CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentPipelineItem {
  node: string;
  label: string;
  order: number;
  state: "completed" | "active" | "pending";
}

interface AgentPipelineProps {
  title: string;
  subtitle: string;
  progressPercent: number;
  completed: number;
  total: number;
  items: AgentPipelineItem[];
  className?: string;
}

export function AgentPipeline({
  title,
  subtitle,
  progressPercent,
  completed,
  total,
  items,
  className,
}: AgentPipelineProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className={cn("rounded-2xl border border-primary/20 bg-card p-5 shadow-sm space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display font-bold text-foreground">{progressPercent}%</p>
          <p className="text-xs text-muted-foreground">
            {completed}/{total || "?"} steps
          </p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>

      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.node}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
              item.state === "completed" && "border-primary/20 bg-primary/5",
              item.state === "active" && "border-primary/30 bg-primary/10",
              item.state === "pending" && "border-border/50 bg-muted/20",
            )}
          >
            {item.state === "completed" ? (
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            ) : (
              <CircleDashed
                size={16}
                className={cn("shrink-0", item.state === "active" ? "text-primary animate-spin" : "text-muted-foreground")}
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                Step {item.order} of {total}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
