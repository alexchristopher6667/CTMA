"""
CTMARS Confidence & Uncertainty Mathematical Model
===================================================
Implements the professor's weighted geometric confidence scoring model:

    C = E^w_E * A^w_A * K^w_K * Q^w_Q * (1-X)^w_X
    U = 1 - C

Where:
    E = Evidence Support        [0,1]
    A = Agent Agreement         [0,1]
    K = Internal Consistency    [0,1]
    Q = Completeness            [0,1]
    X = Contradiction/Challenge [0,1]

Communication Decision function:
    D = alpha * U + beta * X + gamma * G
    where alpha=0.4, beta=0.4, gamma=0.2 (G = information gap)

Thresholds:
    D < 0.25         -> STOP (no additional communication)
    0.25 <= D < 0.50 -> VERIFY (single verification)
    0.50 <= D < 0.75 -> CROSS_TALK (additional round)
    D >= 0.75        -> DEEP_VERIFY (extra retrieval + restart)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


# ---------------------------------------------------------------------------
# Weights (sum = 1.0)
# ---------------------------------------------------------------------------
W_EVIDENCE     = 0.35   # Evidence support
W_AGREEMENT    = 0.20   # Agent agreement
W_CONSISTENCY  = 0.15   # Internal consistency
W_COMPLETENESS = 0.10   # Completeness
W_CONTRADICTION = 0.20  # Contradiction / challenge

# Decision function weights (sum = 1.0)
ALPHA = 0.4   # Uncertainty weight
BETA  = 0.4   # Contradiction weight
GAMMA = 0.2   # Information gap weight


class CommDecision(str, Enum):
    STOP        = "stop"           # D < 0.25
    VERIFY      = "verify"         # 0.25 <= D < 0.50
    CROSS_TALK  = "cross_talk"     # 0.50 <= D < 0.75
    DEEP_VERIFY = "deep_verify"    # D >= 0.75


@dataclass
class ClaimConfidence:
    """Per-claim confidence and uncertainty scores."""
    claim: str
    evidence_support: float     # E in [0,1]
    agent_agreement: float      # A in [0,1]
    consistency: float          # K in [0,1]
    completeness: float         # Q in [0,1]
    contradiction: float        # X in [0,1]
    importance: float = 1.0     # p_i weight for response-level aggregation

    def compute(self) -> tuple[float, float]:
        """Returns (confidence, uncertainty) using the weighted geometric model."""
        E = max(0.0, min(1.0, self.evidence_support))
        A = max(0.0, min(1.0, self.agent_agreement))
        K = max(0.0, min(1.0, self.consistency))
        Q = max(0.0, min(1.0, self.completeness))
        X = max(0.0, min(1.0, self.contradiction))

        # Guard against log(0) by flooring component values
        e_safe = max(1e-9, E)
        a_safe = max(1e-9, A)
        k_safe = max(1e-9, K)
        q_safe = max(1e-9, Q)
        anti_x = max(1e-9, 1.0 - X)

        C = (e_safe ** W_EVIDENCE *
             a_safe ** W_AGREEMENT *
             k_safe ** W_CONSISTENCY *
             q_safe ** W_COMPLETENESS *
             anti_x ** W_CONTRADICTION)

        C = round(max(0.0, min(1.0, C)), 4)
        U = round(1.0 - C, 4)
        return C, U


def compute_response_confidence(claims: List[ClaimConfidence]) -> tuple[float, float]:
    """
    Aggregate per-claim confidence into response-level confidence:
        C_response = sum(p_i * C_i) / sum(p_i)
    """
    if not claims:
        return 0.5, 0.5

    total_weight = sum(c.importance for c in claims)
    if total_weight <= 0:
        total_weight = len(claims)

    weighted_sum = 0.0
    for c in claims:
        conf, _ = c.compute()
        w = c.importance / total_weight
        weighted_sum += w * conf

    C_response = round(max(0.0, min(1.0, weighted_sum)), 4)
    U_response = round(1.0 - C_response, 4)
    return C_response, U_response


def compute_decision(uncertainty: float, contradiction: float, info_gap: float = 0.0) -> tuple[float, CommDecision]:
    """
    Communication Decision Function:
        D = alpha * U + beta * X + gamma * G
    
    Returns (D_score, CommDecision)
    """
    U = max(0.0, min(1.0, uncertainty))
    X = max(0.0, min(1.0, contradiction))
    G = max(0.0, min(1.0, info_gap))

    D = ALPHA * U + BETA * X + GAMMA * G
    D = round(min(1.0, D), 4)

    if D < 0.25:
        decision = CommDecision.STOP
    elif D < 0.50:
        decision = CommDecision.VERIFY
    elif D < 0.75:
        decision = CommDecision.CROSS_TALK
    else:
        decision = CommDecision.DEEP_VERIFY

    return D, decision


def estimate_confidence_from_llm_score(
    raw_confidence: float,
    evidence_count: int = 0,
    has_contradiction: bool = False,
    response_coverage: float = 0.8,
) -> tuple[float, float]:
    """
    Fallback: Convert a raw LLM-generated confidence score to a
    calibrated CTMARS score using heuristic factor estimation.

    Used when the LLM doesn't provide full E/A/K/Q/X breakdowns.
    """
    raw = max(0.0, min(1.0, float(raw_confidence)))

    # Estimate sub-components from available signals
    E = min(1.0, 0.5 + 0.1 * min(evidence_count, 5))   # more evidence -> higher
    A = raw  # assume agreement tracks with reported confidence
    K = 0.85 if raw > 0.7 else 0.65                     # heuristic
    Q = max(0.3, response_coverage)
    X = 0.70 if has_contradiction else 0.05

    claim = ClaimConfidence(
        claim="(aggregate)",
        evidence_support=E,
        agent_agreement=A,
        consistency=K,
        completeness=Q,
        contradiction=X,
    )
    return claim.compute()


def agent_agreement_score(conf_a: float, conf_b: float, semantic_similarity: float = 0.8) -> float:
    """
    Compute agreement score between two agents:
        A = lambda * A_semantic + (1 - lambda) * A_confidence
    lambda defaults to 0.6 (semantic agreement weighted more)
    """
    lambda_ = 0.6
    A_confidence = 1.0 - abs(conf_a - conf_b)
    A = lambda_ * semantic_similarity + (1 - lambda_) * A_confidence
    return round(max(0.0, min(1.0, A)), 4)


def critic_challenge_strength(critic_confidence: float, challenge_magnitude: float = 0.7) -> float:
    """
    Compute the contradiction factor X from the Critic's assessment:
        X = C_critic * S_C
    """
    X = critic_confidence * challenge_magnitude
    return round(max(0.0, min(1.0, X)), 4)
