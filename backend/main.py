"""
FastAPI entry point for the Cross-Talking Multi-Agent AI System.

Serves static frontend assets, exposes:
  GET  /api/status  -> Returns provider (Groq/OpenAI), active model, and agent states
  POST /api/start   -> Starts a multi-agent debate
  POST /api/stop    -> Cancels the active debate
  WS   /ws          -> Real-time WebSocket event stream
"""

from __future__ import annotations

import asyncio
import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from communication import CommunicationManager
import config
from engine import CrossTalkEngine
from models import StartDiscussionRequest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")

app = FastAPI(title="Cross-Talking Multi-Agent AI System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

comm = CommunicationManager()
engine = CrossTalkEngine(comm)


@app.get("/")
async def index() -> FileResponse:
    target_html = (
        os.path.join(DIST_DIR, "index.html")
        if os.path.exists(os.path.join(DIST_DIR, "index.html"))
        else os.path.join(FRONTEND_DIR, "index.html")
    )
    return FileResponse(target_html)


if os.path.exists(os.path.join(DIST_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/api/status")
async def status() -> JSONResponse:
    engine.ensure_provider()
    return JSONResponse(
        {
            "llm_configured": engine.provider is not None,
            "provider": config.get_active_provider(),
            "model": config.get_active_model() if engine.provider is not None else None,
            "config_error": engine.config_error,
            "running": engine.running,
            "agents": [a.to_public() for a in engine.agents.values()],
        }
    )


@app.post("/api/start")
async def start_discussion(req: StartDiscussionRequest) -> JSONResponse:
    task = (req.task or "").strip()
    if not task:
        return JSONResponse({"error": "Task cannot be empty."}, status_code=400)
    if len(task) > config.MAX_TASK_LENGTH:
        return JSONResponse(
            {"error": f"Task is too long (max {config.MAX_TASK_LENGTH} characters)."},
            status_code=400,
        )
    if engine.running:
        return JSONResponse({"error": "A discussion is already in progress."}, status_code=409)
    if not engine.ensure_provider():
        return JSONResponse(
            {
                "error": engine.config_error
                or "LLM provider is not configured. Set GROQ_API_KEY or OPENAI_API_KEY and try again."
            },
            status_code=503,
        )

    conf_thresh = getattr(req, "confidence_threshold", 0.75)
    mode = getattr(req, "mode", "balanced")
    asyncio.create_task(_run_safe(task, conf_thresh, mode))
    return JSONResponse({
        "status": "started",
        "task": task,
        "mode": mode,
        "confidence_threshold": conf_thresh,
        "provider": config.get_active_provider(),
        "model": config.get_active_model(),
    })


@app.post("/api/stop")
async def stop_discussion() -> JSONResponse:
    if not engine.running:
        return JSONResponse({"status": "not_running", "message": "No active discussion to stop."})
    engine.cancel_discussion()
    return JSONResponse({"status": "stopping", "message": "Cancellation requested."})


async def _run_safe(task: str, confidence_threshold: float = 0.75, mode: str = "balanced") -> None:
    try:
        await engine.run_discussion(task, confidence_threshold=confidence_threshold, mode=mode)
    except Exception as exc:  # noqa: BLE001
        await comm.broadcast({"type": "discussion_error", "message": str(exc)})


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await comm.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        comm.disconnect(ws)
    except Exception:
        comm.disconnect(ws)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.HOST, port=config.PORT)
