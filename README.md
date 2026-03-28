# ROI Flow - An AI Powered Automation Analysis

ROI Flow is a **full-stack, TypeScript-based automation analysis platform** that converts repetitive business tasks into prioritized automation opportunities and generates production-ready n8n workflows.

It operates **zero API cost by default** using rule-based logic, with optional local LLM support via Ollama.

---

## 🚀 What It Does

- **Analyzes** manual business processes and workflows
- **Extracts** triggers, tools, and actions from process descriptions
- **Calculates** monthly time savings and ROI metrics
- **Prioritizes** automation opportunities (High / Medium / Low)
- **Generates** draft n8n workflow JSON ready for deployment
- **Works fully offline** in Standard mode (no APIs required)

---

## 💡 Key Features

- **Local-first architecture** - No mandatory cloud dependency
- **Monorepo workspace** - Modular TypeScript codebase with pnpm
- **Hybrid analysis** - Rule-based by default + optional AI via Ollama
- **Zero-cost Standard mode** - Works without API keys
- **React + TypeScript frontend** - Modern UI with Vite
- **FastAPI + TypeScript backends** - LangGraph orchestration
- **Dark/Light mode** - Theme toggle in UI
- **Voice input support** - Accessibility-first design
- **Database-ready** - Drizzle ORM with PostgreSQL support

---

## 🧠 Tech Stack

### Frontend
- **React 18+** with Hooks (TypeScript)
- **Vite** - Next-generation build tool
- **Tailwind CSS + Radix UI** - Component library
- **React Query** - Data fetching & state management
- **React Hook Form** - Form handling

### Backend
- **FastAPI** (Python) - REST API server with LangGraph
- **LangGraph** - Stateful workflow orchestration
- **Uvicorn** - ASGI server
- **Pydantic** - Runtime schema validation

### Optional AI
- **Ollama** - Local LLM (llama3.2:3b, qwen2.5, mistral, gemma, or custom)
- **LangGraph** - Agentic workflow graph
- **LangChain Core** - LLM integrations

### Additional Services
- **Express.js** (TypeScript) - Optional utility API server
- **Drizzle ORM** - Type-safe database queries
- **Zod** - Type validation
- **SQLite / PostgreSQL** - Data storage
- **n8n** - Workflow automation output

### Infrastructure
- **pnpm** - Workspace package manager
- **TypeScript** - End-to-end type safety
- **Gradio** - Optional public demo interface

---

## 📊 Example Use Case

**Client Onboarding Automation**

Input: Form submission → CRM entry → Slack notification

Output: Auto-generated n8n workflow JSON

Result: ~6.7 hours saved/month

Priority: HIGH

---

## 📁 Project Structure

```
ROI-Flow/
├── artifacts/
│   ├── roiflow/            # React + TypeScript frontend (Vite)
│   ├── api-server/         # Express + TypeScript backend (optional)
│   ├── python-api/         # FastAPI + LangGraph backend (primary)
│   ├── mockup-sandbox/     # UI component showcase
│   └── gradio-share/       # Public demo interface
├── lib/
│   ├── api-zod/            # Shared API schemas
│   ├── api-spec/           # API specification
│   ├── api-client-react/   # React API client
│   └── db/                 # Database schema & ORM
├── scripts/                # Utility scripts (TypeScript)
├── main.py                 # Python entry point
├── pyproject.toml          # Python dependencies
├── pnpm-workspace.yaml     # Workspace configuration
└── package.json            # Root TypeScript config
```

---

## ⚙️ Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (enforced via corepack)
- **Python** 3.11+
- **Optional:** Ollama (for AI mode)

---

## 🛠️ Installation

### Clone Repository

```bash
git clone https://github.com/SharadhaKasiviswanathan/ROI-Flow.git
cd ROI-Flow
```

### Setup Node.js Environment

```bash
corepack enable
corepack pnpm install
```

### Setup Python Environment

#### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install .
```

#### Windows (PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install .
```

---

## ▶️ Running Locally

### 1. Optional: Start Ollama (AI Mode)

If you want AI-powered analysis, start Ollama first:

```bash
ollama serve
```

In another terminal:

```bash
ollama pull llama3.2:3b
```

Skip this if using Standard mode (rule-based only).

---

### 2. Start the Backend (FastAPI + LangGraph)

```bash
cd artifacts/python-api
PYTHON_API_PORT=8002 BASE_PATH=/python-api python3 start.py
```

The backend will start on:

```
http://127.0.0.1:8002
```

#### Available Endpoints

- `GET /` — Service info  
- `POST /analyze-task` — Standard & AI analysis  
- `POST /analyze-task/stream` — Streaming AI analysis  
- `GET /opportunities` — Submitted tasks  
- `GET /health` — Health check  

---

### 3. Start the Frontend

Open a new terminal in the repo root:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @roiflow/app dev
```

---

### 4. Open the App

Navigate to:

```
http://localhost:5173
```
---

## ⚡ Operating Modes


### Standard Mode (Default)

- Rule-based analysis (no ML required)
- Fully offline & free
- Instant results
- No API keys needed
- Limited to predefined patterns


### AI Mode (Optional with Ollama)

- LLM-powered analysis (local inference)
- Handles complex, custom workflows
- Better accuracy for edge cases
- Still cost-efficient (local processing)
- Requires Ollama + ~6GB VRAM
- Slightly slower than Standard mode

---


## 📌 Why This Matters

ROI Flow shifts automation from guesswork to ROI-driven decision making.

Before: "What should we automate?"

After: "What is worth automating first?"

By calculating true ROI (time saved × hourly cost), teams make smarter automation investments instead of automating randomly.

---

## 🏗️ Architecture

- Monorepo Pattern - Single source of truth for types & schemas using pnpm workspaces
- Type Safety - Full TypeScript across Node, React, and API layers
- Shared Schemas - Zod validation at API boundaries with shared types
- Separation of Concerns - Frontend, API, and AI logic clearly isolated
- Modular Libraries - Reusable packages for API clients, database, and validation

---

## 🚀 Production Deployment

The project supports:

- Docker containerization for backend services
- Static hosting for React frontend (Vite builds to dist/)
- PostgreSQL for persistence
- Environment-based configuration
- Express server scalability

---

## 👩‍💻 Author

Sharadha Kasiviswanathan

GitHub: [@SharadhaKasiviswanathan](https://github.com/SharadhaKasiviswanathan)
