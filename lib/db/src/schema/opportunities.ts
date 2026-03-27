import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const opportunitiesTable = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  frequencyPerMonth: integer("frequency_per_month").notNull(),
  minutesPerRun: integer("minutes_per_run").notNull(),
  peopleInvolved: integer("people_involved").notNull(),
  taskSummary: text("task_summary").notNull(),
  trigger: text("trigger").notNull(),
  appsInvolved: text("apps_involved").notNull(),
  outputAction: text("output_action").notNull(),
  monthlyHoursLost: real("monthly_hours_lost").notNull(),
  estimatedHoursSaved: real("estimated_hours_saved").notNull(),
  roiScore: integer("roi_score").notNull(),
  complexityScore: integer("complexity_score").notNull(),
  priority: text("priority").notNull(),
  automationRecommendation: text("automation_recommendation").notNull(),
  suggestedToolStack: text("suggested_tool_stack").notNull(),
  n8nWorkflowJson: text("n8n_workflow_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOpportunitySchema = createInsertSchema(opportunitiesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
