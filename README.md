# Cross-Talking Multi-Agent AI System

A real-LLM-powered, web-grounded technical research system with three agents that genuinely cross-talk: **Research Agent**, **Analyst Agent**, and **Critic Agent**.

Supports dual LLM providers: **Groq** (ultra-fast LPU inference) and **OpenAI** (Responses API & Chat Completions), with live web search grounding and real-time evidence verification.

---

## Architecture

```
USER QUERY
    │
Research Agent  ──(real LLM + live web search)──>  initial evidence
    │                                                     │
    ▼                                                     ▼
Analyst Agent  <──── cross-talk ────>  Critic Agent  <──── cross-talk ────>  Research Agent (revises)
    │
    ▼
Round 3 (Parallelized): each agent states its final, refined stance concurrently
    │
    ▼
Final synthesis (real LLM) ──> unified answer + structured citations
```

- **Round 1 — Investigation:** The Research Agent reasons with live web search. Analyst and Critic wait to react to actual findings rather than producing independent guesses.
- **Round 2 — Cross-talk:** Directed peer messaging (`research → analyst`, `research → critic`, `analyst → critic`, `critic → research`). Critic actively challenges assumptions and counter-evidence; Research revises honestly.
- **Round 3 — Refinement:** All three agents synthesize their final stances concurrently (`asyncio.gather`), reducing round latency by ~40%.
- **Final Synthesis:** A dedicated LLM call combines the full transcript and structured evidence into a clear, authoritative briefing.

---

## Dual LLM Provider Support

Configure either **Groq** (recommended for speed and low cost) or **OpenAI**:

### Option 1: Groq (Recommended)
```bash
export GROQ_API_KEY="gsk_..."
# Optional (default is llama-3.3-70b-versatile):
export GROQ_MODEL="llama-3.3-70b-versatile"
```

### Option 2: OpenAI
```bash
export OPENAI_API_KEY="sk-..."
# Optional (default is gpt-4o):
export OPENAI_MODEL="gpt-4o"
```

### Auto-Detection & Priority
If both keys are present, the system defaults to `groq` or you can explicitly choose via:
```bash
export LLM_PROVIDER="groq"    # or "openai"
```

---

## Key Features

1. **No Hallucinated Fallbacks or Mocks:** Every turn and synthesis is executed by real LLM calls.
2. **Grounding & Evidence Tiering:**
   - **Tier 1:** Official documentation, standards bodies (IETF, W3C, ISO, NIST), research papers (arXiv, Nature).
   - **Tier 2:** IEEE, ACM, university publications, Springer.
   - **Tier 3:** General technical web sources.
   - Real-time **Evidence & Grounding Panel** renders citations and credibility badges in the frontend.
3. **Interactive UI Controls:**
   - Pre-flight configuration validation banner.
   - Active provider/model pill in the header.
   - Real-time discussion cancellation (**Stop Discussion** button).
   - One-click **Copy Answer** button with clipboard feedback.
   - Animated SVG message travel dots between agent nodes.
   - Rich Markdown formatting with clickable outbound links.

---

## Quick Start (Local)

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set your API key:**
   ```bash
   # For Groq:
   export GROQ_API_KEY="your-groq-key"

   # Or for OpenAI:
   export OPENAI_API_KEY="your-openai-key"
   ```

3. **Start the server:**
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
   Open `http://localhost:8000` in your browser.

### UptimeRobot Health Monitor

Monitor `https://<your-host>/api/health` as an HTTP(s) monitor and set its check interval to 5 minutes. The route supports `GET` and `HEAD`, returns `200` while the backend is running, and includes `X-Health-Status: healthy`.

To require a monitor header, set `HEALTHCHECK_TOKEN` on the backend and configure UptimeRobot to send `X-Health-Check-Token` with the same value.

---

## Running in Google Colab

```python
import os
from google.colab import userdata

# Store your key in Google Colab Secrets (Left sidebar -> Key icon):
os.environ["GROQ_API_KEY"] = userdata.get("GROQ_API_KEY", "")
# or:
os.environ["OPENAI_API_KEY"] = userdata.get("OPENAI_API_KEY", "")

!pip install -q -r requirements.txt
!python run_colab.py
```

`run_colab.py` will launch the backend and provide a public URL via Google Colab's native proxy port (`proxyPort`).

---

## Project Structure

```
cross_talking_multi_agent/
├── backend/
│   ├── main.py          FastAPI server, REST endpoints, and WebSocket handler
│   ├── engine.py        3-round orchestration, parallel Round 3, cancellation
│   ├── agents.py        Agent identities and cross-talk topology
│   ├── communication.py Inboxes, history, and WebSocket broadcasting
│   ├── providers.py     Dual LLM provider implementation (Groq & OpenAI)
│   ├── reasoning.py     Prompt engineering, search injection, JSON parser
│   ├── web_search.py    Live web search (DDG/Tavily), citation extraction, tiering
│   ├── models.py        Pydantic data models (Agent, Message, Evidence)
│   └── config.py        Unified configuration and provider auto-detection
├── frontend/
│   ├── index.html       Web interface with Evidence Grid & Provider Status
│   ├── style.css        Modern dark-mode theme with micro-animations
│   └── app.js           WebSocket listener, SVG line geometry, text formatter
├── run_colab.py         One-shot launcher for Google Colab
├── requirements.txt     Minimal Python dependencies
└── README.md
```
