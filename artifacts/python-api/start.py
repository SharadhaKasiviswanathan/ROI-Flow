import os
import uvicorn

port = int(os.getenv("PYTHON_API_PORT", "8002"))

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
