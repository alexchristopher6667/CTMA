"""
Global configuration for the Cross-Talking Multi-Agent AI System.

Supports dual LLM providers:
1. OpenAI (native Responses API or Chat Completions with web search)
2. Groq (ultra-fast LPU Chat Completions + built-in web search grounding)

Set either OPENAI_API_KEY or GROQ_API_KEY in your environment.
"""

from __future__ import annotations

import os


# ---------------------------------------------------------------------------
# Built-in .env loader (loads root or backend .env if present)
# ---------------------------------------------------------------------------

def _load_env_file() -> None:
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass

_load_env_file()


# ---------------------------------------------------------------------------
# Provider selection: "auto", "openai", or "groq"
# ---------------------------------------------------------------------------

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "auto").strip().lower()


# ---------------------------------------------------------------------------
# OpenAI configuration
# ---------------------------------------------------------------------------

OPENAI_API_KEY = os.environ.get(
    "OPENAI_API_KEY",
    "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",
).strip()
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o").strip()
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "").strip() or None


# ---------------------------------------------------------------------------
# Groq configuration
# ---------------------------------------------------------------------------

GROQ_KEY = os.environ.get(
    "GROQ_API_KEY",
    "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",
).strip()
GROQ_API_KEY = GROQ_KEY
GROQ_MODEL = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b").strip()
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").strip()
GROQ_REASONING_EFFORT = os.environ.get("GROQ_REASONING_EFFORT", "medium").strip()


# ---------------------------------------------------------------------------
# Web search configuration
# ---------------------------------------------------------------------------

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "").strip()
OPENAI_WEB_SEARCH_TOOL_TYPE = os.environ.get("OPENAI_WEB_SEARCH_TOOL_TYPE", "web_search_preview").strip()
MAX_SEARCH_RESULTS = int(os.environ.get("MAX_SEARCH_RESULTS", "5"))


# ---------------------------------------------------------------------------
# Common generation parameters
# ---------------------------------------------------------------------------

REQUEST_TIMEOUT_SECONDS = float(os.environ.get("REQUEST_TIMEOUT_SECONDS", "90"))
MAX_OUTPUT_TOKENS = int(os.environ.get("MAX_OUTPUT_TOKENS", "2048"))
TEMPERATURE = float(os.environ.get("TEMPERATURE", "0.4"))
TRANSIENT_RETRY_DELAY_SECONDS = 2.0


# ---------------------------------------------------------------------------
# Discussion / UI pacing
# ---------------------------------------------------------------------------

THINKING_DELAY = (0.4, 0.8)
MESSAGE_TRAVEL_DELAY = 0.5
READING_DELAY = (0.3, 0.6)
NUM_ROUNDS = 3
MAX_TASK_LENGTH = 500


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))


# ---------------------------------------------------------------------------
# Provider resolution helpers
# ---------------------------------------------------------------------------

def get_active_provider() -> str:
    """Return 'openai' or 'groq' based on configuration and available keys."""
    if LLM_PROVIDER in ("openai", "groq"):
        return LLM_PROVIDER
    # "auto" resolution: prefer Groq if key provided (fast & free tier), else OpenAI
    if GROQ_API_KEY:
        return "groq"
    if OPENAI_API_KEY:
        return "openai"
    return "none"


def is_configured() -> bool:
    """Check if at least one provider has a valid API key configured."""
    provider = get_active_provider()
    if provider == "groq":
        return bool(GROQ_API_KEY)
    if provider == "openai":
        return bool(OPENAI_API_KEY)
    return False


def get_active_model() -> str:
    """Return the name of the active model."""
    provider = get_active_provider()
    if provider == "groq":
        return GROQ_MODEL
    if provider == "openai":
        return OPENAI_MODEL
    return "none"