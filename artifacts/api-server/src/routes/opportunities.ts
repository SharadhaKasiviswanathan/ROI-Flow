import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { opportunitiesTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { CreateOpportunityBody, ListOpportunitiesQueryParams } from "@workspace/api-zod";
import { detectApps, detectTrigger, detectOutput, generateTaskSummary, generateRecommendation, suggestToolStack } from "../lib/classifier.js";
import { calculateRoi } from "../lib/roiEngine.js";
import { buildN8nWorkflow } from "../lib/n8nBuilder.js";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const query = ListOpportunitiesQueryParams.safeParse(req.query);
  const sort = query.success ? (query.data.sort ?? "roi_score") : "roi_score";
  const order = query.success ? (query.data.order ?? "desc") : "desc";

  const columnMap: Record<string, typeof opportunitiesTable[keyof typeof opportunitiesTable]> = {
    roi_score: opportunitiesTable.roiScore,
    priority: opportunitiesTable.priority,
    created_at: opportunitiesTable.createdAt,
  };

  const col = columnMap[sort] ?? opportunitiesTable.roiScore;
  const orderFn = order === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(opportunitiesTable)
    .orderBy(orderFn(col as Parameters<typeof orderFn>[0]));

  const result = rows.map(formatOpportunity);
  res.json(result);
});

router.post("/", async (req, res) => {
  const parsed = CreateOpportunityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.message });
    return;
  }

  const { title, description, frequencyPerMonth, minutesPerRun, peopleInvolved } = parsed.data;

  const appsInvolved = detectApps(description);
  const trigger = detectTrigger(description);
  const outputAction = detectOutput(description);
  const taskSummary = generateTaskSummary(title, description, trigger, appsInvolved, outputAction);

  const roi = calculateRoi(frequencyPerMonth, minutesPerRun, peopleInvolved, appsInvolved.length);

  const automationRecommendation = generateRecommendation(appsInvolved, trigger, outputAction, roi.priority);
  const suggestedTools = suggestToolStack(appsInvolved);
  const n8nWorkflowJson = buildN8nWorkflow(title, trigger, appsInvolved);

  const [inserted] = await db.insert(opportunitiesTable).values({
    title,
    description,
    frequencyPerMonth,
    minutesPerRun,
    peopleInvolved,
    taskSummary,
    trigger,
    appsInvolved: JSON.stringify(appsInvolved),
    outputAction,
    monthlyHoursLost: roi.monthlyHoursLost,
    estimatedHoursSaved: roi.estimatedHoursSaved,
    roiScore: roi.roiScore,
    complexityScore: roi.complexityScore,
    priority: roi.priority,
    automationRecommendation,
    suggestedToolStack: JSON.stringify(suggestedTools),
    n8nWorkflowJson,
  }).returning();

  res.status(201).json(formatOpportunity(inserted));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [row] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.json(formatOpportunity(row));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [deleted] = await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.status(204).send();
});

function formatOpportunity(row: typeof opportunitiesTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    frequencyPerMonth: row.frequencyPerMonth,
    minutesPerRun: row.minutesPerRun,
    peopleInvolved: row.peopleInvolved,
    taskSummary: row.taskSummary,
    trigger: row.trigger,
    appsInvolved: JSON.parse(row.appsInvolved) as string[],
    outputAction: row.outputAction,
    monthlyHoursLost: row.monthlyHoursLost,
    estimatedHoursSaved: row.estimatedHoursSaved,
    roiScore: row.roiScore,
    complexityScore: row.complexityScore,
    priority: row.priority,
    automationRecommendation: row.automationRecommendation,
    suggestedToolStack: JSON.parse(row.suggestedToolStack) as string[],
    n8nWorkflowJson: row.n8nWorkflowJson,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
