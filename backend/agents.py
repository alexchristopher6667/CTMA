"""
Static definitions of the three specialized agents.
"""

from __future__ import annotations

from models import Agent, AgentRole, AgentStatus


def build_agents() -> dict:
    """Return a fresh set of the three agents, keyed by id."""
    return {
        "research": Agent(
            id="research",
            name="Research Agent",
            role=AgentRole.RESEARCH,
            description="Research & Evidence",
            status=AgentStatus.IDLE,
        ),
        "analyst": Agent(
            id="analyst",
            name="Analyst Agent",
            role=AgentRole.ANALYST,
            description="Trade-offs & Implications",
            status=AgentStatus.IDLE,
        ),
        "critic": Agent(
            id="critic",
            name="Critic Agent",
            role=AgentRole.CRITIC,
            description="Challenge & Scrutiny",
            status=AgentStatus.IDLE,
        ),
    }


# Fixed communication topology used during cross-talk (round 2): who sends
# to whom, in order. Kept simple and explicit rather than fully-connected,
# so the visual communication paths stay readable.
CROSS_TALK_EDGES = [
    ("research", "analyst"),
    ("research", "critic"),
    ("analyst", "critic"),
    ("critic", "research"),
]
