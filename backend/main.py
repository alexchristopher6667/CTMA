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
import html
import hmac
import os
import re
import threading
import time
from urllib.parse import urlparse

from fastapi import FastAPI, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from communication import CommunicationManager
import config
from engine import CrossTalkEngine
from models import StartDiscussionRequest
from web_search import perform_web_search

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
SUGGESTION_CACHE_TTL_SECONDS = 6 * 60 * 60
SUGGESTION_SEARCH_QUERIES = [
    "latest science and technology research breakthroughs AI energy quantum biology",
    "recent scientific discoveries artificial intelligence batteries climate quantum computing biotech",
    "new research papers and technology breakthroughs published this week science engineering",
    "latest university research news medicine robotics semiconductors materials science",
]
_suggestion_cache: list[dict[str, str]] = []
_suggestion_cache_expires_at = 0.0
_suggestion_cache_lock = threading.Lock()
_suggestion_search_index = 0


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


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def healthcheck(request: Request) -> Response:
    headers = {"Cache-Control": "no-store", "X-Health-Status": "healthy"}
    expected_token = os.environ.get("HEALTHCHECK_TOKEN")
    supplied_token = request.headers.get("X-Health-Check-Token", "")

    if expected_token and not hmac.compare_digest(supplied_token, expected_token):
        headers["X-Health-Status"] = "unauthorized"
        if request.method == "HEAD":
            return Response(status_code=401, headers=headers)
        return JSONResponse({"status": "unauthorized"}, status_code=401, headers=headers)

    if request.method == "HEAD":
        return Response(status_code=200, headers=headers)
    return JSONResponse({"status": "ok"}, headers=headers)


@app.get("/api/suggestions")
def suggestions(refresh: bool = False, exclude: list[str] = Query(default=[])) -> JSONResponse:
    global _suggestion_cache, _suggestion_cache_expires_at, _suggestion_search_index

    with _suggestion_cache_lock:
        if not refresh and time.monotonic() < _suggestion_cache_expires_at:
            return JSONResponse(_suggestion_cache, headers={"Cache-Control": "no-store"})

        search_query = SUGGESTION_SEARCH_QUERIES[
            _suggestion_search_index % len(SUGGESTION_SEARCH_QUERIES)
        ]
        _suggestion_search_index += 1

        try:
            results = perform_web_search(
                search_query,
                max_results=12,
            )
        except Exception:
            results = []

        topics: list[dict[str, str]] = []
        seen_headlines: set[str] = set()
        excluded_queries = {query.casefold() for query in exclude}
        for result in results:
            raw_title = str(result.get("title") or "")
            headline = html.unescape(re.sub(r"<[^>]+>", "", raw_title))
            headline = re.sub(r"\s+", " ", headline).strip()[:180]
            if not headline or headline.casefold() in seen_headlines:
                continue

            seen_headlines.add(headline.casefold())
            domain = (urlparse(str(result.get("url") or "")).hostname or "").removeprefix("www.")
            topic = {
                "badge": domain or "Live research",
                "query": (
                    f"What does the latest evidence say about {headline}? "
                    "Assess recent advances, practical implications, and open questions."
                ),
            }
            if topic["query"].casefold() in excluded_queries:
                continue
            topics.append(topic)
            if len(topics) == 3:
                break

        if topics or not refresh:
            _suggestion_cache = topics
            _suggestion_cache_expires_at = time.monotonic() + SUGGESTION_CACHE_TTL_SECONDS
        return JSONResponse(topics, headers={"Cache-Control": "no-store"})


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
