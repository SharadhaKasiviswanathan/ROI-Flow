import React, { useState } from "react";
import { Link } from "wouter";
import { 
  useListOpportunities, 
  useDeleteOpportunity, 
  ListOpportunitiesSort, 
  ListOpportunitiesOrder 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  ArrowUpDown, 
  Trash2, 
  Eye, 
  PlusCircle, 
  SearchX, 
  Clock,
  TrendingUp,
  BrainCircuit
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<ListOpportunitiesSort>("roi_score");
  const [order, setOrder] = useState<ListOpportunitiesOrder>("desc");

  const { data: opportunities, isLoading, error } = useListOpportunities({
    params: { sort, order }
  });

  const deleteMutation = useDeleteOpportunity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      }
    }
  });

  const handleSort = (newSort: ListOpportunitiesSort) => {
    if (sort === newSort) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(newSort);
      setOrder("desc");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-destructive/10 text-destructive border-destructive/20";
      case "Medium": return "bg-warning/10 text-warning border-warning/20";
      case "Low": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const SortButton = ({ field, label }: { field: ListOpportunitiesSort, label: string }) => (
    <button 
      onClick={() => handleSort(field)}
      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
    >
      {label}
      <ArrowUpDown 
        size={14} 
        className={`transition-colors ${sort === field ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground'}`} 
      />
    </button>
  );

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Automation Pipeline
          </h1>
          <p className="mt-2 text-muted-foreground text-base">
            Track and prioritize manual tasks for automation based on ROI.
          </p>
        </div>
        <Link 
          href="/submit"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shrink-0"
        >
          <PlusCircle size={18} />
          Submit Task
        </Link>
      </div>

      {/* Content */}
      <div className="bg-card border border-border/50 shadow-xl shadow-black/5 rounded-2xl overflow-hidden">
        
        {isLoading ? (
          <div className="p-8 flex flex-col gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-full h-16 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
              <SearchX size={32} />
            </div>
            <h3 className="text-xl font-display font-semibold text-foreground mb-2">Failed to load</h3>
            <p className="text-muted-foreground">There was an error fetching your automation pipeline.</p>
          </div>
        ) : !opportunities || opportunities.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-24 h-24 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-6 shadow-inner">
              <BrainCircuit size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-display font-bold text-foreground mb-3">No tasks submitted yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
              Start building your automation pipeline by submitting manual tasks that are slowing down your team.
            </p>
            <Link 
              href="/submit"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <PlusCircle size={20} />
              Submit Your First Task
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="p-4 font-medium text-muted-foreground">Task Title</th>
                  <th className="p-4">
                    <SortButton field="priority" label="Priority" />
                  </th>
                  <th className="p-4">
                    <SortButton field="roi_score" label="ROI Score" />
                  </th>
                  <th className="p-4 font-medium text-muted-foreground text-sm uppercase tracking-wider">Hours Lost</th>
                  <th className="p-4 font-medium text-muted-foreground text-sm uppercase tracking-wider">Complexity</th>
                  <th className="p-4">
                    <SortButton field="created_at" label="Date Added" />
                  </th>
                  <th className="p-4 text-right font-medium text-muted-foreground text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {opportunities.map((opp, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={opp.id} 
                    className="group hover:bg-muted/30 transition-colors duration-200"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{opp.title}</div>
                      <div className="text-sm text-muted-foreground flex gap-1 flex-wrap mt-1">
                        {opp.appsInvolved?.slice(0, 2).map(app => (
                          <span key={app} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                            {app}
                          </span>
                        ))}
                        {(opp.appsInvolved?.length || 0) > 2 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                            +{(opp.appsInvolved?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(opp.priority)}`}>
                        {opp.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-display font-bold text-foreground">
                          {opp.roiScore}
                        </div>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, Math.max(0, opp.roiScore))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Clock size={16} className="text-muted-foreground" />
                        {opp.monthlyHoursLost.toFixed(1)}h/mo
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={16} className="text-muted-foreground" />
                        <span className="font-medium">{opp.complexityScore}/10</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(opp.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/results/${opp.id}`}
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          title="View Analysis"
                        >
                          <Eye size={18} />
                        </Link>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this opportunity?")) {
                              deleteMutation.mutate({ id: opp.id });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
