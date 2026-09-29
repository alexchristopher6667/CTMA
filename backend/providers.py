"""
Dual LLM provider implementation supporting both OpenAI and Groq.

1. GroqProvider: Uses Groq's high-speed inference (LPU) via OpenAI-compatible
   Chat Completions with live web search grounding.
2. OpenAIProvider: Uses OpenAI's Responses API (with native hosted search) or
   standard Chat Completions with live search.

No mock data or fabricated responses. If a provider call fails, errors are reported cleanly.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import logging
from typing import List, Optional

import config
from models import AgentRole, Evidence
from reasoning import (
    build_synthesis_system_prompt,
    build_synthesis_user_prompt,
    build_system_prompt,
    build_user_prompt,
    parse_agent_json,
)
import web_search

logger = logging.getLogger(__name__)


class LLMConfigError(RuntimeError):
    """Raised when neither OpenAI nor Groq is properly configured."""


class LLMRequestError(RuntimeError):
    """Raised when an API request to the LLM provider fails."""


@dataclass
class AgentTurnResult:
    message: str
    confidence: float
    evidence: List[dict] = field(default_factory=list)
    citations: List[dict] = field(default_factory=list)
    used_search: bool = False


# ---------------------------------------------------------------------------
# Base Provider Interface
# ---------------------------------------------------------------------------

class BaseLLMProvider:
    provider_name: str = "base"
    model_name: str = ""

    async def generate_agent_turn(
        self,
        role: AgentRole,
        task: str,
        round_number: int,
        incoming_messages: List[dict],
        own_previous_reasoning: Optional[str],
        evidence_so_far: List[dict],
    ) -> AgentTurnResult:
        raise NotImplementedError

    async def synthesize_final(
        self,
        task: str,
        transcript: List[dict],
        evidence_all: List[dict],
    ) -> str:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Groq Provider (Chat Completions + Live Web Search)
# ---------------------------------------------------------------------------

class GroqProvider(BaseLLMProvider):
    provider_name = "groq"

    def __init__(self) -> None:
        if not config.GROQ_API_KEY:
            raise LLMConfigError(
                "GROQ_API_KEY is not set. Set it in your environment or Google Colab secrets."
            )
        try:
            from openai import AsyncOpenAI
            import openai as openai_module
        except ImportError as exc:
            raise LLMConfigError("The 'openai' package is required: pip install openai") from exc

        self._openai_module = openai_module
        self._client = AsyncOpenAI(
            api_key=config.GROQ_API_KEY,
            base_url=config.GROQ_BASE_URL,
            timeout=config.REQUEST_TIMEOUT_SECONDS,
        )
        self.model_name = config.GROQ_MODEL

    async def _call_chat(self, system: str, user: str) -> str:
        current_system = system
        candidate_models = [self.model_name]
        for fallback in ("qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"):
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error: Optional[Exception] = None
        for model in candidate_models:
            for retry in range(2):
                try:
                    response = await self._client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": current_system},
                            {"role": "user", "content": user},
                        ],
                        max_tokens=config.MAX_OUTPUT_TOKENS,
                        temperature=config.TEMPERATURE,
                    )
                    choice = response.choices[0] if response.choices else None
                    text = choice.message.content if choice and choice.message else None
                    if not text:
                        raise LLMRequestError("Groq returned an empty response.")
                    # If fallback worked, remember it
                    self.model_name = model
                    return text
                except self._openai_module.BadRequestError as exc:
                    err_str = str(exc)
                    if ("tool" in err_str.lower() or "failed_generation" in err_str.lower()) and retry == 0:
                        current_system += (
                            "\n\nCRITICAL MANDATORY INSTRUCTION: You do NOT have any tools or functions. "
                            "Do NOT output function calls or syntax like web.run. Respond ONLY with the JSON object."
                        )
                        await asyncio.sleep(0.5)
                        continue
                    clean_msg = err_str
                    try:
                        if hasattr(exc, "body") and isinstance(exc.body, dict):
                            clean_msg = exc.body.get("message") or exc.body.get("error", {}).get("message", err_str)
                    except Exception:
                        pass
                    raise LLMRequestError(f"Groq request rejected: {clean_msg}") from exc
                except self._openai_module.AuthenticationError as exc:
                    raise LLMRequestError(f"Groq API key error: {exc}") from exc
                except self._openai_module.RateLimitError as exc:
                    last_error = exc
                    if retry == 0:
                        await asyncio.sleep(config.TRANSIENT_RETRY_DELAY_SECONDS)
                        continue
                    break  # Try next candidate model
                except (self._openai_module.APITimeoutError, self._openai_module.APIConnectionError) as exc:
                    last_error = exc
                    if retry == 0:
                        await asyncio.sleep(config.TRANSIENT_RETRY_DELAY_SECONDS)
                        continue
                    break
                except Exception as exc:
                    err_text = str(exc).lower()
                    last_error = exc
                    # If model is unreachable (503 / capacity) or internal server error, try next candidate model
                    if any(term in err_text for term in ("unreachable", "503", "500", "overloaded", "capacity", "service_unavailable")):
                        logger.warning(f"Groq model {model} temporarily unavailable: {exc}. Trying fallback...")
                        break
                    if retry == 0:
                        await asyncio.sleep(1.0)
                        continue
                    raise LLMRequestError(f"Groq request error: {exc}") from exc

        raise LLMRequestError(f"All Groq candidate models failed. Last error: {last_error}")

    async def generate_agent_turn(
        self,
        role: AgentRole,
        task: str,
        round_number: int,
        incoming_messages: List[dict],
        own_previous_reasoning: Optional[str],
        evidence_so_far: List[dict],
    ) -> AgentTurnResult:
        # Ground research agent (Round 1) and critic agent (Round 2) with live web search
        search_citations: List[dict] = []
        live_evidence_text: Optional[str] = None
        should_search = (role == AgentRole.RESEARCH and round_number == 1) or (
            role == AgentRole.CRITIC and round_number == 2
        )

        if should_search:
            search_query = task if round_number == 1 else f"{task} criticism limitations counter-evidence"
            search_citations = web_search.perform_web_search(search_query, max_results=config.MAX_SEARCH_RESULTS)
            if search_citations:
                live_evidence_text = web_search.format_search_results_for_prompt(search_citations)

        system = build_system_prompt(role)
        user = build_user_prompt(
            role=role,
            task=task,
            round_number=round_number,
            incoming_messages=incoming_messages,
            own_previous_reasoning=own_previous_reasoning,
            evidence_so_far=evidence_so_far,
            live_search_evidence=live_evidence_text,
        )

        raw_text = await self._call_chat(system, user)
        parsed = parse_agent_json(raw_text)

        message = str(parsed.get("message") or "").strip() or "(no content returned)"
        try:
            confidence = float(parsed.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))

        raw_evidence = parsed.get("evidence") or []
        evidence: List[dict] = []
        if isinstance(raw_evidence, list):
            for item in raw_evidence:
                if not isinstance(item, dict):
                    continue
                ev = Evidence.normalize(item)
                if not ev.source_type and ev.source_url:
                    ev.source_type = web_search.classify_source_tier(ev.source_url)
                evidence.append(ev.model_dump())

        # If model didn't fill evidence schema but we found live citations during search, associate them
        if not evidence and search_citations:
            for sc in search_citations[:3]:
                ev = Evidence(
                    claim=sc.get("title", ""),
                    evidence=sc.get("snippet", ""),
                    source_title=sc.get("title"),
                    source_url=sc.get("url"),
                    source_type=sc.get("source_type"),
                    confidence=confidence,
                    uncertainty=round(1.0 - confidence, 2),
                )
                evidence.append(ev.model_dump())

        return AgentTurnResult(
            message=message,
            confidence=confidence,
            evidence=evidence,
            citations=search_citations,
            used_search=bool(search_citations),
        )

    async def synthesize_final(
        self,
        task: str,
        transcript: List[dict],
        evidence_all: List[dict],
    ) -> str:
        system = build_synthesis_system_prompt()
        user = build_synthesis_user_prompt(task, transcript, evidence_all)
        return (await self._call_chat(system, user)).strip()


# ---------------------------------------------------------------------------
# OpenAI Provider (Responses API with hosted search + Chat fallback)
# ---------------------------------------------------------------------------

class OpenAIProvider(BaseLLMProvider):
    provider_name = "openai"

    def __init__(self) -> None:
        if not config.OPENAI_API_KEY:
            raise LLMConfigError(
                "OPENAI_API_KEY is not set. Set it in your environment or Google Colab secrets."
            )
        try:
            from openai import AsyncOpenAI
            import openai as openai_module
        except ImportError as exc:
            raise LLMConfigError("The 'openai' package is required: pip install openai") from exc

        self._openai_module = openai_module
        self._client = AsyncOpenAI(
            api_key=config.OPENAI_API_KEY,
            base_url=config.OPENAI_BASE_URL,
            timeout=config.REQUEST_TIMEOUT_SECONDS,
        )
        self.model_name = config.OPENAI_MODEL
        self._supports_responses_api = True

    async def _call_responses(self, system: str, user: str, use_search: bool):
        kwargs = {
            "model": self.model_name,
            "input": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_output_tokens": config.MAX_OUTPUT_TOKENS,
            "temperature": config.TEMPERATURE,
        }
        if use_search:
            kwargs["tools"] = [{"type": config.OPENAI_WEB_SEARCH_TOOL_TYPE}]
            kwargs["tool_choice"] = "required"

        resp = await self._client.responses.create(**kwargs)
        text = getattr(resp, "output_text", None)
        citations = web_search.extract_citations(resp) if use_search else []
        return text, citations

    async def _call_chat(self, system: str, user: str) -> str:
        response = await self._client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=config.MAX_OUTPUT_TOKENS,
            temperature=config.TEMPERATURE,
        )
        choice = response.choices[0] if response.choices else None
        return choice.message.content if choice and choice.message else ""

    async def generate_agent_turn(
        self,
        role: AgentRole,
        task: str,
        round_number: int,
        incoming_messages: List[dict],
        own_previous_reasoning: Optional[str],
        evidence_so_far: List[dict],
    ) -> AgentTurnResult:
        use_search = (role == AgentRole.RESEARCH and round_number == 1) or (
            role == AgentRole.CRITIC and round_number == 2
        )
        system = build_system_prompt(role)

        text = ""
        citations: List[dict] = []

        # Attempt Responses API if supported
        if self._supports_responses_api and hasattr(self._client, "responses"):
            try:
                user = build_user_prompt(
                    role=role,
                    task=task,
                    round_number=round_number,
                    incoming_messages=incoming_messages,
                    own_previous_reasoning=own_previous_reasoning,
                    evidence_so_far=evidence_so_far,
                )
                text, citations = await self._call_responses(system, user, use_search)
            except Exception as exc:
                logger.info(f"Responses API fallback to Chat Completions: {exc}")
                self._supports_responses_api = False

        # Fallback to Chat Completions with live web search
        if not self._supports_responses_api or not text:
            live_evidence_text = None
            if use_search:
                citations = web_search.perform_web_search(task, max_results=config.MAX_SEARCH_RESULTS)
                live_evidence_text = web_search.format_search_results_for_prompt(citations)

            user = build_user_prompt(
                role=role,
                task=task,
                round_number=round_number,
                incoming_messages=incoming_messages,
                own_previous_reasoning=own_previous_reasoning,
                evidence_so_far=evidence_so_far,
                live_search_evidence=live_evidence_text,
            )
            text = await self._call_chat(system, user)

        parsed = parse_agent_json(text)
        message = str(parsed.get("message") or "").strip() or "(no content returned)"
        try:
            confidence = float(parsed.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))

        raw_evidence = parsed.get("evidence") or []
        evidence: List[dict] = []
        if isinstance(raw_evidence, list):
            for item in raw_evidence:
                if not isinstance(item, dict):
                    continue
                ev = Evidence.normalize(item)
                if not ev.source_type and ev.source_url:
                    ev.source_type = web_search.classify_source_tier(ev.source_url)
                evidence.append(ev.model_dump())

        return AgentTurnResult(
            message=message,
            confidence=confidence,
            evidence=evidence,
            citations=web_search.dedupe_and_rank(citations),
            used_search=bool(citations),
        )

    async def synthesize_final(
        self,
        task: str,
        transcript: List[dict],
        evidence_all: List[dict],
    ) -> str:
        system = build_synthesis_system_prompt()
        user = build_synthesis_user_prompt(task, transcript, evidence_all)

        if self._supports_responses_api and hasattr(self._client, "responses"):
            try:
                text, _ = await self._call_responses(system, user, use_search=False)
                if text:
                    return text.strip()
            except Exception:
                self._supports_responses_api = False

        return (await self._call_chat(system, user)).strip()


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_provider() -> BaseLLMProvider:
    """Return an instance of the active provider (Groq or OpenAI)."""
    active = config.get_active_provider()
    if active == "groq":
        return GroqProvider()
    if active == "openai":
        return OpenAIProvider()
    raise LLMConfigError(
        "Neither GROQ_API_KEY nor OPENAI_API_KEY is configured. "
        "Please set at least one in your environment or Google Colab secrets."
    )