import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

BASE_PATH = os.getenv("BASE_PATH", "/python-api")

app = FastAPI(
    title="ROIFlow AI by Sharadha Kasiviswanathan",
    description="LangGraph-powered automation intake and ROI analysis engine running on Ollama local or cloud",
    version="1.0.0",
    root_path=BASE_PATH,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="")


@app.get("/")
async def root():
    return {
        "service": "ROIFlow AI by Sharadha Kasiviswanathan",
        "version": "1.0.0",
        "engine": "FastAPI + LangGraph + Ollama local or cloud",
        "pricing": "Use a local Ollama daemon or point at Ollama Cloud with an API key",
        "endpoints": [
            "/opportunities",
            "/analyze-task",
            "/analyze-task/stream",
            "/tasks",
            "/health",
        ],
    }
