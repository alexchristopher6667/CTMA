"""
Core data models shared across the backend.
"""

from __future__ import annotations

import time
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class AgentRole(str, Enum):
    RESEARCH = "research"
    ANALYST = "analyst"
    CRITIC = "critic"


class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    READING = "reading"
    REVIEWING = "reviewing"
    SPEAKING = "speaking"
    CHALLENGING = "challenging"
    REFINING = "refining"
    WAITING = "waiting"
    CONFIDENT = "confident"
    COMPLETED = "completed"
    ERROR = "error"


class MessageType(str, Enum):
    INITIAL_REASONING = "initial_reasoning"
    CROSS_TALK = "cross_talk"
    REFINEMENT = "refinement"
    FINAL = "final"


class Agent(BaseModel):
    id: str
    name: str
    role: AgentRole
    description: str
    status: AgentStatus = AgentStatus.IDLE
    current_task: Optional[str] = None
    current_reasoning: Optional[str] = None
    confidence: float = 0.5
    uncertainty: float = 0.5

    def to_public(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role.value,
            "description": self.description,
            "status": self.status.value,
            "current_reasoning": self.current_reasoning,
            "confidence": self.confidence,
            "uncertainty": self.uncertainty,
        }


class Message(BaseModel):
    id: str
    sender: str
    receiver: str
    content: str
    round: int
    message_type: MessageType
    timestamp: float = Field(default_factory=time.time)
    # Internal telemetry (backend data only -- the existing frontend does not
    # read these fields, so adding them is additive and UI-safe). See
    # models.Evidence below for what a confidence score is derived from.
    confidence: Optional[float] = None

    def to_public(self) -> dict:
        return {
            "id": self.id,
            "sender": self.sender,
            "receiver": self.receiver,
            "content": self.content,
            "round": self.round,
            "message_type": self.message_type.value,
            "timestamp": self.timestamp,
            "confidence": self.confidence,
        }


class Evidence(BaseModel):
    """
    A single structured finding produced by an agent's real LLM + web-search
    turn. This is backend-internal data used to ground cross-talk and the
    final synthesis in actual sources -- it is never rendered as its own UI
    panel. See backend/reasoning.py for the JSON contract agents are asked
    to fill in, and backend/web_search.py for source-tier classification.
    """

    claim: str
    evidence: str
    source_title: Optional[str] = None
    source_url: Optional[str] = None
    source_type: Optional[str] = None  # "tier1" | "tier2" | "tier3" | None
    confidence: float = 0.5
    uncertainty: float = 0.5

    @classmethod
    def normalize(cls, raw: dict) -> "Evidence":
        """Build an Evidence record from a loosely-typed dict the model
        returned, filling in sane defaults for anything missing/malformed."""
        confidence = raw.get("confidence")
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))

        uncertainty = raw.get("uncertainty")
        try:
            uncertainty = float(uncertainty)
        except (TypeError, ValueError):
            uncertainty = 1.0 - confidence
        uncertainty = max(0.0, min(1.0, uncertainty))

        return cls(
            claim=str(raw.get("claim") or "").strip() or "(unspecified claim)",
            evidence=str(raw.get("evidence") or "").strip(),
            source_title=(raw.get("source_title") or None),
            source_url=(raw.get("source_url") or None),
            source_type=(raw.get("source_type") or None),
            confidence=confidence,
            uncertainty=uncertainty,
        )


class DiscussionStats(BaseModel):
    """Telemetry snapshot broadcast inside the ``discussion_finished`` payload.

    Every field defaults to 0 / ``None`` so sessions loaded from localStorage
    that pre-date this schema never crash the frontend.
    """

    # --- existing counters (unchanged) ---
    confidence_threshold: float = 0.75
    uncertainty_threshold: float = 0.25
    messages_sent: int = 0
    messages_bypassed: int = 0
    overhead_reduction_pct: int = 0
    tokens_saved: int = 0

    # --- latency ---
    latency_multi_sec: float = 0.0
    latency_single_sec: float = 0.0
    latency_delta_pct: float = 0.0

    # --- energy ---
    energy_multi_wh: float = 0.0
    energy_single_wh: float = 0.0
    energy_delta_pct: float = 0.0

    # --- carbon ---
    carbon_multi_g: float = 0.0
    carbon_single_g: float = 0.0
    carbon_saved_g: float = 0.0

    # --- concurrency ---
    concurrency_time_saved_sec: float = 0.0


class StartDiscussionRequest(BaseModel):
    task: str
    confidence_threshold: float = 0.75
    mode: Optional[str] = "balanced"
