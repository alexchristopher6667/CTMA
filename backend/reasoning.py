"""
Prompt engineering for the real-LLM, web-grounded multi-agent pipeline.

Builds system/user prompts for OpenAI and Groq models, injects live web search
evidence, and parses structured JSON output contracts.
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Optional

from models import AgentRole

# ---------------------------------------------------------------------------
# Shared policy text injected into every agent's system prompt
# ---------------------------------------------------------------------------

SOURCE_POLICY = """
When reasoning and gathering evidence, prioritize sources in this order:
Tier 1 (strongly preferred): official documentation, standards organizations (IETF, W3C, ISO, NIST),
government technical bodies, original research papers (arXiv, Nature, Science), official project repos.
Tier 2: IEEE, ACM, reputable technical publications, university research, Springer.
Tier 3: general technical websites, engineering blogs, tutorials.
Prefer primary sources over SEO aggregators. Never fabricate a source URL or citation -- only cite
sources provided in the search findings or established technical repositories.
""".strip()

OUTPUT_CONTRACT = """
CRITICAL: Do NOT invoke tool calls, function calls, or syntax like 'web.run'. You do NOT have tool execution access.
All necessary search evidence is provided directly in your prompt text.
You must respond ONLY with a single JSON object and nothing else -- no markdown fences, no tool syntax, no commentary
before or after it. The JSON object must have exactly these keys:

{
  "message": string,       // your response to the team this turn: 2-5 concise sentences,
                            // technically rigorous, written in first-person as this agent.
  "confidence": number,    // your confidence (0.0-1.0) in the claims made this turn.
  "evidence": [             // 0-4 structured findings backing this turn.
    {
      "claim": string,           // specific factual assertion or takeaway
      "evidence": string,        // concise quote or factual summary backing the claim
      "source_title": string,    // title of the source (or null)
      "source_url": string,      // valid URL from the search results (or null)
      "source_type": string,     // "tier1" | "tier2" | "tier3" | null
      "confidence": number,      // 0.0 - 1.0
      "uncertainty": number      // 1.0 - confidence
    }
  ]
}

If no new evidence was uncovered this turn, use an empty list for "evidence".
""".strip()

ROLE_BLURB: Dict[AgentRole, str] = {
    AgentRole.RESEARCH: (
        "You are the Research Agent on a three-agent technical research team. "
        "Your role is to analyze the technical question, inspect current web-search evidence, "
        "and extract concrete, grounded facts with real citations. You clearly distinguish "
        "empirical facts from speculation. When challenged by the Critic, re-examine the sources "
        "and revise your stance and confidence honestly."
    ),
    AgentRole.ANALYST: (
        "You are the Analyst Agent on a three-agent technical research team. "
        "You build upon the Research Agent's findings: evaluate engineering trade-offs, "
        "practical implications, architectural scalability, and identify gaps or overgeneralized "
        "claims. Refine your evaluation after hearing from the Critic."
    ),
    AgentRole.CRITIC: (
        "You are the Critic Agent on a three-agent technical research team. "
        "Your role is to stress-test the team's reasoning: challenge weak assumptions, "
        "identify counter-arguments, failure modes, limitations, and edge cases. Be rigorous "
        "and direct, but acknowledge when evidence is solid."
    ),
}


def build_system_prompt(role: AgentRole) -> str:
    return (
        f"{ROLE_BLURB[role]}\n\n"
        "You are participating in a live, real multi-turn technical debate. "
        "Your output for this turn will be read directly by teammates and displayed in the UI.\n\n"
        f"{SOURCE_POLICY}\n\n"
        f"{OUTPUT_CONTRACT}"
    )


# ---------------------------------------------------------------------------
# Per-round user prompt
# ---------------------------------------------------------------------------

_ROUND_INSTRUCTIONS = {
    (AgentRole.RESEARCH, 1): (
        "This is the opening investigation. Examine the user's question and any search evidence "
        "provided below. Report your initial findings with specific technical facts and citations."
    ),
    (AgentRole.ANALYST, 2): (
        "The Research Agent just shared its findings with you. Analyze the evidence: "
        "what are the architectural trade-offs, scalability considerations, and unstated assumptions? "
        "Respond directly to what Research presented."
    ),
    (AgentRole.CRITIC, 2): (
        "Review the findings and analysis below. Actively scrutinize flaws, counter-evidence, "
        "security or operational risks, and edge cases. Challenge unsupported claims."
    ),
    (AgentRole.RESEARCH, 2): (
        "The Critic has challenged your findings. Carefully review the challenge: "
        "either defend your position with specific evidence or revise your stance and confidence honestly."
    ),
    (AgentRole.RESEARCH, 3): (
        "This is your final position for this discussion. Taking the Analyst's and Critic's arguments "
        "into account, state your refined technical conclusion and honest final confidence."
    ),
    (AgentRole.ANALYST, 3): (
        "This is your final position for this discussion. State your final trade-off and implementation "
        "recommendation, reflecting the full debate."
    ),
    (AgentRole.CRITIC, 3): (
        "This is your final position for this discussion. State which objections were resolved, which "
        "trade-offs remain critical, and your final assessment."
    ),
}

_DEFAULT_INSTRUCTION = (
    "Continue the discussion: respond directly to teammates, and update your position and confidence."
)


def _format_incoming(incoming_messages: List[dict]) -> str:
    if not incoming_messages:
        return "(no teammate messages yet this round)"
    lines = [f"- {m['sender']}: {m['content']}" for m in incoming_messages]
    return "\n".join(lines)


def build_user_prompt(
    role: AgentRole,
    task: str,
    round_number: int,
    incoming_messages: List[dict],
    own_previous_reasoning: Optional[str],
    evidence_so_far: List[dict],
    live_search_evidence: Optional[str] = None,
) -> str:
    instruction = _ROUND_INSTRUCTIONS.get((role, round_number), _DEFAULT_INSTRUCTION)

    parts = [
        f"User's technical question: {task}",
        "",
        f"Round {round_number} instruction: {instruction}",
    ]

    if live_search_evidence:
        parts.append("")
        parts.append(live_search_evidence)

    if own_previous_reasoning:
        parts.append("")
        parts.append(f"Your own previous position this discussion: {own_previous_reasoning}")

    parts.append("")
    parts.append("Teammate messages you have received:")
    parts.append(_format_incoming(incoming_messages))

    if evidence_so_far:
        parts.append("")
        parts.append("Evidence and sources already surfaced by the team:")
        for ev in evidence_so_far[-6:]:
            src = ev.get("source_title") or ev.get("source_url") or "source"
            parts.append(f"- [{ev.get('source_type', 'tier3')}] Claim: {ev.get('claim')} | Source: {src}")

    parts.append("")
    parts.append("Respond now with the exact JSON object described in your system instructions.")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Final synthesis prompts
# ---------------------------------------------------------------------------

def build_synthesis_system_prompt() -> str:
    return (
        "You are the final synthesis engine of a three-agent technical debate (Research, Analyst, Critic). "
        "Synthesize a clear, authoritative, academically rigorous, and balanced answer for the human user.\n\n"
        "Formatting & Structure Guidelines:\n"
        "1. Structure your output with clear markdown headings:\n"
        "   - '### Executive Summary' or '### Answer'\n"
        "   - '### Key Findings & Evidence' (incorporate a structured markdown table)\n"
        "   - '### Architectural Trade-offs & Implications'\n"
        "   - '### Remaining Uncertainties & Open Questions'\n"
        "   - '### Sources' (list top sources with URLs separated by semicolons)\n"
        "2. When presenting structured comparisons, evidence summaries, or multi-factor trade-offs, ALWAYS "
        "format them as a clean Markdown table with headers (e.g. | Aspect | Evidence | Takeaway |).\n"
        "3. If mathematical expressions, metrics, formulas, or algorithmic equations are relevant, format them "
        "using proper LaTeX math notation ($...$ for inline formulas, $$...$$ for display equations). "
        "Never output plain text or informal pseudo-code for math formulas.\n"
        "4. Distinguish empirical facts from theoretical possibilities, and ground claims directly in the team's evidence."
    )


def build_synthesis_user_prompt(task: str, transcript: List[dict], evidence_all: List[dict]) -> str:
    lines = [f"Original user question: {task}", "", "Full discussion transcript:"]
    for m in transcript:
        lines.append(f"[Round {m['round']}] {m['sender']} -> {m['receiver']}: {m['content']}")

    if evidence_all:
        lines.append("")
        lines.append("Structured evidence gathered during discussion:")
        for ev in evidence_all:
            src = ev.get("source_title") or "Source"
            url = ev.get("source_url") or ""
            lines.append(f"- Claim: {ev.get('claim')} | Evidence: {ev.get('evidence')} | Source: {src} ({url})")

    lines.append("")
    lines.append("Produce the final synthesized answer now.")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Structured JSON parsing with cleanup
# ---------------------------------------------------------------------------

_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)
_THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def parse_agent_json(raw_text: str) -> dict:
    """
    Parse the JSON response returned by an agent turn.
    Handles markdown fences, whitespace, think tags, and JSON repair.
    """
    text = (raw_text or "").strip()

    # Remove reasoning model <think>...</think> blocks if present
    text = _THINK_TAG_RE.sub("", text).strip()

    # Strip code block wrappers
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "message" in parsed:
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass

    match = _JSON_BLOCK_RE.search(text)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict) and "message" in parsed:
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "message": text or "(no response returned)",
        "confidence": 0.5,
        "evidence": [],
    }
