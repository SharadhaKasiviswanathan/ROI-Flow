# Project Notes

## Overview

ROIFlow is a local-first automation analysis app. It uses:

- FastAPI for the backend API
- LangGraph for agent orchestration
- Ollama for local or cloud AI inference in AI mode
- Vite + React for the web interface
- Optional Gradio share app for quick public demos

## Run Locally

1. Start the Python API from `artifacts/python-api` with `PYTHON_API_PORT=8002 BASE_PATH=/python-api python3 start.py`
2. Start the frontend from the repo root with `PORT=5173 BASE_PATH=/ PYTHON_API_PORT=8002 corepack pnpm --filter @roiflow/app dev`

## Run With Ollama Cloud

Set these environment variables before starting the Python API if you want the same code to use Ollama Cloud instead of a local daemon:

- `OLLAMA_BASE_URL=https://ollama.com`
- `OLLAMA_API_KEY=<your-api-key>`
- `OLLAMA_MODEL=gpt-oss:120b`

If you leave `OLLAMA_BASE_URL` unset, ROIFlow defaults to your local Ollama server on `http://127.0.0.1:11434`.

## Public Share Link

The main Vite site is still a local development app, so it only runs on the machine where you start it unless you deploy or tunnel it.

For a quick public demo link, use the Gradio companion app:

1. Install the extra dependency with `pip install -r artifacts/gradio-share/requirements.txt`
2. Start the share app with `GRADIO_SHARE=true python3 artifacts/gradio-share/app.py`
3. Gradio will print a temporary public URL in the terminal while the app is running

## Modes

- Standard mode: local rules-based analysis with no LLM requirement
- AI mode: LangGraph agentic analysis via a configurable Ollama host
