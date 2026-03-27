import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

BASE_PATH = os.getenv("BASE_PATH", "/python-api")

app = FastAPI(
    title="ROIFlow AI",
    description="LangGraph-powered automation intake and ROI analysis engine",
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
        "service": "ROIFlow AI",
        "version": "1.0.0",
        "engine": "LangGraph + Rules-based",
        "endpoints": ["/analyze-task", "/tasks", "/export/{id}", "/demo/{key}", "/health"],
    }
