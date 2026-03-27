# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (port 8080)
│   ├── python-api/         # FastAPI + LangGraph AI backend (port 5000)
│   └── roiflow/            # ROIFlow React frontend (react-vite, root path /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Application: ROIFlow

ROIFlow is an automation intake and prioritization tool for operations teams.

### Purpose
Users submit repetitive manual tasks and get back:
1. A structured summary of the problem
2. An ROI score (0-100)
3. Estimated monthly hours saved
4. Automation priority ranking (High / Medium / Low)
5. A draft n8n workflow JSON template

### Pages
- `/` — Dashboard: sortable table of all submitted automation opportunities
- `/submit` — Dual-mode form (Standard or AI/LangGraph) with voice input via Web Speech API and 3 demo examples
- `/results/:id` — Standard mode: ROI analysis from Express API
- `/results/ai-:id` — AI mode: ROI analysis from Python LangGraph API (with LLM mode badge, warnings, validation status)

### Analysis Modes

**Standard Mode** — uses Express API at `/api/opportunities`
- Fast, pure rule-based TypeScript classifier, ROI engine, n8n builder
- Results stored in PostgreSQL

**AI Mode (LangGraph)** — uses Python FastAPI at `/python-api/analyze-task`
- 8-node LangGraph pipeline: ingest → parse → extract → roi → template → n8n → validate → summarize
- LLM-enhanced summaries: tries Ollama (local) first, falls back to rules-based
- Results stored in `/tmp/roiflow_tasks.json`
- Shows LLM mode badge (Ollama/rules/openai), warnings, and workflow validation status

### Core Logic (no LLM required, all rule-based)
- **Classifier** (`artifacts/api-server/src/lib/classifier.ts`): keyword-based detection of apps, triggers, and outputs
- **ROI Engine** (`artifacts/api-server/src/lib/roiEngine.ts`): formula using frequency, minutes, people, complexity
- **n8n Builder** (`artifacts/api-server/src/lib/n8nBuilder.ts`): generates valid n8n workflow JSON from a fixed node catalog
- **Python AI Pipeline** (`artifacts/python-api/`): LangGraph stateful graph with same logic in Python + optional LLM enhancement

### ROI Formula
```
monthlyHoursLost = (frequencyPerMonth × minutesPerRun × peopleInvolved) / 60
complexityPenalty = appsCount × 1.5 + (minutesPerRun > 30 ? 2 : 0)
roiScore = volumeScore(40) + frequencyScore(30) + peopleScore(20) + complexityBonus(10)
priority = High (≥60) | Medium (≥35) | Low (<35)
```

### Supported n8n Nodes (fixed catalog)
CRM, Slack, Gmail, Google Sheets, QuickBooks, SharePoint, LMS, Webhook, HTTP Request, Schedule Trigger, Set, IF, Code

## Packages

### `artifacts/roiflow` (`@workspace/roiflow`)
React + Vite frontend. Uses `@workspace/api-client-react` for generated React Query hooks.

Frontend dependencies: framer-motion, react-hook-form, @hookform/resolvers, date-fns, react-syntax-highlighter, wouter, @tanstack/react-query

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/opportunities.ts` handles CRUD for opportunities
- Key libs: `src/lib/classifier.ts`, `src/lib/roiEngine.ts`, `src/lib/n8nBuilder.ts`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/opportunities.ts` — `opportunitiesTable` with all ROI analysis fields

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) with endpoints:
- `GET /api/opportunities` — list with sort/order params
- `POST /api/opportunities` — create and analyze
- `GET /api/opportunities/:id` — get single
- `DELETE /api/opportunities/:id` — delete

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
